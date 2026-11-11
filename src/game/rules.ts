/**
 * Game rules, scoring, near-miss detection, and difficulty scaling
 */

export interface RunStats {
  score: number;
  distance: number;       // meters
  topSpeed: number;       // km/h
  driftPoints: number;
  nearMisses: number;
  coinsCollected: number;
  stage: number;
}

export interface TrafficVehicle {
  id: number;
  type: 'hatchback' | 'truck' | 'muscle';
  x: number;
  z: number;
  speed: number;          // m/s
  targetLaneX: number;
  width: number;
  length: number;
  color: string;
  isChangingLanes: boolean;
  laneChangeTimer: number;
  blinkerTimer: number;   // Visual telegraph
  blinkerSide: 'left' | 'right' | null;
}

export interface Collectible {
  id: number;
  type: 'nitro' | 'coin' | 'repair';
  x: number;
  z: number;
  collected: boolean;
  pulsePhase: number;
}

/**
 * Calculates score delta for a frame
 */
export function calculateFrameScore(
  speedMps: number,
  isDrifting: boolean,
  driftSlip: number,
  isNitro: boolean,
  dt: number
): { scoreInc: number; driftScoreInc: number } {
  // Speed converted to km/h
  const speedKmh = speedMps * 3.6;
  if (speedKmh < 10) return { scoreInc: 0, driftScoreInc: 0 };

  // Base speed points
  let scoreInc = (speedKmh * 0.35) * dt;

  let driftScoreInc = 0;
  if (isDrifting && speedKmh > 40) {
    driftScoreInc = (speedKmh * 2.0 * driftSlip) * dt;
    scoreInc += driftScoreInc;
  }

  if (isNitro) {
    scoreInc *= 1.5;
  }

  return {
    scoreInc: Math.round(scoreInc),
    driftScoreInc: Math.round(driftScoreInc),
  };
}

/**
 * Check if player performed a "Near Miss" overtake
 * Player passes close to traffic without colliding at high speed (> 80 km/h)
 */
export function checkNearMiss(
  player: { x: number; z: number; speed: number; width: number; length: number },
  traffic: TrafficVehicle,
  alreadyTriggeredSet: Set<number>
): boolean {
  if (alreadyTriggeredSet.has(traffic.id)) return false;
  const speedKmh = player.speed * 3.6;
  if (speedKmh < 75) return false;

  // Lateral distance within 1.2 to 2.8 meters
  const dx = Math.abs(player.x - traffic.x);
  const dz = Math.abs(player.z - traffic.z);

  const lateralNear = dx > (player.width / 2 + traffic.width / 2) && dx < 3.4;
  const longitudinalOverlap = dz < 2.0;

  if (lateralNear && longitudinalOverlap) {
    alreadyTriggeredSet.add(traffic.id);
    return true;
  }
  return false;
}

/**
 * Calculate difficulty parameters based on total distance traveled
 */
export function getDifficultyParams(distanceMeters: number): {
  trafficSpawnInterval: number; // meters between spawns
  maxTrafficCount: number;
  trafficSpeedMin: number;
  trafficSpeedMax: number;
  laneChangeChance: number;
  stage: number;
} {
  const stage = Math.floor(distanceMeters / 1500) + 1; // Stage advances every 1500m
  const progressRatio = Math.min(1, distanceMeters / 6000);

  return {
    trafficSpawnInterval: Math.max(22, 50 - progressRatio * 26),
    maxTrafficCount: Math.min(18, Math.floor(7 + progressRatio * 10)),
    trafficSpeedMin: 22 + progressRatio * 8, // ~80 to 110 km/h
    trafficSpeedMax: 35 + progressRatio * 10, // ~126 to 162 km/h
    laneChangeChance: 0.15 + progressRatio * 0.35,
    stage,
  };
}

/**
 * Resolves damage and speed loss upon crash
 */
export function resolveCollisionImpact(
  playerSpeed: number,
  trafficType: 'hatchback' | 'truck' | 'muscle'
): { damage: number; speedRetained: number; hitstopDuration: number } {
  let baseDamage = 20;
  let speedLossRatio = 0.5;
  let hitstop = 0.04;

  if (trafficType === 'truck') {
    baseDamage = 35;
    speedLossRatio = 0.75;
    hitstop = 0.08;
  } else if (trafficType === 'muscle') {
    baseDamage = 25;
    speedLossRatio = 0.55;
    hitstop = 0.05;
  }

  // Speed multiplier
  const speedRatio = Math.min(1.5, Math.max(0.5, playerSpeed / 40));
  const finalDamage = Math.round(baseDamage * speedRatio);
  const remainingSpeed = playerSpeed * (1 - speedLossRatio);

  return {
    damage: finalDamage,
    speedRetained: Math.max(5, remainingSpeed),
    hitstopDuration: hitstop,
  };
}
