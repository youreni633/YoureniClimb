/**
 * QWER Climb - Input Manager (입력 관리)
 * 키보드 입력을 처리하고 게임 액션으로 변환합니다.
 */

export class InputManager {
  constructor() {
    this.keys = {};
    this.justPressed = {};
    this.callbacks = {};

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
  }

  /** 키 다운 처리 */
  _onKeyDown(e) {
    // 게임에서 사용하는 키만 기본 동작 방지
    const gameKeys = ['q', 'w', 'e', 'r', 't', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Escape'];
    if (gameKeys.includes(e.key)) {
      e.preventDefault();
    }

    if (!this.keys[e.key]) {
      this.justPressed[e.key] = true;
    }
    this.keys[e.key] = true;

    // 콜백 실행
    const key = e.key.toLowerCase();
    if (this.callbacks[key]) {
      this.callbacks[key](e);
    }
    if (this.callbacks[e.key]) {
      this.callbacks[e.key](e);
    }
  }

  /** 키 업 처리 */
  _onKeyUp(e) {
    this.keys[e.key] = false;
  }

  /** 이번 프레임에 방금 눌렸는지 확인 */
  wasJustPressed(key) {
    return !!this.justPressed[key];
  }

  /** 현재 눌려있는지 확인 */
  isPressed(key) {
    return !!this.keys[key];
  }

  /** 프레임 끝에 호출 - justPressed 초기화 */
  clearFrame() {
    this.justPressed = {};
  }

  /** 키 콜백 등록 */
  on(key, callback) {
    this.callbacks[key] = callback;
  }

  /** 모든 콜백 제거 */
  clearCallbacks() {
    this.callbacks = {};
  }

  /** 정리 */
  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
  }
}
