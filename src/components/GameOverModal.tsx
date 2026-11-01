/**
 * Outcome-Matched Status Modal (Defeat or Victory).
 * Conforms to game guidelines: displays mastery and progress-toward-goal metrics with data-start="true" CTA.
 */

import React from 'react';
import { Trophy, Skull, RotateCcw, Home, Activity, Flame } from 'lucide-react';
import { WorkoutSessionStats } from '../types/game';

interface GameOverModalProps {
  isVictory: boolean;
  floorReached: number;
  workout: WorkoutSessionStats;
  onPlayAgain: () => void;
  onExitToTitle: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isVictory,
  floorReached,
  workout,
  onPlayAgain,
  onExitToTitle,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 select-none font-mono">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl flex flex-col items-center text-center">
        {/* Outcome Header */}
        <div className="mb-3">
          {isVictory ? (
            <div className="w-16 h-16 rounded-full bg-amber-950/60 border border-amber-500/60 flex items-center justify-center text-amber-400 mx-auto shadow-[0_0_20px_rgba(245,158,11,0.4)]">
              <Trophy className="w-8 h-8" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-red-950/60 border border-red-500/60 flex items-center justify-center text-red-400 mx-auto shadow-[0_0_20px_rgba(239,68,68,0.4)]">
              <Skull className="w-8 h-8" />
            </div>
          )}
        </div>

        <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-white">
          {isVictory ? 'Catacombs Conquered!' : 'Fallen in Battle'}
        </h2>
        <p className="text-xs text-slate-400 mt-1 mb-6">
          {isVictory
            ? 'Your physical discipline obliterated the dungeon depths.'
            : 'Fatigue claimed you on the iron stones. Rise stronger.'}
        </p>

        {/* Workout & Run Mastery Metric Tiles */}
        <div className="w-full grid grid-cols-2 gap-2.5 mb-6 text-left">
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
            <span className="text-[10px] text-slate-500 uppercase block font-bold">Total Push-Ups</span>
            <span className="text-2xl font-black text-white tabular-nums">{workout.validReps}</span>
            <span className="text-[9px] text-slate-500 block">Reps Validated</span>
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
            <span className="text-[10px] text-slate-500 uppercase block font-bold">Form Accuracy</span>
            <span className="text-2xl font-black text-emerald-400 tabular-nums">{workout.avgFormScore}%</span>
            <span className="text-[9px] text-slate-500 block">Avg Quality</span>
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
            <span className="text-[10px] text-slate-500 uppercase block font-bold">Best Streak</span>
            <span className="text-2xl font-black text-amber-400 tabular-nums">{workout.bestStreak}x</span>
            <span className="text-[9px] text-slate-500 block">Unbroken Reps</span>
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
            <span className="text-[10px] text-slate-500 uppercase block font-bold">Floor Reached</span>
            <span className="text-2xl font-black text-cyan-400 tabular-nums">Floor {floorReached}</span>
            <span className="text-[9px] text-slate-500 block">{workout.estimatedCalories} kcal burned</span>
          </div>
        </div>

        {/* Actions */}
        <div className="w-full flex flex-col gap-2.5">
          <button
            data-start="true"
            onClick={onPlayAgain}
            className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white rounded font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Try Again (Enter)</span>
          </button>

          <button
            onClick={onExitToTitle}
            className="w-full py-2.5 bg-transparent hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 rounded font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Return to Title</span>
          </button>
        </div>
      </div>
    </div>
  );
};
