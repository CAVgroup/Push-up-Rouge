import test from 'node:test';
import assert from 'node:assert/strict';
import { CombatEngine } from '../engine/combat';
import { HeroState } from '../types/game';
import { RuntimeEnemy } from '../types/enemy';
import { WeaponDefinition } from '../types/weapon';
import { RepValidationResult } from '../types/fitness';

const mockWeapon: WeaponDefinition = {
  id: 'test_sword',
  name: 'Test Sword',
  title: 'Test',
  type: 'sword',
  description: 'Test weapon',
  baseDamage: 30,
  attackRange: 120,
  attackArc: 180,
  hitstopDuration: 0.05,
  critChance: 0.0, // 0 for deterministic testing
  critMultiplier: 2.0,
  specialEffect: 'standard',
  color: '#ffffff',
  accentColor: '#cccccc',
  iconSvg: 'sword',
  requirement: {
    metric: 'total_reps',
    threshold: 0,
    description: 'None',
  },
};

const mockRep: RepValidationResult = {
  repNumber: 1,
  quality: 'GOOD',
  formScore: 80,
  elbowAngle: 90,
  depthPercent: 0.85,
  durationMs: 1200,
  cadenceBpm: 20,
  bonusMultiplier: 1.2,
  feedback: 'Good',
};

test('CombatEngine: damages living enemy within weapon range and applies form multiplier', () => {
  const hero: HeroState = {
    x: 100,
    y: 100,
    vx: 0,
    vy: 0,
    facing: 1,
    hp: 100,
    maxHp: 100,
    essence: 0,
    level: 1,
    xp: 0,
    xpNext: 100,
    isAttacking: false,
    attackTimer: 0,
    attackSlashAngle: 0,
    comboCount: 0,
    comboTimer: 0,
    invulnerableTimer: 0,
    stamina: 100,
    maxStamina: 100,
    equippedWeapon: mockWeapon,
  };

  const enemy: RuntimeEnemy = {
    uid: 'enemy_1',
    defId: 'goblin',
    def: {
      id: 'goblin',
      name: 'Goblin',
      lore: 'Small fiend',
      hp: 50,
      speed: 60,
      attackDamage: 10,
      attackRange: 30,
      attackWindup: 0.5,
      attackCooldown: 1.0,
      behavior: 'swarmer',
      visual: {
        primaryColor: '#ef4444',
        accentColor: '#f87171',
        glowColor: '#dc2626',
        scale: 1,
        shape: 'beast',
      },
      telegraph: { type: 'circle', color: 'red', radius: 30 },
      dropXP: 10,
      dropEssence: 2,
    },
    x: 150, // 50px away, well within 120px range
    y: 100,
    vx: 0,
    vy: 0,
    hp: 50,
    maxHp: 50,
    state: 'chasing',
    stateTimer: 0,
    facing: -1,
    hitFlashTimer: 0,
    knockbackTimer: 0,
    orbitAngle: 0,
    scalePulse: 1,
  };

  const floatingTexts: any[] = [];
  const slashEffects: any[] = [];
  const lightningArcs: any[] = [];

  const result = CombatEngine.executeRepAttack(
    hero,
    [enemy],
    mockWeapon,
    mockRep,
    floatingTexts,
    slashEffects,
    lightningArcs
  );

  assert.equal(result.enemiesHit, 1);
  // Base 30 * 1.2 bonusMultiplier = 36 damage
  assert.equal(result.totalDamage, 36);
  assert.equal(enemy.hp, 14);
  assert.equal(enemy.state, 'hit');
  assert.ok(slashEffects.length > 0, 'Slash visual effect should be created');
});
