/**
 * Low-occlusion Game HUD for Apex Drift
 * World-matched styling, tabular-nums integers, zero backdrop-filter
 */

import React from 'react';
import { HUDData } from '../game/GameEngine.ts';
import { Pause, RotateCcw, Volume2, VolumeX, Zap, Shield, Flame } from 'lucide-react';

interface GameHUDProps {
  hud: HUDData;
  onPause: () => void;
  onRestart: () => void;
  onToggleMute: () => void;
  onVirtualKey?: (key: string, held: boolean) => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  hud,
  onPause,
  onRestart,
  onToggleMute,
  onVirtualKey,
}) => {
  // Discrete health pips (5 pips, each 20% health)
  const healthPips = 5;
  const fullPips = Math.ceil(hud.healthPercent / 20);

  return (
    <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-3 md:p-6 select-none text-white">
      {/* Top Bar: Left Stats + Right Utilities */}
      <div className="flex items-start justify-between w-full">
        {/* Top-Left Cluster: Score, Distance & Stage */}
        <div className="flex flex-col gap-1 bg-[#0a0e14]/90 border border-cyan-500/30 p-2.5 md:p-3 rounded-xl shadow-lg">
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] md:text-[11px] font-mono uppercase text-slate-400">SCORE</span>
            <span className="text-xl md:text-3xl font-black font-mono tracking-tight text-white tabular-nums">
              {hud.score.toLocaleString()}
            </span>
            {hud.comboMultiplier > 1.0 && (
              <span className="text-[10px] md:text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded">
                x{hud.comboMultiplier.toFixed(1)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 md:gap-4 text-[11px] md:text-xs font-mono text-slate-300">
            <div>
              <span className="text-slate-500 mr-1">DIST</span>
              <span className="font-bold text-cyan-300 tabular-nums">{hud.distance}m</span>
            </div>
            <div>
              <span className="text-slate-500 mr-1">STAGE</span>
              <span className="font-bold text-amber-300 tabular-nums">{hud.stage}</span>
            </div>
          </div>
        </div>

        {/* Top-Center Transient Event Alerts (Drift & Near Miss) */}
        <div className="flex flex-col items-center gap-1">
          {hud.nearMissNotif && (
            <div className="animate-bounce bg-amber-500 text-slate-950 font-black font-mono text-xs md:text-sm px-3 py-1 rounded-md shadow-[0_0_15px_rgba(255,170,0,0.6)] uppercase tracking-wider">
              ⚡ NEAR MISS! +250
            </div>
          )}
          {hud.isDrifting && (
            <div className="flex items-center gap-1.5 bg-cyan-500/90 text-slate-950 font-black font-mono text-xs md:text-sm px-3 py-1 rounded-md shadow-[0_0_15px_rgba(0,240,255,0.6)] uppercase tracking-wider">
              <Flame className="w-4 h-4 fill-slate-950" />
              <span>DRIFTING +{hud.driftPoints}</span>
            </div>
          )}
        </div>

        {/* Top-Right Utility Cluster */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            onClick={onToggleMute}
            tabIndex={-1}
            aria-label={hud.isMuted ? 'Unmute Sound' : 'Mute Sound'}
            className="w-9 h-9 flex items-center justify-center bg-[#0a0e14]/90 hover:bg-slate-800 border border-slate-700/80 rounded-lg text-slate-300 transition-colors shadow-lg cursor-pointer"
          >
            {hud.isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          <button
            type="button"
            onClick={onRestart}
            tabIndex={-1}
            aria-label="Restart Race"
            className="w-9 h-9 flex items-center justify-center bg-[#0a0e14]/90 hover:bg-slate-800 border border-slate-700/80 rounded-lg text-slate-300 transition-colors shadow-lg cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
          </button>

          <button
            type="button"
            onClick={onPause}
            tabIndex={-1}
            aria-label="Pause Game"
            className="w-9 h-9 flex items-center justify-center bg-[#0a0e14]/90 hover:bg-slate-800 border border-slate-700/80 rounded-lg text-slate-300 transition-colors shadow-lg cursor-pointer"
          >
            <Pause className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Middle/Bottom: Optional Touch Controls for Mobile/Tablets */}
      <div className="flex items-center justify-between w-full pointer-events-none sm:hidden mb-2">
        {/* Left/Right Steer D-Pad */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            aria-label="Steer Left"
            onPointerDown={() => onVirtualKey?.('a', true)}
            onPointerUp={() => onVirtualKey?.('a', false)}
            onPointerLeave={() => onVirtualKey?.('a', false)}
            className="w-13 h-13 flex items-center justify-center bg-[#0a0e14]/85 border border-cyan-500/40 rounded-xl text-cyan-400 font-black text-xl active:bg-cyan-500 active:text-slate-950 shadow-lg cursor-pointer select-none"
          >
            ◀
          </button>
          <button
            type="button"
            aria-label="Steer Right"
            onPointerDown={() => onVirtualKey?.('d', true)}
            onPointerUp={() => onVirtualKey?.('d', false)}
            onPointerLeave={() => onVirtualKey?.('d', false)}
            className="w-13 h-13 flex items-center justify-center bg-[#0a0e14]/85 border border-cyan-500/40 rounded-xl text-cyan-400 font-black text-xl active:bg-cyan-500 active:text-slate-950 shadow-lg cursor-pointer select-none"
          >
            ▶
          </button>
        </div>

        {/* Right Action Pedals: Drift/Nitro + Gas/Brake */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              aria-label="Nitro Boost"
              onPointerDown={() => onVirtualKey?.('n', true)}
              onPointerUp={() => onVirtualKey?.('n', false)}
              onPointerLeave={() => onVirtualKey?.('n', false)}
              className="w-11 h-9 flex items-center justify-center bg-cyan-500/30 border border-cyan-400 rounded-lg text-cyan-300 font-black text-[11px] active:bg-cyan-400 active:text-slate-950 shadow-lg cursor-pointer select-none"
            >
              NITRO
            </button>
            <button
              type="button"
              aria-label="Handbrake Drift"
              onPointerDown={() => onVirtualKey?.(' ', true)}
              onPointerUp={() => onVirtualKey?.(' ', false)}
              onPointerLeave={() => onVirtualKey?.(' ', false)}
              className="w-11 h-9 flex items-center justify-center bg-amber-500/30 border border-amber-400 rounded-lg text-amber-300 font-black text-[11px] active:bg-amber-400 active:text-slate-950 shadow-lg cursor-pointer select-none"
            >
              DRIFT
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              aria-label="Accelerate"
              onPointerDown={() => onVirtualKey?.('w', true)}
              onPointerUp={() => onVirtualKey?.('w', false)}
              onPointerLeave={() => onVirtualKey?.('w', false)}
              className="w-12 h-11 flex items-center justify-center bg-emerald-500/40 border border-emerald-400 rounded-xl text-emerald-300 font-black text-lg active:bg-emerald-400 active:text-slate-950 shadow-lg cursor-pointer select-none"
            >
              ▲
            </button>
            <button
              type="button"
              aria-label="Brake"
              onPointerDown={() => onVirtualKey?.('s', true)}
              onPointerUp={() => onVirtualKey?.('s', false)}
              onPointerLeave={() => onVirtualKey?.('s', false)}
              className="w-12 h-9 flex items-center justify-center bg-rose-500/40 border border-rose-400 rounded-lg text-rose-300 font-black text-xs active:bg-rose-400 active:text-slate-950 shadow-lg cursor-pointer select-none"
            >
              ▼
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Perimeter HUD: Speedometer, Hull Integrity & Nitro Boost */}
      <div className="flex items-end justify-between w-full max-w-4xl mx-auto">
        {/* Hull Integrity Pips */}
        <div className="flex flex-col gap-1 bg-[#0a0e14]/90 border border-slate-800 p-2.5 rounded-xl shadow-lg">
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>HULL</span>
            <span className="font-bold text-white tabular-nums">{hud.healthPercent}%</span>
          </div>
          <div className="flex items-center gap-1">
            {Array.from({ length: healthPips }).map((_, i) => (
              <div
                key={i}
                className={`w-4 h-2 rounded-xs transition-colors ${
                  i < fullPips
                    ? hud.healthPercent > 40
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]'
                      : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                    : 'bg-slate-800'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Hero Digital Speedometer & Tachometer Display */}
        <div className="flex flex-col items-center bg-[#0a0e14]/95 border-2 border-cyan-500/40 px-5 py-2.5 rounded-2xl shadow-[0_0_20px_rgba(0,240,255,0.2)]">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl md:text-5xl font-black font-mono tracking-tight text-white tabular-nums">
              {hud.speedKmh}
            </span>
            <span className="text-xs font-mono font-bold text-cyan-400 uppercase">KM/H</span>
          </div>

          {/* Virtual Gear & RPM Indicator */}
          <div className="flex items-center gap-3 w-full justify-between mt-1 pt-1 border-t border-slate-800 text-[11px] font-mono text-slate-400">
            <div>
              <span>GEAR </span>
              <span className="font-bold text-amber-400">{hud.gear}</span>
            </div>
            <div>
              <span className="tabular-nums text-slate-300">{hud.rpm}</span>
              <span className="text-slate-500"> RPM</span>
            </div>
          </div>
        </div>

        {/* Nitro Boost Gauge */}
        <div className="flex flex-col gap-1 bg-[#0a0e14]/90 border border-slate-800 p-2.5 rounded-xl shadow-lg w-32 md:w-36">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <div className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>NITRO</span>
            </div>
            <span className="font-bold text-cyan-300 tabular-nums">{hud.nitroPercent}%</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all rounded-full shadow-[0_0_10px_rgba(0,240,255,0.7)]"
              style={{ width: `${hud.nitroPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
