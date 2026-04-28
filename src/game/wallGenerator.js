/**
 * QWER Climb - Wall Generator
 * 홀드가 겹치지 않도록 규칙적인 레인 간격으로 벽을 생성합니다.
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

  createStartCluster(holds, wallLeft, wallWidth, startY, Math.min(diff.minHoldDistance, 58));
  createStructuredZones(holds, wallLeft, wallRight, wallHeight, goalY, diff);
  addGoalHolds(holds, wallLeft, wallWidth, goalY, diff.minHoldDistance);

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
  const minDistance = 60;

  createStartCluster(holds, WALL_MARGIN_X, CANVAS_WIDTH - WALL_MARGIN_X * 2, startY, 58);

  const tutorialHolds = [
    { x: 300, y: startY - 82, type: 'GREEN' },
    { x: 400, y: startY - 110, type: 'GREEN' },
    { x: 500, y: startY - 96, type: 'GREEN' },
    { x: 360, y: startY - 188, type: 'GREEN' },
    { x: 460, y: startY - 214, type: 'BLUE' },
    { x: 320, y: startY - 288, type: 'GREEN' },
    { x: 430, y: startY - 316, type: 'BLUE' },
    { x: 530, y: startY - 352, type: 'GREEN' },
    { x: 360, y: startY - 430, type: 'GREEN' },
    { x: 480, y: startY - 462, type: 'PURPLE' },
    { x: 390, y: startY - 548, type: 'PURPLE' },
  ];

  tutorialHolds.forEach((hold) => {
    tryAddHold(holds, hold.x, hold.y, hold.type, minDistance);
  });

  addGoalHolds(holds, WALL_MARGIN_X, CANVAS_WIDTH - WALL_MARGIN_X * 2, goalY, minDistance);

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

function createStartCluster(holds, wallLeft, wallWidth, startY, minDistance) {
  const baseX = wallLeft + wallWidth * 0.5;
  const startLayout = [
    { x: baseX - 110, y: startY, type: 'GREEN' },
    { x: baseX + 110, y: startY, type: 'GREEN' },
    { x: baseX - 108, y: startY - 72, type: 'GREEN' },
    { x: baseX + 108, y: startY - 72, type: 'GREEN' },
    { x: baseX - 48, y: startY - 38, type: 'GREEN' },
    { x: baseX + 48, y: startY - 38, type: 'GREEN' },
    { x: baseX - 200, y: startY - 24, type: 'BLUE' },
    { x: baseX + 200, y: startY - 24, type: 'BLUE' },
    { x: baseX - 82, y: startY - 144, type: 'GREEN' },
    { x: baseX + 82, y: startY - 144, type: 'GREEN' },
  ];

  startLayout.forEach((hold) => {
    tryAddHold(holds, hold.x, hold.y, hold.type, minDistance);
  });
}

function createStructuredZones(holds, wallLeft, wallRight, wallHeight, goalY, diff) {
  const totalTarget = randInt(diff.holdCount.min, diff.holdCount.max);
  const remaining = Math.max(0, totalTarget - holds.length - 2);
  const quotas = {
    bottom: Math.round(remaining * 0.34),
    middle: Math.round(remaining * 0.42),
  };
  quotas.top = Math.max(0, remaining - quotas.bottom - quotas.middle);

  const pathState = {
    bottom: Math.floor(diff.lanes.bottom / 2),
    middle: Math.floor(diff.lanes.middle / 2),
    top: Math.floor(diff.lanes.top / 2),
  };

  const zones = [
    { name: 'bottom', yStart: wallHeight * 0.72, yEnd: wallHeight * 0.56 },
    { name: 'middle', yStart: wallHeight * 0.54, yEnd: wallHeight * 0.24 },
    { name: 'top', yStart: wallHeight * 0.22, yEnd: goalY + 86 },
  ];

  zones.forEach((zone) => {
    createZoneRows(holds, zone, quotas[zone.name], diff, wallLeft, wallRight, pathState);
  });
}

function createZoneRows(holds, zone, quota, diff, wallLeft, wallRight, pathState) {
  if (quota <= 0) return;

  const spacing = diff.spacing[zone.name];
  const [rowMin, rowMax] = diff.rowHolds[zone.name];
  const laneXs = buildLaneCenters(wallLeft, wallRight, diff.lanes[zone.name]);
  const minDistance = diff.minHoldDistance;
  let currentY = zone.yStart;
  let placed = 0;
  let rowIndex = 0;
  let activeLane = pathState[zone.name];

  while (placed < quota && currentY >= zone.yEnd) {
    activeLane = getNextLane(activeLane, laneXs.length, rowIndex);
    const rowQuota = quota - placed;
    const desiredCount = Math.min(rowQuota, randInt(rowMin, rowMax));
    const selectedLanes = pickRowLanes(activeLane, desiredCount, laneXs.length);

    let rowPlaced = 0;
    selectedLanes.forEach((laneIndex, index) => {
      const laneOrder = [laneIndex, laneIndex - 1, laneIndex + 1, laneIndex - 2, laneIndex + 2]
        .filter((candidate, candidateIndex, arr) =>
          candidate >= 0 && candidate < laneXs.length && arr.indexOf(candidate) === candidateIndex
        );

      for (const candidateLane of laneOrder) {
        const x = laneXs[candidateLane] + randFloat(-12, 12);
        const y = currentY + randFloat(-8, 8);
        const typeKey = weightedRandom(diff.zoneWeights[zone.name]);
        if (tryAddHold(holds, x, y, typeKey, minDistance)) {
          rowPlaced++;
          break;
        }
      }
    });

    if (rowPlaced > 0) {
      placed += rowPlaced;
      pathState[zone.name] = Math.round(
        selectedLanes.reduce((sum, lane) => sum + lane, 0) / selectedLanes.length
      );
    }

    currentY -= randFloat(spacing.min, spacing.max);
    rowIndex++;
  }
}

function addGoalHolds(holds, wallLeft, wallWidth, goalY, minDistance) {
  tryAddHold(holds, wallLeft + wallWidth * 0.36, goalY, 'PURPLE', minDistance);
  tryAddHold(holds, wallLeft + wallWidth * 0.64, goalY, 'PURPLE', minDistance);
}

function buildLaneCenters(wallLeft, wallRight, laneCount) {
  const sidePadding = 58;
  const usableLeft = wallLeft + sidePadding;
  const usableRight = wallRight - sidePadding;
  const usableWidth = usableRight - usableLeft;

  if (laneCount === 1) return [usableLeft + usableWidth / 2];

  return Array.from({ length: laneCount }, (_, index) =>
    usableLeft + usableWidth * (index / (laneCount - 1))
  );
}

function getNextLane(currentLane, laneCount, rowIndex) {
  const stepChoices = rowIndex % 2 === 0 ? [0, -1, 1] : [0, 1, -1];
  for (const step of stepChoices) {
    const next = currentLane + step;
    if (next >= 0 && next < laneCount) return next;
  }
  return Math.max(0, Math.min(laneCount - 1, currentLane));
}

function pickRowLanes(mainLane, count, laneCount) {
  const offsets = [0, -1, 1, -2, 2];
  const selected = [];

  for (const offset of offsets) {
    const lane = mainLane + offset;
    if (lane < 0 || lane >= laneCount) continue;
    if (!selected.includes(lane)) {
      selected.push(lane);
    }
    if (selected.length >= count) break;
  }

  return selected;
}

function tryAddHold(holds, x, y, typeKey, minDistance) {
  if (!canPlaceHold(holds, x, y, minDistance)) return false;

  holds.push(createHold(x, y, typeKey, holds.length));
  return true;
}

function canPlaceHold(holds, x, y, minDistance) {
  return holds.every((hold) => Math.hypot(hold.x - x, hold.y - y) >= minDistance);
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
