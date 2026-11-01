/**
 * Weapon and unlocking system definitions based on push-up workout milestones and streaks.
 */

export type WeaponType = 'sword' | 'daggers' | 'greatsword' | 'hammer' | 'shield_spear' | 'katana';

export type WeaponUnlockMetric = 
  | 'total_reps'          // e.g. 5 total push-ups
  | 'streak'              // e.g. 10 push-ups in a row with valid form
  | 'intensity_cadence'   // e.g. 25+ reps per minute pace
  | 'perfect_reps';       // e.g. 5 perfect form reps (elbows <= 80°)

export interface WeaponUnlockRequirement {
  metric: WeaponUnlockMetric;
  threshold: number;
  description: string;
}

export type SpecialEffect = 
  | 'standard'         // Reliable direct slash with crisp hitstop
  | 'rapid_flurry'     // Twin slashes with high crit chance
  | 'cleave'           // Massive 220° sweep hitting all foes in arc + extra hitstop
  | 'lightning_chain'  // Summons lightning bolts arcing to all active enemies
  | 'shield_barrier'   // Grants 35% damage reduction & emits defensive shockwave
  | 'dimension_rift';  // Slashes through fabric of space, piercing all enemies in line

export interface WeaponDefinition {
  id: string;
  name: string;
  title: string;
  type: WeaponType;
  description: string;
  baseDamage: number;
  attackRange: number;       // In pixels
  attackArc: number;         // Angle sweep in degrees
  hitstopDuration: number;   // In seconds (e.g. 0.05s)
  critChance: number;        // 0 to 1
  critMultiplier: number;    // e.g. 2.0
  specialEffect: SpecialEffect;
  color: string;
  accentColor: string;
  iconSvg: string;
  requirement: WeaponUnlockRequirement;
}

export interface PlayerWeaponProgression {
  unlockedWeaponIds: string[];
  equippedWeaponId: string;
  unlockedAt: Record<string, string>; // weaponId -> ISO timestamp
}
