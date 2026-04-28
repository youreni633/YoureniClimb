/**
 * QWER Climb - Game Constants
 * 게임에서 사용되는 모든 상수를 정의합니다.
 */

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 900;

export const WALL_MARGIN_X = 80;
export const WALL_MARGIN_TOP = 60;
export const WALL_MARGIN_BOTTOM = 80;

export const HOLD_TYPES = {
  GREEN: {
    id: 'green',
    name: '초록 홀드',
    color: '#4ecdc4',
    glowColor: 'rgba(78, 205, 196, 0.4)',
    description: '쉬운 홀드',
    reachBonus: 24,
    tensionMultiplier: 0.82,
    slipChance: 0,
    scoreValue: 10,
    radius: 18,
  },
  BLUE: {
    id: 'blue',
    name: '파랑 홀드',
    color: '#3498db',
    glowColor: 'rgba(52, 152, 219, 0.4)',
    description: '일반 홀드',
    reachBonus: 8,
    tensionMultiplier: 1.0,
    slipChance: 0,
    scoreValue: 20,
    radius: 15,
  },
  RED: {
    id: 'red',
    name: '빨강 홀드',
    color: '#e74c3c',
    glowColor: 'rgba(231, 76, 60, 0.45)',
    description: '어려운 홀드',
    reachBonus: -18,
    tensionMultiplier: 1.3,
    slipChance: 0,
    scoreValue: 40,
    radius: 12,
  },
  YELLOW: {
    id: 'yellow',
    name: '노랑 홀드',
    color: '#f1c40f',
    glowColor: 'rgba(241, 196, 15, 0.45)',
    description: '미끄러운 홀드',
    reachBonus: 0,
    tensionMultiplier: 1.5,
    slipChance: 0.003,
    scoreValue: 30,
    radius: 16,
  },
  PURPLE: {
    id: 'purple',
    name: '보라 홀드',
    color: '#9b59b6',
    glowColor: 'rgba(155, 89, 182, 0.55)',
    description: '보너스 홀드',
    reachBonus: 0,
    tensionMultiplier: 1.08,
    slipChance: 0,
    scoreValue: 100,
    radius: 14,
  },
};

export const LIMB = {
  LEFT_HAND: { id: 'leftHand', key: 'q', label: '왼손', color: '#e74c3c', isHand: true },
  RIGHT_HAND: { id: 'rightHand', key: 'w', label: '오른손', color: '#3498db', isHand: true },
  LEFT_FOOT: { id: 'leftFoot', key: 'e', label: '왼발', color: '#2ecc71', isHand: false },
  RIGHT_FOOT: { id: 'rightFoot', key: 'r', label: '오른발', color: '#f39c12', isHand: false },
};

export const LIMB_IDS = Object.values(LIMB).map((limb) => limb.id);

export const CHARACTER = {
  HEAD_RADIUS: 16,
  BODY_LENGTH: 55,
  ARM_LENGTH: 78,
  LEG_LENGTH: 82,
  SHOULDER_OFFSET_X: 20,
  SHOULDER_OFFSET_Y: -20,
  HIP_OFFSET_X: 16,
  HIP_OFFSET_Y: 20,
  MAX_REACH_HAND: 155,
  MAX_REACH_FOOT: 145,
  CONTROL_MOVE_SPEED: 280,
  RELEASE_GRAB_RADIUS: 36,
  STRETCH_WARN: 0.74,
  STRETCH_MAX: 1.0,
};

export const DYNAMICS = {
  DANGLE_LERP: 0.18,
  LIMB_SNAP_SPEED: 7.0,
  BODY_LERP: 0.16,
};

export const TENSION = {
  MAX: 100,
  WARNING_THRESHOLD: 60,
  CRITICAL_THRESHOLD: 85,
  FAIL_THRESHOLD: 100,
  BASE_INCREASE: 0.45,
  STRETCH_INCREASE: 3.0,
  REST_DECREASE: 0.65,
  DANGLING_PENALTY: 1.6,
  BAD_POSTURE_PENALTY: 1.4,
  GRIP_BONUS: {
    4: -0.35,
    3: -0.18,
    2: 2.2,
    1: 6.2,
    0: 14.0,
  },
  MIN_STABLE_GRIPS: 2,
};

export const DIFFICULTY = {
  EASY: {
    id: 'easy',
    name: '쉬움',
    holdCount: { min: 24, max: 28 },
    wallHeight: 820,
    tensionMultiplier: 0.8,
    spacing: {
      bottom: { min: 64, max: 82 },
      middle: { min: 82, max: 104 },
      top: { min: 96, max: 122 },
    },
    lanes: { bottom: 6, middle: 6, top: 5 },
    rowHolds: { bottom: [2, 3], middle: [2, 2], top: [1, 2] },
    minHoldDistance: 64,
    zoneWeights: {
      bottom: { GREEN: 0.58, BLUE: 0.34, PURPLE: 0.08 },
      middle: { GREEN: 0.3, BLUE: 0.35, RED: 0.08, YELLOW: 0.12, PURPLE: 0.15 },
      top: { GREEN: 0.2, BLUE: 0.3, RED: 0.14, YELLOW: 0.16, PURPLE: 0.2 },
    },
  },
  NORMAL: {
    id: 'normal',
    name: '보통',
    holdCount: { min: 22, max: 26 },
    wallHeight: 1000,
    tensionMultiplier: 1.0,
    spacing: {
      bottom: { min: 72, max: 90 },
      middle: { min: 92, max: 116 },
      top: { min: 108, max: 136 },
    },
    lanes: { bottom: 6, middle: 6, top: 5 },
    rowHolds: { bottom: [2, 2], middle: [2, 2], top: [1, 2] },
    minHoldDistance: 70,
    zoneWeights: {
      bottom: { GREEN: 0.46, BLUE: 0.4, PURPLE: 0.14 },
      middle: { GREEN: 0.22, BLUE: 0.32, RED: 0.18, YELLOW: 0.16, PURPLE: 0.12 },
      top: { GREEN: 0.1, BLUE: 0.25, RED: 0.28, YELLOW: 0.22, PURPLE: 0.15 },
    },
  },
  HARD: {
    id: 'hard',
    name: '어려움',
    holdCount: { min: 20, max: 24 },
    wallHeight: 1200,
    tensionMultiplier: 1.22,
    spacing: {
      bottom: { min: 78, max: 98 },
      middle: { min: 104, max: 128 },
      top: { min: 126, max: 156 },
    },
    lanes: { bottom: 5, middle: 4, top: 4 },
    rowHolds: { bottom: [2, 2], middle: [1, 2], top: [1, 1] },
    minHoldDistance: 76,
    zoneWeights: {
      bottom: { GREEN: 0.4, BLUE: 0.42, PURPLE: 0.18 },
      middle: { GREEN: 0.14, BLUE: 0.26, RED: 0.27, YELLOW: 0.2, PURPLE: 0.13 },
      top: { GREEN: 0.05, BLUE: 0.18, RED: 0.34, YELLOW: 0.28, PURPLE: 0.15 },
    },
  },
};

export const SCORING = {
  TIME_BONUS: [
    { max: 60, score: 500 },
    { max: 120, score: 300 },
    { max: 180, score: 150 },
    { max: Infinity, score: 50 },
  ],
  MOVE_BONUS: [
    { max: 18, score: 450 },
    { max: 30, score: 280 },
    { max: 45, score: 120 },
    { max: Infinity, score: 30 },
  ],
  FALL_PENALTY: 300,
  NO_FALL_BONUS: 200,
  GRADES: [
    { min: 900, grade: 'S' },
    { min: 700, grade: 'A' },
    { min: 500, grade: 'B' },
    { min: 300, grade: 'C' },
    { min: 0, grade: 'F' },
  ],
};

export const FEEDBACK_MESSAGES = {
  MISS: ['헛손질!', '잡을 게 없어요!', '발이 놀고 있습니다'],
  BAD_POSTURE: ['그 자세는 인간이 아닙니다', '이건 스트레칭이 아니라 재난입니다'],
  LOW_GRIP: ['어어어 떨어진다', '기적의 한 손!', '한 팔다리로 버티는 중'],
  DYNO_FAIL: ['다이노 실패!', '잡을 게 없어요!', '허공에 악수했습니다'],
  DYNO_SUCCESS: ['이걸 잡네?', '기적의 한 손!', '벽이 너를 받아들였다'],
};

export const TUTORIAL_STEPS = [
  {
    message: 'QWER Climb에 오신 걸 환영합니다.\nQ/W/E/R을 누른 채로 팔다리를 직접 움직여 보세요.',
    action: null,
    waitTime: 2600,
  },
  {
    message: '[Q]를 누르고 방향키로 왼손을 움직인 뒤,\n[Q]를 떼서 근처 홀드를 잡아보세요.',
    action: 'leftHandRelease',
    key: 'q',
  },
  {
    message: '[W]도 같은 방식으로 움직여 보세요.',
    action: 'rightHandRelease',
    key: 'w',
  },
  {
    message: '[E], [R]로 발도 움직일 수 있습니다.\n최소 두 팔다리는 잡고 있어야 안정적입니다.',
    action: 'feetRelease',
    key: null,
  },
  {
    message: '[Space]를 누른 채 방향키를 눌러 다이노를 준비해보세요.',
    action: 'dynoCharge',
    key: ' ',
  },
  {
    message: '좋아요! 이제 위로 올라가 봅시다.',
    action: 'freeClimb',
    key: null,
  },
];

export const CAMERA = {
  FOLLOW_SPEED: 0.05,
  LOOK_AHEAD: 100,
  MARGIN_TOP: 200,
  MARGIN_BOTTOM: 300,
};

export const DYNO = {
  CHARGE_RATE: 0.75,
  MAX_POWER: 1.0,
  MIN_POWER: 0.2,
  BODY_SPEED: 450,
  UPWARD_BOOST: 110,
  DURATION: 0.55,
  GRAB_RADIUS: 46,
  TRAJECTORY_SCALE: 180,
  HOLD_WINDOW_START: 0.14,
  HOLD_WINDOW_END: 0.46,
};
