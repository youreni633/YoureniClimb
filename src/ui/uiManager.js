/**
 * QWER Climb - UI Manager
 * HTML 기반 UI 오버레이를 관리합니다.
 * 시작 화면, HUD, 결과 화면 등
 */

import { GAME_STATE } from '../game/engine.js';
import { TENSION } from '../game/constants.js';
import { formatTime } from '../utils/helpers.js';

export class UIManager {
  constructor(overlayEl, engine) {
    this.overlay = overlayEl;
    this.engine = engine;

    // UI 상태 추적
    this.currentScreen = null;

    // HUD 요소 참조
    this.hudElements = {};

    // 초기 화면 표시
    this.showStartScreen();

    // 엔진 콜백 연결
    this.engine.onStateChange = (state, data) => this._onStateChange(state, data);
    this.engine.onTutorialMessage = (msg) => this._onTutorialMessage(msg);
  }

  /** 상태 변경 핸들러 */
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

  /** 튜토리얼 메시지 업데이트 */
  _onTutorialMessage(msg) {
    const el = this.overlay.querySelector('.tutorial-msg');
    if (el) {
      if (msg) {
        el.textContent = msg;
        el.style.display = 'block';
      } else {
        el.style.display = 'none';
      }
    }
  }

  // =====================
  //  시작 화면
  // =====================

  showStartScreen() {
    this.currentScreen = 'start';
    this.overlay.innerHTML = `
      <div class="start-screen">
        <div class="game-title">QWER Climb</div>
        <div class="game-subtitle">🧗 실내 볼더링 클라이밍 🧗</div>
        <button class="menu-btn" id="btn-tutorial">🎓 튜토리얼</button>
        <button class="menu-btn" id="btn-freemode">🏔️ 자유 모드</button>
        <button class="menu-btn secondary" id="btn-controls">🎮 조작법 보기</button>
      </div>
    `;

    this.overlay.querySelector('#btn-tutorial').onclick = () => {
      this.engine.startTutorial();
    };

    this.overlay.querySelector('#btn-freemode').onclick = () => {
      this.showDifficultySelect();
    };

    this.overlay.querySelector('#btn-controls').onclick = () => {
      this.showControlsScreen();
    };
  }

  // =====================
  //  난이도 선택 화면
  // =====================

  showDifficultySelect() {
    this.currentScreen = 'difficulty';
    this.overlay.innerHTML = `
      <div class="difficulty-select">
        <div class="difficulty-title">난이도 선택</div>
        <button class="diff-btn easy" data-diff="EASY">🟢 쉬움</button>
        <button class="diff-btn normal" data-diff="NORMAL">🔵 보통</button>
        <button class="diff-btn hard" data-diff="HARD">🔴 어려움</button>
        <button class="diff-btn back" id="btn-back">← 뒤로</button>
      </div>
    `;

    this.overlay.querySelectorAll('.diff-btn[data-diff]').forEach(btn => {
      btn.onclick = () => {
        const diff = btn.dataset.diff;
        this.engine.startFreeMode(diff);
      };
    });

    this.overlay.querySelector('#btn-back').onclick = () => {
      this.showStartScreen();
    };
  }

  // =====================
  //  조작법 화면
  // =====================

  showControlsScreen() {
    this.currentScreen = 'controls';
    this.overlay.innerHTML = `
      <div class="controls-overlay">
        <div class="controls-title">🎮 조작법</div>
        <div class="controls-grid">
          <span class="key-label key-q">Q</span>
          <span class="key-desc">왼손 선택</span>
          
          <span class="key-label key-w">W</span>
          <span class="key-desc">오른손 선택</span>
          
          <span class="key-label key-e">E</span>
          <span class="key-desc">왼발 선택</span>
          
          <span class="key-label key-r">R</span>
          <span class="key-desc">오른발 선택</span>
          
          <span class="key-label key-arrow">↑ ↓ ← →</span>
          <span class="key-desc">방향에 있는 홀드 후보 선택</span>
          
          <span class="key-label key-space">Space</span>
          <span class="key-desc">선택된 홀드 잡기</span>
          
          <span class="key-label key-t">T</span>
          <span class="key-desc">스테이지 재시작</span>
          
          <span class="key-label key-t">ESC</span>
          <span class="key-desc">메뉴로 돌아가기</span>
        </div>
        
        <div style="margin: 10px 0 20px; color: #888; text-align: center; max-width: 450px; line-height: 1.6;">
          <strong style="color: #ff6b35;">💡 플레이 방법:</strong><br>
          1. Q/W/E/R로 움직일 팔다리를 선택<br>
          2. 방향키로 잡을 홀드를 골라 (하이라이트)<br>
          3. Space로 잡기!<br>
          4. 반복해서 꼭대기까지 올라가세요!
        </div>
        
        <div style="margin-bottom: 20px;">
          <div style="display: flex; gap: 15px; flex-wrap: wrap; justify-content: center;">
            <span style="color: #4ecdc4;">🟢 쉬운 홀드</span>
            <span style="color: #3498db;">🔵 일반 홀드</span>
            <span style="color: #e74c3c;">🔴 어려운 홀드</span>
            <span style="color: #f1c40f;">🟡 미끄러운 홀드</span>
            <span style="color: #9b59b6;">🟣 보너스 홀드</span>
          </div>
        </div>
        
        <button class="menu-btn secondary" id="btn-back">← 뒤로</button>
      </div>
    `;

    this.overlay.querySelector('#btn-back').onclick = () => {
      this.showStartScreen();
    };
  }

  // =====================
  //  게임 HUD
  // =====================

  showGameHUD(isTutorial = false) {
    this.currentScreen = 'game';
    this.overlay.innerHTML = `
      <div class="game-hud">
        <div class="hud-left">
          <div class="hud-item">⏱️ 시간: <span class="value" id="hud-time">0:00</span></div>
          <div class="hud-item">🦶 이동: <span class="value" id="hud-moves">0</span></div>
        </div>
        <div class="hud-right">
          <div class="hud-item" style="font-size: 12px; color: #666;">ESC 메뉴 | T 재시작</div>
        </div>
      </div>
      
      <div class="tension-label">긴 장 도</div>
      <div class="tension-container">
        <div class="tension-fill" id="tension-fill" style="height: 0%"></div>
      </div>
      
      <div class="limb-hud">
        <div class="limb-key lh" id="limb-q">Q<span class="limb-name">왼손</span></div>
        <div class="limb-key rh" id="limb-w">W<span class="limb-name">오른손</span></div>
        <div class="limb-key lf" id="limb-e">E<span class="limb-name">왼발</span></div>
        <div class="limb-key rf" id="limb-r">R<span class="limb-name">오른발</span></div>
      </div>
      
      ${isTutorial ? '<div class="tutorial-msg" style="display:none;"></div>' : ''}
    `;

    this.hudElements = {
      time: this.overlay.querySelector('#hud-time'),
      moves: this.overlay.querySelector('#hud-moves'),
      tensionFill: this.overlay.querySelector('#tension-fill'),
      limbQ: this.overlay.querySelector('#limb-q'),
      limbW: this.overlay.querySelector('#limb-w'),
      limbE: this.overlay.querySelector('#limb-e'),
      limbR: this.overlay.querySelector('#limb-r'),
    };

    // HUD 업데이트 타이머 시작
    this._startHUDUpdate();
  }

  /** HUD 주기적 업데이트 */
  _startHUDUpdate() {
    if (this._hudInterval) clearInterval(this._hudInterval);
    
    this._hudInterval = setInterval(() => {
      if (this.currentScreen !== 'game') {
        clearInterval(this._hudInterval);
        return;
      }

      const engine = this.engine;
      if (!engine || engine.state === GAME_STATE.MENU) return;

      // 시간
      if (this.hudElements.time) {
        this.hudElements.time.textContent = formatTime(engine.scoring.getElapsedSeconds());
      }

      // 이동 횟수
      if (this.hudElements.moves) {
        this.hudElements.moves.textContent = engine.scoring.moveCount;
      }

      // 긴장도 게이지
      if (this.hudElements.tensionFill) {
        const pct = (engine.character.tension / TENSION.MAX) * 100;
        this.hudElements.tensionFill.style.height = `${pct}%`;

        // 색상 변경
        if (engine.character.tension > TENSION.CRITICAL_THRESHOLD) {
          this.hudElements.tensionFill.style.background = 
            'linear-gradient(to top, #ff6b6b, #ff0000)';
        } else if (engine.character.tension > TENSION.WARNING_THRESHOLD) {
          this.hudElements.tensionFill.style.background = 
            'linear-gradient(to top, #ffd93d, #ff6b6b)';
        } else {
          this.hudElements.tensionFill.style.background = 
            'linear-gradient(to top, #4ecdc4, #ffd93d, #ff6b6b)';
        }
      }

      // 선택된 팔다리 하이라이트
      const limbMap = {
        leftHand: this.hudElements.limbQ,
        rightHand: this.hudElements.limbW,
        leftFoot: this.hudElements.limbE,
        rightFoot: this.hudElements.limbR,
      };
      Object.entries(limbMap).forEach(([limbId, el]) => {
        if (el) {
          el.classList.toggle('active', engine.selectedLimb === limbId);
        }
      });
    }, 50); // 20fps UI 업데이트
  }

  // =====================
  //  결과 화면
  // =====================

  showResultScreen(data) {
    this.currentScreen = 'result';
    if (this._hudInterval) clearInterval(this._hudInterval);

    const { success, totalScore, grade, elapsed, moveCount, fallCount, bonusHoldsGrabbed } = data;

    this.overlay.innerHTML = `
      <div class="result-screen">
        <div class="result-status ${success ? 'success' : 'fail'}">
          ${success ? '🎉 클리어!' : '💀 추락!'}
        </div>
        
        <div class="result-grade grade-${grade}">${grade}</div>
        
        <div class="result-score">총점: ${totalScore}점</div>
        
        <div class="result-stats">
          <span class="stat-label">⏱️ 시간</span>
          <span class="stat-value">${formatTime(elapsed)}</span>
          
          <span class="stat-label">🦶 이동 횟수</span>
          <span class="stat-value">${moveCount}회</span>
          
          <span class="stat-label">💀 추락 횟수</span>
          <span class="stat-value">${fallCount}회</span>
          
          <span class="stat-label">🟣 보너스 홀드</span>
          <span class="stat-value">${bonusHoldsGrabbed}개</span>
        </div>
        
        <button class="menu-btn" id="btn-retry">🔄 다시하기</button>
        <button class="menu-btn secondary" id="btn-menu">🏠 메뉴로</button>
      </div>
    `;

    this.overlay.querySelector('#btn-retry').onclick = () => {
      if (this.engine.state === GAME_STATE.RESULT) {
        this.engine.startFreeMode(this.engine.difficulty);
      }
    };

    this.overlay.querySelector('#btn-menu').onclick = () => {
      this.engine.goToMenu();
    };
  }

  /** 정리 */
  destroy() {
    if (this._hudInterval) clearInterval(this._hudInterval);
  }
}
