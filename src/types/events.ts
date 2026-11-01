/**
 * Typed Event Bus signatures for the event-driven game loop.
 * Physical reps drive hero attacks and game reactions.
 */

import { PushUpPhase, FormQuality, RepValidationResult } from './fitness';
import { RuntimeEnemy } from './enemy';
import { WeaponDefinition } from './weapon';

export interface GameEventPayloads {
  // Pushup exercise tracking events
  'EXERCISE_PHASE_CHANGE': {
    phase: PushUpPhase;
    elbowAngle: number;
    depthPercent: number;
    formScore: number;
  };
  'REP_DEPTH_PULSE': {
    depthPercent: number;
    elbowAngle: number;
  };
  'REP_VALIDATED': RepValidationResult;
  'REP_FAILED': {
    reason: string;
    formScore: number;
  };

  // Combat & Game events triggered by reps
  'HERO_ATTACK': {
    weapon: WeaponDefinition;
    powerMultiplier: number;
    isCrit: boolean;
    hitCount: number;
    formQuality: FormQuality;
  };
  'ENEMY_HIT': {
    enemyUid: string;
    damage: number;
    isCrit: boolean;
    knockbackX: number;
    knockbackY: number;
    targetX: number;
    targetY: number;
  };
  'ENEMY_KILLED': {
    enemyUid: string;
    enemyName: string;
    dropXP: number;
    dropEssence: number;
    x: number;
    y: number;
  };
  'HERO_DAMAGED': {
    damage: number;
    currentHp: number;
    maxHp: number;
    source: string;
  };
  'FLOOR_CLEARED': {
    floor: number;
    repsSpent: number;
  };
  'WEAPON_UNLOCKED': {
    weapon: WeaponDefinition;
  };
  'WORKOUT_STREAK_CHANGE': {
    currentStreak: number;
    bestStreak: number;
  };
  'SCREEN_SHAKE': {
    intensity: number;
    duration: number;
  };
}

export type GameEventName = keyof GameEventPayloads;
export type GameEventListener<K extends GameEventName> = (payload: GameEventPayloads[K]) => void;
