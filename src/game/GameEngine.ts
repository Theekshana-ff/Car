/**
 * Core Three.js Engine for Apex Drift
 * Implements 60fps simulation, software WebGL guard, chase camera rig,
 * hitstop, trauma shake, traffic, and input buffering
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  CarState,
  PHYSICS_CONFIG,
  stepCarPhysics,
  checkAABBCollision,
} from './physics.ts';
import {
  calculateFrameScore,
  checkNearMiss,
  getDifficultyParams,
  resolveCollisionImpact,
  TrafficVehicle,
  Collectible,
  RunStats,
} from './rules.ts';
import {
  createHeroCar,
  createTrafficVehicle,
  createCollectibleMesh,
  HeroCarModel,
  TrafficCarModel,
} from './models.ts';
import { ParticleSystem } from './particles.ts';
import { WorldManager, ROAD_CONFIG } from './world.ts';
import { soundManager } from './audio.ts';

export type GameState = 'title' | 'playing' | 'paused' | 'gameover' | 'victory';

export interface HUDData {
  speedKmh: number;
  gear: number;
  rpm: number;
  nitroPercent: number;
  healthPercent: number;
  distance: number;
  score: number;
  bestScore: number;
  stage: number;
  comboMultiplier: number;
  driftPoints: number;
  isDrifting: boolean;
  nearMissNotif: boolean;
  isMuted: boolean;
}

export class GameEngine {
  private container: HTMLElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();

  // Engine state
  public gameState: GameState = 'title';
  private isSoftwareGl: boolean = false;
  private frameId: number = 0;
  private isDestroyed: boolean = false;

  // Car & Physics
  public playerCarState!: CarState;
  public heroCarModel!: HeroCarModel;
  private carColorHex: number = 0x00f0ff;

  // World & VFX
  private worldManager!: WorldManager;
  private particleSystem!: ParticleSystem;

  // Traffic & Collectibles
  private trafficList: { vehicle: TrafficVehicle; model: TrafficCarModel }[] = [];
  private collectibles: { item: Collectible; mesh: THREE.Group }[] = [];
  private nextTrafficId: number = 1;
  private nextCollectibleId: number = 1;
  private nearMissTriggeredSet = new Set<number>();
  private lastTrafficSpawnZ: number = 30;

  // Camera rig & shake
  private cameraOffset = new THREE.Vector3(0, 3.4, -6.8);
  private cameraLookOffset = new THREE.Vector3(0, 1.2, 5.0);
  private cameraShakeTrauma: number = 0; // 0 to 1, decays over time
  private titleCameraAngle: number = 0;

  // Hitstop freeze
  private hitstopTimer: number = 0;

  // HUD & Stats
  private onHUDUpdate?: (hud: HUDData) => void;
  private onStateChange?: (state: GameState, stats: RunStats) => void;
  private hudThrottleCounter: number = 0;
  private nearMissTimer: number = 0;
  private comboMultiplier: number = 1.0;
  private comboTimer: number = 0;
  private bestScore: number = 0;

  public runStats: RunStats = {
    score: 0,
    distance: 0,
    topSpeed: 0,
    driftPoints: 0,
    nearMisses: 0,
    coinsCollected: 0,
    stage: 1,
  };

  // Input states
  private keysHeld = new Map<string, boolean>();
  private justPressedKeys = new Set<string>();

  constructor(
    container: HTMLElement,
    callbacks: {
      onHUDUpdate?: (hud: HUDData) => void;
      onStateChange?: (state: GameState, stats: RunStats) => void;
    }
  ) {
    this.container = container;
    this.onHUDUpdate = callbacks.onHUDUpdate;
    this.onStateChange = callbacks.onStateChange;

    // Load best score from storage
    try {
      this.bestScore = parseInt(localStorage.getItem('apex_drift_best') || '0', 10);
    } catch {}

    this.initThree();
    this.initInputs();
    this.resetGame();

    // Start loop
    this.tick();
  }

  private initThree() {
    // 1. Software WebGL Guard probe
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
      preserveDrawingBuffer: true,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);

    // 2. Scene setup & Horizon Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x06080e);
    this.scene.fog = new THREE.FogExp2(0x06080e, 0.007);

    // 3. Camera
    this.camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 400);

    // 4. RoomEnvironment for PBR Reflections
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. Balanced Lighting Rig (warm key + cool hemisphere fill)
    const hemiLight = new THREE.HemisphereLight(0x4488bb, 0x111622, 1.0);
    this.scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffeedd, 1.3);
    keyLight.position.set(12, 20, 16);
    if (!this.isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 120;
      keyLight.shadow.camera.left = -25;
      keyLight.shadow.camera.right = 25;
      keyLight.shadow.camera.top = 25;
      keyLight.shadow.camera.bottom = -25;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    this.scene.add(keyLight);

    // 6. World Manager & Particles
    this.worldManager = new WorldManager(this.scene);
    this.particleSystem = new ParticleSystem();
    this.scene.add(this.particleSystem.mesh);

    // 7. Hero Car Model
    this.heroCarModel = createHeroCar(this.carColorHex);
    this.scene.add(this.heroCarModel.group);

    // Resize observer
    window.addEventListener('resize', this.onResize);
  }

  private onResize = () => {
    if (!this.renderer || !this.camera || !this.container) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.render(this.scene, this.camera);
  };

  private initInputs() {
    window.addEventListener('keydown', (e) => {
      // Prevent scrolling on arrows/space
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      const key = e.key.toLowerCase();
      if (!this.keysHeld.get(key)) {
        this.justPressedKeys.add(key);
      }
      this.keysHeld.set(key, true);

      // Edge-triggered pause
      if (e.key === 'Escape' || key === 'p') {
        this.togglePause();
      }

      // Quick start on enter or space while in title or gameover
      if ((e.key === 'Enter' || e.key === ' ') && this.gameState === 'title') {
        this.startGame();
      } else if (e.key === 'Enter' && (this.gameState === 'gameover' || this.gameState === 'victory')) {
        this.startGame();
      }

      // Audio mute shortcut [M]
      if (key === 'm') {
        this.toggleMute();
      }
    });

    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      this.keysHeld.set(key, false);
    });

    // Clear keys on window blur so inputs never stick
    window.addEventListener('blur', () => {
      this.keysHeld.clear();
      this.justPressedKeys.clear();
    });
  }

  public setKeyInput(key: string, held: boolean) {
    const k = key.toLowerCase();
    if (held && !this.keysHeld.get(k)) {
      this.justPressedKeys.add(k);
    }
    this.keysHeld.set(k, held);
  }

  public setCarColor(hex: number) {
    this.carColorHex = hex;
    this.heroCarModel.bodyMaterial.color.setHex(hex);
    (this.heroCarModel.underglow.material as THREE.MeshBasicMaterial).color.setHex(hex);
  }

  public resetGame() {
    this.playerCarState = {
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

    this.runStats = {
      score: 0,
      distance: 0,
      topSpeed: 0,
      driftPoints: 0,
      nearMisses: 0,
      coinsCollected: 0,
      stage: 1,
    };

    this.lastTrafficSpawnZ = 35;
    this.cameraShakeTrauma = 0;
    this.hitstopTimer = 0;
    this.comboMultiplier = 1.0;
    this.comboTimer = 0;
    this.nearMissTriggeredSet.clear();

    // Clear existing traffic
    this.trafficList.forEach((t) => {
      this.scene.remove(t.model.group);
    });
    this.trafficList = [];

    // Clear collectibles
    this.collectibles.forEach((c) => {
      this.scene.remove(c.mesh);
    });
    this.collectibles = [];

    this.heroCarModel.group.position.set(0, 0, 0);
    this.heroCarModel.group.rotation.set(0, 0, 0);
    this.heroCarModel.setSteerAngle(0);
  }

  public startGame() {
    this.resetGame();
    this.gameState = 'playing';
    document.body.dataset.state = 'playing';
    soundManager.resume();
    soundManager.startEngine();
    soundManager.playCountdownBeep(true);
    this.onStateChange?.(this.gameState, this.runStats);
  }

  public togglePause() {
    if (this.gameState === 'playing') {
      this.gameState = 'paused';
      document.body.dataset.state = 'paused';
      soundManager.stopEngine();
      this.onStateChange?.(this.gameState, this.runStats);
    } else if (this.gameState === 'paused') {
      this.gameState = 'playing';
      document.body.dataset.state = 'playing';
      soundManager.startEngine();
      this.onStateChange?.(this.gameState, this.runStats);
    }
  }

  public toggleMute(): boolean {
    const isMuted = soundManager.toggleMute();
    this.broadcastHUD();
    return isMuted;
  }

  /**
   * Spawn dynamic traffic ahead of player
   */
  private updateTrafficSpawning(distanceMeters: number, playerZ: number) {
    const diff = getDifficultyParams(distanceMeters);

    // Spawn new traffic ahead
    if (playerZ > this.lastTrafficSpawnZ - 120 && this.trafficList.length < diff.maxTrafficCount) {
      this.lastTrafficSpawnZ += diff.trafficSpawnInterval + (Math.random() - 0.5) * 10;

      // Select random lane (-8.25, -2.75, 2.75, 8.25)
      const lanes = [-8.25, -2.75, 2.75, 8.25];
      const laneX = lanes[Math.floor(Math.random() * lanes.length)];

      // Random archetype
      const rand = Math.random();
      let type: 'hatchback' | 'truck' | 'muscle' = 'hatchback';
      let speed = diff.trafficSpeedMin + Math.random() * (diff.trafficSpeedMax - diff.trafficSpeedMin);
      let width = 2.0;
      let length = 4.2;

      if (rand < 0.28) {
        type = 'truck';
        speed *= 0.85; // Trucks move slower
        width = 2.5;
        length = 8.5;
      } else if (rand < 0.6) {
        type = 'muscle';
        speed *= 1.1; // Muscle cars drive faster
        width = 2.1;
        length = 4.8;
      }

      const colors = [0xff2244, 0x2288ff, 0xeecc00, 0xffffff, 0x33cc66, 0x8844ff];
      const color = colors[Math.floor(Math.random() * colors.length)];

      const trafficVehicle: TrafficVehicle = {
        id: this.nextTrafficId++,
        type,
        x: laneX,
        z: playerZ + 90 + Math.random() * 40,
        speed,
        targetLaneX: laneX,
        width,
        length,
        color: `#${color.toString(16)}`,
        isChangingLanes: false,
        laneChangeTimer: 0,
        blinkerTimer: 0,
        blinkerSide: null,
      };

      const model = createTrafficVehicle(type, color);
      model.group.position.set(trafficVehicle.x, 0, trafficVehicle.z);
      this.scene.add(model.group);

      this.trafficList.push({ vehicle: trafficVehicle, model });

      // Occasional collectible spawn near traffic
      if (Math.random() < 0.45 && this.collectibles.length < 10) {
        this.spawnCollectible(playerZ + 60 + Math.random() * 50);
      }
    }

    // Update existing traffic vehicles
    const dt = this.clock.getDelta();
    for (let i = this.trafficList.length - 1; i >= 0; i--) {
      const { vehicle, model } = this.trafficList[i];

      // Move traffic forward along road
      vehicle.z += vehicle.speed * dt;

      // Random lane change decision
      vehicle.laneChangeTimer += dt;
      if (!vehicle.isChangingLanes && vehicle.laneChangeTimer > 4.5 && Math.random() < diff.laneChangeChance) {
        vehicle.laneChangeTimer = 0;
        const currentLaneIdx = Math.round((vehicle.x + 8.25) / 5.5);
        const shift = Math.random() > 0.5 ? 1 : -1;
        const targetIdx = Math.max(0, Math.min(3, currentLaneIdx + shift));
        if (targetIdx !== currentLaneIdx) {
          vehicle.isChangingLanes = true;
          vehicle.targetLaneX = -8.25 + targetIdx * 5.5;
          vehicle.blinkerSide = shift > 0 ? 'right' : 'left';
          vehicle.blinkerTimer = 0;
        }
      }

      // Execute lane change with animated blinker telegraph
      if (vehicle.isChangingLanes) {
        vehicle.blinkerTimer += dt;
        const blinkerActive = Math.sin(vehicle.blinkerTimer * 12) > 0;
        model.setBlinker(vehicle.blinkerSide, blinkerActive);

        // Smooth lateral glide
        const dx = vehicle.targetLaneX - vehicle.x;
        vehicle.x += Math.sign(dx) * Math.min(Math.abs(dx), 3.5 * dt);

        if (Math.abs(dx) < 0.1) {
          vehicle.x = vehicle.targetLaneX;
          vehicle.isChangingLanes = false;
          vehicle.blinkerSide = null;
          model.setBlinker(null, false);
        }
      }

      model.group.position.set(vehicle.x, 0, vehicle.z);
      model.spinWheels(vehicle.speed * dt);

      // Near-miss check
      if (
        checkNearMiss(
          {
            x: this.playerCarState.x,
            z: this.playerCarState.z,
            speed: this.playerCarState.speed,
            width: PHYSICS_CONFIG.CAR_WIDTH,
            length: PHYSICS_CONFIG.CAR_LENGTH,
          },
          vehicle,
          this.nearMissTriggeredSet
        )
      ) {
        this.runStats.nearMisses++;
        this.comboMultiplier = Math.min(4.0, this.comboMultiplier + 0.5);
        this.comboTimer = 3.5;
        this.nearMissTimer = 1.0;
        this.runStats.score += Math.round(250 * this.comboMultiplier);
        soundManager.playNearMiss();
      }

      // Collision check with player
      if (
        this.playerCarState.invulnerableTimer <= 0 &&
        checkAABBCollision(
          {
            x: this.playerCarState.x,
            z: this.playerCarState.z,
            width: PHYSICS_CONFIG.CAR_WIDTH,
            length: PHYSICS_CONFIG.CAR_LENGTH,
          },
          {
            x: vehicle.x,
            z: vehicle.z,
            width: vehicle.width,
            length: vehicle.length,
          }
        )
      ) {
        this.handleCrash(vehicle);
      }

      // Despawn if far behind player or too far ahead
      if (vehicle.z < playerZ - 30 || vehicle.z > playerZ + 250) {
        this.scene.remove(model.group);
        this.trafficList.splice(i, 1);
      }
    }
  }

  private spawnCollectible(zPos: number) {
    const lanes = [-8.25, -2.75, 2.75, 8.25];
    const laneX = lanes[Math.floor(Math.random() * lanes.length)];
    const rand = Math.random();
    let type: 'nitro' | 'coin' | 'repair' = 'coin';
    if (rand < 0.35) type = 'nitro';
    else if (rand < 0.5) type = 'repair';

    const item: Collectible = {
      id: this.nextCollectibleId++,
      type,
      x: laneX,
      z: zPos,
      collected: false,
      pulsePhase: Math.random() * Math.PI * 2,
    };

    const mesh = createCollectibleMesh(type);
    mesh.position.set(item.x, 0, item.z);
    this.scene.add(mesh);
    this.collectibles.push({ item, mesh });
  }

  private updateCollectibles(dt: number) {
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const { item, mesh } = this.collectibles[i];
      if (item.collected) continue;

      item.pulsePhase += dt * 4;
      mesh.rotation.y += dt * 2.5;
      mesh.position.y = Math.sin(item.pulsePhase) * 0.15;

      // Pickup collision
      const dx = Math.abs(this.playerCarState.x - item.x);
      const dz = Math.abs(this.playerCarState.z - item.z);
      if (dx < 1.8 && dz < 2.5) {
        item.collected = true;
        soundManager.playPickup();

        if (item.type === 'nitro') {
          this.playerCarState.nitroRemaining = Math.min(100, this.playerCarState.nitroRemaining + 40);
          this.runStats.score += 200;
          this.particleSystem.spawnPickupSparks(item.x, 0.5, item.z, 0x00f0ff);
        } else if (item.type === 'coin') {
          this.runStats.coinsCollected++;
          this.runStats.score += Math.round(350 * this.comboMultiplier);
          this.particleSystem.spawnPickupSparks(item.x, 0.5, item.z, 0xffcc00);
        } else {
          // Repair
          this.playerCarState.health = Math.min(100, this.playerCarState.health + 30);
          this.runStats.score += 150;
          this.particleSystem.spawnPickupSparks(item.x, 0.5, item.z, 0x00ff88);
        }

        this.scene.remove(mesh);
        this.collectibles.splice(i, 1);
        continue;
      }

      // Cleanup
      if (item.z < this.playerCarState.z - 25) {
        this.scene.remove(mesh);
        this.collectibles.splice(i, 1);
      }
    }
  }

  private handleCrash(traffic: TrafficVehicle) {
    const impact = resolveCollisionImpact(this.playerCarState.speed, traffic.type);

    this.playerCarState.health = Math.max(0, this.playerCarState.health - impact.damage);
    this.playerCarState.speed = impact.speedRetained;
    this.playerCarState.invulnerableTimer = 1.6; // Post-hit flashing
    this.hitstopTimer = impact.hitstopDuration;
    this.cameraShakeTrauma = Math.min(1.0, this.cameraShakeTrauma + 0.7);

    // Zero out combo
    this.comboMultiplier = 1.0;
    this.comboTimer = 0;

    // Sparks & Audio
    this.particleSystem.spawnCrashSparks(
      this.playerCarState.x,
      0.8,
      this.playerCarState.z + 1.8,
      traffic.type === 'truck' ? 32 : 18
    );
    soundManager.playCrash(traffic.type === 'truck' ? 'heavy' : 'light');

    // Game Over check
    if (this.playerCarState.health <= 0) {
      this.triggerGameOver();
    }
  }

  private triggerGameOver() {
    this.gameState = 'gameover';
    document.body.dataset.state = 'gameover';
    soundManager.stopEngine();
    soundManager.playGameOver();

    // Check high score
    if (this.runStats.score > this.bestScore) {
      this.bestScore = this.runStats.score;
      try {
        localStorage.setItem('apex_drift_best', String(this.bestScore));
      } catch {}
    }

    this.onStateChange?.(this.gameState, this.runStats);
  }

  private broadcastHUD() {
    if (!this.onHUDUpdate) return;
    const speedKmh = Math.round(this.playerCarState.speed * 3.6);
    const speedNorm = Math.min(1, speedKmh / 280);
    const gear = Math.min(6, Math.max(1, Math.floor(speedNorm * 5) + 1));
    const rpm = Math.round(2000 + (speedNorm * 6500));

    this.onHUDUpdate({
      speedKmh,
      gear,
      rpm,
      nitroPercent: Math.round(this.playerCarState.nitroRemaining),
      healthPercent: Math.round(this.playerCarState.health),
      distance: Math.round(this.runStats.distance),
      score: this.runStats.score,
      bestScore: this.bestScore,
      stage: this.runStats.stage,
      comboMultiplier: Math.round(this.comboMultiplier * 10) / 10,
      driftPoints: this.runStats.driftPoints,
      isDrifting: this.playerCarState.isDrifting,
      nearMissNotif: this.nearMissTimer > 0,
      isMuted: soundManager.getMuted(),
    });
  }

  /**
   * Main render and physics loop
   */
  private tick = () => {
    if (this.isDestroyed) return;

    const rawDt = this.clock.getDelta();
    const dt = Math.min(rawDt, 0.05);

    // 1. Title Screen live orbit showcase
    if (this.gameState === 'title') {
      this.titleCameraAngle += dt * 0.35;
      const radius = 5.8;
      this.camera.position.set(
        Math.sin(this.titleCameraAngle) * radius,
        1.8 + Math.sin(this.titleCameraAngle * 0.6) * 0.3,
        Math.cos(this.titleCameraAngle) * radius
      );
      this.camera.lookAt(0, 0.45, 0);

      this.worldManager.update(0);
      this.particleSystem.update(dt);
      this.renderer.render(this.scene, this.camera);

      this.scheduleNextFrame();
      return;
    }

    // 2. Paused State
    if (this.gameState === 'paused') {
      this.renderer.render(this.scene, this.camera);
      this.scheduleNextFrame();
      return;
    }

    // 3. Active Gameplay Simulation
    if (this.gameState === 'playing' || this.gameState === 'gameover') {
      // Hitstop logic: freezes simulation while camera shake and particles keep animating
      if (this.hitstopTimer > 0) {
        this.hitstopTimer -= dt;
      } else if (this.gameState === 'playing') {
        // Collect inputs
        const throttle = (this.keysHeld.get('w') || this.keysHeld.get('arrowup')) ? 1 : 0;
        const brake = (this.keysHeld.get('s') || this.keysHeld.get('arrowdown')) ? 1 : 0;
        const steerL = (this.keysHeld.get('a') || this.keysHeld.get('arrowleft')) ? -1 : 0;
        const steerR = (this.keysHeld.get('d') || this.keysHeld.get('arrowright')) ? 1 : 0;
        const handbrake = !!(this.keysHeld.get(' ') || this.keysHeld.get('shift'));
        const nitro = !!(this.keysHeld.get('n') || (this.keysHeld.get('shift') && throttle > 0));

        // Physics step
        this.playerCarState = stepCarPhysics(
          this.playerCarState,
          {
            throttle,
            brake,
            steer: steerL + steerR,
            handbrake,
            nitro,
          },
          dt
        );

        // Stats accumulation
        this.runStats.distance = this.playerCarState.z;
        const speedKmh = this.playerCarState.speed * 3.6;
        if (speedKmh > this.runStats.topSpeed) {
          this.runStats.topSpeed = Math.round(speedKmh);
        }

        const scoreDelta = calculateFrameScore(
          this.playerCarState.speed,
          this.playerCarState.isDrifting,
          this.playerCarState.driftSlip,
          this.playerCarState.isNitroActive,
          dt
        );
        this.runStats.score += scoreDelta.scoreInc;
        this.runStats.driftPoints += scoreDelta.driftScoreInc;

        const diff = getDifficultyParams(this.runStats.distance);
        this.runStats.stage = diff.stage;

        // Combo decay
        if (this.comboTimer > 0) {
          this.comboTimer -= dt;
          if (this.comboTimer <= 0) {
            this.comboMultiplier = 1.0;
          }
        }

        if (this.nearMissTimer > 0) {
          this.nearMissTimer -= dt;
        }

        // Audio update
        soundManager.updateEngine(
          this.playerCarState.speed,
          this.playerCarState.isDrifting,
          this.playerCarState.driftSlip,
          this.playerCarState.isNitroActive
        );

        // Tire smoke when drifting or braking at speed
        if (this.playerCarState.isDrifting) {
          this.particleSystem.spawnTireSmoke(
            this.playerCarState.x - 0.9,
            0.1,
            this.playerCarState.z - 1.2,
            this.playerCarState.driftSlip
          );
          this.particleSystem.spawnTireSmoke(
            this.playerCarState.x + 0.9,
            0.1,
            this.playerCarState.z - 1.2,
            this.playerCarState.driftSlip
          );
        }

        // Nitro exhaust flames
        if (this.playerCarState.isNitroActive) {
          this.particleSystem.spawnNitroFlames(
            this.playerCarState.x - 0.45,
            0.3,
            this.playerCarState.z - 2.1
          );
          this.particleSystem.spawnNitroFlames(
            this.playerCarState.x + 0.45,
            0.3,
            this.playerCarState.z - 2.1
          );
        }

        // Update traffic & collectibles
        this.updateTrafficSpawning(this.runStats.distance, this.playerCarState.z);
        this.updateCollectibles(dt);
      }

      // 4. Update 3D Hero Car Model Transform
      this.heroCarModel.group.position.set(
        this.playerCarState.x,
        0,
        this.playerCarState.z
      );
      this.heroCarModel.group.rotation.y = -this.playerCarState.heading;

      // Body roll during sharp turns
      this.heroCarModel.group.rotation.z = this.playerCarState.steerAngle * 0.08;
      this.heroCarModel.setSteerAngle(-this.playerCarState.steerAngle);
      this.heroCarModel.spinWheels(this.playerCarState.speed * dt);

      // Flashing on invulnerability
      if (this.playerCarState.invulnerableTimer > 0) {
        const isFlashOn = Math.sin(this.playerCarState.invulnerableTimer * 25) > 0;
        this.heroCarModel.group.visible = isFlashOn;
      } else {
        this.heroCarModel.group.visible = true;
      }

      // 5. Camera follow rig with exponential spring damping & trauma shake
      const targetCamPos = new THREE.Vector3(
        this.playerCarState.x * 0.65,
        this.cameraOffset.y,
        this.playerCarState.z + this.cameraOffset.z
      );

      // FOV kick during high speed / nitro
      const baseFov = 65;
      const speedRatio = Math.min(1, (this.playerCarState.speed * 3.6) / 280);
      const targetFov = baseFov + speedRatio * 15 + (this.playerCarState.isNitroActive ? 8 : 0);
      this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, 6 * dt);
      this.camera.updateProjectionMatrix();

      // Exponential damping
      this.camera.position.lerp(targetCamPos, 1 - Math.exp(-9 * dt));

      // Decaying Camera Trauma Shake (trauma * trauma)
      if (this.cameraShakeTrauma > 0) {
        this.cameraShakeTrauma = Math.max(0, this.cameraShakeTrauma - dt * 2.2);
        const shake = this.cameraShakeTrauma * this.cameraShakeTrauma * 0.55;
        this.camera.position.x += (Math.random() - 0.5) * shake;
        this.camera.position.y += (Math.random() - 0.5) * shake;
      }

      const lookTarget = new THREE.Vector3(
        this.playerCarState.x * 0.85,
        this.cameraLookOffset.y,
        this.playerCarState.z + this.cameraLookOffset.z
      );
      this.camera.lookAt(lookTarget);

      // 6. Update World & Particles
      this.worldManager.update(this.playerCarState.z);
      this.particleSystem.update(dt);

      // 7. Render
      this.renderer.render(this.scene, this.camera);

      // 8. Throttle HUD updates to 10-15 Hz (avoids React re-rendering at 60 Hz)
      this.hudThrottleCounter++;
      if (this.hudThrottleCounter % 4 === 0) {
        this.broadcastHUD();
      }

      this.justPressedKeys.clear();
      this.scheduleNextFrame();
    }
  };

  /**
   * Software WebGL loop scheduling vs standard rAF
   */
  private scheduleNextFrame() {
    if (this.isDestroyed) return;

    if (this.isSoftwareGl) {
      // afterDraw pacing pattern
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();

      const poll = () => {
        if (this.isDestroyed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(this.tick, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  }

  public destroy() {
    this.isDestroyed = true;
    window.removeEventListener('resize', this.onResize);
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    soundManager.stopEngine();

    try {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    } catch {}
  }
}
