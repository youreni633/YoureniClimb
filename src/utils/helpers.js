/**
 * QWER Climb - Utility Functions
 * 공통 유틸리티 함수들
 */

/** 두 점 사이의 거리 계산 */
export function distance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/** 두 점 사이의 각도 계산 (라디안) */
export function angle(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

/** min~max 사이 랜덤 정수 */
export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** min~max 사이 랜덤 실수 */
export function randFloat(min, max) {
  return Math.random() * (max - min) + min;
}

/** 값을 min~max 범위로 제한 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/** 선형 보간 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** 가중치 기반 랜덤 선택 */
export function weightedRandom(weights) {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = Math.random() * total;
  for (const [key, weight] of entries) {
    r -= weight;
    if (r <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

/** 방향에 따른 홀드 필터링 및 정렬 */
export function findHoldsInDirection(fromX, fromY, holds, direction, maxDistance = 200) {
  const dirFilters = {
    up: (h) => h.y < fromY - 10,
    down: (h) => h.y > fromY + 10,
    left: (h) => h.x < fromX - 10,
    right: (h) => h.x > fromX + 10,
  };

  const filter = dirFilters[direction];
  if (!filter) return [];

  // 방향에 맞는 홀드만 필터링
  const candidates = holds.filter(h => {
    if (!filter(h)) return false;
    const dist = distance(fromX, fromY, h.x, h.y);
    return dist <= maxDistance;
  });

  // 방향별로 가장 가까운 순서로 정렬 (1차: 주요 방향, 2차: 거리)
  candidates.sort((a, b) => {
    const distA = distance(fromX, fromY, a.x, a.y);
    const distB = distance(fromX, fromY, b.x, b.y);
    
    // 주요 방향의 거리를 우선으로
    if (direction === 'up' || direction === 'down') {
      const primaryA = Math.abs(a.y - fromY);
      const primaryB = Math.abs(b.y - fromY);
      if (Math.abs(primaryA - primaryB) > 20) return primaryA - primaryB;
    } else {
      const primaryA = Math.abs(a.x - fromX);
      const primaryB = Math.abs(b.x - fromX);
      if (Math.abs(primaryA - primaryB) > 20) return primaryA - primaryB;
    }
    return distA - distB;
  });

  return candidates;
}

/** 시간 포맷팅 (초 -> mm:ss) */
export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** 부드러운 사인 웨이브 (우스꽝스러운 움직임용) */
export function wobble(time, frequency = 1, amplitude = 1) {
  return Math.sin(time * frequency * Math.PI * 2) * amplitude;
}

/** 배열에서 임의 요소 선택 */
export function sample(items) {
  if (!items.length) return null;
  return items[Math.floor(Math.random() * items.length)];
}

/** 범위 안 가장 가까운 홀드 찾기 */
export function findNearestHold(x, y, holds, radius, filter = () => true) {
  let nearest = null;
  let nearestDist = Infinity;

  for (const hold of holds) {
    if (!filter(hold)) continue;
    const dist = distance(x, y, hold.x, hold.y);
    if (dist <= radius && dist < nearestDist) {
      nearest = hold;
      nearestDist = dist;
    }
  }

  return nearest;
}
