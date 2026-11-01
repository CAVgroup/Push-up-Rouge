/**
 * Core game state, hero stats, and workout statistics.
 */

import { WeaponDefinition } from './weapon';

export type GameStatus = 'title' | 'playing' | 'paused' | 'gameover' | 'victory';

export interface HeroState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  hp: number;
  maxHp: number;
  essence: number;
  level: number;
  xp: number;
  xpNext: number;
  isAttacking: boolean;
  attackTimer: number;
  attackSlashAngle: number;
  comboCount: number;
  comboTimer: number;
  invulnerableTimer: number;
  stamina: number;
  maxStamina: number;
  equippedWeapon: WeaponDefinition;
}

export interface WorkoutSessionStats {
  totalReps: number;
  validReps: number;
  failedReps: number;
  currentStreak: number;
  bestStreak: number;
  perfectReps: number;
  sessionStartTime: number;
  totalActiveSeconds: number;
  avgCadenceBpm: number;
  avgFormScore: number;
  estimatedCalories: number;
}

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  vy: number;
  color: string;
  alpha: number;
  scale: number;
  isCrit: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  shape: 'square' | 'spark' | 'ring' | 'slash';
}

export interface LightningArc {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  life: number;
  maxLife: number;
  branches: Array<{ x: number; y: number }>;
}

export interface SlashEffect {
  x: number;
  y: number;
  angle: number;
  radius: number;
  arc: number;
  color: string;
  life: number;
  maxLife: number;
}
