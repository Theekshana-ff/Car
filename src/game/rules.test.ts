import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateFrameScore,
  checkNearMiss,
  getDifficultyParams,
  resolveCollisionImpact,
  TrafficVehicle,
} from './rules.ts';
import {
  stepCarPhysics,
  checkAABBCollision,
  PHYSICS_CONFIG,
  CarState,
} from './physics.ts';

test('calculateFrameScore accumulates higher score at higher speed and drift', () => {
  const lowSpeed = calculateFrameScore(10, false, 0, false, 0.1);
  const highSpeed = calculateFrameScore(50, false, 0, false, 0.1);
  assert.ok(highSpeed.scoreInc > lowSpeed.scoreInc, 'High speed should score more than low speed');

  const drifting = calculateFrameScore(50, true, 0.8, false, 0.1);
  assert.ok(drifting.driftScoreInc > 0, 'Drift score should be greater than zero when drifting');
  assert.ok(drifting.scoreInc > highSpeed.scoreInc, 'Drifting should boost total score increment');

  const nitro = calculateFrameScore(50, false, 0, true, 0.1);
  assert.ok(nitro.scoreInc > highSpeed.scoreInc, 'Nitro should provide a score multiplier');
});

test('checkNearMiss detects close overtaking without overlapping collision', () => {
  const triggered = new Set<number>();
  const player = { x: 3.5, z: 100, speed: 30, width: 2.1, length: 4.5 };
  const traffic: TrafficVehicle = {
    id: 101,
    type: 'hatchback',
    x: 6.0, // dx = 2.5 meters apart (within lateral 1.2 to 3.4 threshold)
    z: 101, // dz = 1 meter apart (close longitudinal)
    speed: 20,
    targetLaneX: 6.0,
    width: 2.0,
    length: 4.2,
    color: '#ff0000',
    isChangingLanes: false,
    laneChangeTimer: 0,
    blinkerTimer: 0,
    blinkerSide: null,
  };

  const isNear = checkNearMiss(player, traffic, triggered);
  assert.equal(isNear, true, 'Should trigger near-miss for close pass');
  assert.ok(triggered.has(101), 'Traffic ID should be recorded in triggered set');

  // Second pass should not trigger again
  const secondCheck = checkNearMiss(player, traffic, triggered);
  assert.equal(secondCheck, false, 'Should not re-trigger same traffic vehicle');
});

test('getDifficultyParams increases speed and traffic density with distance', () => {
  const startDiff = getDifficultyParams(0);
  const laterDiff = getDifficultyParams(4000);

  assert.equal(startDiff.stage, 1);
  assert.ok(laterDiff.stage >= 3, 'Stage should advance as distance increases');
  assert.ok(laterDiff.trafficSpeedMin >= startDiff.trafficSpeedMin, 'Minimum traffic speed should increase');
  assert.ok(laterDiff.maxTrafficCount >= startDiff.maxTrafficCount, 'Max traffic count should increase');
});

test('resolveCollisionImpact applies higher damage for heavy trucks', () => {
  const carImpact = resolveCollisionImpact(40, 'hatchback');
  const truckImpact = resolveCollisionImpact(40, 'truck');

  assert.ok(truckImpact.damage > carImpact.damage, 'Truck impact should cause more damage than hatchback');
  assert.ok(truckImpact.hitstopDuration >= carImpact.hitstopDuration, 'Truck hitstop should be longer or equal');
  assert.ok(truckImpact.speedRetained < carImpact.speedRetained, 'Truck should scrub more speed');
});

test('checkAABBCollision accurately detects overlapping and separate boxes', () => {
  const box1 = { x: 0, z: 0, width: 2, length: 4 };
  const boxOverlap = { x: 1, z: 1, width: 2, length: 4 };
  const boxAway = { x: 10, z: 10, width: 2, length: 4 };

  assert.equal(checkAABBCollision(box1, boxOverlap), true, 'Overlapping boxes should collide');
  assert.equal(checkAABBCollision(box1, boxAway), false, 'Separated boxes should not collide');
});

test('stepCarPhysics accelerates on throttle and clamps to road boundaries', () => {
  const initialCar: CarState = {
    x: 0,
    z: 0,
    speed: 0,
    steerAngle: 0,
    heading: 0,
    driftSlip: 0,
    isDrifting: false,
    nitroRemaining: 100,
    isNitroActive: false,
    health: 100,
    invulnerableTimer: 0,
  };

  // Accelerate
  const accelerated = stepCarPhysics(
    initialCar,
    { throttle: 1, brake: 0, steer: 0, handbrake: false, nitro: false },
    0.05
  );
  assert.ok(accelerated.speed > 0, 'Car speed should increase with throttle');
  assert.ok(accelerated.z > 0, 'Car Z position should advance');

  // Steer all the way right and check road clamping
  let farCar = { ...accelerated, x: PHYSICS_CONFIG.ROAD_HALF_WIDTH - 0.1 };
  const clampedCar = stepCarPhysics(
    farCar,
    { throttle: 1, brake: 0, steer: 1, handbrake: false, nitro: false },
    0.05
  );
  assert.ok(clampedCar.x <= PHYSICS_CONFIG.ROAD_HALF_WIDTH, 'Car should be clamped at road boundary');
});
