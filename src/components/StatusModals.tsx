/**
 * Status Modals: Pause, Game Over, and Stage Victory
 * Formatted with tabular-nums metrics, primary CTAs with data-start="true"
 */

import React from 'react';
import { RunStats } from '../game/rules.ts';
import { Play, RotateCcw, Home, Trophy, Skull, Gauge, Zap } from 'lucide-react';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onTitle: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onTitle,
}) => {
  return (
    <div className="absolute inset-0 z-40 bg-black/75 flex items-center justify-center p-4 select-none">
      <div className="bg-[#0c1017] border-2 border-cyan-500/40 p-6 md:p-8 rounded-2xl max-w-md w-full shadow-[0_0_30px_rgba(0,240,255,0.25)] text-center text-white">
        <h2 className="text-2xl md:text-3xl font-black font-mono tracking-wider text-cyan-300 uppercase mb-2">
          RACE PAUSED
        </h2>
        <p className="text-xs font-mono text-slate-400 mb-6">
          ENGINES IDLE · SYSTEM STANDBY
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 mb-6">
          <button
            type="button"
            onClick={onResume}
            className="flex items-center justify-center gap-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-base py-3 px-6 rounded-xl transition-all cursor-pointer shadow-lg"
          >
            <Play className="w-5 h-5 fill-slate-950" />
            <span>RESUME [ESC]</span>
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="flex items-center justify-center gap-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold font-mono text-sm py-2.5 px-6 rounded-xl border border-amber-500/30 transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
            <span>RESTART RACE</span>
          </button>

          <button
            type="button"
            onClick={onTitle}
            className="flex items-center justify-center gap-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold font-mono text-sm py-2.5 px-6 rounded-xl border border-slate-700 transition-all cursor-pointer"
          >
            <Home className="w-4 h-4 text-slate-400" />
            <span>MAIN MENU</span>
          </button>
        </div>

        {/* Controls Reference */}
        <div className="border-t border-slate-800/80 pt-4 text-left">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 block mb-2">
            CONTROLS REFERENCE
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-300">
            <div><span className="text-cyan-400 font-semibold">W / UP</span> Gas</div>
            <div><span className="text-cyan-400 font-semibold">S / DOWN</span> Brake</div>
            <div><span className="text-cyan-400 font-semibold">A / D</span> Steer</div>
            <div><span className="text-cyan-400 font-semibold">SPACE</span> Drift</div>
            <div><span className="text-cyan-400 font-semibold">N / SHIFT</span> Nitro</div>
            <div><span className="text-cyan-400 font-semibold">M</span> Mute Audio</div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface GameOverModalProps {
  stats: RunStats;
  bestScore: number;
  onRestart: () => void;
  onTitle: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  stats,
  bestScore,
  onRestart,
  onTitle,
}) => {
  const isNewRecord = stats.score >= bestScore && stats.score > 0;

  return (
    <div className="absolute inset-0 z-40 bg-black/80 flex items-center justify-center p-4 select-none">
      <div className="bg-[#0c1017] border-2 border-rose-500/50 p-6 md:p-8 rounded-2xl max-w-lg w-full shadow-[0_0_35px_rgba(244,63,94,0.3)] text-center text-white">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 mb-3">
          <Skull className="w-6 h-6" />
        </div>

        <h2 className="text-3xl md:text-4xl font-black font-mono tracking-wider text-rose-400 uppercase mb-1">
          HULL DESTROYED
        </h2>
        <p className="text-xs font-mono text-slate-400 mb-6">
          VEHICLE CRITICAL FAILURE · TELEMETRY LOGGED
        </p>

        {isNewRecord && (
          <div className="inline-flex items-center gap-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/50 px-3 py-1 rounded-full text-xs font-mono font-bold mb-4 shadow-[0_0_15px_rgba(255,170,0,0.4)]">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>NEW ALL-TIME RECORD!</span>
          </div>
        )}

        {/* Run Metrics Grid */}
        <div className="grid grid-cols-2 gap-2.5 mb-6 text-left">
          <div className="bg-[#141820] border border-slate-800 p-3 rounded-xl">
            <span className="text-[11px] font-mono text-slate-400 uppercase block">FINAL SCORE</span>
            <span className="text-xl md:text-2xl font-black font-mono text-cyan-300 tabular-nums">
              {stats.score.toLocaleString()}
            </span>
          </div>

          <div className="bg-[#141820] border border-slate-800 p-3 rounded-xl">
            <span className="text-[11px] font-mono text-slate-400 uppercase block">BEST RECORD</span>
            <span className="text-xl md:text-2xl font-black font-mono text-amber-300 tabular-nums">
              {Math.max(bestScore, stats.score).toLocaleString()}
            </span>
          </div>

          <div className="bg-[#141820] border border-slate-800 p-3 rounded-xl">
            <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 uppercase">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              <span>TOP SPEED</span>
            </div>
            <span className="text-lg font-bold font-mono text-white tabular-nums">
              {stats.topSpeed} KM/H
            </span>
          </div>

          <div className="bg-[#141820] border border-slate-800 p-3 rounded-xl">
            <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 uppercase">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>NEAR MISSES</span>
            </div>
            <span className="text-lg font-bold font-mono text-white tabular-nums">
              {stats.nearMisses}
            </span>
          </div>

          <div className="bg-[#141820] border border-slate-800 p-3 rounded-xl">
            <span className="text-[11px] font-mono text-slate-400 uppercase block">DISTANCE</span>
            <span className="text-lg font-bold font-mono text-white tabular-nums">
              {Math.round(stats.distance)} METERS
            </span>
          </div>

          <div className="bg-[#141820] border border-slate-800 p-3 rounded-xl">
            <span className="text-[11px] font-mono text-slate-400 uppercase block">STAGE REACHED</span>
            <span className="text-lg font-bold font-mono text-cyan-400 tabular-nums">
              STAGE {stats.stage}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            data-start="true"
            onClick={onRestart}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black font-mono text-base py-3 px-6 rounded-xl shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all cursor-pointer uppercase"
          >
            <RotateCcw className="w-5 h-5 text-slate-950" />
            <span>TRY AGAIN [ENTER]</span>
          </button>

          <button
            type="button"
            onClick={onTitle}
            className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold font-mono text-sm py-3 px-5 rounded-xl border border-slate-700 transition-all cursor-pointer"
          >
            <Home className="w-4 h-4 text-slate-400" />
            <span>MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
