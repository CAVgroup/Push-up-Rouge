/**
 * Game Title Screen & Launch Staging.
 * Features an atmospheric bespoke inline SVG title lockup, Start CTA,
 * mode selector (Camera ML Kit, Sensors, Simulator), and clear control hints.
 */

import React, { useEffect } from 'react';
import { Camera, Activity, Swords, Wrench, Shield, Smartphone, Zap } from 'lucide-react';
import { TrackingMode, SensitivityLevel } from '../types/fitness';

interface TitleScreenProps {
  onStartGame: () => void;
  trackingMode: TrackingMode;
  onSelectTrackingMode: (mode: TrackingMode) => void;
  sensitivity: SensitivityLevel;
  onSelectSensitivity: (level: SensitivityLevel) => void;
  onOpenArmory: () => void;
  onOpenModding: () => void;
  onOpenAndroidGuide: () => void;
  bestStreak: number;
  totalCareerReps: number;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartGame,
  trackingMode,
  onSelectTrackingMode,
  sensitivity,
  onSelectSensitivity,
  onOpenArmory,
  onOpenModding,
  onOpenAndroidGuide,
  bestStreak,
  totalCareerReps,
}) => {
  // Support Enter to start from Title
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter') {
        e.preventDefault();
        onStartGame();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStartGame]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between items-center select-none bg-[#090a0f] text-slate-100 overflow-hidden px-4 py-8">
      {/* Background Ambient Arena Atmosphere */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl" />
      </div>

      {/* Top Utility Bar */}
      <div className="w-full max-w-4xl flex justify-between items-center z-10">
        <div className="flex items-center gap-3 text-xs tracking-widest uppercase font-mono text-slate-400">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>1v1 Fitness Duel Arena</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAndroidGuide}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-cyan-300 bg-cyan-950/40 border border-cyan-800/60 rounded hover:bg-cyan-900/40 transition-colors"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Android ML Kit</span>
          </button>
          <button
            onClick={onOpenModding}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-amber-300 bg-amber-950/40 border border-amber-800/60 rounded hover:bg-amber-900/40 transition-colors"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>JSON Modding</span>
          </button>
        </div>
      </div>

      {/* Centerpiece: Bespoke SVG Title Lockup */}
      <div className="flex flex-col items-center text-center z-10 max-w-2xl mt-4">
        <div className="mb-4">
          <svg className="w-20 h-20 text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" viewBox="0 0 100 100" fill="none">
            {/* Crest Shield */}
            <path d="M50 8 L85 24 V58 C85 76 50 92 50 92 C50 92 15 76 15 58 V24 Z" stroke="#ef4444" strokeWidth="4" fill="#181116" />
            {/* Sword Blade */}
            <path d="M50 18 L53 66 L50 72 L47 66 Z" fill="#38bdf8" />
            <path d="M38 52 H62" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
            {/* Bicep / Iron Icon */}
            <path d="M42 34 C44 28 56 28 58 34 C60 40 40 40 42 34 Z" fill="#f59e0b" />
          </svg>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white uppercase font-sans drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
          Push-Up <span className="text-red-500">Rogue</span>
        </h1>
        <p className="text-sm sm:text-base text-slate-400 font-mono mt-2 tracking-wide">
          1v1 Duel Arena. Real push-ups strike your challenger.
        </p>

        {/* Career Milestone Summary */}
        <div className="flex gap-6 mt-4 text-xs font-mono text-slate-300">
          <div>Duels Cleared: <span className="text-cyan-400 font-bold tabular-nums">{totalCareerReps}</span></div>
          <div className="text-slate-600">|</div>
          <div>Best Streak: <span className="text-amber-400 font-bold tabular-nums">{bestStreak}</span></div>
        </div>

        {/* Input / Tracking Mode Selection (Pure Real Physical Tracking) */}
        <div className="mt-7 flex flex-wrap justify-center gap-2 p-1.5 bg-slate-900/90 border border-slate-800 rounded-lg">
          <button
            onClick={() => onSelectTrackingMode('CAMERA_VISION')}
            className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-mono transition-all ${
              trackingMode === 'CAMERA_VISION'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Camera Vision (Google ML Kit)</span>
          </button>
          <button
            onClick={() => onSelectTrackingMode('DEVICE_SENSORS')}
            className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-mono transition-all ${
              trackingMode === 'DEVICE_SENSORS'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Mat Accelerometer Sensor</span>
          </button>
        </div>

        {/* Exercise Form Sensitivity Selector */}
        <div className="mt-3 flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400 text-[11px] flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span>Sensitivity:</span>
          </span>
          <div className="inline-flex rounded-lg border border-slate-800 p-0.5 bg-slate-950/80">
            <button
              onClick={() => onSelectSensitivity('normal')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                sensitivity === 'normal'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Normal (1.0x)
            </button>
            <button
              onClick={() => onSelectSensitivity('high')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                sensitivity === 'high'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              ⚡ High (1.6x)
            </button>
            <button
              onClick={() => onSelectSensitivity('ultra')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                sensitivity === 'ultra'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              🔥 Ultra (2.4x)
            </button>
          </div>
        </div>

        {/* Primary Start CTA Button */}
        <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
          <button
            data-start="true"
            onClick={onStartGame}
            className="px-8 py-3.5 bg-red-600 hover:bg-red-500 text-white text-base font-bold font-mono tracking-wider uppercase rounded shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:shadow-[0_0_28px_rgba(239,68,68,0.6)] transition-all transform active:scale-95 cursor-pointer"
          >
            Enter 1v1 Arena (Enter)
          </button>
          <button
            onClick={onOpenArmory}
            className="flex items-center gap-2 px-5 py-3.5 bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-200 text-sm font-mono tracking-wide rounded cursor-pointer transition-colors"
          >
            <Shield className="w-4 h-4 text-amber-400" />
            <span>Armory & Weapons</span>
          </button>
        </div>
      </div>

      {/* Flat Control Hints in bottom safe margin */}
      <div className="z-10 text-center text-xs font-mono text-slate-500 tracking-wider">
        WASD Move · Real Push-Ups Attack · Esc Pause
      </div>
    </div>
  );
};
