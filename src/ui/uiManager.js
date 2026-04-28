/**
 * QWER Climb - UI Manager
 * 메뉴, HUD, 결과 화면을 관리합니다.
 */

import { GAME_STATE } from '../game/engine.js';
import { TENSION } from '../game/constants.js';
import { formatTime } from '../utils/helpers.js';

export class UIManager {
  constructor(overlayEl, engine) {
    this.overlay = overlayEl;
    this.engine = engine;
    this.currentScreen = null;
    this.hudElements = {};
    this._hudInterval = null;

    this.showStartScreen();
    this.engine.onStateChange = (state, data) => this._onStateChange(state, data);
    this.engine.onTutorialMessage = (msg) => this._onTutorialMessage(msg);
  }

  _onStateChange(state, data) {
    switch (state) {
      case GAME_STATE.MENU:
        this.showStartScreen();
        break;
      case GAME_STATE.PLAYING:
      case GAME_STATE.TUTORIAL:
        this.showGameHUD(state === GAME_STATE.TUTORIAL);
        break;
      case GAME_STATE.RESULT:
        this.showResultScreen(data);
        break;
    }
  }

  _onTutorialMessage(msg) {
    const el = this.overlay.querySelector('.tutorial-msg');
    if (!el) return;
    if (msg) {
      el.textContent = msg;
      el.style.display = 'block';
    } else {
      el.style.display = 'none';
    }
  }

  showStartScreen() {
    this.currentScreen = 'start';
    this.overlay.innerHTML = `
      <div class="start-screen">
        <div class="game-title">QWER Climb</div>
        <div class="game-subtitle">직접 팔다리를 움직이는 볼더링 난장판</div>
        <button class="menu-btn" id="btn-tutorial">튜토리얼</button>
        <button class="menu-btn" id="btn-freemode">자유 모드</button>
        <button class="menu-btn secondary" id="btn-controls">새 조작법 보기</button>
      </div>
    `;

    this.overlay.querySelector('#btn-tutorial').onclick = () => this.engine.startTutorial();
    this.overlay.querySelector('#btn-freemode').onclick = () => this.showDifficultySelect();
    this.overlay.querySelector('#btn-controls').onclick = () => this.showControlsScreen();
  }

  showDifficultySelect() {
    this.currentScreen = 'difficulty';
    this.overlay.innerHTML = `
      <div class="difficulty-select">
        <div class="difficulty-title">난이도 선택</div>
        <button class="diff-btn easy" data-diff="EASY">쉬움</button>
        <button class="diff-btn normal" data-diff="NORMAL">보통</button>
        <button class="diff-btn hard" data-diff="HARD">어려움</button>
        <button class="diff-btn back" id="btn-back">뒤로</button>
      </div>
    `;

    this.overlay.querySelectorAll('.diff-btn[data-diff]').forEach((btn) => {
      btn.onclick = () => this.engine.startFreeMode(btn.dataset.diff);
    });
    this.overlay.querySelector('#btn-back').onclick = () => this.showStartScreen();
  }

  showControlsScreen() {
    this.currentScreen = 'controls';
    this.overlay.innerHTML = `
      <div class="controls-overlay">
        <div class="controls-title">직접 조작법</div>
        <div class="controls-grid">
          <span class="key-label key-q">Q</span><span class="key-desc">왼손을 떼고 누른 채 직접 이동</span>
          <span class="key-label key-w">W</span><span class="key-desc">오른손을 떼고 누른 채 직접 이동</span>
          <span class="key-label key-e">E</span><span class="key-desc">왼발을 떼고 누른 채 직접 이동</span>
          <span class="key-label key-r">R</span><span class="key-desc">오른발을 떼고 누른 채 직접 이동</span>
          <span class="key-label key-arrow">↑↓←→</span><span class="key-desc">선택된 팔다리 이동 / 다이노 방향 지정</span>
          <span class="key-label key-space">Space</span><span class="key-desc">다이노 준비 후 발사</span>
          <span class="key-label key-t">T</span><span class="key-desc">스테이지 재시작</span>
          <span class="key-label key-t">ESC</span><span class="key-desc">메뉴로 돌아가기</span>
        </div>

        <div style="margin: 12px 0 20px; color: #bbb; text-align: center; max-width: 520px; line-height: 1.7;">
          <strong style="color: #ff6b35;">핵심 흐름</strong><br>
          1. Q/W/E/R 중 하나를 누르면 해당 팔다리가 홀드에서 떨어집니다.<br>
          2. 누른 상태에서 방향키로 직접 움직입니다.<br>
          3. 키를 떼면 주변 반경 안에서 가장 가까운 홀드를 자동으로 잡습니다.<br>
          4. 못 잡으면 축 늘어지고, 두 개 이하만 잡고 있으면 매우 위험합니다.<br>
          5. Space + 방향키로 다이노를 충전하고, 공중에서는 Q/W/E/R 타이밍 잡기로 버팁니다.
        </div>

        <button class="menu-btn secondary" id="btn-back">뒤로</button>
      </div>
    `;

    this.overlay.querySelector('#btn-back').onclick = () => this.showStartScreen();
  }

  showGameHUD(isTutorial = false) {
    this.currentScreen = 'game';
    this.overlay.innerHTML = `
      <div class="game-hud">
        <div class="hud-left">
          <div class="hud-item">시간: <span class="value" id="hud-time">0:00</span></div>
          <div class="hud-item">이동: <span class="value" id="hud-moves">0</span></div>
        </div>
        <div class="hud-right">
          <div class="hud-item" id="hud-status" style="font-size: 12px; color: #aaa;">
            QWER 직접 이동 | Space 다이노
          </div>
        </div>
      </div>

      <div class="tension-label">긴장도</div>
      <div class="tension-container">
        <div class="tension-fill" id="tension-fill" style="height: 0%"></div>
      </div>

      <div class="limb-hud">
        <div class="limb-key lh" id="limb-q">Q<span class="limb-name">왼손</span></div>
        <div class="limb-key rh" id="limb-w">W<span class="limb-name">오른손</span></div>
        <div class="limb-key lf" id="limb-e">E<span class="limb-name">왼발</span></div>
        <div class="limb-key rf" id="limb-r">R<span class="limb-name">오른발</span></div>
      </div>

      <div class="dyno-help">Space + 방향키로 다이노, 공중에서 QWER로 잡기</div>
      ${isTutorial ? '<div class="tutorial-msg" style="display:none;"></div>' : ''}
    `;

    this.hudElements = {
      time: this.overlay.querySelector('#hud-time'),
      moves: this.overlay.querySelector('#hud-moves'),
      tensionFill: this.overlay.querySelector('#tension-fill'),
      status: this.overlay.querySelector('#hud-status'),
      limbQ: this.overlay.querySelector('#limb-q'),
      limbW: this.overlay.querySelector('#limb-w'),
      limbE: this.overlay.querySelector('#limb-e'),
      limbR: this.overlay.querySelector('#limb-r'),
    };

    this._startHUDUpdate();
  }

  _startHUDUpdate() {
    if (this._hudInterval) clearInterval(this._hudInterval);

    this._hudInterval = setInterval(() => {
      if (this.currentScreen !== 'game') {
        clearInterval(this._hudInterval);
        return;
      }

      const engine = this.engine;
      if (!engine || engine.state === GAME_STATE.MENU) return;

      if (this.hudElements.time) {
        this.hudElements.time.textContent = formatTime(engine.scoring.getElapsedSeconds());
      }

      if (this.hudElements.moves) {
        this.hudElements.moves.textContent = engine.scoring.moveCount;
      }

      if (this.hudElements.tensionFill) {
        const pct = (engine.character.tension / TENSION.MAX) * 100;
        this.hudElements.tensionFill.style.height = `${pct}%`;

        if (engine.character.tension > TENSION.CRITICAL_THRESHOLD) {
          this.hudElements.tensionFill.style.background = 'linear-gradient(to top, #ff6b6b, #ff0000)';
        } else if (engine.character.tension > TENSION.WARNING_THRESHOLD) {
          this.hudElements.tensionFill.style.background = 'linear-gradient(to top, #ffd93d, #ff6b6b)';
        } else {
          this.hudElements.tensionFill.style.background = 'linear-gradient(to top, #4ecdc4, #ffd93d, #ff6b6b)';
        }
      }

      if (this.hudElements.status) {
        if (engine.character.dyno.active) {
          this.hudElements.status.textContent = '공중이다! QWER로 홀드를 낚아채세요';
        } else if (engine.character.dyno.charging) {
          this.hudElements.status.textContent = '다이노 충전 중... 방향키를 오래 누르세요';
        } else if (engine.character.controlledLimb) {
          this.hudElements.status.textContent = '방향키로 팔다리 직접 이동, 키를 떼면 자동 잡기';
        } else {
          this.hudElements.status.textContent = 'QWER 직접 이동 | Space 다이노';
        }
      }

      const limbMap = {
        leftHand: this.hudElements.limbQ,
        rightHand: this.hudElements.limbW,
        leftFoot: this.hudElements.limbE,
        rightFoot: this.hudElements.limbR,
      };

      Object.entries(limbMap).forEach(([limbId, el]) => {
        if (!el) return;
        el.classList.toggle('active', engine.character.controlledLimb === limbId);
        const dynoCatchWindow = engine.character.canCatchDuringDyno?.();
        el.classList.toggle('pulse', Boolean(dynoCatchWindow && engine.character.dyno.active));
      });
    }, 50);
  }

  showResultScreen(data) {
    this.currentScreen = 'result';
    if (this._hudInterval) clearInterval(this._hudInterval);

    const { success, totalScore, grade, elapsed, moveCount, fallCount, bonusHoldsGrabbed } = data;
    this.overlay.innerHTML = `
      <div class="result-screen">
        <div class="result-status ${success ? 'success' : 'fail'}">
          ${success ? '클리어!' : '추락!'}
        </div>
        <div class="result-grade grade-${grade}">${grade}</div>
        <div class="result-score">총점: ${totalScore}점</div>
        <div class="result-stats">
          <span class="stat-label">시간</span><span class="stat-value">${formatTime(elapsed)}</span>
          <span class="stat-label">이동 횟수</span><span class="stat-value">${moveCount}회</span>
          <span class="stat-label">추락 횟수</span><span class="stat-value">${fallCount}회</span>
          <span class="stat-label">보너스 홀드</span><span class="stat-value">${bonusHoldsGrabbed}개</span>
        </div>
        <button class="menu-btn" id="btn-retry">다시 하기</button>
        <button class="menu-btn secondary" id="btn-menu">메뉴로</button>
      </div>
    `;

    this.overlay.querySelector('#btn-retry').onclick = () => {
      if (this.engine.state === GAME_STATE.RESULT) {
        this.engine.startFreeMode(this.engine.difficulty);
      }
    };
    this.overlay.querySelector('#btn-menu').onclick = () => this.engine.goToMenu();
  }

  destroy() {
    if (this._hudInterval) clearInterval(this._hudInterval);
  }
}
