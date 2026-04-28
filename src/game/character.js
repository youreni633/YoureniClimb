/**
 * QWER Climb - Character (캐릭터 시스템)
 * 캐릭터의 위치, 팔다리 상태, 물리 연산을 관리합니다.
 */

import { CHARACTER, TENSION, LIMB } from './constants.js';
import { distance, clamp, lerp, wobble } from '../utils/helpers.js';

export class Character {
  constructor() {
    this.reset();
  }

  /** 캐릭터 초기화 */
  reset() {
    // 각 팔다리 위치 (홀드에 부착될 때 해당 홀드 좌표가 들어감)
    this.limbs = {
      leftHand:  { x: 0, y: 0, holdId: null, startX: 0, startY: 0, targetX: 0, targetY: 0, animProgress: 1 },
      rightHand: { x: 0, y: 0, holdId: null, startX: 0, startY: 0, targetX: 0, targetY: 0, animProgress: 1 },
      leftFoot:  { x: 0, y: 0, holdId: null, startX: 0, startY: 0, targetX: 0, targetY: 0, animProgress: 1 },
      rightFoot: { x: 0, y: 0, holdId: null, startX: 0, startY: 0, targetX: 0, targetY: 0, animProgress: 1 },
    };

    // 몸통 위치 (팔다리 중심에서 자동 계산)
    this.bodyX = 0;
    this.bodyY = 0;

    // 머리 위치
    this.headX = 0;
    this.headY = 0;

    // 긴장도
    this.tension = 0;

    // 상태
    this.isFalling = false;
    this.fallVelocity = 0;
    this.fallY = 0;

    // 우스꽝스러운 효과용 타이머
    this.wobbleTime = 0;
    this.stretchFactor = 0; // 0~1, 1이면 최대 스트레치
  }

  /**
   * 시작 홀드에 캐릭터 배치
   * @param {Object} startHolds - { leftFoot, rightFoot, leftHand, rightHand } 홀드 인덱스
   * @param {Array} holds - 홀드 배열
   */
  initPosition(startHolds, holds) {
    const lf = holds[startHolds.leftFoot];
    const rf = holds[startHolds.rightFoot];
    const lh = holds[startHolds.leftHand];
    const rh = holds[startHolds.rightHand];

    // 초기 위치는 즉시 설정 (애니메이션 없이)
    this._setLimbImmediate('leftFoot', lf);
    this._setLimbImmediate('rightFoot', rf);
    this._setLimbImmediate('leftHand', lh);
    this._setLimbImmediate('rightHand', rh);

    // 몸통 위치도 즉시 계산
    const avgX = (lf.x + rf.x + lh.x + rh.x) / 4;
    const avgY = (lh.y + (lf.y + rf.y) / 2) * 0.5 + lh.y * 0.15;
    this.bodyX = avgX;
    this.bodyY = (lh.y + lf.y) / 2;
    this.headX = this.bodyX;
    this.headY = this.bodyY - CHARACTER.BODY_LENGTH * 0.5 - CHARACTER.HEAD_RADIUS;
  }

  /** 팔다리를 즉시 홀드 위치에 배치 (초기화용) */
  _setLimbImmediate(limbId, hold) {
    const limb = this.limbs[limbId];
    limb.x = hold.x;
    limb.y = hold.y;
    limb.targetX = hold.x;
    limb.targetY = hold.y;
    limb.holdId = hold.id;
    limb.animProgress = 1; // 애니메이션 완료 상태
  }

  /** 팔다리를 특정 홀드에 붙이기 */
  setLimbToHold(limbId, hold) {
    const limb = this.limbs[limbId];
    
    // 이전 홀드 해제
    if (limb.holdId !== null) {
      // 외부에서 holds 배열을 업데이트해야 함
    }

    limb.startX = limb.x;
    limb.startY = limb.y;
    limb.targetX = hold.x;
    limb.targetY = hold.y;
    limb.holdId = hold.id;
    limb.animProgress = 0; // 이동 애니메이션 시작
  }

  /** 팔다리를 홀드에서 떼기 */
  releaseLimb(limbId) {
    const limb = this.limbs[limbId];
    limb.holdId = null;
  }

  /** 잡고 있는 팔다리 수 */
  getGripCount() {
    return Object.values(this.limbs).filter(l => l.holdId !== null).length;
  }

  /** 잡고 있는 손 수 */
  getHandGripCount() {
    let count = 0;
    if (this.limbs.leftHand.holdId !== null) count++;
    if (this.limbs.rightHand.holdId !== null) count++;
    return count;
  }

  /**
   * 매 프레임 업데이트
   * @param {number} dt - 프레임 시간 (초)
   * @param {Array} holds - 홀드 배열
   * @param {number} diffTensionMult - 난이도별 긴장도 배율
   * @returns {{ tension: number, isFalling: boolean }}
   */
  update(dt, holds, diffTensionMult = 1.0) {
    this.wobbleTime += dt;

    // 1) 팔다리 이동 애니메이션
    for (const limb of Object.values(this.limbs)) {
      if (limb.animProgress < 1) {
        limb.animProgress = Math.min(1, limb.animProgress + dt * 4.5); // ~0.22초에 완료
        const t = easeOutBack(limb.animProgress);
        limb.x = lerp(limb.startX, limb.targetX, t);
        limb.y = lerp(limb.startY, limb.targetY, t);
      } else {
        limb.x = limb.targetX;
        limb.y = limb.targetY;
      }
    }

    // 2) 몸통 위치 계산
    this.updateBodyPosition();

    // 3) 추락 중이면 물리 처리
    if (this.isFalling) {
      this.fallVelocity += 800 * dt; // 중력
      this.fallY += this.fallVelocity * dt;
      return { tension: this.tension, isFalling: true };
    }

    // 4) 스트레칭 계산 (팔다리가 얼마나 늘어나 있는지)
    this.stretchFactor = this.calculateStretch(holds);

    // 5) 긴장도 업데이트
    this.updateTension(dt, holds, diffTensionMult);

    // 6) 추락 체크
    if (this.tension >= TENSION.FAIL_THRESHOLD || this.getGripCount() === 0) {
      this.startFalling();
    }

    return { tension: this.tension, isFalling: this.isFalling };
  }

  /** 몸통 위치 계산 - 팔다리의 중심점 */
  updateBodyPosition() {
    const grippedLimbs = Object.values(this.limbs).filter(l => l.holdId !== null);
    if (grippedLimbs.length === 0) return;

    // 손과 발의 중간점으로 몸통 위치 계산
    const hands = [this.limbs.leftHand, this.limbs.rightHand].filter(l => l.holdId !== null);
    const feet = [this.limbs.leftFoot, this.limbs.rightFoot].filter(l => l.holdId !== null);

    let avgX, avgY;

    if (hands.length > 0 && feet.length > 0) {
      const handAvgX = hands.reduce((s, l) => s + l.x, 0) / hands.length;
      const handAvgY = hands.reduce((s, l) => s + l.y, 0) / hands.length;
      const footAvgX = feet.reduce((s, l) => s + l.x, 0) / feet.length;
      const footAvgY = feet.reduce((s, l) => s + l.y, 0) / feet.length;
      // 몸통은 손과 발 중간의 위쪽 1/3 지점
      avgX = (handAvgX + footAvgX) / 2;
      avgY = handAvgY + (footAvgY - handAvgY) * 0.35;
    } else {
      avgX = grippedLimbs.reduce((s, l) => s + l.x, 0) / grippedLimbs.length;
      avgY = grippedLimbs.reduce((s, l) => s + l.y, 0) / grippedLimbs.length;
    }

    // 부드럽게 이동 + 우스꽝스러운 흔들림
    const wobbleX = wobble(this.wobbleTime, 0.8, 2 + this.tension * 0.1);
    const wobbleY = wobble(this.wobbleTime, 1.2, 1 + this.tension * 0.05);

    this.bodyX = lerp(this.bodyX, avgX + wobbleX, 0.15);
    this.bodyY = lerp(this.bodyY, avgY + wobbleY, 0.15);

    // 머리는 몸통 위
    this.headX = this.bodyX + wobble(this.wobbleTime, 0.6, 3);
    this.headY = this.bodyY - CHARACTER.BODY_LENGTH * 0.5 - CHARACTER.HEAD_RADIUS;
  }

  /** 스트레칭 정도 계산 (0~1) */
  calculateStretch(holds) {
    let maxStretch = 0;
    const grippedLimbs = Object.entries(this.limbs).filter(([, l]) => l.holdId !== null);

    for (let i = 0; i < grippedLimbs.length; i++) {
      for (let j = i + 1; j < grippedLimbs.length; j++) {
        const [, l1] = grippedLimbs[i];
        const [, l2] = grippedLimbs[j];
        const dist = distance(l1.x, l1.y, l2.x, l2.y);
        const maxDist = CHARACTER.ARM_LENGTH + CHARACTER.LEG_LENGTH + CHARACTER.BODY_LENGTH;
        const stretch = dist / maxDist;
        maxStretch = Math.max(maxStretch, stretch);
      }
    }

    return clamp(maxStretch, 0, 1);
  }

  /** 긴장도 업데이트 */
  updateTension(dt, holds, diffMult) {
    const gripCount = this.getGripCount();
    const gripBonus = TENSION.GRIP_BONUS[gripCount] ?? TENSION.GRIP_BONUS[0];

    // 기본 증가
    let tensionDelta = TENSION.BASE_INCREASE;

    // 잡고 있는 팔다리 수에 따른 보정
    tensionDelta += gripBonus;

    // 스트레칭에 따른 추가 증가
    if (this.stretchFactor > CHARACTER.STRETCH_WARN) {
      const stretchExtra = (this.stretchFactor - CHARACTER.STRETCH_WARN) / 
                           (CHARACTER.STRETCH_MAX - CHARACTER.STRETCH_WARN);
      tensionDelta += TENSION.STRETCH_INCREASE * stretchExtra;
    }

    // 미끄러운 홀드 체크
    for (const limb of Object.values(this.limbs)) {
      if (limb.holdId !== null) {
        const hold = holds[limb.holdId];
        if (hold) {
          tensionDelta *= hold.type.tensionMultiplier;
          // 미끄러짐 체크
          if (hold.type.slipChance > 0 && Math.random() < hold.type.slipChance) {
            this.tension += 5; // 미끄러질 때 긴장도 급증
          }
        }
      }
    }

    // 안정적일 때 감소
    if (gripCount >= 3 && this.stretchFactor < CHARACTER.STRETCH_WARN) {
      tensionDelta -= TENSION.REST_DECREASE;
    }

    // 난이도 배율 적용
    if (tensionDelta > 0) {
      tensionDelta *= diffMult;
    }

    this.tension = clamp(this.tension + tensionDelta, 0, TENSION.MAX);
  }

  /** 추락 시작 */
  startFalling() {
    this.isFalling = true;
    this.fallVelocity = 0;
    this.fallY = 0;
    // 모든 팔다리 해제
    for (const limb of Object.values(this.limbs)) {
      limb.holdId = null;
    }
  }

  /** 캐릭터의 가장 높은 위치 (Y가 작을수록 높음) */
  getHighestY() {
    const gripped = Object.values(this.limbs).filter(l => l.holdId !== null);
    if (gripped.length === 0) return this.bodyY;
    return Math.min(...gripped.map(l => l.y));
  }
}

/** easeOutBack 이징 함수 (약간 튕기는 느낌) */
function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
