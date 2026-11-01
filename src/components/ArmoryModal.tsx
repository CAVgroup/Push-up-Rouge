/**
 * Weapon Armory & Workout Progression Modal.
 * Unlocks weapons based on workout streaks, career reps, and intensity milestones.
 */

import React from 'react';
import { X, Check, Lock, Shield, Zap, Flame, Compass, Sparkles } from 'lucide-react';
import { WeaponDefinition, PlayerWeaponProgression } from '../types/weapon';
import { WorkoutSessionStats } from '../types/game';

interface ArmoryModalProps {
  weapons: WeaponDefinition[];
  progression: PlayerWeaponProgression;
  workout: WorkoutSessionStats;
  onEquipWeapon: (weaponId: string) => void;
  onClose: () => void;
}

export const ArmoryModal: React.FC<ArmoryModalProps> = ({
  weapons,
  progression,
  workout,
  onEquipWeapon,
  onClose,
}) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'daggers':
        return <Sparkles className="w-5 h-5 text-emerald-400" />;
      case 'greatsword':
        return <Flame className="w-5 h-5 text-red-400" />;
      case 'hammer':
        return <Zap className="w-5 h-5 text-amber-400" />;
      case 'shield_spear':
        return <Shield className="w-5 h-5 text-blue-400" />;
      case 'katana':
        return <Compass className="w-5 h-5 text-purple-400" />;
      default:
        return <Shield className="w-5 h-5 text-cyan-400" />;
    }
  };

  const getMetricProgress = (req: WeaponDefinition['requirement']) => {
    switch (req.metric) {
      case 'total_reps':
        return { current: workout.totalReps, target: req.threshold, label: 'Career Reps' };
      case 'streak':
        return { current: workout.bestStreak, target: req.threshold, label: 'Best Streak' };
      case 'intensity_cadence':
        return { current: workout.avgCadenceBpm, target: req.threshold, label: 'Pace BPM' };
      case 'perfect_reps':
        return { current: workout.perfectReps, target: req.threshold, label: 'Perfect Form Reps' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 select-none font-mono">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div>
            <h2 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-400" />
              <span>Iron Forge Armory</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Unlock relics through workout streaks, intensity tempo, and perfect form.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Weapons Grid */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          {weapons.map((weapon) => {
            const isUnlocked = progression.unlockedWeaponIds.includes(weapon.id);
            const isEquipped = progression.equippedWeaponId === weapon.id;
            const progress = getMetricProgress(weapon.requirement);
            const progressPct = Math.min(100, Math.round((progress.current / Math.max(1, progress.target)) * 100));

            return (
              <div
                key={weapon.id}
                className={`p-4 rounded-lg border flex flex-col justify-between transition-all ${
                  isEquipped
                    ? 'bg-slate-800/90 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                    : isUnlocked
                    ? 'bg-slate-900/80 border-slate-700 hover:border-slate-600'
                    : 'bg-slate-950/60 border-slate-800/80 opacity-70'
                }`}
              >
                <div>
                  {/* Weapon Title & Badge */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded bg-slate-800 border border-slate-700">
                        {getIcon(weapon.type)}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white tracking-wide">{weapon.name}</h3>
                        <span className="text-[10px] text-amber-400 uppercase tracking-widest">{weapon.title}</span>
                      </div>
                    </div>

                    {isEquipped ? (
                      <span className="px-2 py-0.5 text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 rounded font-bold uppercase tracking-wider">
                        Equipped
                      </span>
                    ) : isUnlocked ? (
                      <span className="px-2 py-0.5 text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 rounded font-bold uppercase tracking-wider">
                        Unlocked
                      </span>
                    ) : (
                      <div className="flex items-center gap-1 text-[10px] text-slate-500">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Locked</span>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">{weapon.description}</p>

                  {/* Weapon Stats */}
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-slate-800 text-[10px] text-slate-300">
                    <div>
                      <span className="text-slate-500 block">BASE DMG</span>
                      <span className="font-bold text-white tabular-nums">{weapon.baseDamage}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">CRIT CHANCE</span>
                      <span className="font-bold text-amber-400 tabular-nums">
                        {Math.round(weapon.critChance * 100)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">ARC SWEEP</span>
                      <span className="font-bold text-cyan-400 tabular-nums">{weapon.attackArc}°</span>
                    </div>
                  </div>
                </div>

                {/* Unlock Requirement or Equip Button */}
                <div className="mt-4 pt-3 border-t border-slate-800/80">
                  {isUnlocked ? (
                    <button
                      onClick={() => onEquipWeapon(weapon.id)}
                      disabled={isEquipped}
                      className={`w-full py-2 text-xs font-bold uppercase tracking-wider rounded transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                        isEquipped
                          ? 'bg-cyan-950/60 text-cyan-400 border border-cyan-800/60 cursor-default'
                          : 'bg-red-600 hover:bg-red-500 text-white'
                      }`}
                    >
                      {isEquipped ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Currently Equipped</span>
                        </>
                      ) : (
                        <span>Equip Weapon</span>
                      )}
                    </button>
                  ) : (
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>{weapon.requirement.description}</span>
                        <span className="font-bold text-amber-400 tabular-nums">
                          {progress.current} / {progress.target}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 transition-all duration-300"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
