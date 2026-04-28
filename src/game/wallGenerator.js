/**
 * QWER Climb - Wall Generator
 * 볼더링 벽과 홀드를 생성합니다.
 */

import { HOLD_TYPES, WALL_MARGIN_X, CANVAS_WIDTH, DIFFICULTY } from './constants.js';
import { randInt, randFloat, weightedRandom } from '../utils/helpers.js';

/**
 * 벽에 배치할 홀드 배열을 생성합니다.
 * @param {string} difficultyKey - 'EASY', 'NORMAL', 'HARD'
 * @returns {{ holds: Array, wallHeight: number, goalY: number }}
 */
export function generateWall(difficultyKey) {
  const diff = DIFFICULTY[difficultyKey] || DIFFICULTY.NORMAL;
  const holdCount = randInt(diff.holdCount.min, diff.holdCount.max);
  const wallHeight = diff.wallHeight;
  const holds = [];

  const wallLeft = WALL_MARGIN_X;
  const wallRight = CANVAS_WIDTH - WALL_MARGIN_X;
  const wallWidth = wallRight - wallLeft;

  // 시작 홀드 4개 (캐릭터 초기 위치용, 하단)
  const startY = wallHeight - 40;
  const startSpacing = wallWidth / 5;
  
  // 왼발/오른발 시작
  holds.push(createHold(wallLeft + startSpacing * 1.5, startY, 'GREEN', holds.length));
  holds.push(createHold(wallLeft + startSpacing * 3.5, startY, 'GREEN', holds.length));
  // 왼손/오른손 시작 (발보다 약간 위)
  holds.push(createHold(wallLeft + startSpacing * 1.2, startY - 70, 'GREEN', holds.length));
  holds.push(createHold(wallLeft + startSpacing * 3.8, startY - 70, 'GREEN', holds.length));

  // 골 홀드 (꼭대기)
  const goalY = 60;
  holds.push(createHold(wallLeft + wallWidth * 0.3, goalY, 'PURPLE', holds.length));
  holds.push(createHold(wallLeft + wallWidth * 0.7, goalY, 'PURPLE', holds.length));

  // 중간 홀드 랜덤 생성 (경로가 연결되도록)
  const midHoldCount = holdCount - 6;
  const sectionHeight = (startY - 80 - goalY - 40) / midHoldCount;

  for (let i = 0; i < midHoldCount; i++) {
    const baseY = goalY + 60 + i * sectionHeight;
    const y = baseY + randFloat(-sectionHeight * 0.3, sectionHeight * 0.3);
    const x = wallLeft + 30 + randFloat(0, wallWidth - 60);

    const typeKey = weightedRandom(diff.holdTypes);
    holds.push(createHold(x, y, typeKey, holds.length));
  }

  // 연결성 보장: 각 홀드에서 150px 이내에 다른 홀드가 있는지 확인
  // 부족하면 중간에 추가
  ensureConnectivity(holds, wallLeft, wallRight, goalY, startY, diff);

  return {
    holds,
    wallHeight,
    goalY,
    startHolds: { 
      leftFoot: 0, 
      rightFoot: 1, 
      leftHand: 2, 
      rightHand: 3 
    },
  };
}

/**
 * 튜토리얼용 간단한 벽 생성
 */
export function generateTutorialWall() {
  const holds = [];
  const wallHeight = 700;
  const startY = wallHeight - 40;
  const goalY = 60;

  // 시작 위치
  holds.push(createHold(280, startY, 'GREEN', 0));       // 왼발
  holds.push(createHold(520, startY, 'GREEN', 1));       // 오른발
  holds.push(createHold(260, startY - 70, 'GREEN', 2));  // 왼손
  holds.push(createHold(540, startY - 70, 'GREEN', 3));  // 오른손

  // 경로 - 간단하고 직선적으로
  const pathHolds = [
    { x: 300, y: startY - 150, type: 'GREEN' },
    { x: 500, y: startY - 170, type: 'GREEN' },
    { x: 250, y: startY - 240, type: 'BLUE' },
    { x: 480, y: startY - 260, type: 'GREEN' },
    { x: 350, y: startY - 320, type: 'GREEN' },
    { x: 520, y: startY - 350, type: 'BLUE' },
    { x: 280, y: startY - 400, type: 'GREEN' },
    { x: 450, y: startY - 430, type: 'GREEN' },
    { x: 350, y: startY - 490, type: 'PURPLE' },
    { x: 500, y: startY - 510, type: 'GREEN' },
    { x: 300, y: startY - 560, type: 'GREEN' },
    { x: 450, y: startY - 590, type: 'GREEN' },
  ];

  pathHolds.forEach(h => {
    holds.push(createHold(h.x, h.y, h.type, holds.length));
  });

  // 골
  holds.push(createHold(350, goalY, 'PURPLE', holds.length));
  holds.push(createHold(450, goalY, 'PURPLE', holds.length));

  return {
    holds,
    wallHeight,
    goalY,
    startHolds: { leftFoot: 0, rightFoot: 1, leftHand: 2, rightHand: 3 },
  };
}

/** 홀드 객체 생성 */
function createHold(x, y, typeKey, index) {
  const type = HOLD_TYPES[typeKey];
  return {
    id: index,
    x: Math.round(x),
    y: Math.round(y),
    type,
    typeKey,
    grabbed: false,       // 현재 잡혀 있는지
    grabbedBy: null,      // 어떤 팔다리가 잡고 있는지
    visited: false,       // 한번이라도 잡혔는지
    shapeVariant: randInt(0, 3), // 홀드 모양 변형
    rotation: randFloat(-0.3, 0.3),
  };
}

/** 연결성 보장 - 고립된 구간에 홀드 추가 */
function ensureConnectivity(holds, wallLeft, wallRight, goalY, startY, diff) {
  const maxGap = 160;
  
  // Y축 기준으로 정렬해서 갭 확인
  const sorted = [...holds].sort((a, b) => a.y - b.y);
  
  for (let i = 0; i < sorted.length - 1; i++) {
    const gap = sorted[i + 1].y - sorted[i].y;
    if (Math.abs(gap) > maxGap) {
      // 중간에 홀드 추가
      const midY = (sorted[i].y + sorted[i + 1].y) / 2;
      const midX = wallLeft + 40 + randFloat(0, wallRight - wallLeft - 80);
      const typeKey = weightedRandom(diff.holdTypes);
      holds.push(createHold(midX, midY, typeKey, holds.length));
    }
  }
}
