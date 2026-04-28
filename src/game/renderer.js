/**
 * QWER Climb - Renderer (렌더러)
 * Canvas에 벽, 홀드, 캐릭터를 그립니다.
 */

import { CANVAS_WIDTH, CANVAS_HEIGHT, CHARACTER, TENSION, HOLD_TYPES } from './constants.js';
import { distance, angle, wobble, clamp, lerp } from '../utils/helpers.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;

    // 카메라
    this.cameraY = 0;
    this.targetCameraY = 0;

    // 화면 흔들림
    this.shakeIntensity = 0;
    this.shakeTime = 0;

    // 파티클 효과
    this.particles = [];

    // 시간
    this.time = 0;
  }

  /** 카메라 Y 위치 설정 */
  setCameraTarget(targetY, wallHeight) {
    // 캐릭터가 화면 중앙보다 위에 있도록
    this.targetCameraY = Math.max(0, targetY - CANVAS_HEIGHT * 0.55);
    this.targetCameraY = Math.min(this.targetCameraY, wallHeight - CANVAS_HEIGHT);
    this.targetCameraY = Math.max(0, this.targetCameraY);
  }

  /** 프레임 업데이트 */
  update(dt) {
    this.time += dt;

    // 카메라 부드럽게 이동
    this.cameraY = lerp(this.cameraY, this.targetCameraY, 0.06);

    // 화면 흔들림 감소
    if (this.shakeIntensity > 0) {
      this.shakeIntensity *= 0.95;
      this.shakeTime += dt;
      if (this.shakeIntensity < 0.5) this.shakeIntensity = 0;
    }

    // 파티클 업데이트
    this.particles = this.particles.filter(p => {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 200 * dt; // gravity
      return p.life > 0;
    });
  }

  /** 화면 흔들기 */
  shake(intensity = 5) {
    this.shakeIntensity = intensity;
    this.shakeTime = 0;
  }

  /** 파티클 생성 (홀드 잡기 효과) */
  spawnGrabParticles(x, y, color) {
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 200,
        vy: (Math.random() - 0.5) * 200 - 50,
        life: 0.3 + Math.random() * 0.3,
        color,
        size: 3 + Math.random() * 4,
      });
    }
  }

  /** 추락 파티클 */
  spawnFallParticles(x, y) {
    for (let i = 0; i < 20; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 300,
        vy: -100 - Math.random() * 200,
        life: 0.5 + Math.random() * 0.5,
        color: `hsl(${Math.random() * 60}, 100%, 60%)`,
        size: 4 + Math.random() * 6,
      });
    }
  }

  /** 전체 씬 렌더링 */
  render(gameState) {
    const { ctx } = this;
    const { holds, character, selectedLimb, candidateHold, wallHeight, goalY, tension } = gameState;

    ctx.save();

    // 화면 흔들림 적용
    let shakeX = 0, shakeY = 0;
    if (this.shakeIntensity > 0) {
      shakeX = Math.sin(this.shakeTime * 50) * this.shakeIntensity;
      shakeY = Math.cos(this.shakeTime * 37) * this.shakeIntensity;
    }

    ctx.translate(shakeX, shakeY);

    // 배경 클리어
    this.drawBackground(ctx, wallHeight);

    // 카메라 적용
    ctx.save();
    ctx.translate(0, -this.cameraY);

    // 벽 그리기
    this.drawWall(ctx, wallHeight);

    // 골 라인
    this.drawGoalLine(ctx, goalY);

    // 홀드 그리기
    holds.forEach(hold => {
      this.drawHold(ctx, hold, candidateHold?.id === hold.id, selectedLimb);
    });

    // 캐릭터 그리기
    if (character) {
      this.drawCharacter(ctx, character, selectedLimb, tension, gameState);
    }

    // 파티클
    this.drawParticles(ctx);

    ctx.restore(); // 카메라 복원

    // 긴장도에 따른 화면 효과 (카메라 밖에서)
    if (tension > TENSION.CRITICAL_THRESHOLD) {
      this.drawDangerOverlay(ctx, tension);
    }

    ctx.restore(); // 흔들림 복원
  }

  /** 배경 그리기 */
  drawBackground(ctx, wallHeight) {
    // 어두운 실내 클라이밍장 배경
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#0d0d1a');
    gradient.addColorStop(0.5, '#141428');
    gradient.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 벽 질감용 패턴 점들
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    for (let i = 0; i < 50; i++) {
      const x = (i * 137.5 + this.time * 3) % CANVAS_WIDTH;
      const y = (i * 97.3 + this.time * 2) % CANVAS_HEIGHT;
      ctx.fillRect(x, y, 2, 2);
    }
  }

  /** 벽 그리기 */
  drawWall(ctx, wallHeight) {
    // 벽 본체
    const wallGradient = ctx.createLinearGradient(60, 0, CANVAS_WIDTH - 60, 0);
    wallGradient.addColorStop(0, '#1e1e32');
    wallGradient.addColorStop(0.5, '#252540');
    wallGradient.addColorStop(1, '#1e1e32');
    ctx.fillStyle = wallGradient;
    ctx.fillRect(60, -50, CANVAS_WIDTH - 120, wallHeight + 100);

    // 벽 테두리
    ctx.strokeStyle = '#333355';
    ctx.lineWidth = 3;
    ctx.strokeRect(60, -50, CANVAS_WIDTH - 120, wallHeight + 100);

    // 벽의 질감 (타일 라인)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let y = 0; y < wallHeight; y += 80) {
      ctx.beginPath();
      ctx.moveTo(60, y);
      ctx.lineTo(CANVAS_WIDTH - 60, y);
      ctx.stroke();
    }
    for (let x = 60; x < CANVAS_WIDTH - 60; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, -50);
      ctx.lineTo(x, wallHeight + 50);
      ctx.stroke();
    }
  }

  /** 골 라인 그리기 */
  drawGoalLine(ctx, goalY) {
    // 번쩍이는 골 라인
    const pulse = 0.5 + Math.sin(this.time * 3) * 0.3;
    ctx.strokeStyle = `rgba(255, 215, 0, ${pulse})`;
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.moveTo(60, goalY + 30);
    ctx.lineTo(CANVAS_WIDTH - 60, goalY + 30);
    ctx.stroke();
    ctx.setLineDash([]);

    // "GOAL" 텍스트
    ctx.fillStyle = `rgba(255, 215, 0, ${pulse})`;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏆 GOAL 🏆', CANVAS_WIDTH / 2, goalY + 25);
  }

  /** 홀드 그리기 */
  drawHold(ctx, hold, isCandidate, selectedLimb) {
    const { x, y, type, shapeVariant, rotation, grabbed, grabbedBy } = hold;
    const r = type.radius;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    // 글로우 효과
    if (isCandidate) {
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 20;
      
      // 후보 홀드 표시 (점선 원)
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, r + 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (grabbed) {
      ctx.shadowColor = type.color;
      ctx.shadowBlur = 12;
    } else {
      ctx.shadowColor = type.glowColor;
      ctx.shadowBlur = 8;
    }

    // 홀드 본체
    ctx.fillStyle = type.color;

    switch (shapeVariant) {
      case 0: // 원형
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 1: // 타원형
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 1.3, r * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 2: // 둥근 사각형
        roundRect(ctx, -r, -r * 0.8, r * 2, r * 1.6, r * 0.4);
        ctx.fill();
        break;
      case 3: // 삼각형-ish
        ctx.beginPath();
        ctx.moveTo(-r, r * 0.6);
        ctx.lineTo(r, r * 0.4);
        ctx.lineTo(0, -r * 0.8);
        ctx.closePath();
        ctx.fill();
        break;
    }

    // 홀드 하이라이트
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.arc(-r * 0.2, -r * 0.2, r * 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    // 잡힌 상태 표시
    if (grabbed && grabbedBy) {
      const limbColor = getLimbColor(grabbedBy);
      ctx.strokeStyle = limbColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  /** 캐릭터 그리기 */
  drawCharacter(ctx, character, selectedLimb, tension, gameState) {
    const { limbs, bodyX, bodyY, headX, headY, isFalling, fallY, wobbleTime, stretchFactor } = character;

    ctx.save();

    // 추락 중이면 아래로 이동
    if (isFalling) {
      ctx.translate(0, fallY);
      // 추락 시 회전
      ctx.translate(bodyX, bodyY);
      ctx.rotate(Math.sin(wobbleTime * 8) * 0.5);
      ctx.translate(-bodyX, -bodyY);
    }

    // 긴장도에 따른 떨림
    const trembleAmt = tension > TENSION.WARNING_THRESHOLD 
      ? (tension - TENSION.WARNING_THRESHOLD) / (TENSION.MAX - TENSION.WARNING_THRESHOLD) * 3
      : 0;

    // 몸통 그리기 (선)
    const bodyTopX = bodyX + wobble(wobbleTime, 0.5, trembleAmt);
    const bodyTopY = bodyY - CHARACTER.BODY_LENGTH * 0.3;
    const bodyBotX = bodyX + wobble(wobbleTime, 0.7, trembleAmt);
    const bodyBotY = bodyY + CHARACTER.BODY_LENGTH * 0.3;

    // 몸통 라인
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bodyTopX, bodyTopY);
    ctx.quadraticCurveTo(
      bodyX + wobble(wobbleTime, 1.3, 5 + trembleAmt),
      bodyY,
      bodyBotX, bodyBotY
    );
    ctx.stroke();

    // 팔다리 그리기
    this.drawLimb(ctx, 'leftHand', limbs.leftHand, bodyTopX, bodyTopY, 
                  CHARACTER.ARM_LENGTH, '#e74c3c', selectedLimb === 'leftHand', trembleAmt, wobbleTime);
    this.drawLimb(ctx, 'rightHand', limbs.rightHand, bodyTopX, bodyTopY, 
                  CHARACTER.ARM_LENGTH, '#3498db', selectedLimb === 'rightHand', trembleAmt, wobbleTime);
    this.drawLimb(ctx, 'leftFoot', limbs.leftFoot, bodyBotX, bodyBotY, 
                  CHARACTER.LEG_LENGTH, '#2ecc71', selectedLimb === 'leftFoot', trembleAmt, wobbleTime);
    this.drawLimb(ctx, 'rightFoot', limbs.rightFoot, bodyBotX, bodyBotY, 
                  CHARACTER.LEG_LENGTH, '#f39c12', selectedLimb === 'rightFoot', trembleAmt, wobbleTime);

    // 머리 그리기
    const hx = headX + wobble(wobbleTime, 0.4, trembleAmt);
    const hy = headY + wobble(wobbleTime, 0.6, trembleAmt * 0.5);

    // 머리 원
    ctx.fillStyle = '#ffdbac';
    ctx.beginPath();
    ctx.arc(hx, hy, CHARACTER.HEAD_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#dda15e';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 표정
    this.drawFace(ctx, hx, hy, tension, isFalling, wobbleTime);

    ctx.restore();
  }

  /** 팔다리 그리기 */
  drawLimb(ctx, limbId, limb, originX, originY, maxLength, color, isSelected, tremble, time) {
    const endX = limb.x + wobble(time, 1.1 + Math.random() * 0.1, tremble);
    const endY = limb.y + wobble(time, 0.9 + Math.random() * 0.1, tremble);

    // 관절 중간점 (약간 구부러진 팔/다리 표현)
    const midX = (originX + endX) / 2 + wobble(time, 0.8, 8 + tremble * 2);
    const midY = (originY + endY) / 2 + wobble(time, 1.0, 4 + tremble);

    // 선택된 팔다리 하이라이트
    if (isSelected) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 10;
      ctx.globalAlpha = 0.3 + Math.sin(time * 6) * 0.15;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.quadraticCurveTo(midX, midY, endX, endY);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // 팔다리 라인
    ctx.strokeStyle = color;
    ctx.lineWidth = limb.holdId !== null ? 5 : 3;
    ctx.lineCap = 'round';

    // 긴장도 높으면 깜빡임
    if (tremble > 1.5 && Math.sin(time * 15) > 0.7) {
      ctx.globalAlpha = 0.5;
    }

    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.quadraticCurveTo(midX, midY, endX, endY);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // 끝점 (손/발) 원
    const endRadius = limbId.includes('Hand') ? 8 : 7;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(endX, endY, endRadius, 0, Math.PI * 2);
    ctx.fill();

    // 홀드를 잡고 있으면 빛나는 테두리
    if (limb.holdId !== null) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(endX, endY, endRadius + 2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  /** 표정 그리기 */
  drawFace(ctx, hx, hy, tension, isFalling, time) {
    const r = CHARACTER.HEAD_RADIUS;

    if (isFalling) {
      // 추락 - 놀람 표정 😱
      // 눈
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(hx - 5, hy - 3, 5, 0, Math.PI * 2);
      ctx.arc(hx + 5, hy - 3, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(hx - 5, hy - 3, 2.5, 0, Math.PI * 2);
      ctx.arc(hx + 5, hy - 3, 2.5, 0, Math.PI * 2);
      ctx.fill();
      // 입 (O 모양)
      ctx.strokeStyle = '#c0392b';
      ctx.lineWidth = 2;
      ctx.fillStyle = '#c0392b';
      ctx.beginPath();
      ctx.arc(hx, hy + 6, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (tension > TENSION.CRITICAL_THRESHOLD) {
      // 위험 - 땀 흘리는 표정 😰
      // 눈 (X자)
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      [-5, 5].forEach(dx => {
        ctx.beginPath();
        ctx.moveTo(hx + dx - 3, hy - 5);
        ctx.lineTo(hx + dx + 3, hy - 1);
        ctx.moveTo(hx + dx + 3, hy - 5);
        ctx.lineTo(hx + dx - 3, hy - 1);
        ctx.stroke();
      });
      // 입 (물결)
      ctx.beginPath();
      ctx.moveTo(hx - 6, hy + 5);
      ctx.bezierCurveTo(hx - 3, hy + 8, hx + 3, hy + 3, hx + 6, hy + 6);
      ctx.stroke();
      // 땀방울
      ctx.fillStyle = '#74b9ff';
      ctx.beginPath();
      ctx.arc(hx + r - 2, hy + wobble(time, 2, 3), 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (tension > TENSION.WARNING_THRESHOLD) {
      // 경고 - 긴장 표정 😬
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(hx - 5, hy - 3, 3, 0, Math.PI * 2);
      ctx.arc(hx + 5, hy - 3, 3, 0, Math.PI * 2);
      ctx.fill();
      // 찡그린 입
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(hx - 5, hy + 5);
      ctx.lineTo(hx + 5, hy + 6);
      ctx.stroke();
    } else {
      // 정상 - 집중 표정 🙂
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(hx - 5, hy - 3, 2.5, 0, Math.PI * 2);
      ctx.arc(hx + 5, hy - 3, 2.5, 0, Math.PI * 2);
      ctx.fill();
      // 미소
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hx, hy + 2, 5, 0.1, Math.PI - 0.1);
      ctx.stroke();
    }
  }

  /** 파티클 그리기 */
  drawParticles(ctx) {
    for (const p of this.particles) {
      ctx.globalAlpha = clamp(p.life * 2, 0, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /** 위험 오버레이 */
  drawDangerOverlay(ctx, tension) {
    const intensity = (tension - TENSION.CRITICAL_THRESHOLD) / 
                      (TENSION.MAX - TENSION.CRITICAL_THRESHOLD);
    const alpha = intensity * 0.2 * (0.5 + Math.sin(this.time * 8) * 0.5);
    ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }
}

/** 둥근 사각형 헬퍼 */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/** 팔다리 ID에서 색상 가져오기 */
function getLimbColor(limbId) {
  const colors = {
    leftHand: '#e74c3c',
    rightHand: '#3498db',
    leftFoot: '#2ecc71',
    rightFoot: '#f39c12',
  };
  return colors[limbId] || '#fff';
}
