/**
 * Procedural 3D composite vehicle and scenery models for Apex Drift
 * Built as multi-part THREE.Group compositions (3-12 parts per vehicle)
 */

import * as THREE from 'three';

// Shared materials and geometries for zero-redundancy performance
const tireMaterial = new THREE.MeshStandardMaterial({
  color: 0x181818,
  roughness: 0.9,
  metalness: 0.1,
});

const rimMaterial = new THREE.MeshStandardMaterial({
  color: 0xcccccc,
  roughness: 0.25,
  metalness: 0.85,
});

const glassMaterial = new THREE.MeshStandardMaterial({
  color: 0x111c24,
  roughness: 0.08,
  metalness: 0.85,
  transparent: true,
  opacity: 0.88,
});

const carbonMaterial = new THREE.MeshStandardMaterial({
  color: 0x1f2326,
  roughness: 0.7,
  metalness: 0.2,
});

const chromeMaterial = new THREE.MeshStandardMaterial({
  color: 0xefefef,
  roughness: 0.15,
  metalness: 0.95,
});

/**
 * Procedural Contact Shadow Disc
 */
export function createContactShadow(width: number, length: number): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(64, 64, 10, 64, 64, 60);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.75)');
  gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.4)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const shadowGeo = new THREE.PlaneGeometry(width * 1.3, length * 1.25);
  shadowGeo.rotateX(-Math.PI / 2);

  const shadowMat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });

  const mesh = new THREE.Mesh(shadowGeo, shadowMat);
  mesh.position.y = 0.02;
  return mesh;
}

/**
 * Creates a wheel assembly with tire, rim and caliper
 */
function createWheelAssembly(radius: number, width: number): THREE.Group {
  const wheelGroup = new THREE.Group();

  // Rubber tire
  const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 18);
  tireGeo.rotateZ(Math.PI / 2);
  const tireMesh = new THREE.Mesh(tireGeo, tireMaterial);
  tireMesh.castShadow = true;
  wheelGroup.add(tireMesh);

  // Metallic rim
  const rimGeo = new THREE.CylinderGeometry(radius * 0.65, radius * 0.65, width * 1.02, 12);
  rimGeo.rotateZ(Math.PI / 2);
  const rimMesh = new THREE.Mesh(rimGeo, rimMaterial);
  wheelGroup.add(rimMesh);

  // Rim spokes accent
  const spokeGeo = new THREE.BoxGeometry(width * 1.04, radius * 1.1, radius * 0.15);
  const spokeMesh = new THREE.Mesh(spokeGeo, carbonMaterial);
  wheelGroup.add(spokeMesh);

  return wheelGroup;
}

export interface HeroCarModel {
  group: THREE.Group;
  frontWheels: THREE.Group[];
  allWheels: THREE.Group[];
  bodyMaterial: THREE.MeshStandardMaterial;
  headlights: THREE.Mesh;
  taillights: THREE.Mesh;
  underglow: THREE.Mesh;
  exhaustPipes: THREE.Mesh[];
  setSteerAngle: (angle: number) => void;
  spinWheels: (distanceDelta: number) => void;
}

/**
 * Composite Hero Sports Car (12 distinct parts)
 */
export function createHeroCar(colorHex: number = 0x00f0ff): HeroCarModel {
  const carGroup = new THREE.Group();

  // 1. Primary Car Body / Lower Chassis
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.36,
    metalness: 0.45,
  });

  // Lower chassis wedge
  const bodyGeo = new THREE.BoxGeometry(1.9, 0.45, 4.3);
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMaterial);
  bodyMesh.position.y = 0.42;
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  carGroup.add(bodyMesh);

  // Carbon Racing Stripe along hood
  const stripeGeo = new THREE.BoxGeometry(0.42, 0.02, 4.32);
  const stripeMesh = new THREE.Mesh(stripeGeo, carbonMaterial);
  stripeMesh.position.set(0, 0.65, 0);
  carGroup.add(stripeMesh);

  // Front wedge nose
  const noseGeo = new THREE.BoxGeometry(1.82, 0.28, 0.9);
  const noseMesh = new THREE.Mesh(noseGeo, bodyMaterial);
  noseMesh.position.set(0, 0.32, 2.3);
  noseMesh.castShadow = true;
  carGroup.add(noseMesh);

  // 2. Cockpit Cabin & Windshield (Glossy aerodynamic greenhouse)
  const cabinGeo = new THREE.BoxGeometry(1.45, 0.46, 1.95);
  const cabinMesh = new THREE.Mesh(cabinGeo, glassMaterial);
  cabinMesh.position.set(0, 0.82, -0.15);
  cabinMesh.castShadow = true;
  carGroup.add(cabinMesh);

  // Roof cap
  const roofGeo = new THREE.BoxGeometry(1.35, 0.08, 1.4);
  const roofMesh = new THREE.Mesh(roofGeo, bodyMaterial);
  roofMesh.position.set(0, 1.07, -0.25);
  carGroup.add(roofMesh);

  // 3. Front Splitter & Carbon Air Scoop
  const splitterGeo = new THREE.BoxGeometry(1.98, 0.06, 0.45);
  const splitterMesh = new THREE.Mesh(splitterGeo, carbonMaterial);
  splitterMesh.position.set(0, 0.16, 2.5);
  carGroup.add(splitterMesh);

  const scoopGeo = new THREE.BoxGeometry(0.55, 0.1, 0.6);
  const scoopMesh = new THREE.Mesh(scoopGeo, carbonMaterial);
  scoopMesh.position.set(0, 0.67, 1.1);
  carGroup.add(scoopMesh);

  // 4. Rear Aerodynamic Wing Spoiler
  const wingGroup = new THREE.Group();
  const bladeGeo = new THREE.BoxGeometry(1.95, 0.06, 0.38);
  const bladeMesh = new THREE.Mesh(bladeGeo, carbonMaterial);
  bladeMesh.position.set(0, 1.05, -2.05);

  const strutGeo = new THREE.BoxGeometry(0.06, 0.35, 0.12);
  const strutL = new THREE.Mesh(strutGeo, carbonMaterial);
  strutL.position.set(-0.55, 0.85, -2.0);
  const strutR = new THREE.Mesh(strutGeo, carbonMaterial);
  strutR.position.set(0.55, 0.85, -2.0);

  wingGroup.add(bladeMesh, strutL, strutR);
  carGroup.add(wingGroup);

  // 5. LED Headlights (Cyan/White emissive)
  const headGeo = new THREE.BoxGeometry(0.42, 0.1, 0.12);
  const headMat = new THREE.MeshStandardMaterial({
    color: 0xccffff,
    emissive: 0x00f0ff,
    emissiveIntensity: 3.0,
    roughness: 0.1,
  });
  const headL = new THREE.Mesh(headGeo, headMat);
  headL.position.set(-0.65, 0.42, 2.68);
  const headR = new THREE.Mesh(headGeo, headMat);
  headR.position.set(0.65, 0.42, 2.68);
  carGroup.add(headL, headR);

  // 6. Rear Taillight Bar (Vibrant Crimson Red)
  const tailGeo = new THREE.BoxGeometry(1.72, 0.09, 0.1);
  const tailMat = new THREE.MeshStandardMaterial({
    color: 0xff0022,
    emissive: 0xff0022,
    emissiveIntensity: 2.5,
    roughness: 0.2,
  });
  const tailMesh = new THREE.Mesh(tailGeo, tailMat);
  tailMesh.position.set(0, 0.52, -2.18);
  carGroup.add(tailMesh);

  // 7. Dual Chrome Exhaust Pipes
  const exhaustGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.25, 12);
  exhaustGeo.rotateX(Math.PI / 2);
  const exhaustL = new THREE.Mesh(exhaustGeo, chromeMaterial);
  exhaustL.position.set(-0.45, 0.25, -2.18);
  const exhaustR = new THREE.Mesh(exhaustGeo, chromeMaterial);
  exhaustR.position.set(0.45, 0.25, -2.18);
  carGroup.add(exhaustL, exhaustR);

  // 8. Neon Underglow Strip (Emissive plane beneath chassis)
  const underglowGeo = new THREE.PlaneGeometry(1.8, 3.6);
  underglowGeo.rotateX(-Math.PI / 2);
  const underglowMat = new THREE.MeshBasicMaterial({
    color: colorHex,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });
  const underglowMesh = new THREE.Mesh(underglowGeo, underglowMat);
  underglowMesh.position.y = 0.06;
  carGroup.add(underglowMesh);

  // 9. Contact Shadow Disc
  const shadowMesh = createContactShadow(2.1, 4.5);
  carGroup.add(shadowMesh);

  // 10. Wheels & Suspension Rig
  const frontWheels: THREE.Group[] = [];
  const allWheels: THREE.Group[] = [];

  const wheelPositions = [
    { x: -0.96, y: 0.35, z: 1.35, isFront: true },
    { x: 0.96, y: 0.35, z: 1.35, isFront: true },
    { x: -0.96, y: 0.36, z: -1.35, isFront: false },
    { x: 0.96, y: 0.36, z: -1.35, isFront: false },
  ];

  wheelPositions.forEach((pos) => {
    // Steer pivot container
    const steerPivot = new THREE.Group();
    steerPivot.position.set(pos.x, pos.y, pos.z);

    // Spin child
    const wheelMesh = createWheelAssembly(0.35, 0.28);
    steerPivot.add(wheelMesh);
    carGroup.add(steerPivot);

    if (pos.isFront) {
      frontWheels.push(steerPivot);
    }
    allWheels.push(wheelMesh);
  });

  return {
    group: carGroup,
    frontWheels,
    allWheels,
    bodyMaterial,
    headlights: headL,
    taillights: tailMesh,
    underglow: underglowMesh,
    exhaustPipes: [exhaustL, exhaustR],
    setSteerAngle: (angle: number) => {
      frontWheels.forEach((w) => {
        w.rotation.y = angle;
      });
    },
    spinWheels: (distanceDelta: number) => {
      const rot = distanceDelta / 0.35;
      allWheels.forEach((w) => {
        w.rotation.x += rot;
      });
    },
  };
}

export interface TrafficCarModel {
  group: THREE.Group;
  type: 'hatchback' | 'truck' | 'muscle';
  blinkerL: THREE.Mesh;
  blinkerR: THREE.Mesh;
  allWheels: THREE.Group[];
  spinWheels: (distanceDelta: number) => void;
  setBlinker: (side: 'left' | 'right' | null, active: boolean) => void;
}

/**
 * Composite Traffic Vehicles with 3 distinct silhouettes and behavior archetypes
 */
export function createTrafficVehicle(type: 'hatchback' | 'truck' | 'muscle', colorHex: number): TrafficCarModel {
  const group = new THREE.Group();
  const allWheels: THREE.Group[] = [];

  const bodyMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.35,
    metalness: 0.45,
  });

  // Amber blinker materials
  const blinkerMatOff = new THREE.MeshStandardMaterial({
    color: 0x553300,
    roughness: 0.5,
  });
  const blinkerMatOn = new THREE.MeshStandardMaterial({
    color: 0xffaa00,
    emissive: 0xffaa00,
    emissiveIntensity: 2.5,
  });

  const blinkerGeo = new THREE.BoxGeometry(0.18, 0.1, 0.08);
  const blinkerL = new THREE.Mesh(blinkerGeo, blinkerMatOff);
  const blinkerR = new THREE.Mesh(blinkerGeo, blinkerMatOff);

  if (type === 'hatchback') {
    // 1. Compact City Hatchback
    const bodyGeo = new THREE.BoxGeometry(1.8, 0.5, 3.8);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.45;
    body.castShadow = true;
    group.add(body);

    const cabinGeo = new THREE.BoxGeometry(1.5, 0.52, 2.1);
    const cabin = new THREE.Mesh(cabinGeo, glassMaterial);
    cabin.position.set(0, 0.88, -0.3);
    cabin.castShadow = true;
    group.add(cabin);

    // Taillights
    const tailGeo = new THREE.BoxGeometry(1.5, 0.1, 0.06);
    const tailMat = new THREE.MeshStandardMaterial({ color: 0xff1122, emissive: 0xaa0011, emissiveIntensity: 1.5 });
    const tail = new THREE.Mesh(tailGeo, tailMat);
    tail.position.set(0, 0.55, -1.92);
    group.add(tail);

    // Blinkers
    blinkerL.position.set(-0.85, 0.55, -1.91);
    blinkerR.position.set(0.85, 0.55, -1.91);
    group.add(blinkerL, blinkerR);

    // Wheels
    [
      { x: -0.92, z: 1.1 },
      { x: 0.92, z: 1.1 },
      { x: -0.92, z: -1.1 },
      { x: 0.92, z: -1.1 },
    ].forEach((p) => {
      const w = createWheelAssembly(0.32, 0.22);
      w.position.set(p.x, 0.32, p.z);
      group.add(w);
      allWheels.push(w);
    });

    group.add(createContactShadow(1.9, 4.0));
  } else if (type === 'truck') {
    // 2. Heavy Semi-Truck & Trailer
    // Semi Cab
    const cabGeo = new THREE.BoxGeometry(2.3, 1.8, 2.5);
    const cab = new THREE.Mesh(cabGeo, bodyMat);
    cab.position.set(0, 1.1, 3.2);
    cab.castShadow = true;
    group.add(cab);

    // Windshield
    const winGeo = new THREE.BoxGeometry(2.1, 0.65, 0.2);
    const win = new THREE.Mesh(winGeo, glassMaterial);
    win.position.set(0, 1.55, 4.46);
    group.add(win);

    // Long Cargo Trailer
    const trailerMat = new THREE.MeshStandardMaterial({
      color: 0x9098a0,
      roughness: 0.5,
      metalness: 0.3,
    });
    const trailerGeo = new THREE.BoxGeometry(2.4, 2.1, 6.2);
    const trailer = new THREE.Mesh(trailerGeo, trailerMat);
    trailer.position.set(0, 1.35, -1.2);
    trailer.castShadow = true;
    group.add(trailer);

    // Chrome exhaust stacks
    const stackGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.4, 10);
    const stackL = new THREE.Mesh(stackGeo, chromeMaterial);
    stackL.position.set(-1.18, 1.8, 2.0);
    const stackR = new THREE.Mesh(stackGeo, chromeMaterial);
    stackR.position.set(1.18, 1.8, 2.0);
    group.add(stackL, stackR);

    // Blinkers on trailer rear
    blinkerL.position.set(-1.15, 0.65, -4.32);
    blinkerR.position.set(1.15, 0.65, -4.32);
    group.add(blinkerL, blinkerR);

    // Heavy wheels (6 wheels)
    [
      { x: -1.15, z: 3.5 },
      { x: 1.15, z: 3.5 },
      { x: -1.18, z: -2.8 },
      { x: 1.18, z: -2.8 },
      { x: -1.18, z: -3.8 },
      { x: 1.18, z: -3.8 },
    ].forEach((p) => {
      const w = createWheelAssembly(0.48, 0.32);
      w.position.set(p.x, 0.48, p.z);
      group.add(w);
      allWheels.push(w);
    });

    group.add(createContactShadow(2.6, 9.5));
  } else {
    // 3. Sleek Muscle Car
    const bodyGeo = new THREE.BoxGeometry(1.95, 0.48, 4.5);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.44;
    body.castShadow = true;
    group.add(body);

    const cabinGeo = new THREE.BoxGeometry(1.55, 0.44, 2.0);
    const cabin = new THREE.Mesh(cabinGeo, glassMaterial);
    cabin.position.set(0, 0.85, -0.2);
    cabin.castShadow = true;
    group.add(cabin);

    // Rear spoiler
    const spoilerGeo = new THREE.BoxGeometry(1.85, 0.06, 0.3);
    const spoiler = new THREE.Mesh(spoilerGeo, carbonMaterial);
    spoiler.position.set(0, 0.8, -2.1);
    group.add(spoiler);

    // Taillights & blinkers
    blinkerL.position.set(-0.9, 0.5, -2.26);
    blinkerR.position.set(0.9, 0.5, -2.26);
    group.add(blinkerL, blinkerR);

    // Wheels
    [
      { x: -1.0, z: 1.3 },
      { x: 1.0, z: 1.3 },
      { x: -1.0, z: -1.3 },
      { x: 1.0, z: -1.3 },
    ].forEach((p) => {
      const w = createWheelAssembly(0.36, 0.28);
      w.position.set(p.x, 0.36, p.z);
      group.add(w);
      allWheels.push(w);
    });

    group.add(createContactShadow(2.1, 4.7));
  }

  return {
    group,
    type,
    blinkerL,
    blinkerR,
    allWheels,
    spinWheels: (distanceDelta: number) => {
      const rot = distanceDelta / 0.35;
      allWheels.forEach((w) => {
        w.rotation.x += rot;
      });
    },
    setBlinker: (side: 'left' | 'right' | null, active: boolean) => {
      blinkerL.material = side === 'left' && active ? blinkerMatOn : blinkerMatOff;
      blinkerR.material = side === 'right' && active ? blinkerMatOn : blinkerMatOff;
    },
  };
}

/**
 * 3D Collectible Mesh (Nitro Bottle, Gold Coin, Repair Wrench)
 */
export function createCollectibleMesh(type: 'nitro' | 'coin' | 'repair'): THREE.Group {
  const group = new THREE.Group();

  if (type === 'nitro') {
    // Dual Cyan Nitro Canisters with Orbiting Ring
    const bottleMat = new THREE.MeshStandardMaterial({
      color: 0x00d8ff,
      emissive: 0x0088cc,
      emissiveIntensity: 1.2,
      roughness: 0.2,
      metalness: 0.8,
    });
    const bottleGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.8, 14);
    const b1 = new THREE.Mesh(bottleGeo, bottleMat);
    b1.position.set(-0.16, 0.5, 0);
    const b2 = new THREE.Mesh(bottleGeo, bottleMat);
    b2.position.set(0.16, 0.5, 0);

    const ringGeo = new THREE.TorusGeometry(0.55, 0.04, 8, 24);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.5;

    group.add(b1, b2, ring);
  } else if (type === 'coin') {
    // Golden Token with inner star
    const coinMat = new THREE.MeshStandardMaterial({
      color: 0xffcc00,
      emissive: 0xff9900,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.9,
    });
    const coinGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.12, 16);
    coinGeo.rotateZ(Math.PI / 2);
    const coin = new THREE.Mesh(coinGeo, coinMat);
    coin.position.y = 0.55;

    const ringGeo = new THREE.TorusGeometry(0.55, 0.03, 8, 20);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffe600 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.55;

    group.add(coin, ring);
  } else {
    // Repair Hologram
    const crossMat = new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      emissive: 0x00cc44,
      emissiveIntensity: 1.4,
      roughness: 0.2,
      metalness: 0.5,
    });
    const arm1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.25), crossMat);
    const arm2 = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.8, 0.25), crossMat);
    arm1.position.y = 0.55;
    arm2.position.y = 0.55;
    group.add(arm1, arm2);
  }

  // Soft glow ground circle
  const shadow = createContactShadow(1.2, 1.2);
  group.add(shadow);

  return group;
}
