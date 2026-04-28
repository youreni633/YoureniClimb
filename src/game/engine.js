/**
 * QWER Climb - Game Engine (게임 엔진)
 * 게임의 핵심 로직을 통합 관리합니다.
 * - 팔다리 선택 → 방향키로 홀드 후보 선택 → Space로 잡기
 * - 긴장도 시스템, 추락 판정, 클리어 판정
 */

import { Character } from './character.js';
import { Renderer } from './renderer.js';
import { InputManager } from './inputManager.js';
import { ScoringSystem } from './scoring.js';
import { generateWall, generateTutorialWall } from './wallGenerator.js';
import {
  CANVAS_WIDTH, CANVAS_HEIGHT, CHARACTER, TENSION, LIMB,
  DIFFICULTY, TUTORIAL_STEPS, HOLD_TYPES,
} from './constants.js';
import { distance, findHoldsInDirection, clamp } from '../utils/helpers.js';

// 게임 상태 enum
export const GAME_STATE = {
  MENU: 'menu',
  DIFFICULTY_SELECT: 'difficultySelect',
  CONTROLS: 'controls',
  PLAYING: 'playing',
  TUTORIAL: 'tutorial',
  RESULT: 'result',
  FALLING: 'falling',
};

export class GameEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.input = new InputManager();
    this.character = new Character();
    this.scoring = new ScoringSystem();

    // 게임 상태
    this.state = GAME_STATE.MENU;
    this.difficulty = 'NORMAL';

    // 벽/홀드 데이터
    this.holds = [];
    this.wallHeight = 0;
    this.goalY = 0;
    this.startHolds = null;

    // 팔다리 선택 상태
    this.selectedLimb = null;     // 현재 선택된 팔다리 ID ('leftHand', 'rightHand', etc.)
    this.candidateHold = null;    // 방향키로 선택된 후보 홀드
    this.candidateIndex = 0;      // 같은 방향의 후보 중 현재 인덱스
    this.lastDirection = null;    // 마지막으로 누른 방향

    // 튜토리얼 상태
    this.tutorialStep = 0;
    this.tutorialMessage = '';
    this.tutorialWaitTimer = 0;
    this.tutorialCompleted = false;

    // UI 콜백 (외부에서 설정)
    this.onStateChange = null;
    this.onTutorialMessage = null;

    // 게임 루프
    this.lastTime = 0;
    this.running = false;

    // 추락 타이머
    this.fallTimer = 0;

    // 바인딩
    this._gameLoop = this._gameLoop.bind(this);
  }

  /** 게임 시작 (메뉴에서) */
  startFreeMode(difficultyKey) {
    this.difficulty = difficultyKey;
    const wallData = generateWall(difficultyKey);
    this._initGame(wallData);
    this.state = GAME_STATE.PLAYING;
    this._notifyStateChange();
  }

  /** 튜토리얼 시작 */
  startTutorial() {
    const wallData = generateTutorialWall();
    this._initGame(wallData);
    this.state = GAME_STATE.TUTORIAL;
    this.tutorialStep = 0;
    this.tutorialCompleted = false;
    this._showTutorialStep();
    this._notifyStateChange();
  }

  /** 게임 초기화 공통 로직 */
  _initGame(wallData) {
    this.holds = wallData.holds;
    this.wallHeight = wallData.wallHeight;
    this.goalY = wallData.goalY;
    this.startHolds = wallData.startHolds;

    // 캐릭터 초기화
    this.character.reset();
    this.character.initPosition(this.startHolds, this.holds);

    // 홀드 상태 초기화
    this.holds.forEach(h => {
      h.grabbed = false;
      h.grabbedBy = null;
    });

    // 시작 홀드 잡기
    this._setHoldGrabbed(this.startHolds.leftFoot, 'leftFoot');
    this._setHoldGrabbed(this.startHolds.rightFoot, 'rightFoot');
    this._setHoldGrabbed(this.startHolds.leftHand, 'leftHand');
    this._setHoldGrabbed(this.startHolds.rightHand, 'rightHand');

    // 선택 초기화
    this.selectedLimb = null;
    this.candidateHold = null;

    // 점수 초기화
    this.scoring.reset();

    // 카메라 초기 위치
    this.renderer.cameraY = Math.max(0, this.wallHeight - CANVAS_HEIGHT);
    this.renderer.targetCameraY = this.renderer.cameraY;

    // 추락 타이머
    this.fallTimer = 0;

    // 게임 루프 시작
    if (!this.running) {
      this.running = true;
      this.lastTime = performance.now();
      requestAnimationFrame(this._gameLoop);
    }
  }

  /** 게임 루프 */
  _gameLoop(timestamp) {
    if (!this.running) return;

    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05); // 최대 50ms
    this.lastTime = timestamp;

    // FALLING 상태에서도 입력 처리 (T/ESC만)
    if (this.state === GAME_STATE.FALLING) {
      if (this.input.wasJustPressed('t')) this._restart();
      if (this.input.wasJustPressed('Escape')) {
        this.state = GAME_STATE.MENU;
        this.running = false;
        this._notifyStateChange();
      }
    }

    // 입력 처리
    this._handleInput(dt);

    // 게임 로직 업데이트
    if (this.state === GAME_STATE.PLAYING || this.state === GAME_STATE.TUTORIAL) {
      this._updateGame(dt);
    } else if (this.state === GAME_STATE.FALLING) {
      this._updateFalling(dt);
    }

    // 렌더링
    this.renderer.update(dt);
    this.renderer.render({
      holds: this.holds,
      character: this.character,
      selectedLimb: this.selectedLimb,
      candidateHold: this.candidateHold,
      wallHeight: this.wallHeight,
      goalY: this.goalY,
      tension: this.character.tension,
    });

    // 입력 프레임 클리어
    this.input.clearFrame();

    requestAnimationFrame(this._gameLoop);
  }

  /** 입력 처리 */
  _handleInput(dt) {
    if (this.state !== GAME_STATE.PLAYING && this.state !== GAME_STATE.TUTORIAL) return;

    // 팔다리 선택 (Q/W/E/R)
    if (this.input.wasJustPressed('q')) {
      this._selectLimb('leftHand');
      if (this.state === GAME_STATE.TUTORIAL) this._checkTutorialAction('selectLeftHand');
    }
    if (this.input.wasJustPressed('w')) {
      this._selectLimb('rightHand');
      if (this.state === GAME_STATE.TUTORIAL) this._checkTutorialAction('selectRightHand');
    }
    if (this.input.wasJustPressed('e')) {
      this._selectLimb('leftFoot');
      if (this.state === GAME_STATE.TUTORIAL) this._checkTutorialAction('selectLeftFoot');
    }
    // R키: 항상 오른발 선택 (재시작은 T키 사용)
    if (this.input.wasJustPressed('r')) {
      this._selectLimb('rightFoot');
      if (this.state === GAME_STATE.TUTORIAL) this._checkTutorialAction('selectRightFoot');
    }

    // 방향키로 홀드 후보 선택
    if (this.selectedLimb) {
      if (this.input.wasJustPressed('ArrowUp')) this._findCandidate('up');
      if (this.input.wasJustPressed('ArrowDown')) this._findCandidate('down');
      if (this.input.wasJustPressed('ArrowLeft')) this._findCandidate('left');
      if (this.input.wasJustPressed('ArrowRight')) this._findCandidate('right');

      // Space로 잡기
      if (this.input.wasJustPressed(' ')) {
        this._grabCandidate();
      }
    }

    // T키: 재시작
    if (this.input.wasJustPressed('t')) {
      this._restart();
    }

    // ESC: 메뉴로
    if (this.input.wasJustPressed('Escape')) {
      this.state = GAME_STATE.MENU;
      this.running = false;
      this._notifyStateChange();
    }
  }

  /** 팔다리 선택 */
  _selectLimb(limbId) {
    this.selectedLimb = limbId;
    this.candidateHold = null;
    this.candidateIndex = 0;
    this.lastDirection = null;
  }

  /** 방향키로 후보 홀드 찾기 */
  _findCandidate(direction) {
    if (!this.selectedLimb) return;

    const limb = this.character.limbs[this.selectedLimb];
    const fromX = limb.x;
    const fromY = limb.y;

    // 도달 가능 거리 계산
    const isHand = this.selectedLimb.includes('Hand');
    const baseReach = isHand ? CHARACTER.MAX_REACH_HAND : CHARACTER.MAX_REACH_FOOT;

    // 후보 홀드 찾기 (현재 팔다리가 잡고 있는 홀드 제외)
    const candidates = findHoldsInDirection(fromX, fromY, this.holds, direction, baseReach + 50)
      .filter(h => {
        // 다른 팔다리가 잡고 있는 홀드는 제외
        if (h.grabbed && h.grabbedBy !== this.selectedLimb) return false;
        // 자기 자신이 잡고 있는 홀드 제외
        if (h.id === limb.holdId) return false;
        // 도달 가능 거리 체크
        const reach = baseReach + (h.type.reachBonus || 0);
        const dist = distance(this.character.bodyX, this.character.bodyY, h.x, h.y);
        return dist <= reach;
      });

    if (candidates.length === 0) {
      // 후보 없음 - 화면 흔들림으로 피드백
      this.renderer.shake(2);
      return;
    }

    // 같은 방향 연속 입력 시 다음 후보로
    if (direction === this.lastDirection && this.candidateHold) {
      this.candidateIndex = (this.candidateIndex + 1) % candidates.length;
    } else {
      this.candidateIndex = 0;
    }

    this.lastDirection = direction;
    this.candidateHold = candidates[this.candidateIndex];

    if (this.state === GAME_STATE.TUTORIAL) {
      this._checkTutorialAction('arrowUp');
    }
  }

  /** 후보 홀드 잡기 */
  _grabCandidate() {
    if (!this.selectedLimb || !this.candidateHold) {
      this.renderer.shake(3);
      return;
    }

    const limb = this.character.limbs[this.selectedLimb];
    const hold = this.candidateHold;

    // 이전 홀드 해제
    if (limb.holdId !== null) {
      const prevHold = this.holds[limb.holdId];
      if (prevHold) {
        prevHold.grabbed = false;
        prevHold.grabbedBy = null;
      }
    }

    // 새 홀드 잡기
    this.character.setLimbToHold(this.selectedLimb, hold);
    this._setHoldGrabbed(hold.id, this.selectedLimb);

    // 보너스 홀드 체크
    if (hold.typeKey === 'PURPLE' && !hold.visited) {
      this.scoring.recordBonusHold();
    }
    hold.visited = true;

    // 이동 기록
    this.scoring.recordMove();

    // 파티클 효과
    this.renderer.spawnGrabParticles(hold.x, hold.y, hold.type.color);

    // 선택 초기화
    this.candidateHold = null;
    this.selectedLimb = null;
    this.candidateIndex = 0;

    // 카메라 업데이트
    const highestY = this.character.getHighestY();
    this.renderer.setCameraTarget(highestY - 100, this.wallHeight);
    this.scoring.updateHeight(this.wallHeight, highestY);

    // 클리어 체크
    this._checkGoal();

    // 튜토리얼 체크
    if (this.state === GAME_STATE.TUTORIAL) {
      this._checkTutorialAction('grab');
      this._checkTutorialAction('grabAny');
      this._checkTutorialAction('moveFeet');
      this._checkTutorialAction('freeClimb');
    }
  }

  /** 홀드 상태를 잡힌 상태로 설정 */
  _setHoldGrabbed(holdId, limbId) {
    const hold = this.holds[holdId];
    if (hold) {
      hold.grabbed = true;
      hold.grabbedBy = limbId;
    }
  }

  /** 게임 업데이트 */
  _updateGame(dt) {
    const diffMult = DIFFICULTY[this.difficulty]?.tensionMultiplier || 1.0;
    const result = this.character.update(dt, this.holds, diffMult);

    // 긴장도에 따른 화면 효과
    if (result.tension > TENSION.CRITICAL_THRESHOLD) {
      this.renderer.shake(result.tension * 0.05);
    }

    // 추락 판정
    if (result.isFalling) {
      this.state = GAME_STATE.FALLING;
      this.fallTimer = 0;
      this.scoring.recordFall();
      this.renderer.spawnFallParticles(this.character.bodyX, this.character.bodyY);
      this.renderer.shake(10);
    }

    // 튜토리얼 타이머
    if (this.state === GAME_STATE.TUTORIAL && this.tutorialWaitTimer > 0) {
      this.tutorialWaitTimer -= dt * 1000;
      if (this.tutorialWaitTimer <= 0) {
        this._advanceTutorial();
      }
    }
  }

  /** 추락 중 업데이트 */
  _updateFalling(dt) {
    this.character.update(dt, this.holds);
    this.fallTimer += dt;

    // 2초 후 결과 화면으로
    if (this.fallTimer > 2) {
      this._showResult(false);
    }
  }

  /** 골 체크 */
  _checkGoal() {
    const highestY = this.character.getHighestY();
    if (highestY <= this.goalY + 40) {
      this.scoring.recordComplete();
      this._showResult(true);
    }
  }

  /** 결과 화면 표시 */
  _showResult(success) {
    this.state = GAME_STATE.RESULT;
    const scoreData = this.scoring.calculateScore();
    const grade = this.scoring.calculateGrade(scoreData.totalScore);

    this.resultData = {
      success,
      ...scoreData,
      grade,
    };

    this._notifyStateChange();
  }

  /** 재시작 */
  _restart() {
    if (this.state === GAME_STATE.TUTORIAL) {
      this.startTutorial();
    } else {
      this.startFreeMode(this.difficulty);
    }
  }

  /** 메뉴로 돌아가기 */
  goToMenu() {
    this.state = GAME_STATE.MENU;
    this.running = false;
    this._notifyStateChange();
  }

  // =====================
  //  튜토리얼 로직
  // =====================

  /** 현재 튜토리얼 단계 표시 */
  _showTutorialStep() {
    if (this.tutorialStep >= TUTORIAL_STEPS.length) {
      this.tutorialCompleted = true;
      this.tutorialMessage = '';
      if (this.onTutorialMessage) this.onTutorialMessage('');
      return;
    }

    const step = TUTORIAL_STEPS[this.tutorialStep];
    this.tutorialMessage = step.message;
    if (this.onTutorialMessage) this.onTutorialMessage(step.message);

    // 대기 시간이 있는 단계
    if (step.waitTime && !step.action) {
      this.tutorialWaitTimer = step.waitTime;
    }
  }

  /** 튜토리얼 액션 체크 */
  _checkTutorialAction(action) {
    if (this.tutorialStep >= TUTORIAL_STEPS.length) return;
    const step = TUTORIAL_STEPS[this.tutorialStep];

    if (step.action === action || step.action === 'freeClimb') {
      // 특수 체크: moveFeet는 양발 모두 이동해야 완료
      if (step.action === 'moveFeet') {
        // 단순화: 아무 발이나 움직이면 통과
      }
      this._advanceTutorial();
    }
  }

  /** 다음 튜토리얼 단계로 */
  _advanceTutorial() {
    this.tutorialStep++;
    this._showTutorialStep();
  }

  // =====================
  //  상태 변경 알림
  // =====================

  _notifyStateChange() {
    if (this.onStateChange) {
      this.onStateChange(this.state, this.resultData);
    }
  }

  /** 정리 */
  destroy() {
    this.running = false;
    this.input.destroy();
  }
}
