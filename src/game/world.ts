/**
 * Procedural Endless Highway & Cyberpunk Environment
 * Segment looping, road markings, lighting poles, and distant skyline
 */

import * as THREE from 'three';
import { PHYSICS_CONFIG } from './physics.ts';

export const ROAD_CONFIG = {
  SEGMENT_LENGTH: 80,
  NUM_SEGMENTS: 10,
  ROAD_WIDTH: 24, // 4 highway lanes
  LANE_WIDTH: 5.5,
  GUARDRAIL_HEIGHT: 0.85,
};

export class WorldManager {
  public scene: THREE.Scene;
  private roadSegments: THREE.Group[] = [];
  private sceneryGroup: THREE.Group = new THREE.Group();
  private skylineGroup: THREE.Group = new THREE.Group();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.scene.add(this.sceneryGroup);
    this.scene.add(this.skylineGroup);

    this.initRoadSegments();
    this.initSkyline();
  }

  /**
   * Procedural road texture with asphalt grain and subtle lane guides
   */
  private createAsphaltTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Dark asphalt base
    ctx.fillStyle = '#14161a';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle asphalt noise speckles
    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const gray = Math.floor(25 + Math.random() * 25);
      ctx.fillStyle = `rgb(${gray}, ${gray + 2}, ${gray + 5})`;
      ctx.fillRect(x, y, 1.5, 1.5);
    }

    // Outer edge boundary lines (solid white/cyan)
    ctx.fillStyle = '#447788';
    ctx.fillRect(8, 0, 6, 512);
    ctx.fillRect(512 - 14, 0, 6, 512);

    // Dashed lane dividers (3 lines for 4 lanes: x = 128, 256, 384)
    ctx.fillStyle = '#ffbb00';
    for (let y = 0; y < 512; y += 64) {
      ctx.fillRect(256 - 3, y + 8, 6, 38); // Yellow center divider
    }

    ctx.fillStyle = '#00e1ff';
    for (let y = 0; y < 512; y += 64) {
      ctx.fillRect(128 - 2, y + 8, 4, 38); // Cyan lane 1-2 divider
      ctx.fillRect(384 - 2, y + 8, 4, 38); // Cyan lane 3-4 divider
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, ROAD_CONFIG.SEGMENT_LENGTH / 16);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private initRoadSegments() {
    const asphaltTex = this.createAsphaltTexture();

    const roadGeo = new THREE.PlaneGeometry(ROAD_CONFIG.ROAD_WIDTH, ROAD_CONFIG.SEGMENT_LENGTH);
    roadGeo.rotateX(-Math.PI / 2);

    const roadMat = new THREE.MeshStandardMaterial({
      map: asphaltTex,
      roughness: 0.65,
      metalness: 0.15,
    });

    const shoulderGeo = new THREE.PlaneGeometry(6, ROAD_CONFIG.SEGMENT_LENGTH);
    shoulderGeo.rotateX(-Math.PI / 2);
    const shoulderMat = new THREE.MeshStandardMaterial({
      color: 0x0c0e12,
      roughness: 0.9,
    });

    // Guardrail geometry
    const guardrailGeo = new THREE.BoxGeometry(0.35, ROAD_CONFIG.GUARDRAIL_HEIGHT, ROAD_CONFIG.SEGMENT_LENGTH);
    const guardrailMat = new THREE.MeshStandardMaterial({
      color: 0x445566,
      roughness: 0.3,
      metalness: 0.8,
    });

    // Neon reflector strip on top of guardrail
    const reflectorGeo = new THREE.BoxGeometry(0.08, 0.08, ROAD_CONFIG.SEGMENT_LENGTH);
    const reflectorMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });

    // Terrain ground plane beyond shoulders
    const terrainGeo = new THREE.PlaneGeometry(160, ROAD_CONFIG.SEGMENT_LENGTH);
    terrainGeo.rotateX(-Math.PI / 2);
    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0x07090d,
      roughness: 0.95,
      metalness: 0.05,
    });

    for (let i = 0; i < ROAD_CONFIG.NUM_SEGMENTS; i++) {
      const segmentGroup = new THREE.Group();
      segmentGroup.position.z = i * ROAD_CONFIG.SEGMENT_LENGTH;

      // Center road
      const roadMesh = new THREE.Mesh(roadGeo, roadMat);
      roadMesh.position.y = 0;
      roadMesh.receiveShadow = true;
      segmentGroup.add(roadMesh);

      // Left and right shoulders
      const shoulderL = new THREE.Mesh(shoulderGeo, shoulderMat);
      shoulderL.position.set(-ROAD_CONFIG.ROAD_WIDTH / 2 - 3, -0.01, 0);
      shoulderL.receiveShadow = true;
      const shoulderR = new THREE.Mesh(shoulderGeo, shoulderMat);
      shoulderR.position.set(ROAD_CONFIG.ROAD_WIDTH / 2 + 3, -0.01, 0);
      shoulderR.receiveShadow = true;
      segmentGroup.add(shoulderL, shoulderR);

      // Guardrails
      const guardrailL = new THREE.Mesh(guardrailGeo, guardrailMat);
      guardrailL.position.set(-ROAD_CONFIG.ROAD_WIDTH / 2, ROAD_CONFIG.GUARDRAIL_HEIGHT / 2, 0);
      guardrailL.castShadow = true;
      const guardrailR = new THREE.Mesh(guardrailGeo, guardrailMat);
      guardrailR.position.set(ROAD_CONFIG.ROAD_WIDTH / 2, ROAD_CONFIG.GUARDRAIL_HEIGHT / 2, 0);
      guardrailR.castShadow = true;
      segmentGroup.add(guardrailL, guardrailR);

      // Guardrail neon strips
      const refL = new THREE.Mesh(reflectorGeo, reflectorMat);
      refL.position.set(-ROAD_CONFIG.ROAD_WIDTH / 2 + 0.15, ROAD_CONFIG.GUARDRAIL_HEIGHT, 0);
      const refR = new THREE.Mesh(reflectorGeo, reflectorMat);
      refR.position.set(ROAD_CONFIG.ROAD_WIDTH / 2 - 0.15, ROAD_CONFIG.GUARDRAIL_HEIGHT, 0);
      segmentGroup.add(refL, refR);

      // Outward vast terrain
      const terrainL = new THREE.Mesh(terrainGeo, terrainMat);
      terrainL.position.set(-ROAD_CONFIG.ROAD_WIDTH / 2 - 86, -0.05, 0);
      const terrainR = new THREE.Mesh(terrainGeo, terrainMat);
      terrainR.position.set(ROAD_CONFIG.ROAD_WIDTH / 2 + 86, -0.05, 0);
      segmentGroup.add(terrainL, terrainR);

      // Roadside street light pole (alternating left/right every 40m)
      const pole = this.createLightPole();
      pole.position.set(i % 2 === 0 ? -ROAD_CONFIG.ROAD_WIDTH / 2 - 2.5 : ROAD_CONFIG.ROAD_WIDTH / 2 + 2.5, 0, 0);
      if (i % 2 !== 0) pole.rotation.y = Math.PI;
      segmentGroup.add(pole);

      this.roadSegments.push(segmentGroup);
      this.scene.add(segmentGroup);
    }
  }

  /**
   * Street light pole with cantilever arm and glowing LED luminaire
   */
  private createLightPole(): THREE.Group {
    const poleGroup = new THREE.Group();
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.4,
      metalness: 0.8,
    });
    const lightMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00f0ff,
      emissiveIntensity: 2.2,
      roughness: 0.1,
    });

    // Vertical mast
    const mastGeo = new THREE.CylinderGeometry(0.12, 0.2, 8.5, 8);
    const mast = new THREE.Mesh(mastGeo, metalMat);
    mast.position.y = 4.25;
    mast.castShadow = true;
    poleGroup.add(mast);

    // Cantilever overhanging arm
    const armGeo = new THREE.BoxGeometry(3.5, 0.12, 0.15);
    const arm = new THREE.Mesh(armGeo, metalMat);
    arm.position.set(1.5, 8.4, 0);
    poleGroup.add(arm);

    // Downward LED lamp fixture
    const lampGeo = new THREE.BoxGeometry(0.9, 0.1, 0.35);
    const lamp = new THREE.Mesh(lampGeo, lightMat);
    lamp.position.set(3.0, 8.3, 0);
    poleGroup.add(lamp);

    return poleGroup;
  }

  /**
   * Distant futuristic cyberpunk skyline
   */
  private initSkyline() {
    const buildingMat = new THREE.MeshStandardMaterial({
      color: 0x0a1018,
      roughness: 0.7,
      metalness: 0.6,
    });

    const windowMat = new THREE.MeshBasicMaterial({ color: 0x00e1ff });
    const pinkWindowMat = new THREE.MeshBasicMaterial({ color: 0xff0077 });

    // Procedural background tower silhouettes
    for (let i = 0; i < 40; i++) {
      const width = 15 + Math.random() * 25;
      const height = 40 + Math.random() * 90;
      const depth = 15 + Math.random() * 25;

      const tower = new THREE.Group();
      const bGeo = new THREE.BoxGeometry(width, height, depth);
      const bMesh = new THREE.Mesh(bGeo, buildingMat);
      bMesh.position.y = height / 2;
      tower.add(bMesh);

      // Glowing antenna or roof edge
      if (Math.random() > 0.3) {
        const spireHeight = 10 + Math.random() * 20;
        const sGeo = new THREE.CylinderGeometry(0.3, 0.6, spireHeight, 6);
        const beacon = new THREE.Mesh(sGeo, Math.random() > 0.5 ? windowMat : pinkWindowMat);
        beacon.position.y = height + spireHeight / 2;
        tower.add(beacon);
      }

      const side = i % 2 === 0 ? -1 : 1;
      const dist = 140 + Math.random() * 80;
      const zPos = (i * 45) % (ROAD_CONFIG.SEGMENT_LENGTH * ROAD_CONFIG.NUM_SEGMENTS);

      tower.position.set(side * dist, 0, zPos);
      this.skylineGroup.add(tower);
    }
  }

  /**
   * Update road segments to follow player Z position seamlessly
   */
  public update(playerZ: number) {
    const totalLength = ROAD_CONFIG.SEGMENT_LENGTH * ROAD_CONFIG.NUM_SEGMENTS;
    const halfLength = totalLength / 2;

    this.roadSegments.forEach((segment) => {
      // If segment is too far behind player, move it forward
      if (segment.position.z < playerZ - ROAD_CONFIG.SEGMENT_LENGTH * 2) {
        segment.position.z += totalLength;
      } else if (segment.position.z > playerZ + totalLength - ROAD_CONFIG.SEGMENT_LENGTH * 2) {
        segment.position.z -= totalLength;
      }
    });

    // Update skyline Z offset so buildings stay surrounding the player
    this.skylineGroup.children.forEach((b) => {
      if (b.position.z < playerZ - 200) {
        b.position.z += totalLength;
      }
    });
  }
}
