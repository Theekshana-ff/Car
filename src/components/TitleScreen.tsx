/**
 * Game Title Screen with Bespoke Inline SVG Logo Lockup, Car Color Customization,
 * High Score Badge, Single Flat Control Hint, and data-start="true"
 */

import React from 'react';
import { Play, Volume2, VolumeX, Sparkles } from 'lucide-react';

interface TitleScreenProps {
  onStart: () => void;
  bestScore: number;
  carColor: number;
  onColorChange: (colorHex: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

const CAR_COLORS = [
  { name: 'Cyber Cyan', hex: 0x00f0ff, css: '#00f0ff' },
  { name: 'Neon Coral', hex: 0xff3366, css: '#ff3366' },
  { name: 'Solar Amber', hex: 0xffaa00, css: '#ffaa00' },
  { name: 'Acid Lime', hex: 0x22ff88, css: '#22ff88' },
  { name: 'Hyper Violet', hex: 0xaa22ff, css: '#aa22ff' },
  { name: 'Carbon Stealth', hex: 0x2a3038, css: '#2a3038' },
];

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStart,
  bestScore,
  carColor,
  onColorChange,
  isMuted,
  onToggleMute,
}) => {
  return (
    <div className="absolute inset-0 z-30 pointer-events-none flex flex-col justify-between p-6 md:p-10 select-none text-white">
      {/* Top Header Row with High Score and Mute */}
      <div className="flex items-center justify-between w-full max-w-6xl mx-auto pointer-events-auto">
        <div className="flex items-center gap-2 bg-[#0c1017]/90 border border-cyan-500/30 px-3.5 py-1.5 rounded-lg shadow-lg">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="text-xs uppercase tracking-wider text-slate-400 font-mono">RECORD</span>
          <span className="text-sm font-bold font-mono text-cyan-300 tabular-nums">
            {bestScore.toLocaleString()} PTS
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleMute}
          tabIndex={-1}
          aria-label={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          className="flex items-center gap-1.5 bg-[#0c1017]/90 hover:bg-slate-800 border border-slate-700/80 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-300 transition-colors shadow-lg cursor-pointer"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          <span className="hidden sm:inline">{isMuted ? 'MUTED [M]' : 'AUDIO [M]'}</span>
        </button>
      </div>

      {/* Upper Title Lockup */}
      <div className="flex flex-col items-center text-center pointer-events-auto max-w-xl mx-auto mt-2">
        <div className="w-full max-w-md">
          <svg
            viewBox="0 0 540 110"
            className="w-full h-auto drop-shadow-[0_0_24px_rgba(0,240,255,0.45)]"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Speed Slash Backdrops */}
            <path d="M40 90 L95 20 L135 20 L80 90 Z" fill="#00f0ff" fillOpacity="0.25" />
            <path d="M125 90 L180 20 L215 20 L160 90 Z" fill="#00f0ff" fillOpacity="0.15" />
            
            {/* "APEX" Main Title */}
            <text
              x="50%"
              y="58"
              textAnchor="middle"
              className="font-black italic tracking-widest text-[54px]"
              fill="#ffffff"
              style={{
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontWeight: 900,
                letterSpacing: '0.14em',
              }}
            >
              APEX DRIFT
            </text>

            {/* Neon Subtitle Bar */}
            <rect x="130" y="74" width="280" height="3" fill="#00f0ff" rx="1.5" />
            <text
              x="50%"
              y="96"
              textAnchor="middle"
              className="text-[13px] font-mono tracking-[0.32em]"
              fill="#00f0ff"
              style={{ fontWeight: 700 }}
            >
              HIGHWAY OVERDRIVE · 3D
            </text>
          </svg>
        </div>
      </div>

      {/* Middle Negative Space (Hero Car orbits visibly here) */}
      <div className="flex-1 min-h-[120px] pointer-events-none" />

      {/* Lower Section: Color Customizer & Primary Start Button */}
      <div className="flex flex-col items-center pointer-events-auto max-w-xl mx-auto w-full gap-3 mb-2">
        {/* Car Paint Selector */}
        <div className="flex items-center gap-3 bg-[#0c1017]/90 border border-slate-800/90 px-4 py-2 rounded-xl shadow-xl">
          <span className="text-[11px] font-mono tracking-wider text-slate-400 uppercase">
            PAINT:
          </span>
          <div className="flex items-center gap-2">
            {CAR_COLORS.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => onColorChange(c.hex)}
                aria-label={`Select ${c.name} color`}
                className={`w-6 h-6 rounded-full transition-transform cursor-pointer border-2 ${
                  carColor === c.hex
                    ? 'scale-125 border-white shadow-[0_0_12px_rgba(255,255,255,0.9)]'
                    : 'border-transparent hover:scale-110 opacity-75 hover:opacity-100'
                }`}
                style={{ backgroundColor: c.css }}
              />
            ))}
          </div>
        </div>

        {/* Primary Start Button */}
        <button
          type="button"
          data-start="true"
          onClick={onStart}
          className="group relative flex items-center justify-center gap-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-base sm:text-lg px-9 py-3.5 rounded-xl shadow-[0_0_28px_rgba(0,240,255,0.45)] transition-all hover:scale-105 active:scale-95 cursor-pointer uppercase tracking-wider"
        >
          <Play className="w-5 h-5 fill-slate-950 text-slate-950" />
          <span>START ENGINE</span>
          <span className="text-xs font-mono font-bold bg-slate-950/20 px-2 py-0.5 rounded text-slate-950">
            [SPACE / ENTER]
          </span>
        </button>
      </div>

      {/* Bottom Flat Control Hint Line */}
      <div className="w-full text-center pointer-events-auto">
        <p className="text-xs sm:text-sm font-mono text-slate-400 tracking-wide">
          <span className="text-cyan-300 font-semibold">WASD / ARROWS</span> Steer & Accel ·{' '}
          <span className="text-cyan-300 font-semibold">SPACE</span> Drift ·{' '}
          <span className="text-cyan-300 font-semibold">N / SHIFT</span> Nitro ·{' '}
          <span className="text-cyan-300 font-semibold">ESC</span> Pause
        </p>
      </div>
    </div>
  );
};
