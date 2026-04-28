/**
 * QWER Climb - Character
 * 캐릭터의 팔다리 상태, 직접 조작, 다이노 움직임을 관리합니다.
 */

import { CHARACTER, DYNAMICS, DYNO, LIMB_IDS, TENSION } from './constants.js';
import { clamp, distance, lerp, wobble } from '../utils/helpers.js';

const HANDS = ['leftHand', 'rightHand'];
const FEET = ['leftFoot', 'rightFoot'];

export class Character {
  constructor() {
    this.reset();
  }

  reset() {
    this.limbs = {
      leftHand: this._createLimb(),
      rightHand: this._createLimb(),
      leftFoot: this._createLimb(),
      rightFoot: this._createLimb(),
    };

    this.bodyX = 0;
    this.bodyY = 0;
    this.headX = 0;
    this.headY = 0;

    this.tension = 0;
    this.isFalling = false;
    this.fallVelocity = 0;
    this.fallY = 0;
    this.wobbleTime = 0;
    this.stretchFactor = 0;
    this.badPosture = false;

    this.controlledLimb = null;
    this.lastReleasedLimb = null;

    this.dyno = {
      charging: false,
      active: false,
      direction: { x: 0, y: -1 },
      power: 0,
      timer: 0,
      velocityX: 0,
      velocityY: 0,
    };
  }

  _createLimb() {
    return {
      x: 0,
      y: 0,
      holdId: null,
      startX: 0,
      startY: 0,
      targetX: 0,
      targetY: 0,
      animProgress: 1,
      releasedX: 0,
      releasedY: 0,
      isControlled: false,
      isDangling: false,
    };
  }

  initPosition(startHolds, holds) {
    const lf = holds[startHolds.leftFoot];
    const rf = holds[startHolds.rightFoot];
    const lh = holds[startHolds.leftHand];
    const rh = holds[startHolds.rightHand];

    this._setLimbImmediate('leftFoot', lf);
    this._setLimbImmediate('rightFoot', rf);
    this._setLimbImmediate('leftHand', lh);
    this._setLimbImmediate('rightHand', rh);

    this.bodyX = (lf.x + rf.x + lh.x + rh.x) / 4;
    this.bodyY = (lh.y + rh.y + lf.y + rf.y) / 4 + 20;
    this.headX = this.bodyX;
    this.headY = this.bodyY - CHARACTER.BODY_LENGTH * 0.5 - CHARACTER.HEAD_RADIUS;
  }

  _setLimbImmediate(limbId, hold) {
    const limb = this.limbs[limbId];
    limb.x = hold.x;
    limb.y = hold.y;
    limb.targetX = hold.x;
    limb.targetY = hold.y;
    limb.startX = hold.x;
    limb.startY = hold.y;
    limb.releasedX = hold.x;
    limb.releasedY = hold.y;
    limb.holdId = hold.id;
    limb.animProgress = 1;
    limb.isDangling = false;
    limb.isControlled = false;
  }

  getGripCount() {
    return Object.values(this.limbs).filter((limb) => limb.holdId !== null).length;
  }

  getDanglingCount() {
    return Object.values(this.limbs).filter((limb) => limb.holdId === null && !limb.isControlled).length;
  }

  getAnchor(limbId) {
    const isHand = limbId.includes('Hand');
    if (limbId === 'leftHand') {
      return { x: this.bodyX - CHARACTER.SHOULDER_OFFSET_X, y: this.bodyY + CHARACTER.SHOULDER_OFFSET_Y };
    }
    if (limbId === 'rightHand') {
      return { x: this.bodyX + CHARACTER.SHOULDER_OFFSET_X, y: this.bodyY + CHARACTER.SHOULDER_OFFSET_Y };
    }
    if (limbId === 'leftFoot') {
      return { x: this.bodyX - CHARACTER.HIP_OFFSET_X, y: this.bodyY + CHARACTER.HIP_OFFSET_Y };
    }
    return {
      x: this.bodyX + CHARACTER.HIP_OFFSET_X,
      y: this.bodyY + CHARACTER.HIP_OFFSET_Y + (isHand ? 0 : 0),
    };
  }

  getReachForLimb(limbId) {
    return limbId.includes('Hand') ? CHARACTER.MAX_REACH_HAND : CHARACTER.MAX_REACH_FOOT;
  }

  getGrabRadiusForLimb(limbId) {
    return CHARACTER.RELEASE_GRAB_RADIUS + (limbId.includes('Hand') ? 3 : 0);
  }

  startLimbControl(limbId) {
    const limb = this.limbs[limbId];
    this.controlledLimb = limbId;
    this.lastReleasedLimb = null;
    limb.isControlled = true;
    limb.isDangling = false;
    limb.releasedX = limb.x;
    limb.releasedY = limb.y;
    limb.startX = limb.x;
    limb.startY = limb.y;
    limb.targetX = limb.x;
    limb.targetY = limb.y;
    limb.animProgress = 1;

    if (limb.holdId !== null) {
      limb.holdId = null;
    }
  }

  moveControlledLimb(limbId, dx, dy, dt) {
    const limb = this.limbs[limbId];
    if (!limb || !limb.isControlled) return;

    const anchor = this.getAnchor(limbId);
    const reach = this.getReachForLimb(limbId);
    let nextX = limb.x + dx * CHARACTER.CONTROL_MOVE_SPEED * dt;
    let nextY = limb.y + dy * CHARACTER.CONTROL_MOVE_SPEED * dt;

    const dist = distance(anchor.x, anchor.y, nextX, nextY);
    if (dist > reach) {
      const ratio = reach / dist;
      nextX = anchor.x + (nextX - anchor.x) * ratio;
      nextY = anchor.y + (nextY - anchor.y) * ratio;
    }

    limb.x = nextX;
    limb.y = nextY;
    limb.targetX = nextX;
    limb.targetY = nextY;
    limb.releasedX = nextX;
    limb.releasedY = nextY;
  }

  releaseControlledLimb(limbId, hold) {
    const limb = this.limbs[limbId];
    if (!limb) return;

    limb.isControlled = false;
    this.controlledLimb = this.controlledLimb === limbId ? null : this.controlledLimb;
    this.lastReleasedLimb = limbId;

    if (hold) {
      this.setLimbToHold(limbId, hold);
      limb.isDangling = false;
      return true;
    }

    limb.holdId = null;
    limb.isDangling = true;
    limb.releasedX = limb.x;
    limb.releasedY = limb.y;
    return false;
  }

  setLimbToHold(limbId, hold) {
    const limb = this.limbs[limbId];
    limb.startX = limb.x;
    limb.startY = limb.y;
    limb.targetX = hold.x;
    limb.targetY = hold.y;
    limb.releasedX = hold.x;
    limb.releasedY = hold.y;
    limb.holdId = hold.id;
    limb.animProgress = 0;
    limb.isDangling = false;
    limb.isControlled = false;
  }

  startDynoCharge() {
    if (this.isFalling || this.dyno.active || this.controlledLimb) return;
    this.dyno.charging = true;
    this.dyno.power = 0;
    this.dyno.direction = { x: 0, y: -1 };
  }

  updateDynoCharge(axis, dt) {
    if (!this.dyno.charging) return;

    if (axis.x !== 0 || axis.y !== 0) {
      const len = Math.hypot(axis.x, axis.y) || 1;
      this.dyno.direction = { x: axis.x / len, y: axis.y / len };
      this.dyno.power = clamp(this.dyno.power + DYNO.CHARGE_RATE * dt, 0, DYNO.MAX_POWER);
    }
  }

  releaseDynoCharge() {
    if (!this.dyno.charging) return false;
    const hasDirection = Math.abs(this.dyno.direction.x) + Math.abs(this.dyno.direction.y) > 0;
    const launched = hasDirection && this.dyno.power >= DYNO.MIN_POWER;

    if (launched) {
      this.dyno.active = true;
      this.dyno.timer = 0;
      this.dyno.velocityX = this.dyno.direction.x * DYNO.BODY_SPEED * this.dyno.power;
      this.dyno.velocityY = this.dyno.direction.y * DYNO.BODY_SPEED * this.dyno.power - DYNO.UPWARD_BOOST * this.dyno.power;
      for (const limbId of LIMB_IDS) {
        if (this.limbs[limbId].holdId === null) {
          this.limbs[limbId].isDangling = true;
        }
      }
    }

    this.dyno.charging = false;
    this.dyno.power = launched ? this.dyno.power : 0;
    return launched;
  }

  canCatchDuringDyno() {
    return this.dyno.active &&
      this.dyno.timer >= DYNO.HOLD_WINDOW_START &&
      this.dyno.timer <= DYNO.HOLD_WINDOW_END;
  }

  getDynoReachTarget(limbId) {
    const anchor = this.getAnchor(limbId);
    const reach = this.getReachForLimb(limbId) * (limbId.includes('Hand') ? 0.9 : 0.75);
    return {
      x: anchor.x + this.dyno.direction.x * reach,
      y: anchor.y + this.dyno.direction.y * reach,
    };
  }

  catchDuringDyno(limbId, hold) {
    if (!this.canCatchDuringDyno()) return false;
    if (!hold) {
      this.limbs[limbId].holdId = null;
      this.limbs[limbId].isDangling = true;
      return false;
    }

    this.setLimbToHold(limbId, hold);
    return true;
  }

  update(dt, holds, diffTensionMult = 1.0) {
    this.wobbleTime += dt;

    for (const [limbId, limb] of Object.entries(this.limbs)) {
      if (limb.isControlled) continue;

      if (limb.animProgress < 1) {
        limb.animProgress = Math.min(1, limb.animProgress + dt * DYNAMICS.LIMB_SNAP_SPEED);
        const t = easeOutBack(limb.animProgress);
        limb.x = lerp(limb.startX, limb.targetX, t);
        limb.y = lerp(limb.startY, limb.targetY, t);
      } else if (limb.holdId === null) {
        const dangleTarget = this.getDanglingTarget(limbId);
        limb.x = lerp(limb.x, dangleTarget.x, DYNAMICS.DANGLE_LERP);
        limb.y = lerp(limb.y, dangleTarget.y, DYNAMICS.DANGLE_LERP);
      } else {
        limb.x = limb.targetX;
        limb.y = limb.targetY;
      }
    }

    this.updateBodyPosition();

    if (this.isFalling) {
      this.fallVelocity += 800 * dt;
      this.fallY += this.fallVelocity * dt;
      return { tension: this.tension, isFalling: true, badPosture: this.badPosture };
    }

    if (this.dyno.active) {
      this.updateDynoMotion(dt);
    }

    this.stretchFactor = this.calculateStretch();
    this.badPosture = this.evaluateBadPosture();
    this.updateTension(dt, holds, diffTensionMult);

    if (this.tension >= TENSION.FAIL_THRESHOLD || this.getGripCount() === 0) {
      this.startFalling();
    }

    return {
      tension: this.tension,
      isFalling: this.isFalling,
      badPosture: this.badPosture,
      gripCount: this.getGripCount(),
    };
  }

  updateDynoMotion(dt) {
    this.dyno.timer += dt;
    this.bodyX += this.dyno.velocityX * dt;
    this.bodyY += this.dyno.velocityY * dt;
    this.dyno.velocityY += 820 * dt;

    for (const limbId of LIMB_IDS) {
      const limb = this.limbs[limbId];
      if (limb.holdId !== null || limb.isControlled) continue;
      const target = this.getDynoReachTarget(limbId);
      limb.x = lerp(limb.x, target.x, 0.2);
      limb.y = lerp(limb.y, target.y, 0.2);
    }

    if (this.dyno.timer >= DYNO.DURATION) {
      this.dyno.active = false;
      this.dyno.power = 0;
    }
  }

  updateBodyPosition() {
    const grippedLimbs = Object.entries(this.limbs).filter(([, limb]) => limb.holdId !== null);

    let targetX = this.bodyX;
    let targetY = this.bodyY;

    if (grippedLimbs.length >= 2) {
      const xs = grippedLimbs.map(([, limb]) => limb.x);
      const ys = grippedLimbs.map(([, limb]) => limb.y);
      targetX = xs.reduce((sum, value) => sum + value, 0) / xs.length;
      targetY = ys.reduce((sum, value) => sum + value, 0) / ys.length + 20;
    } else if (grippedLimbs.length === 1) {
      const [, limb] = grippedLimbs[0];
      targetX = limb.x;
      targetY = limb.y + 70;
    }

    const wobbleX = wobble(this.wobbleTime, 0.8, 2 + this.tension * 0.08);
    const wobbleY = wobble(this.wobbleTime, 1.1, 1 + this.tension * 0.04);

    this.bodyX = lerp(this.bodyX, targetX + wobbleX, DYNAMICS.BODY_LERP);
    this.bodyY = lerp(this.bodyY, targetY + wobbleY, DYNAMICS.BODY_LERP);
    this.headX = this.bodyX + wobble(this.wobbleTime, 0.6, 2.5);
    this.headY = this.bodyY - CHARACTER.BODY_LENGTH * 0.5 - CHARACTER.HEAD_RADIUS;
  }

  getDanglingTarget(limbId) {
    const anchor = this.getAnchor(limbId);
    const side = limbId.startsWith('left') ? -1 : 1;
    const isHand = limbId.includes('Hand');

    return {
      x: anchor.x + side * (isHand ? 8 : 10),
      y: anchor.y + (isHand ? 78 : 94),
    };
  }

  calculateStretch() {
    let maxStretch = 0;

    for (const limbId of LIMB_IDS) {
      const limb = this.limbs[limbId];
      const anchor = this.getAnchor(limbId);
      const reach = this.getReachForLimb(limbId);
      const stretch = distance(anchor.x, anchor.y, limb.x, limb.y) / reach;
      maxStretch = Math.max(maxStretch, stretch);
    }

    return clamp(maxStretch, 0, 1.2);
  }

  evaluateBadPosture() {
    const leftHand = this.limbs.leftHand;
    const rightHand = this.limbs.rightHand;
    const leftFoot = this.limbs.leftFoot;
    const rightFoot = this.limbs.rightFoot;

    const shoulderSpan = distance(leftHand.x, leftHand.y, rightHand.x, rightHand.y);
    const footSpan = distance(leftFoot.x, leftFoot.y, rightFoot.x, rightFoot.y);
    const crossedHands = leftHand.x > rightHand.x + 40;
    const crossedFeet = leftFoot.x > rightFoot.x + 30;

    return shoulderSpan > 250 || footSpan > 260 || crossedHands || crossedFeet || this.stretchFactor > 0.96;
  }

  updateTension(dt, holds, diffMult) {
    const gripCount = this.getGripCount();
    const danglingCount = this.getDanglingCount();
    const gripBonus = TENSION.GRIP_BONUS[gripCount] ?? TENSION.GRIP_BONUS[0];

    let tensionDelta = TENSION.BASE_INCREASE + gripBonus;

    if (this.stretchFactor > CHARACTER.STRETCH_WARN) {
      const stretchExtra = (this.stretchFactor - CHARACTER.STRETCH_WARN) /
        (CHARACTER.STRETCH_MAX - CHARACTER.STRETCH_WARN);
      tensionDelta += TENSION.STRETCH_INCREASE * clamp(stretchExtra, 0, 2);
    }

    tensionDelta += danglingCount * TENSION.DANGLING_PENALTY;

    if (this.badPosture) {
      tensionDelta += TENSION.BAD_POSTURE_PENALTY;
    }

    for (const limb of Object.values(this.limbs)) {
      if (limb.holdId !== null) {
        const hold = holds[limb.holdId];
        if (!hold) continue;
        tensionDelta *= hold.type.tensionMultiplier;
        if (hold.type.slipChance > 0 && Math.random() < hold.type.slipChance) {
          this.tension += 5;
        }
      }
    }

    if (gripCount >= 3 && !this.dyno.active && !this.controlledLimb && this.stretchFactor < CHARACTER.STRETCH_WARN) {
      tensionDelta -= TENSION.REST_DECREASE;
    }

    if (this.dyno.active) {
      tensionDelta += 0.25;
    }

    if (tensionDelta > 0) {
      tensionDelta *= diffMult;
    }

    this.tension = clamp(this.tension + tensionDelta, 0, TENSION.MAX);
  }

  startFalling() {
    this.isFalling = true;
    this.fallVelocity = 0;
    this.fallY = 0;
    this.dyno.active = false;
    this.dyno.charging = false;
    for (const limb of Object.values(this.limbs)) {
      limb.holdId = null;
      limb.isControlled = false;
      limb.isDangling = true;
    }
  }

  getHighestY() {
    const allY = Object.values(this.limbs).map((limb) => limb.y);
    allY.push(this.bodyY);
    return Math.min(...allY);
  }
}

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
