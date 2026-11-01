import test from 'node:test';
import assert from 'node:assert/strict';
import { DungeonManager } from '../engine/dungeon';
import { EnemyDefinition } from '../types/enemy';

test('DungeonManager: loads default modular enemies from JSON', () => {
  const manager = new DungeonManager();
  const enemies = manager.getAllEnemyDefinitions();

  assert.ok(enemies.length >= 4, 'Should load at least 4 default enemies');
  const swarmer = enemies.find((e) => e.id === 'goblin_swarmer');
  assert.ok(swarmer, 'Should contain goblin_swarmer');
  assert.equal(swarmer?.behavior, 'swarmer');
  assert.ok(swarmer?.hp && swarmer.hp > 0);
});

test('DungeonManager: allows community custom enemy registration and modding', () => {
  const manager = new DungeonManager();

  const customModEnemy: EnemyDefinition = {
    id: 'community_frost_demon',
    name: 'Frostbite Demon',
    lore: 'A community modded winter fiend.',
    hp: 95,
    speed: 80,
    attackDamage: 22,
    attackRange: 50,
    attackWindup: 0.6,
    attackCooldown: 1.5,
    behavior: 'charger',
    visual: {
      primaryColor: '#38bdf8',
      accentColor: '#e0f2fe',
      glowColor: '#0284c7',
      scale: 1.3,
      shape: 'demon',
      hasHorns: true,
    },
    telegraph: {
      type: 'line',
      color: 'rgba(56, 189, 248, 0.5)',
      range: 90,
    },
    dropXP: 60,
    dropEssence: 20,
  };

  manager.registerCustomEnemy(customModEnemy);
  const found = manager.getAllEnemyDefinitions().find((e) => e.id === 'community_frost_demon');
  assert.ok(found, 'Community modded enemy should be registered');
  assert.equal(found?.name, 'Frostbite Demon');
  assert.equal(found?.visual.shape, 'demon');
});

test('DungeonManager: spawns strictly ONE enemy for 1v1 duel', () => {
  const manager = new DungeonManager();
  const mockHero: any = { x: 400, y: 300 };

  manager.spawnWave(mockHero);
  const activeEnemies = manager.getEnemies();

  assert.equal(activeEnemies.length, 1, 'Must spawn strictly ONE enemy for 1v1 duel');
  assert.ok(activeEnemies[0].hp > 0);
  assert.equal(activeEnemies[0].state, 'chasing');
});

