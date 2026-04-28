/**
 * QWER Climb - Input Manager
 * 키보드 입력을 추적하고 프레임 단위 상태를 제공합니다.
 */

export class InputManager {
  constructor() {
    this.keys = {};
    this.justPressed = {};
    this.justReleased = {};
    this.callbacks = {};

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
  }

  _onKeyDown(e) {
    const gameKeys = ['q', 'w', 'e', 'r', 't', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Escape'];
    if (gameKeys.includes(e.key)) {
      e.preventDefault();
    }

    if (!this.keys[e.key]) {
      this.justPressed[e.key] = true;
    }
    this.keys[e.key] = true;

    const key = e.key.toLowerCase();
    if (this.callbacks[key]) this.callbacks[key](e);
    if (this.callbacks[e.key]) this.callbacks[e.key](e);
  }

  _onKeyUp(e) {
    if (this.keys[e.key]) {
      this.justReleased[e.key] = true;
    }
    this.keys[e.key] = false;
  }

  wasJustPressed(key) {
    return !!this.justPressed[key];
  }

  wasJustReleased(key) {
    return !!this.justReleased[key];
  }

  isPressed(key) {
    return !!this.keys[key];
  }

  getAxis() {
    let x = 0;
    let y = 0;
    if (this.isPressed('ArrowLeft')) x -= 1;
    if (this.isPressed('ArrowRight')) x += 1;
    if (this.isPressed('ArrowUp')) y -= 1;
    if (this.isPressed('ArrowDown')) y += 1;
    return { x, y };
  }

  clearFrame() {
    this.justPressed = {};
    this.justReleased = {};
  }

  on(key, callback) {
    this.callbacks[key] = callback;
  }

  clearCallbacks() {
    this.callbacks = {};
  }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
  }
}
