/**
 * Minimalist, Low-Occlusion In-Game HUD.
 * Keeps >85% of the playfield unobstructed. Zero backdrop-filter over active canvas.
 * Perimeter clusters for vitality, push-up depth arc, workout streak, and weapon badge.
 */

import React from 'react';
import { Volume2, VolumeX, Pause, Shield, Zap, Flame } from 'lucide-react';
import { HeroState, WorkoutSessionStats } from '../types/game';
import { PushUpPhase } from '../types/fitness';

interface MinimalHUDProps {
  hero: HeroState;
  workout: WorkoutSessionStats;
  currentFloor: number;
  currentWave: number;
  exercisePhase: PushUpPhase;
  elbowAngle: number;
  depthPercent: number;
  formFeedback: string;
  isMuted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onOpenArmory: () => void;
}

export const MinimalHUD: React.FC<MinimalHUDProps> = ({
  hero,
  workout,
  currentFloor,
  currentWave,
  exercisePhase,
  elbowAngle,
  depthPercent,
  formFeedback,
  isMuted,
  onToggleMute,
  onPause,
  onOpenArmory,
}) => {
  // Compute health pip count (5 pips, each represents 20 hp)
  const totalPips = 5;
  const hpPerPip = hero.maxHp / totalPips;
  const currentPips = Math.ceil(hero.hp / hpPerPip);

  // Dynamic color for pushup depth ring
  const ringColor =
    depthPercent >= 0.85
      ? '#22c55e' // Green (Full depth)
      : depthPercent >= 0.5
      ? '#f59e0b' // Amber (Descending)
      : '#38bdf8'; // Cyan (Ready)

  return (
    <div className="fixed inset-0 pointer-events-none z-30 flex flex-col justify-between p-4 sm:p-6 select-none font-mono">
      {/* Top Bar: Cluster Left, Center Rep Counter, Cluster Right */}
      <div className="flex justify-between items-start w-full">
        {/* Top-Left: Hero Health Pips & Floor Progress */}
        <div className="flex flex-col gap-1.5 pointer-events-auto bg-slate-950/80 border border-slate-800/90 rounded-lg p-2.5 shadow-md">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">HP</span>
            <div className="flex gap-1">
              {Array.from({ length: totalPips }).map((_, i) => {
                const isFull = i < currentPips;
                const isCracked = i === currentPips - 1 && hero.hp % hpPerPip !== 0 && hero.hp % hpPerPip < hpPerPip * 0.5;

                return (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-sm border transition-colors ${
                      isFull
                        ? 'bg-red-600 border-red-400 shadow-[0_0_6px_rgba(239,68,68,0.6)]'
                        : isCracked
                        ? 'bg-red-950 border-red-500/60'
                        : 'bg-slate-900 border-slate-700/50'
                    }`}
                  />
                );
              })}
            </div>
            <span className="text-xs text-red-400 font-bold tabular-nums ml-1">
              {Math.round(hero.hp)}/{hero.maxHp}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-300">
            <div>
              <span className="text-slate-500 text-[10px]">DUEL </span>
              <span className="text-amber-400 font-bold tabular-nums">#{currentFloor}</span>
              <span className="text-slate-500 text-[10px]"> 1v1</span>
            </div>
            <div className="text-slate-700">|</div>
            <div>
              <span className="text-slate-500 text-[10px]">ESSENCE </span>
              <span className="text-purple-400 font-bold tabular-nums">{hero.essence}</span>
            </div>
          </div>
        </div>

        {/* Top-Center: Large Rep Readout & Push-Up Depth Arc */}
        <div className="flex flex-col items-center">
          <div className="relative flex items-center justify-center">
            {/* SVG Circular Depth Progress Ring */}
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" stroke="#1e293b" strokeWidth="6" fill="rgba(15, 23, 42, 0.75)" />
              <circle
                cx="50"
                cy="50"
                r="42"
                stroke={ringColor}
                strokeWidth="6"
                strokeDasharray={264}
                strokeDashoffset={264 * (1 - depthPercent)}
                strokeLinecap="round"
                fill="none"
                className="transition-all duration-75"
              />
            </svg>

            {/* Rep Counter in Tabular Numerals */}
            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-black text-white tabular-nums drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                {workout.validReps}
              </span>
              <span className="text-[9px] text-slate-400 uppercase tracking-widest -mt-1">REPS</span>
            </div>
          </div>

          {/* Form & Phase Guidance Pill */}
          <div className="mt-1 px-3 py-0.5 rounded-full bg-slate-900/90 border border-slate-700 text-[11px] font-bold text-center tracking-wide">
            {exercisePhase === 'BOTTOM_HOLD' ? (
              <span className="text-emerald-400 animate-pulse">LOCKOUT NOW!</span>
            ) : exercisePhase === 'DESCENDING' ? (
              <span className="text-amber-400">LOWER CHEST ({Math.round(elbowAngle)}°)</span>
            ) : exercisePhase === 'ASCENDING' ? (
              <span className="text-cyan-400">PRESS UP!</span>
            ) : (
              <span className="text-slate-300">{formFeedback || 'READY FOR PUSH-UP'}</span>
            )}
          </div>
        </div>

        {/* Top-Right: Equipped Weapon Badge & Quick Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Workout Streak Indicator */}
          {workout.currentStreak > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-950/70 border border-amber-600/50 rounded-lg text-amber-300 text-xs shadow-md">
              <Flame className="w-4 h-4 text-amber-500 fill-amber-500 animate-bounce" />
              <span className="font-bold tabular-nums">{workout.currentStreak}x</span>
            </div>
          )}

          {/* Weapon Armory Button */}
          <button
            onClick={onOpenArmory}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 transition-colors shadow-sm cursor-pointer"
            title="Armory & Weapons"
          >
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline font-semibold">{hero.equippedWeapon.name}</span>
          </button>

          {/* Mute Button */}
          <button
            onClick={onToggleMute}
            className="p-2 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 rounded-lg text-slate-300 transition-colors cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Pause Button */}
          <button
            onClick={onPause}
            className="p-2 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 rounded-lg text-slate-300 transition-colors cursor-pointer"
            title="Pause (Esc)"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Bar: Quick Workout Telemetry */}
      <div className="flex justify-between items-end w-full">
        {/* Left: Session Telemetry */}
        <div className="pointer-events-auto bg-slate-950/80 border border-slate-800/90 rounded-lg px-3 py-2 text-xs flex gap-4 text-slate-400 shadow-md">
          <div>
            <span className="text-[10px] text-slate-500 block uppercase">Cadence</span>
            <span className="text-white font-bold tabular-nums">{workout.avgCadenceBpm} BPM</span>
          </div>
          <div className="border-r border-slate-800" />
          <div>
            <span className="text-[10px] text-slate-500 block uppercase">Form Avg</span>
            <span className="text-emerald-400 font-bold tabular-nums">{workout.avgFormScore}%</span>
          </div>
          <div className="border-r border-slate-800" />
          <div>
            <span className="text-[10px] text-slate-500 block uppercase">Calories</span>
            <span className="text-amber-400 font-bold tabular-nums">{workout.estimatedCalories} kcal</span>
          </div>
        </div>

        {/* Right: Flat control hint */}
        <div className="text-[11px] text-slate-500 tracking-wider">
          Push-Up Lockout Strikes Challenger
        </div>
      </div>
    </div>
  );
};
