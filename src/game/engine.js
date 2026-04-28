/**
 * QWER Climb - Game Engine
 * 직접 팔다리 조작과 다이노 중심의 게임 흐름을 관리합니다.
 */

import { Character } from './character.js';
import { Renderer } from './renderer.js';
import { InputManager } from './inputManager.js';
import { ScoringSystem } from './scoring.js';
import { generateTutorialWall, generateWall } from './wallGenerator.js';
import {
  CANVAS_HEIGHT,
  CHARACTER,
  DIFFICULTY,
  DYNO,
  FEEDBACK_MESSAGES,
  LIMB,
  LIMB_IDS,
  TENSION,
  TUTORIAL_STEPS,
} from './constants.js';
import { clamp, findNearestHold, sample } from '../utils/helpers.js';

export const GAME_STATE = {
  MENU: 'menu',
  PLAYING: 'playing',
  TUTORIAL: 'tutorial',
  RESULT: 'result',
  FALLING: 'falling',
};

const LIMB_KEY_TO_ID = {
  q: 'leftHand',
  w: 'rightHand',
  e: 'leftFoot',
  r: 'rightFoot',
};

export class GameEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.input = new InputManager();
    this.character = new Character();
    this.scoring = new ScoringSystem();

    this.state = GAME_STATE.MENU;
    this.difficulty = 'NORMAL';

    this.holds = [];
    this.wallHeight = 0;
    this.goalY = 0;
    this.startHolds = null;

    this.feedbackMessage = '';
    this.feedbackTimer = 0;
    this.warningMessage = '';
    this.warningTimer = 0;

    this.tutorialStep = 0;
    this.tutorialWaitTimer = 0;
    this.tutorialCompleted = false;

    this.onStateChange = null;
    this.onTutorialMessage = null;
    this.onFeedbackMessage = null;

    this.lastTime = 0;
    this.running = false;
    this.fallTimer = 0;
    this.resultData = null;

    this._gameLoop = this._gameLoop.bind(this);
  }

  startFreeMode(difficultyKey) {
    this.difficulty = difficultyKey;
    this._initGame(generateWall(difficultyKey));
    this.state = GAME_STATE.PLAYING;
    this._notifyStateChange();
  }

  startTutorial() {
    this._initGame(generateTutorialWall());
    this.state = GAME_STATE.TUTORIAL;
    this.tutorialStep = 0;
    this.tutorialCompleted = false;
    this._showTutorialStep();
    this._notifyStateChange();
  }

  _initGame(wallData) {
    this.holds = wallData.holds;
    this.wallHeight = wallData.wallHeight;
    this.goalY = wallData.goalY;
    this.startHolds = wallData.startHolds;
    this.feedbackMessage = '';
    this.warningMessage = '';
    this.feedbackTimer = 0;
    this.warningTimer = 0;

    this.character.reset();
    this.character.initPosition(this.startHolds, this.holds);

    this.holds.forEach((hold) => {
      hold.grabbed = false;
      hold.grabbedBy = null;
      hold.visited = false;
    });

    for (const [limbId, holdId] of Object.entries(this.startHolds)) {
      this._setHoldGrabbed(holdId, limbId);
    }

    this.scoring.reset();
    this.renderer.cameraY = Math.max(0, this.wallHeight - CANVAS_HEIGHT);
    this.renderer.targetCameraY = this.renderer.cameraY;
    this.fallTimer = 0;

    if (!this.running) {
      this.running = true;
      this.lastTime = performance.now();
      requestAnimationFrame(this._gameLoop);
    }
  }

  _gameLoop(timestamp) {
    if (!this.running) return;

    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    if (this.state === GAME_STATE.FALLING) {
      if (this.input.wasJustPressed('t')) this._restart();
      if (this.input.wasJustPressed('Escape')) {
        this.goToMenu();
      }
    }

    this._handleInput(dt);

    if (this.state === GAME_STATE.PLAYING || this.state === GAME_STATE.TUTORIAL) {
      this._updateGame(dt);
    } else if (this.state === GAME_STATE.FALLING) {
      this._updateFalling(dt);
    }

    this.renderer.update(dt);
    this.renderer.render({
      holds: this.holds,
      character: this.character,
      wallHeight: this.wallHeight,
      goalY: this.goalY,
      tension: this.character.tension,
      feedbackMessage: this.feedbackMessage,
      warningMessage: this.warningMessage,
      dynoHint: this.character.dyno.charging,
      controlledLimb: this.character.controlledLimb,
      activeGrabRadius: this.character.controlledLimb
        ? this.character.getGrabRadiusForLimb(this.character.controlledLimb)
        : 0,
    });

    this.input.clearFrame();
    requestAnimationFrame(this._gameLoop);
  }

  _handleInput(dt) {
    if (this.state !== GAME_STATE.PLAYING && this.state !== GAME_STATE.TUTORIAL) return;

    if (this.input.wasJustPressed('Escape')) {
      this.goToMenu();
      return;
    }

    if (this.input.wasJustPressed('t')) {
      this._restart();
      return;
    }

    this._handleLimbControl(dt);
    this._handleDyno(dt);
  }

  _handleLimbControl(dt) {
    for (const [key, limbId] of Object.entries(LIMB_KEY_TO_ID)) {
      if (this.input.wasJustPressed(key)) {
        this._beginLimbControl(limbId);
      }
      if (this.input.wasJustReleased(key)) {
        this._finishLimbControl(limbId);
      }
    }

    const activeLimb = this.character.controlledLimb;
    if (!activeLimb) return;

    const axis = this.input.getAxis();
    if (axis.x !== 0 || axis.y !== 0) {
      this.character.moveControlledLimb(activeLimb, axis.x, axis.y, dt);
      this.renderer.setCameraTarget(this.character.getHighestY() - 120, this.wallHeight);
    }
  }

  _handleDyno(dt) {
    const axis = this.input.getAxis();

    if (this.input.wasJustPressed(' ')) {
      this.character.startDynoCharge();
      this._setFeedback('Space + 방향키로 다이노 준비', 0.9);
      if (this.state === GAME_STATE.TUTORIAL) {
        this._checkTutorialAction('dynoCharge');
      }
    }

    if (this.character.dyno.charging) {
      this.character.updateDynoCharge(axis, dt);
      if (axis.x !== 0 || axis.y !== 0) {
        this._setWarning('방향키를 오래 누르면 더 멀리 뜁니다', 0.12);
      }

      const arrowReleased =
        (axis.x !== 0 || axis.y !== 0) &&
        (this.input.wasJustReleased('ArrowUp') || this.input.wasJustReleased('ArrowDown') ||
          this.input.wasJustReleased('ArrowLeft') || this.input.wasJustReleased('ArrowRight'));

      if (this.input.wasJustReleased(' ') || arrowReleased) {
        const launched = this.character.releaseDynoCharge();
        if (launched) {
          this._setFeedback('다이노!', 0.5);
        }
      }
    }

    if (this.character.canCatchDuringDyno()) {
      for (const [key, limbId] of Object.entries(LIMB_KEY_TO_ID)) {
        if (this.input.wasJustPressed(key)) {
          const success = this._attemptDynoCatch(limbId);
          if (success && this.character.getGripCount() >= 2) {
            this.character.dyno.active = false;
            this.character.dyno.power = 0;
          }
        }
      }
    }

    if (!this.character.dyno.active) return;

    if (!this.character.canCatchDuringDyno() && this.character.dyno.timer > DYNO.HOLD_WINDOW_END) {
      if (this.character.getGripCount() === 0) {
        this._setFeedback(sample(FEEDBACK_MESSAGES.DYNO_FAIL), 1.2);
        this.character.startFalling();
      } else if (this.character.getGripCount() === 1) {
        this._setFeedback(sample(FEEDBACK_MESSAGES.LOW_GRIP), 1.0);
      }
    }
  }

  _beginLimbControl(limbId) {
    if (this.character.isFalling || this.character.dyno.active) return;
    if (this.character.controlledLimb && this.character.controlledLimb !== limbId) return;

    const limb = this.character.limbs[limbId];
    if (limb.holdId !== null) {
      const previousHold = this.holds[limb.holdId];
      if (previousHold && previousHold.grabbedBy === limbId) {
        previousHold.grabbed = false;
        previousHold.grabbedBy = null;
      }
    }

    this.character.startLimbControl(limbId);
  }

  _finishLimbControl(limbId) {
    const limb = this.character.limbs[limbId];
    if (!limb.isControlled) return;

    const nearest = this._findClosestHoldForLimb(limbId, limb.x, limb.y);
    const success = this.character.releaseControlledLimb(limbId, nearest);

    if (success) {
      this._setHoldGrabbed(nearest.id, limbId);
      this._afterSuccessfulGrab(nearest, limbId);
    } else {
      this._setFeedback(sample(FEEDBACK_MESSAGES.MISS), 1.0);
    }

    if (this.state === GAME_STATE.TUTORIAL) {
      if (limbId === 'leftHand') this._checkTutorialAction('leftHandRelease');
      if (limbId === 'rightHand') this._checkTutorialAction('rightHandRelease');
      if (limbId === 'leftFoot' || limbId === 'rightFoot') this._checkTutorialAction('feetRelease');
    }
  }

  _attemptDynoCatch(limbId) {
    const target = this.character.getDynoReachTarget(limbId);
    const hold = findNearestHold(
      target.x,
      target.y,
      this.holds,
      DYNO.GRAB_RADIUS,
      (candidate) => !candidate.grabbed || candidate.grabbedBy === limbId
    );

    if (hold) {
      const existingHold = this.character.limbs[limbId].holdId;
      if (existingHold !== null) {
        this._clearHoldGrab(existingHold, limbId);
      }

      this.character.catchDuringDyno(limbId, hold);
      this._setHoldGrabbed(hold.id, limbId);
      this.renderer.spawnGrabParticles(hold.x, hold.y, hold.type.color);
      this._setFeedback(sample(FEEDBACK_MESSAGES.DYNO_SUCCESS), 0.9);
      this.scoring.recordMove();
      return true;
    }

    this.character.catchDuringDyno(limbId, null);
    this._setFeedback(sample(FEEDBACK_MESSAGES.DYNO_FAIL), 0.8);
    return false;
  }

  _findClosestHoldForLimb(limbId, x, y) {
    return findNearestHold(
      x,
      y,
      this.holds,
      this.character.getGrabRadiusForLimb(limbId),
      (hold) => !hold.grabbed || hold.grabbedBy === limbId
    );
  }

  _afterSuccessfulGrab(hold, limbId) {
    if (hold.typeKey === 'PURPLE' && !hold.visited) {
      this.scoring.recordBonusHold();
    }
    hold.visited = true;

    this.scoring.recordMove();
    this.renderer.spawnGrabParticles(hold.x, hold.y, hold.type.color);
    this.renderer.setCameraTarget(this.character.getHighestY() - 120, this.wallHeight);
    this.scoring.updateHeight(this.wallHeight, this.character.getHighestY());
    this._checkGoal();
  }

  _clearHoldGrab(holdId, limbId) {
    const hold = this.holds[holdId];
    if (hold && hold.grabbedBy === limbId) {
      hold.grabbed = false;
      hold.grabbedBy = null;
    }
  }

  _setHoldGrabbed(holdId, limbId) {
    const hold = this.holds[holdId];
    if (!hold) return;
    hold.grabbed = true;
    hold.grabbedBy = limbId;
  }

  _updateGame(dt) {
    const diffMult = DIFFICULTY[this.difficulty]?.tensionMultiplier || 1.0;
    const result = this.character.update(dt, this.holds, diffMult);

    if (result.tension > TENSION.CRITICAL_THRESHOLD) {
      this.renderer.shake(result.tension * 0.05);
    }

    if (result.badPosture) {
      this._setWarning(sample(FEEDBACK_MESSAGES.BAD_POSTURE), 0.2);
    } else if (result.gripCount <= 1) {
      this._setWarning(sample(FEEDBACK_MESSAGES.LOW_GRIP), 0.2);
    }

    if (result.isFalling) {
      this.state = GAME_STATE.FALLING;
      this.fallTimer = 0;
      this.scoring.recordFall();
      this.renderer.spawnFallParticles(this.character.bodyX, this.character.bodyY);
      this.renderer.shake(10);
      this._setFeedback('어어어 떨어진다', 1.4);
    }

    if (this.feedbackTimer > 0) {
      this.feedbackTimer -= dt;
      if (this.feedbackTimer <= 0) this._setFeedback('', 0);
    }

    if (this.warningTimer > 0) {
      this.warningTimer -= dt;
      if (this.warningTimer <= 0) this.warningMessage = '';
    }

    if (this.state === GAME_STATE.TUTORIAL && this.tutorialWaitTimer > 0) {
      this.tutorialWaitTimer -= dt * 1000;
      if (this.tutorialWaitTimer <= 0) this._advanceTutorial();
    }
  }

  _updateFalling(dt) {
    this.character.update(dt, this.holds);
    this.fallTimer += dt;
    if (this.fallTimer > 2) {
      this._showResult(false);
    }
  }

  _checkGoal() {
    if (this.character.getHighestY() <= this.goalY + 40) {
      this.scoring.recordComplete();
      this._showResult(true);
    }
  }

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

  _restart() {
    if (this.state === GAME_STATE.TUTORIAL) {
      this.startTutorial();
    } else {
      this.startFreeMode(this.difficulty);
    }
  }

  goToMenu() {
    this.state = GAME_STATE.MENU;
    this.running = false;
    this._notifyStateChange();
  }

  _showTutorialStep() {
    if (this.tutorialStep >= TUTORIAL_STEPS.length) {
      this.tutorialCompleted = true;
      if (this.onTutorialMessage) this.onTutorialMessage('');
      return;
    }

    const step = TUTORIAL_STEPS[this.tutorialStep];
    if (this.onTutorialMessage) this.onTutorialMessage(step.message);
    if (step.waitTime && !step.action) {
      this.tutorialWaitTimer = step.waitTime;
    }
  }

  _checkTutorialAction(action) {
    if (this.tutorialStep >= TUTORIAL_STEPS.length) return;
    const step = TUTORIAL_STEPS[this.tutorialStep];
    if (step.action === action || step.action === 'freeClimb') {
      this._advanceTutorial();
    }
  }

  _advanceTutorial() {
    this.tutorialStep++;
    this._showTutorialStep();
  }

  _notifyStateChange() {
    if (this.onStateChange) {
      this.onStateChange(this.state, this.resultData);
    }
  }

  _setFeedback(message, seconds = 1) {
    this.feedbackMessage = message;
    this.feedbackTimer = seconds;
    if (this.onFeedbackMessage) this.onFeedbackMessage(message);
  }

  _setWarning(message, seconds = 0.25) {
    this.warningMessage = message;
    this.warningTimer = seconds;
  }

  destroy() {
    this.running = false;
    this.input.destroy();
  }
}
