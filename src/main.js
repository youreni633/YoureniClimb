/**
 * QWER Climb - Main Entry Point
 * 게임을 초기화하고 시작합니다.
 */

import { GameEngine } from './game/engine.js';
import { UIManager } from './ui/uiManager.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './game/constants.js';

// DOM 준비 후 초기화
function init() {
  const canvas = document.getElementById('gameCanvas');
  const overlay = document.getElementById('ui-overlay');

  if (!canvas || !overlay) {
    console.error('QWER Climb: Required DOM elements not found!');
    return;
  }

  // 캔버스 크기 설정
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  // 반응형 크기 조정
  function resize() {
    const maxW = window.innerWidth;
    const maxH = window.innerHeight;
    const scale = Math.min(maxW / CANVAS_WIDTH, maxH / CANVAS_HEIGHT);
    const w = Math.floor(CANVAS_WIDTH * scale);
    const h = Math.floor(CANVAS_HEIGHT * scale);

    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    overlay.style.width = `${w}px`;
    overlay.style.height = `${h}px`;
    overlay.style.left = `${(maxW - w) / 2}px`;
    overlay.style.top = `${(maxH - h) / 2}px`;
  }

  resize();
  window.addEventListener('resize', resize);

  // 게임 엔진 초기화
  const engine = new GameEngine(canvas);

  // UI 매니저 초기화
  const ui = new UIManager(overlay, engine);

  // 디버그 정보 (개발용)
  if (import.meta.env?.DEV) {
    window.__game = engine;
    console.log('🧗 QWER Climb initialized (dev mode)');
  }

  console.log('🧗 QWER Climb v1.0 - Ready!');
}

// DOM이 준비되면 시작
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
