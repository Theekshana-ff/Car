/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, GameState, HUDData } from './game/GameEngine.ts';
import { RunStats } from './game/rules.ts';
import { TitleScreen } from './components/TitleScreen.tsx';
import { GameHUD } from './components/GameHUD.tsx';
import { PauseModal, GameOverModal } from './components/StatusModals.tsx';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [gameState, setGameState] = useState<GameState>('title');
  const [carColor, setCarColor] = useState<number>(0x00f0ff);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const [hudData, setHudData] = useState<HUDData>({
    speedKmh: 0,
    gear: 1,
    rpm: 1000,
    nitroPercent: 100,
    healthPercent: 100,
    distance: 0,
    score: 0,
    bestScore: 0,
    stage: 1,
    comboMultiplier: 1.0,
    driftPoints: 0,
    isDrifting: false,
    nearMissNotif: false,
    isMuted: false,
  });

  const [runStats, setRunStats] = useState<RunStats>({
    score: 0,
    distance: 0,
    topSpeed: 0,
    driftPoints: 0,
    nearMisses: 0,
    coinsCollected: 0,
    stage: 1,
  });

  // Handle engine callbacks
  const handleHUDUpdate = useCallback((hud: HUDData) => {
    setHudData(hud);
    setIsMuted(hud.isMuted);
  }, []);

  const handleStateChange = useCallback((newState: GameState, stats: RunStats) => {
    setGameState(newState);
    setRunStats({ ...stats });
  }, []);

  useEffect(() => {
    if (!mountRef.current) return;

    // Initialize 3D game engine
    const engine = new GameEngine(mountRef.current, {
      onHUDUpdate: handleHUDUpdate,
      onStateChange: handleStateChange,
    });
    engineRef.current = engine;

    // Check for ?autostart=1 parameter
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      engine.startGame();
    } else {
      document.body.dataset.state = 'title';
    }

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [handleHUDUpdate, handleStateChange]);

  const handleStartGame = () => {
    engineRef.current?.startGame();
  };

  const handlePause = () => {
    engineRef.current?.togglePause();
  };

  const handleRestart = () => {
    engineRef.current?.startGame();
  };

  const handleTitle = () => {
    if (engineRef.current) {
      engineRef.current.gameState = 'title';
      document.body.dataset.state = 'title';
      setGameState('title');
    }
  };

  const handleToggleMute = () => {
    if (engineRef.current) {
      const muted = engineRef.current.toggleMute();
      setIsMuted(muted);
    }
  };

  const handleColorChange = (hex: number) => {
    setCarColor(hex);
    engineRef.current?.setCarColor(hex);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#06080e] select-none">
      {/* 3D WebGL Canvas isolated mount */}
      <div
        ref={mountRef}
        data-testid="game-canvas-container"
        className="absolute inset-0 w-full h-full"
      />

      {/* Screen 1: Title Screen */}
      {gameState === 'title' && (
        <TitleScreen
          onStart={handleStartGame}
          bestScore={hudData.bestScore}
          carColor={carColor}
          onColorChange={handleColorChange}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Screen 2: Playing HUD */}
      {gameState === 'playing' && (
        <GameHUD
          hud={hudData}
          onPause={handlePause}
          onRestart={handleRestart}
          onToggleMute={handleToggleMute}
          onVirtualKey={(key, held) => engineRef.current?.setKeyInput(key, held)}
        />
      )}

      {/* Screen 3: Paused Modal */}
      {gameState === 'paused' && (
        <PauseModal
          onResume={handlePause}
          onRestart={handleRestart}
          onTitle={handleTitle}
        />
      )}

      {/* Screen 4: Game Over Modal */}
      {gameState === 'gameover' && (
        <GameOverModal
          stats={runStats}
          bestScore={hudData.bestScore}
          onRestart={handleRestart}
          onTitle={handleTitle}
        />
      )}
    </div>
  );
}
