/**
 * QWER Climb - Game Constants
 * 게임에서 사용되는 모든 상수를 정의합니다.
 */

// 캔버스 크기
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 900;

// 벽 설정
export const WALL_MARGIN_X = 80;
export const WALL_MARGIN_TOP = 60;
export const WALL_MARGIN_BOTTOM = 80;

// 홀드 타입 정의
export const HOLD_TYPES = {
  GREEN: {
    id: 'green',
    name: '초록 홀드',
    color: '#4ecdc4',
    glowColor: 'rgba(78, 205, 196, 0.4)',
    description: '쉬운 홀드',
    reachBonus: 30,       // 도달 가능 거리 보너스 (더 멀리서 잡을 수 있음)
    tensionMultiplier: 0.8, // 긴장도 증가 배율 (낮을수록 편안)
    slipChance: 0,         // 미끄러질 확률
    scoreValue: 10,
    radius: 18,
  },
  BLUE: {
    id: 'blue',
    name: '파랑 홀드',
    color: '#3498db',
    glowColor: 'rgba(52, 152, 219, 0.4)',
    description: '일반 홀드',
    reachBonus: 0,
    tensionMultiplier: 1.0,
    slipChance: 0,
    scoreValue: 20,
    radius: 15,
  },
  RED: {
    id: 'red',
    name: '빨강 홀드',
    color: '#e74c3c',
    glowColor: 'rgba(231, 76, 60, 0.4)',
    description: '어려운 홀드',
    reachBonus: -20,       // 도달 가능 거리 감소 (더 가까이 가야 잡을 수 있음)
    tensionMultiplier: 1.3,
    slipChance: 0,
    scoreValue: 40,
    radius: 12,
  },
  YELLOW: {
    id: 'yellow',
    name: '노랑 홀드',
    color: '#f1c40f',
    glowColor: 'rgba(241, 196, 15, 0.4)',
    description: '미끄러운 홀드',
    reachBonus: 10,
    tensionMultiplier: 1.8,  // 오래 잡으면 긴장도 빠르게 증가
    slipChance: 0.003,       // 매 프레임 미끄러질 작은 확률
    scoreValue: 30,
    radius: 16,
  },
  PURPLE: {
    id: 'purple',
    name: '보라 홀드',
    color: '#9b59b6',
    glowColor: 'rgba(155, 89, 182, 0.5)',
    description: '보너스 점수 홀드',
    reachBonus: 0,
    tensionMultiplier: 1.0,
    slipChance: 0,
    scoreValue: 100,
    radius: 14,
  },
};

// 팔다리 정의
export const LIMB = {
  LEFT_HAND: { id: 'leftHand', key: 'Q', label: '왼손', color: '#e74c3c', isHand: true },
  RIGHT_HAND: { id: 'rightHand', key: 'W', label: '오른손', color: '#3498db', isHand: true },
  LEFT_FOOT: { id: 'leftFoot', key: 'E', label: '왼발', color: '#2ecc71', isHand: false },
  RIGHT_FOOT: { id: 'rightFoot', key: 'R', label: '오른발', color: '#f39c12', isHand: false },
};

// 캐릭터 물리 설정
export const CHARACTER = {
  HEAD_RADIUS: 16,
  BODY_LENGTH: 55,
  ARM_LENGTH: 70,       // 팔 최대 길이
  LEG_LENGTH: 75,       // 다리 최대 길이
  MAX_REACH_HAND: 140,  // 손이 도달할 수 있는 최대 거리 (몸 중심 기준)
  MAX_REACH_FOOT: 130,  // 발이 도달할 수 있는 최대 거리 (몸 중심 기준)
  STRETCH_WARN: 0.75,   // 이 비율 이상 늘어나면 경고
  STRETCH_MAX: 1.0,     // 이 비율이면 최대 한계
};

// 긴장도 시스템
export const TENSION = {
  MAX: 100,                 // 최대 긴장도
  WARNING_THRESHOLD: 60,    // 경고 시작 수치
  CRITICAL_THRESHOLD: 85,   // 위험 수치 (화면 흔들림)
  FAIL_THRESHOLD: 100,      // 추락 수치
  BASE_INCREASE: 0.05,      // 기본 프레임당 증가량
  STRETCH_INCREASE: 0.15,   // 스트레칭에 의한 추가 증가
  REST_DECREASE: 0.08,      // 안정적일 때 감소량
  GRIP_BONUS: {             // 잡고 있는 팔다리 수에 따른 보정
    4: -0.1,    // 4개 다 잡고 있으면 긴장도 감소
    3: 0,       // 3개 안정적
    2: 0.2,     // 2개 불안정
    1: 0.5,     // 1개 매우 위험
    0: 2.0,     // 0개 바로 추락
  },
  MIN_GRIPS: 1,             // 최소 이 수 이상 잡고 있어야 함
};

// 난이도 설정
export const DIFFICULTY = {
  EASY: {
    id: 'easy',
    name: '쉬움',
    holdCount: { min: 35, max: 45 },
    holdSpacing: { min: 50, max: 90 },
    holdTypes: { GREEN: 0.4, BLUE: 0.3, RED: 0.05, YELLOW: 0.1, PURPLE: 0.15 },
    wallHeight: 800,
    tensionMultiplier: 0.7,
  },
  NORMAL: {
    id: 'normal',
    name: '보통',
    holdCount: { min: 28, max: 38 },
    holdSpacing: { min: 60, max: 110 },
    holdTypes: { GREEN: 0.2, BLUE: 0.35, RED: 0.2, YELLOW: 0.15, PURPLE: 0.1 },
    wallHeight: 1000,
    tensionMultiplier: 1.0,
  },
  HARD: {
    id: 'hard',
    name: '어려움',
    holdCount: { min: 22, max: 32 },
    holdSpacing: { min: 70, max: 140 },
    holdTypes: { GREEN: 0.1, BLUE: 0.25, RED: 0.3, YELLOW: 0.25, PURPLE: 0.1 },
    wallHeight: 1200,
    tensionMultiplier: 1.4,
  },
};

// 점수 시스템
export const SCORING = {
  // 시간 보너스 (초 단위)
  TIME_BONUS: [
    { max: 60, score: 500 },
    { max: 120, score: 300 },
    { max: 180, score: 150 },
    { max: Infinity, score: 50 },
  ],
  // 이동 횟수 보너스
  MOVE_BONUS: [
    { max: 20, score: 400 },
    { max: 35, score: 250 },
    { max: 50, score: 100 },
    { max: Infinity, score: 30 },
  ],
  FALL_PENALTY: 300,
  NO_FALL_BONUS: 200,
  // 등급 기준 (총점)
  GRADES: [
    { min: 900, grade: 'S' },
    { min: 700, grade: 'A' },
    { min: 500, grade: 'B' },
    { min: 300, grade: 'C' },
    { min: 0, grade: 'F' },
  ],
};

// 튜토리얼 단계
export const TUTORIAL_STEPS = [
  {
    message: '🧗 QWER Climb에 오신 걸 환영합니다!\n볼더링 벽을 올라가 보세요!',
    action: null,
    waitTime: 3000,
  },
  {
    message: '👈 [Q]를 눌러 왼손을 선택하세요!',
    action: 'selectLeftHand',
    key: 'q',
  },
  {
    message: '⬆️ 방향키 [↑]를 눌러 위쪽 홀드를 선택하세요!',
    action: 'arrowUp',
    key: 'ArrowUp',
  },
  {
    message: '✊ [Space]를 눌러 홀드를 잡으세요!',
    action: 'grab',
    key: ' ',
  },
  {
    message: '👉 [W]를 눌러 오른손을 선택하세요!',
    action: 'selectRightHand',
    key: 'w',
  },
  {
    message: '⬆️ 방향키 [↑]로 위쪽 홀드를 선택하고 [Space]로 잡으세요!',
    action: 'grabAny',
    key: null,
  },
  {
    message: '🦶 [E]로 왼발, [R]로 오른발을 선택하고\n같은 방식으로 발도 홀드에 올려보세요!',
    action: 'moveFeet',
    key: null,
  },
  {
    message: '⚡ 팔다리가 너무 멀어지면 긴장도가 올라갑니다!\n오른쪽 게이지를 확인하세요.',
    action: null,
    waitTime: 4000,
  },
  {
    message: '🏔️ 꼭대기까지 올라가면 클리어!\n자유롭게 올라가 보세요!',
    action: 'freeClimb',
    key: null,
  },
];

// 카메라 설정
export const CAMERA = {
  FOLLOW_SPEED: 0.05,      // 카메라가 캐릭터를 따라가는 속도
  LOOK_AHEAD: 100,         // 캐릭터 위쪽을 미리 보여주는 정도
  MARGIN_TOP: 200,         // 화면 상단 여백
  MARGIN_BOTTOM: 300,      // 화면 하단 여백
};
