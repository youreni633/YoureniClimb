/**
 * QWER Climb - Renderer
 * Canvas 위에 벽, 홀드, 캐릭터, 다이노 UI를 그립니다.
 */

import { CANVAS_HEIGHT, CANVAS_WIDTH, CHARACTER, DYNO, TENSION } from './constants.js';
import { clamp, lerp, wobble } from '../utils/helpers.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;

    this.cameraY = 0;
    this.targetCameraY = 0;
    this.shakeIntensity = 0;
    this.shakeTime = 0;
    this.particles = [];
    this.time = 0;
  }

  setCameraTarget(targetY, wallHeight) {
    this.targetCameraY = Math.max(0, targetY - CANVAS_HEIGHT * 0.55);
    this.targetCameraY = Math.min(this.targetCameraY, wallHeight - CANVAS_HEIGHT);
    this.targetCameraY = Math.max(0, this.targetCameraY);
  }

  update(dt) {
    this.time += dt;
    this.cameraY = lerp(this.cameraY, this.targetCameraY, 0.06);

    if (this.shakeIntensity > 0) {
      this.shakeIntensity *= 0.95;
      this.shakeTime += dt;
      if (this.shakeIntensity < 0.5) this.shakeIntensity = 0;
    }

    this.particles = this.particles.filter((particle) => {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 200 * dt;
      return particle.life > 0;
    });
  }

  shake(intensity = 5) {
    this.shakeIntensity = intensity;
    this.shakeTime = 0;
  }

  spawnGrabParticles(x, y, color) {
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 200,
        vy: (Math.random() - 0.5) * 200 - 50,
        life: 0.3 + Math.random() * 0.3,
        color,
        size: 3 + Math.random() * 4,
      });
    }
  }

  spawnFallParticles(x, y) {
    for (let i = 0; i < 20; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 300,
        vy: -100 - Math.random() * 200,
        life: 0.5 + Math.random() * 0.5,
        color: `hsl(${Math.random() * 60}, 100%, 60%)`,
        size: 4 + Math.random() * 6,
      });
    }
  }

  render(gameState) {
    const { ctx } = this;
    const {
      holds,
      character,
      wallHeight,
      goalY,
      tension,
      feedbackMessage,
      warningMessage,
      controlledLimb,
      activeGrabRadius,
      dynoHint,
    } = gameState;

    ctx.save();

    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeIntensity > 0) {
      shakeX = Math.sin(this.shakeTime * 50) * this.shakeIntensity;
      shakeY = Math.cos(this.shakeTime * 37) * this.shakeIntensity;
    }

    ctx.translate(shakeX, shakeY);
    this.drawBackground(ctx);

    ctx.save();
    ctx.translate(0, -this.cameraY);

    this.drawWall(ctx, wallHeight);
    this.drawGoalLine(ctx, goalY);
    holds.forEach((hold) => this.drawHold(ctx, hold));
    this.drawParticles(ctx);
    if (character) {
      this.drawCharacter(ctx, character, controlledLimb, activeGrabRadius);
      if (character.dyno.charging || character.dyno.active) {
        this.drawDynoOverlay(ctx, character);
      }
    }

    ctx.restore();

    if (tension > TENSION.CRITICAL_THRESHOLD) {
      this.drawDangerOverlay(ctx, tension);
    }

    this.drawCenterMessage(ctx, feedbackMessage, CANVAS_HEIGHT - 80, '#ffffff');
    this.drawCenterMessage(ctx, warningMessage, 90, '#ffb347');

    if (dynoHint) {
      this.drawHintBox(ctx);
    }

    ctx.restore();
  }

  drawBackground(ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#0d0d1a');
    gradient.addColorStop(0.5, '#141428');
    gradient.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    for (let i = 0; i < 50; i++) {
      const x = (i * 137.5 + this.time * 3) % CANVAS_WIDTH;
      const y = (i * 97.3 + this.time * 2) % CANVAS_HEIGHT;
      ctx.fillRect(x, y, 2, 2);
    }
  }

  drawWall(ctx, wallHeight) {
    const wallGradient = ctx.createLinearGradient(60, 0, CANVAS_WIDTH - 60, 0);
    wallGradient.addColorStop(0, '#1e1e32');
    wallGradient.addColorStop(0.5, '#252540');
    wallGradient.addColorStop(1, '#1e1e32');
    ctx.fillStyle = wallGradient;
    ctx.fillRect(60, -50, CANVAS_WIDTH - 120, wallHeight + 100);

    ctx.strokeStyle = '#333355';
    ctx.lineWidth = 3;
    ctx.strokeRect(60, -50, CANVAS_WIDTH - 120, wallHeight + 100);

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

  drawGoalLine(ctx, goalY) {
    const pulse = 0.5 + Math.sin(this.time * 3) * 0.3;
    ctx.strokeStyle = `rgba(255, 215, 0, ${pulse})`;
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.moveTo(60, goalY + 30);
    ctx.lineTo(CANVAS_WIDTH - 60, goalY + 30);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = `rgba(255, 215, 0, ${pulse})`;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GOAL', CANVAS_WIDTH / 2, goalY + 25);
  }

  drawHold(ctx, hold) {
    const { x, y, type, shapeVariant, rotation, grabbed, grabbedBy } = hold;
    const r = type.radius;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    if (grabbed) {
      ctx.shadowColor = type.color;
      ctx.shadowBlur = 14;
    } else {
      ctx.shadowColor = type.glowColor;
      ctx.shadowBlur = 8;
    }

    ctx.fillStyle = type.color;

    switch (shapeVariant) {
      case 0:
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 1:
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 1.3, r * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 2:
        roundRect(ctx, -r, -r * 0.8, r * 2, r * 1.6, r * 0.4);
        ctx.fill();
        break;
      default:
        ctx.beginPath();
        ctx.moveTo(-r, r * 0.6);
        ctx.lineTo(r, r * 0.4);
        ctx.lineTo(0, -r * 0.8);
        ctx.closePath();
        ctx.fill();
        break;
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.arc(-r * 0.2, -r * 0.2, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    if (grabbed && grabbedBy) {
      ctx.strokeStyle = getLimbColor(grabbedBy);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawCharacter(ctx, character, controlledLimb, activeGrabRadius) {
    const { limbs, bodyX, bodyY, headX, headY, isFalling, fallY, wobbleTime, tension } = character;
    ctx.save();

    if (isFalling) {
      ctx.translate(0, fallY);
      ctx.translate(bodyX, bodyY);
      ctx.rotate(Math.sin(wobbleTime * 8) * 0.5);
      ctx.translate(-bodyX, -bodyY);
    }

    const trembleAmt = tension > TENSION.WARNING_THRESHOLD
      ? (tension - TENSION.WARNING_THRESHOLD) / (TENSION.MAX - TENSION.WARNING_THRESHOLD) * 3
      : 0;

    const bodyTopX = bodyX + wobble(wobbleTime, 0.5, trembleAmt);
    const bodyTopY = bodyY - CHARACTER.BODY_LENGTH * 0.3;
    const bodyBotX = bodyX + wobble(wobbleTime, 0.7, trembleAmt);
    const bodyBotY = bodyY + CHARACTER.BODY_LENGTH * 0.3;

    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bodyTopX, bodyTopY);
    ctx.quadraticCurveTo(
      bodyX + wobble(wobbleTime, 1.3, 5 + trembleAmt),
      bodyY,
      bodyBotX,
      bodyBotY
    );
    ctx.stroke();

    this.drawLimb(ctx, 'leftHand', limbs.leftHand, bodyTopX, bodyTopY, '#e74c3c', controlledLimb, trembleAmt, wobbleTime);
    this.drawLimb(ctx, 'rightHand', limbs.rightHand, bodyTopX, bodyTopY, '#3498db', controlledLimb, trembleAmt, wobbleTime);
    this.drawLimb(ctx, 'leftFoot', limbs.leftFoot, bodyBotX, bodyBotY, '#2ecc71', controlledLimb, trembleAmt, wobbleTime);
    this.drawLimb(ctx, 'rightFoot', limbs.rightFoot, bodyBotX, bodyBotY, '#f39c12', controlledLimb, trembleAmt, wobbleTime);

    if (controlledLimb) {
      const limb = limbs[controlledLimb];
      this.drawControlCursor(ctx, limb.x, limb.y, getLimbColor(controlledLimb), activeGrabRadius);
    }

    const hx = headX + wobble(wobbleTime, 0.4, trembleAmt);
    const hy = headY + wobble(wobbleTime, 0.6, trembleAmt * 0.5);
    ctx.fillStyle = '#ffdbac';
    ctx.beginPath();
    ctx.arc(hx, hy, CHARACTER.HEAD_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#dda15e';
    ctx.lineWidth = 2;
    ctx.stroke();

    this.drawFace(ctx, hx, hy, tension, isFalling, wobbleTime);
    ctx.restore();
  }

  drawLimb(ctx, limbId, limb, originX, originY, color, controlledLimb, tremble, time) {
    const endX = limb.x + wobble(time, 1.1, tremble);
    const endY = limb.y + wobble(time, 0.9, tremble);
    const midX = (originX + endX) / 2 + wobble(time, 0.8, 6 + tremble * 2);
    const midY = (originY + endY) / 2 + wobble(time, 1.0, 4 + tremble);

    if (controlledLimb === limbId) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 10;
      ctx.globalAlpha = 0.28 + Math.sin(time * 6) * 0.12;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.quadraticCurveTo(midX, midY, endX, endY);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = limb.holdId !== null ? 5 : 3;
    if (limb.isDangling) {
      ctx.setLineDash([8, 8]);
      ctx.globalAlpha = 0.7;
    }

    if (tremble > 1.5 && Math.sin(time * 15) > 0.72) {
      ctx.globalAlpha *= 0.5;
    }

    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.quadraticCurveTo(midX, midY, endX, endY);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);

    const endRadius = limbId.includes('Hand') ? 8 : 7;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(endX, endY, endRadius, 0, Math.PI * 2);
    ctx.fill();

    if (limb.holdId !== null) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(endX, endY, endRadius + 2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawControlCursor(ctx, x, y, color, radius) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 14, y);
    ctx.lineTo(x + 14, y);
    ctx.moveTo(x, y - 14);
    ctx.lineTo(x, y + 14);
    ctx.stroke();
    ctx.restore();
  }

  drawDynoOverlay(ctx, character) {
    const { bodyX, bodyY, dyno } = character;
    const dir = dyno.direction;
    const power = clamp(dyno.power, 0, 1);
    const targetX = bodyX + dir.x * DYNO.TRAJECTORY_SCALE * Math.max(power, 0.2);
    const targetY = bodyY + dir.y * DYNO.TRAJECTORY_SCALE * Math.max(power, 0.2) - 70 * power;

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(bodyX, bodyY);
    ctx.quadraticCurveTo((bodyX + targetX) / 2, targetY - 30, targetX, targetY);
    ctx.stroke();
    ctx.setLineDash([]);

    this.drawArrow(ctx, bodyX, bodyY, bodyX + dir.x * 70, bodyY + dir.y * 70, '#ffd93d');

    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(bodyX - 60, bodyY - 115, 120, 12);
    ctx.fillStyle = '#ffd93d';
    ctx.fillRect(bodyX - 60, bodyY - 115, 120 * power, 12);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.strokeRect(bodyX - 60, bodyY - 115, 120, 12);

    const pulse = 0.5 + Math.sin(this.time * 14) * 0.5;
    ctx.fillStyle = `rgba(255,255,255,${pulse})`;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('QWER로 잡을 타이밍!', bodyX, bodyY - 130);
    ctx.restore();
  }

  drawArrow(ctx, x1, y1, x2, y2, color) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 12 * Math.cos(angle - Math.PI / 6), y2 - 12 * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - 12 * Math.cos(angle + Math.PI / 6), y2 - 12 * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  drawFace(ctx, hx, hy, tension, isFalling, time) {
    const r = CHARACTER.HEAD_RADIUS;

    if (isFalling) {
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
      ctx.fillStyle = '#c0392b';
      ctx.beginPath();
      ctx.arc(hx, hy + 6, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (tension > TENSION.CRITICAL_THRESHOLD) {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      [-5, 5].forEach((dx) => {
        ctx.beginPath();
        ctx.moveTo(hx + dx - 3, hy - 5);
        ctx.lineTo(hx + dx + 3, hy - 1);
        ctx.moveTo(hx + dx + 3, hy - 5);
        ctx.lineTo(hx + dx - 3, hy - 1);
        ctx.stroke();
      });
      ctx.beginPath();
      ctx.moveTo(hx - 6, hy + 5);
      ctx.bezierCurveTo(hx - 3, hy + 8, hx + 3, hy + 3, hx + 6, hy + 6);
      ctx.stroke();
      ctx.fillStyle = '#74b9ff';
      ctx.beginPath();
      ctx.arc(hx + r - 2, hy + wobble(time, 2, 3), 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (tension > TENSION.WARNING_THRESHOLD) {
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(hx - 5, hy - 3, 3, 0, Math.PI * 2);
      ctx.arc(hx + 5, hy - 3, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(hx - 5, hy + 5);
      ctx.lineTo(hx + 5, hy + 6);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(hx - 5, hy - 3, 2.5, 0, Math.PI * 2);
      ctx.arc(hx + 5, hy - 3, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hx, hy + 2, 5, 0.1, Math.PI - 0.1);
      ctx.stroke();
    }
  }

  drawParticles(ctx) {
    for (const particle of this.particles) {
      ctx.globalAlpha = clamp(particle.life * 2, 0, 1);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * particle.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawDangerOverlay(ctx, tension) {
    const intensity = (tension - TENSION.CRITICAL_THRESHOLD) /
      (TENSION.MAX - TENSION.CRITICAL_THRESHOLD);
    const alpha = intensity * 0.2 * (0.5 + Math.sin(this.time * 8) * 0.5);
    ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  drawCenterMessage(ctx, text, y, color) {
    if (!text) return;
    ctx.save();
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(CANVAS_WIDTH / 2 - 180, y - 28, 360, 44);
    ctx.fillStyle = color;
    ctx.fillText(text, CANVAS_WIDTH / 2, y);
    ctx.restore();
  }

  drawHintBox(ctx) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(20, CANVAS_HEIGHT - 120, 290, 78);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.strokeRect(20, CANVAS_HEIGHT - 120, 290, 78);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('Space + 방향키로 다이노 준비', 34, CANVAS_HEIGHT - 88);
    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#ffd93d';
    ctx.fillText('방향키를 오래 누르면 더 멀리 뜁니다', 34, CANVAS_HEIGHT - 62);
    ctx.restore();
  }
}

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

function getLimbColor(limbId) {
  const colors = {
    leftHand: '#e74c3c',
    rightHand: '#3498db',
    leftFoot: '#2ecc71',
    rightFoot: '#f39c12',
  };
  return colors[limbId] || '#fff';
}
