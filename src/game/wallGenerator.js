/**
 * QWER Climb - Wall Generator
 * 시작 구간은 넉넉하고 위로 갈수록 드문 홀드 구성을 만듭니다.
 */

import { CANVAS_WIDTH, DIFFICULTY, HOLD_TYPES, WALL_MARGIN_X } from './constants.js';
import { randFloat, randInt, weightedRandom } from '../utils/helpers.js';

export function generateWall(difficultyKey) {
  const diff = DIFFICULTY[difficultyKey] || DIFFICULTY.NORMAL;
  const wallHeight = diff.wallHeight;
  const holds = [];
  const wallLeft = WALL_MARGIN_X;
  const wallRight = CANVAS_WIDTH - WALL_MARGIN_X;
  const wallWidth = wallRight - wallLeft;
  const startY = wallHeight - 55;
  const goalY = 60;

  createStartCluster(holds, wallLeft, wallWidth, startY);
  createBottomSupport(holds, wallLeft, wallWidth, wallHeight, diff);
  createClimbZones(holds, wallLeft, wallWidth, wallHeight, goalY, diff);
  ensureBottomMobility(holds, wallHeight, diff);
  addGoalHolds(holds, wallLeft, wallWidth, goalY);

  return {
    holds,
    wallHeight,
    goalY,
    startHolds: {
      leftFoot: 0,
      rightFoot: 1,
      leftHand: 2,
      rightHand: 3,
    },
  };
}

export function generateTutorialWall() {
  const holds = [];
  const wallHeight = 760;
  const goalY = 60;
  const startY = wallHeight - 55;

  createStartCluster(holds, WALL_MARGIN_X, CANVAS_WIDTH - WALL_MARGIN_X * 2, startY);

  const tutorialHolds = [
    { x: 280, y: startY - 80, type: 'GREEN' },
    { x: 360, y: startY - 115, type: 'GREEN' },
    { x: 460, y: startY - 95, type: 'GREEN' },
    { x: 530, y: startY - 145, type: 'BLUE' },
    { x: 320, y: startY - 190, type: 'GREEN' },
    { x: 420, y: startY - 220, type: 'BLUE' },
    { x: 520, y: startY - 255, type: 'GREEN' },
    { x: 360, y: startY - 310, type: 'GREEN' },
    { x: 500, y: startY - 360, type: 'PURPLE' },
    { x: 310, y: startY - 430, type: 'GREEN' },
    { x: 460, y: startY - 470, type: 'GREEN' },
    { x: 380, y: startY - 540, type: 'PURPLE' },
  ];

  tutorialHolds.forEach((hold) => {
    holds.push(createHold(hold.x, hold.y, hold.type, holds.length));
  });

  addGoalHolds(holds, WALL_MARGIN_X, CANVAS_WIDTH - WALL_MARGIN_X * 2, goalY);

  return {
    holds,
    wallHeight,
    goalY,
    startHolds: {
      leftFoot: 0,
      rightFoot: 1,
      leftHand: 2,
      rightHand: 3,
    },
  };
}

function createStartCluster(holds, wallLeft, wallWidth, startY) {
  const baseX = wallLeft + wallWidth * 0.5;
  const startLayout = [
    { x: baseX - 120, y: startY, type: 'GREEN' },
    { x: baseX + 120, y: startY, type: 'GREEN' },
    { x: baseX - 110, y: startY - 72, type: 'GREEN' },
    { x: baseX + 110, y: startY - 72, type: 'GREEN' },
    { x: baseX - 10, y: startY - 30, type: 'GREEN' },
    { x: baseX - 170, y: startY - 28, type: 'BLUE' },
    { x: baseX + 170, y: startY - 28, type: 'BLUE' },
    { x: baseX - 70, y: startY - 120, type: 'GREEN' },
    { x: baseX + 70, y: startY - 120, type: 'GREEN' },
    { x: baseX, y: startY - 165, type: 'BLUE' },
  ];

  startLayout.forEach((hold) => {
    holds.push(createHold(hold.x, hold.y, hold.type, holds.length));
  });
}

function createBottomSupport(holds, wallLeft, wallWidth, wallHeight, diff) {
  const zoneTop = wallHeight * 0.75;
  const extraCount = randInt(6, 9);

  for (let i = 0; i < extraCount; i++) {
    const x = wallLeft + 35 + randFloat(0, wallWidth - 70);
    const y = randFloat(zoneTop, wallHeight - 150);
    const type = weightedRandom(diff.zoneWeights.bottom);
    holds.push(createHold(x, y, type, holds.length));
  }
}

function createClimbZones(holds, wallLeft, wallWidth, wallHeight, goalY, diff) {
  const totalTarget = randInt(diff.holdCount.min, diff.holdCount.max);
  const remaining = Math.max(0, totalTarget - holds.length - 2);

  const bottomCount = Math.floor(remaining * 0.35);
  const middleCount = Math.floor(remaining * 0.42);
  const topCount = remaining - bottomCount - middleCount;

  const zones = [
    { count: bottomCount, yMin: wallHeight * 0.58, yMax: wallHeight * 0.75, weights: diff.zoneWeights.bottom, spacing: { min: 52, max: 86 } },
    { count: middleCount, yMin: wallHeight * 0.25, yMax: wallHeight * 0.58, weights: diff.zoneWeights.middle, spacing: { min: 74, max: 118 } },
    { count: topCount, yMin: goalY + 70, yMax: wallHeight * 0.25, weights: diff.zoneWeights.top, spacing: diff.topSpacing },
  ];

  zones.forEach((zone) => {
    const ys = distributeY(zone.count, zone.yMin, zone.yMax, zone.spacing.min, zone.spacing.max);
    ys.forEach((y) => {
      const x = wallLeft + 28 + randFloat(0, wallWidth - 56);
      const type = weightedRandom(zone.weights);
      holds.push(createHold(x, y, type, holds.length));
    });
  });
}

function addGoalHolds(holds, wallLeft, wallWidth, goalY) {
  holds.push(createHold(wallLeft + wallWidth * 0.32, goalY, 'PURPLE', holds.length));
  holds.push(createHold(wallLeft + wallWidth * 0.68, goalY, 'PURPLE', holds.length));
}

function ensureBottomMobility(holds, wallHeight, diff) {
  const bottomBand = holds
    .filter((hold) => hold.y >= wallHeight * 0.68)
    .sort((a, b) => b.y - a.y);

  for (let i = 0; i < bottomBand.length - 1; i++) {
    const current = bottomBand[i];
    const next = bottomBand[i + 1];
    const dist = Math.hypot(current.x - next.x, current.y - next.y);
    if (dist > 130) {
      holds.push(createHold(
        (current.x + next.x) / 2,
        (current.y + next.y) / 2,
        weightedRandom(diff.zoneWeights.bottom),
        holds.length
      ));
    }
  }
}

function createHold(x, y, typeKey, index) {
  return {
    id: index,
    x: Math.round(x),
    y: Math.round(y),
    type: HOLD_TYPES[typeKey],
    typeKey,
    grabbed: false,
    grabbedBy: null,
    visited: false,
    shapeVariant: randInt(0, 3),
    rotation: randFloat(-0.3, 0.3),
  };
}

function distributeY(count, yMin, yMax, spacingMin, spacingMax) {
  if (count <= 0) return [];

  const values = [];
  let current = yMax;

  for (let i = 0; i < count; i++) {
    values.push(current);
    current -= randFloat(spacingMin, spacingMax);
    if (current < yMin) {
      current = randFloat(yMin, yMax);
    }
  }

  return values;
}
