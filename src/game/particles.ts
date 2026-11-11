/**
 * Zero-GC Pooled Particle System for Apex Drift
 * Uses THREE.InstancedMesh to avoid garbage collection during gameplay
 */

import * as THREE from 'three';

interface Particle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  scale: number;
  scaleSpeed: number;
  life: number;
  maxLife: number;
  r: number;
  g: number;
  b: number;
}

const POOL_SIZE = 220;

export class ParticleSystem {
  public mesh: THREE.InstancedMesh;
  private particles: Particle[] = [];
  private dummy = new THREE.Object3D();
  private color = new THREE.Color();

  constructor() {
    // 12-sided low-poly sphere for fast rendering
    const geo = new THREE.SphereGeometry(0.18, 8, 6);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });

    this.mesh = new THREE.InstancedMesh(geo, mat, POOL_SIZE);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    // Initialize particle pool
    for (let i = 0; i < POOL_SIZE; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: -100,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        scale: 0.1,
        scaleSpeed: 0,
        life: 0,
        maxLife: 1,
        r: 1,
        g: 1,
        b: 1,
      });

      this.dummy.position.set(0, -100, 0);
      this.dummy.scale.set(0.001, 0.001, 0.001);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
      this.mesh.setColorAt(i, this.color.setRGB(1, 1, 1));
    }

    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  public spawn(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    scale: number,
    scaleSpeed: number,
    life: number,
    hexColor: number
  ) {
    // Find inactive particle or oldest particle
    let p = this.particles.find((item) => !item.active);
    if (!p) {
      // Steal the first particle
      p = this.particles[0];
    }

    p.active = true;
    p.x = x;
    p.y = y;
    p.z = z;
    p.vx = vx;
    p.vy = vy;
    p.vz = vz;
    p.scale = scale;
    p.scaleSpeed = scaleSpeed;
    p.life = life;
    p.maxLife = life;

    this.color.setHex(hexColor);
    p.r = this.color.r;
    p.g = this.color.g;
    p.b = this.color.b;
  }

  public spawnTireSmoke(x: number, y: number, z: number, intensity: number) {
    const count = Math.min(4, Math.ceil(intensity * 3));
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 1.5;
      this.spawn(
        x + (Math.random() - 0.5) * 0.3,
        y + 0.1,
        z - 0.2,
        Math.cos(angle) * speed,
        0.8 + Math.random() * 1.2,
        Math.sin(angle) * speed - 2.0,
        0.35 + Math.random() * 0.2,
        0.8, // Expand outward
        0.45 + Math.random() * 0.3,
        0xd0d8e0
      );
    }
  }

  public spawnNitroFlames(x: number, y: number, z: number) {
    for (let i = 0; i < 3; i++) {
      this.spawn(
        x + (Math.random() - 0.5) * 0.2,
        y,
        z - 0.2,
        (Math.random() - 0.5) * 0.8,
        (Math.random() - 0.5) * 0.6,
        -15 - Math.random() * 10,
        0.4 + Math.random() * 0.3,
        -0.4,
        0.18 + Math.random() * 0.15,
        Math.random() > 0.4 ? 0x00f0ff : 0xaa22ff
      );
    }
  }

  public spawnCrashSparks(x: number, y: number, z: number, count: number = 18) {
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.5;
      const speed = 4 + Math.random() * 10;
      this.spawn(
        x,
        y,
        z,
        Math.cos(theta) * Math.sin(phi) * speed,
        Math.cos(phi) * speed + 2,
        Math.sin(theta) * Math.sin(phi) * speed,
        0.25 + Math.random() * 0.2,
        -0.2,
        0.3 + Math.random() * 0.4,
        Math.random() > 0.5 ? 0xffaa00 : 0xff3300
      );
    }
  }

  public spawnPickupSparks(x: number, y: number, z: number, hexColor: number) {
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 4.5;
      this.spawn(
        x,
        y + 0.5,
        z,
        Math.cos(angle) * speed,
        1.5 + Math.random() * 4,
        Math.sin(angle) * speed,
        0.3,
        -0.25,
        0.45 + Math.random() * 0.3,
        hexColor
      );
    }
  }

  public update(dt: number) {
    let hasActive = false;
    for (let i = 0; i < POOL_SIZE; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      hasActive = true;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        this.dummy.position.set(0, -100, 0);
        this.dummy.scale.set(0.001, 0.001, 0.001);
        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(i, this.dummy.matrix);
        continue;
      }

      // Physics
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vy -= 4.5 * dt; // Gravity

      p.scale = Math.max(0.01, p.scale + p.scaleSpeed * dt);
      const lifeRatio = p.life / p.maxLife;

      this.dummy.position.set(p.x, Math.max(0.05, p.y), p.z);
      const s = p.scale * lifeRatio;
      this.dummy.scale.set(s, s, s);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);

      if (this.mesh.instanceColor) {
        this.color.setRGB(p.r * lifeRatio, p.g * lifeRatio, p.b * lifeRatio);
        this.mesh.setColorAt(i, this.color);
      }
    }

    if (hasActive) {
      this.mesh.instanceMatrix.needsUpdate = true;
      if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    }
  }
}
