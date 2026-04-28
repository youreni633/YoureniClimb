/**
 * QWER Climb - Scoring System (점수 시스템)
 * 클리어 시간, 이동 횟수, 추락 여부 등을 기반으로 점수와 등급을 계산합니다.
 */

import { SCORING } from './constants.js';

export class ScoringSystem {
  constructor() {
    this.reset();
  }

  reset() {
    this.startTime = Date.now();
    this.moveCount = 0;
    this.fallCount = 0;
    this.bonusHoldsGrabbed = 0;
    this.maxHeight = 0;   // 도달한 최대 높이 (벽 하단에서의 거리)
    this.completed = false;
  }

  /** 이동 기록 */
  recordMove() {
    this.moveCount++;
  }

  /** 추락 기록 */
  recordFall() {
    this.fallCount++;
  }

  /** 보너스 홀드 잡기 기록 */
  recordBonusHold() {
    this.bonusHoldsGrabbed++;
  }

  /** 높이 갱신 */
  updateHeight(wallHeight, currentY) {
    const height = wallHeight - currentY;
    if (height > this.maxHeight) {
      this.maxHeight = height;
    }
  }

  /** 클리어 기록 */
  recordComplete() {
    this.completed = true;
  }

  /** 경과 시간 (초) */
  getElapsedSeconds() {
    return (Date.now() - this.startTime) / 1000;
  }

  /** 최종 점수 계산 */
  calculateScore() {
    const elapsed = this.getElapsedSeconds();

    // 1) 시간 보너스
    let timeScore = 0;
    for (const tier of SCORING.TIME_BONUS) {
      if (elapsed <= tier.max) {
        timeScore = tier.score;
        break;
      }
    }

    // 2) 이동 횟수 보너스
    let moveScore = 0;
    for (const tier of SCORING.MOVE_BONUS) {
      if (this.moveCount <= tier.max) {
        moveScore = tier.score;
        break;
      }
    }

    // 3) 추락 페널티 / 노추락 보너스
    let fallScore = 0;
    if (this.fallCount === 0) {
      fallScore = SCORING.NO_FALL_BONUS;
    } else {
      fallScore = -(this.fallCount * SCORING.FALL_PENALTY);
    }

    // 4) 보너스 홀드 점수
    const bonusScore = this.bonusHoldsGrabbed * 50;

    // 5) 클리어 보너스
    const clearBonus = this.completed ? 200 : 0;

    const totalScore = Math.max(0, timeScore + moveScore + fallScore + bonusScore + clearBonus);

    return {
      timeScore,
      moveScore,
      fallScore,
      bonusScore,
      clearBonus,
      totalScore,
      elapsed,
      moveCount: this.moveCount,
      fallCount: this.fallCount,
      bonusHoldsGrabbed: this.bonusHoldsGrabbed,
      completed: this.completed,
    };
  }

  /** 등급 계산 */
  calculateGrade(totalScore) {
    if (!this.completed) return 'F';
    for (const tier of SCORING.GRADES) {
      if (totalScore >= tier.min) {
        return tier.grade;
      }
    }
    return 'F';
  }
}
