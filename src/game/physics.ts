/**
 * Pure physics calculations and constants for Apex Drift
 */

export interface CarState {
  x: number;          // Lateral lane position (meters from center, -12 to 12)
  z: number;          // Longitudinal position along the track
  speed: number;      // Current forward speed (m/s)
  steerAngle: number; // Front wheel steer angle in radians (-maxSteer to maxSteer)
  heading: number;    // Car yaw orientation relative to road forward
  driftSlip: number;  // Drift slip angle/intensity (0 to 1)
  isDrifting: boolean;
  nitroRemaining: number; // Nitro fuel (0 to 100)
  isNitroActive: boolean;
  health: number;     // Hull integrity (0 to 100)
  invulnerableTimer: number; // Post-hit recovery seconds
}

export const PHYSICS_CONFIG = {
  MAX_SPEED: 70,              // ~252 km/h
  NITRO_MAX_SPEED: 95,        // ~342 km/h
  REVERSE_MAX_SPEED: 12,      // ~43 km/h
  ACCELERATION: 28,           // m/s^2
  NITRO_ACCELERATION: 55,     // m/s^2
  BRAKING: 45,                // m/s^2
  DRAG_COEFFICIENT: 0.12,     // Natural rolling friction
  STEER_SPEED: 3.2,           // Steering agility
  MAX_STEER_ANGLE: 0.55,      // ~31.5 degrees
  DRIFT_INIT_SPEED_MIN: 18,   // Minimum speed required to initiate drift
  DRIFT_TRACTION_LOSS: 0.65,  // Lateral grip when drifting
  ROAD_HALF_WIDTH: 11.5,      // Usable road lateral bounds
  CAR_WIDTH: 2.1,
  CAR_LENGTH: 4.5,
  NITRO_CONSUMPTION_RATE: 25, // Percent per second
  NITRO_RECHARGE_RATE: 8,     // Percent per second while driving fast without nitro
};

/**
 * Step car physics forward by dt
 */
export function stepCarPhysics(
  car: CarState,
  inputs: {
    throttle: number; // 0 to 1
    brake: number;    // 0 to 1
    steer: number;    // -1 (left) to 1 (right)
    handbrake: boolean;
    nitro: boolean;
  },
  dt: number
): CarState {
  const safeDt = Math.min(dt, 0.05);

  // Nitro state
  const wantsNitro = inputs.nitro && car.nitroRemaining > 2 && car.speed > 5;
  const isNitroActive = wantsNitro;
  let nitroRemaining = car.nitroRemaining;
  if (isNitroActive) {
    nitroRemaining = Math.max(0, nitroRemaining - PHYSICS_CONFIG.NITRO_CONSUMPTION_RATE * safeDt);
  } else if (car.speed > 25 && !inputs.handbrake) {
    nitroRemaining = Math.min(100, nitroRemaining + PHYSICS_CONFIG.NITRO_RECHARGE_RATE * safeDt);
  }

  // Target top speed & acceleration
  const currentMaxSpeed = isNitroActive ? PHYSICS_CONFIG.NITRO_MAX_SPEED : PHYSICS_CONFIG.MAX_SPEED;
  const accelRate = isNitroActive ? PHYSICS_CONFIG.NITRO_ACCELERATION : PHYSICS_CONFIG.ACCELERATION;

  // Forward acceleration & braking
  let speed = car.speed;
  if (inputs.throttle > 0) {
    if (speed < currentMaxSpeed) {
      speed += inputs.throttle * accelRate * safeDt;
      speed = Math.min(speed, currentMaxSpeed);
    }
  } else if (inputs.brake > 0) {
    if (speed > 0) {
      speed -= inputs.brake * PHYSICS_CONFIG.BRAKING * safeDt;
      if (speed < 0) speed = 0;
    } else {
      // Reverse
      speed -= inputs.brake * (PHYSICS_CONFIG.ACCELERATION * 0.4) * safeDt;
      speed = Math.max(-PHYSICS_CONFIG.REVERSE_MAX_SPEED, speed);
    }
  } else {
    // Natural friction drag
    if (speed > 0) {
      speed = Math.max(0, speed - (1.5 + speed * PHYSICS_CONFIG.DRAG_COEFFICIENT) * safeDt);
    } else if (speed < 0) {
      speed = Math.min(0, speed + 3.0 * safeDt);
    }
  }

  // Steering
  const targetSteer = inputs.steer * PHYSICS_CONFIG.MAX_STEER_ANGLE;
  const steerAngle = car.steerAngle + (targetSteer - car.steerAngle) * Math.min(1, PHYSICS_CONFIG.STEER_SPEED * safeDt * 4);

  // Drift mechanics
  const isHighSpeedTurn = Math.abs(steerAngle) > 0.22 && speed > PHYSICS_CONFIG.DRIFT_INIT_SPEED_MIN;
  const wantsDrift = inputs.handbrake && speed > PHYSICS_CONFIG.DRIFT_INIT_SPEED_MIN;
  const isDrifting = (wantsDrift || (isHighSpeedTurn && inputs.handbrake)) && speed > 10;

  // Drift slip accumulation and decay
  let driftSlip = car.driftSlip;
  if (isDrifting) {
    const slipTarget = Math.min(1, 0.4 + Math.abs(steerAngle) * 1.2);
    driftSlip += (slipTarget - driftSlip) * Math.min(1, 6 * safeDt);
    // Drifting creates slight speed drag
    speed = Math.max(5, speed - 8.0 * safeDt);
  } else {
    driftSlip = Math.max(0, driftSlip - 4.5 * safeDt);
  }

  // Heading calculation with slip
  const speedRatio = Math.min(1, Math.abs(speed) / 25);
  const driftHeadingMult = isDrifting ? 1.9 : 1.0;
  const targetHeading = steerAngle * speedRatio * driftHeadingMult;
  const heading = car.heading + (targetHeading - car.heading) * Math.min(1, 10 * safeDt);

  // Lateral movement based on steering + drift sliding
  let lateralVelocity = Math.sin(heading) * speed;
  if (isDrifting && Math.abs(steerAngle) > 0.05) {
    // Extra lateral slide when drifting
    lateralVelocity += Math.sign(steerAngle) * (driftSlip * 18);
  }

  // Road position update
  let x = car.x + lateralVelocity * safeDt;
  const z = car.z + Math.cos(heading) * speed * safeDt;

  // Road boundaries and guardrail bounce
  const maxRoadX = PHYSICS_CONFIG.ROAD_HALF_WIDTH;
  if (x > maxRoadX) {
    x = maxRoadX;
    speed *= 0.85; // Speed scrub on guardrail hit
  } else if (x < -maxRoadX) {
    x = -maxRoadX;
    speed *= 0.85;
  }

  const invulnerableTimer = Math.max(0, car.invulnerableTimer - safeDt);

  return {
    x,
    z,
    speed,
    steerAngle,
    heading,
    driftSlip,
    isDrifting,
    nitroRemaining,
    isNitroActive,
    health: car.health,
    invulnerableTimer,
  };
}

/**
 * Check if 2 bounding boxes overlap (2D top-down AABB)
 */
export function checkAABBCollision(
  a: { x: number; z: number; width: number; length: number },
  b: { x: number; z: number; width: number; length: number }
): boolean {
  const aMinX = a.x - a.width / 2;
  const aMaxX = a.x + a.width / 2;
  const aMinZ = a.z - a.length / 2;
  const aMaxZ = a.z + a.length / 2;

  const bMinX = b.x - b.width / 2;
  const bMaxX = b.x + b.width / 2;
  const bMinZ = b.z - b.length / 2;
  const bMaxZ = b.z + b.length / 2;

  return !(aMaxX < bMinX || aMinX > bMaxX || aMaxZ < bMinZ || aMinZ > bMaxZ);
}
