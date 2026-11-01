/**
 * Dungeon Manager & Modular Enemy AI Coordinator.
 * Spawns waves, manages enemy behaviors, telegraph timers, attack token pool,
 * and seamlessly integrates community JSON modded enemies.
 */

import { EnemyDefinition, RuntimeEnemy } from '../types/enemy';
import { HeroState, FloatingText } from '../types/game';
import defaultEnemies from '../data/enemies.json';
import { gameEvents } from './events';

export class DungeonManager {
  private currentFloor = 1;
  private waveNumber = 1;
  private maxWavesPerFloor = 3;
  private enemyRegistry: Map<string, EnemyDefinition> = new Map();
  private enemies: RuntimeEnemy[] = [];
  private attackTokens = 3; // Maximum concurrent enemies winding up attacks
  private floorDimensions = { width: 1200, height: 800 };

  constructor() {
    this.loadDefaultEnemies();
  }

  public loadDefaultEnemies(): void {
    defaultEnemies.forEach((def) => {
      this.enemyRegistry.set(def.id, def as EnemyDefinition);
    });
  }

  public registerCustomEnemy(def: EnemyDefinition): void {
    this.enemyRegistry.set(def.id, def);
  }

  public getAllEnemyDefinitions(): EnemyDefinition[] {
    return Array.from(this.enemyRegistry.values());
  }

  public getEnemies(): RuntimeEnemy[] {
    return this.enemies;
  }

  public getCurrentFloor(): number {
    return this.currentFloor;
  }

  public getWaveNumber(): number {
    return this.waveNumber;
  }

  public isBossWave(): boolean {
    return this.currentFloor % 5 === 0 && this.waveNumber === this.maxWavesPerFloor;
  }

  /**
   * Spawns strictly ONE challenger enemy for a focused 1v1 duel.
   */
  public spawnWave(hero: HeroState): void {
    this.enemies = [];
    const availablePool = Array.from(this.enemyRegistry.values());
    if (availablePool.length === 0) return;

    // Pick challenger based on current duel number
    let def: EnemyDefinition;

    // Every 5th duel is a Titan Boss duel
    if (this.currentFloor % 5 === 0 && this.enemyRegistry.has('iron_golem_boss')) {
      def = this.enemyRegistry.get('iron_golem_boss')!;
    } else {
      const regularPool = availablePool.filter((e) => e.behavior !== 'boss');
      const pool = regularPool.length > 0 ? regularPool : availablePool;
      const index = (this.currentFloor - 1) % pool.length;
      def = pool[index];
    }

    // Spawn exactly ONE single enemy directly across from the player in the 1v1 arena
    const spawnX = Math.max(200, Math.min(this.floorDimensions.width - 200, hero.x + 220));
    const spawnY = hero.y;

    // Scale challenger HP smoothly by duel rank
    const hpMultiplier = 1 + (this.currentFloor - 1) * 0.2;
    const scaledDef: EnemyDefinition = {
      ...def,
      hp: Math.round(def.hp * hpMultiplier),
      maxHp: Math.round(def.hp * hpMultiplier),
    };

    this.enemies.push(this.createRuntimeEnemy(scaledDef, spawnX, spawnY, 0));
  }

  private createRuntimeEnemy(def: EnemyDefinition, x: number, y: number, idx: number): RuntimeEnemy {
    return {
      uid: `${def.id}_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      defId: def.id,
      def,
      x,
      y,
      vx: 0,
      vy: 0,
      hp: def.hp,
      maxHp: def.hp,
      state: 'chasing',
      stateTimer: 0,
      facing: 1,
      hitFlashTimer: 0,
      knockbackTimer: 0,
      orbitAngle: Math.random() * Math.PI * 2,
      scalePulse: 1.0,
    };
  }

  /**
   * Update enemy behaviors, telegraphs, movement, and attacks against the player.
   */
  public update(dt: number, hero: HeroState, floatingTexts: FloatingText[]): void {
    let tokensInUse = 0;

    // Filter out completely dead dissolved enemies
    this.enemies = this.enemies.filter((enemy) => {
      if (enemy.state === 'dying') {
        enemy.stateTimer -= dt;
        return enemy.stateTimer > 0;
      }
      return true;
    });

    for (const enemy of this.enemies) {
      // Hit flash decay
      if (enemy.hitFlashTimer > 0) {
        enemy.hitFlashTimer = Math.max(0, enemy.hitFlashTimer - dt);
      }

      // Knockback velocity dampening
      if (Math.abs(enemy.vx) > 0.1 || Math.abs(enemy.vy) > 0.1) {
        enemy.x += enemy.vx * dt;
        enemy.y += enemy.vy * dt;
        enemy.vx *= 0.88;
        enemy.vy *= 0.88;
      }

      if (enemy.state === 'dying') continue;

      if (enemy.state === 'hit') {
        enemy.stateTimer -= dt;
        if (enemy.stateTimer <= 0) {
          enemy.state = 'chasing';
        }
        continue;
      }

      const dx = hero.x - enemy.x;
      const dy = hero.y - enemy.y;
      const dist = Math.hypot(dx, dy);
      enemy.facing = dx >= 0 ? 1 : -1;

      // Count active telegraphs against token pool
      if (enemy.state === 'telegraphing') {
        tokensInUse++;
      }

      switch (enemy.state) {
        case 'chasing': {
          // Behavior-specific movement
          if (enemy.def.behavior === 'kiter') {
            // Keep at preferred distance (160-220px)
            const targetDist = 180;
            if (dist < targetDist - 30) {
              // Back away
              enemy.x -= (dx / Math.max(1, dist)) * enemy.def.speed * dt;
              enemy.y -= (dy / Math.max(1, dist)) * enemy.def.speed * dt;
            } else if (dist > targetDist + 40) {
              // Close in slightly
              enemy.x += (dx / Math.max(1, dist)) * (enemy.def.speed * 0.8) * dt;
              enemy.y += (dy / Math.max(1, dist)) * (enemy.def.speed * 0.8) * dt;
            }
          } else if (enemy.def.behavior === 'flanker') {
            // Circle around player before striking
            enemy.orbitAngle += dt * 1.5;
            const targetX = hero.x + Math.cos(enemy.orbitAngle) * 150;
            const targetY = hero.y + Math.sin(enemy.orbitAngle) * 150;
            const toTargetX = targetX - enemy.x;
            const toTargetY = targetY - enemy.y;
            const toDist = Math.hypot(toTargetX, toTargetY);
            if (toDist > 10) {
              enemy.x += (toTargetX / toDist) * enemy.def.speed * dt;
              enemy.y += (toTargetY / toDist) * enemy.def.speed * dt;
            }
          } else {
            // Swarmer, charger, boss move towards player
            if (dist > enemy.def.attackRange) {
              enemy.x += (dx / Math.max(1, dist)) * enemy.def.speed * dt;
              enemy.y += (dy / Math.max(1, dist)) * enemy.def.speed * dt;
            }
          }

          // Trigger attack telegraph if in range and tokens available
          if (dist <= enemy.def.attackRange && tokensInUse < this.attackTokens) {
            enemy.state = 'telegraphing';
            enemy.stateTimer = enemy.def.attackWindup;
            tokensInUse++;
          }
          break;
        }

        case 'telegraphing': {
          enemy.stateTimer -= dt;
          // Pulse scale during windup
          enemy.scalePulse = 1.0 + Math.sin(enemy.stateTimer * 20) * 0.08;

          if (enemy.stateTimer <= 0) {
            // Strike!
            enemy.state = 'attacking';
            enemy.stateTimer = 0.2; // Attack active frame duration
            this.resolveEnemyAttack(enemy, hero, floatingTexts);
          }
          break;
        }

        case 'attacking': {
          enemy.stateTimer -= dt;
          if (enemy.stateTimer <= 0) {
            enemy.state = 'recovering';
            enemy.stateTimer = enemy.def.attackCooldown;
            enemy.scalePulse = 1.0;
          }
          break;
        }

        case 'recovering': {
          enemy.stateTimer -= dt;
          if (enemy.stateTimer <= 0) {
            enemy.state = 'chasing';
          }
          break;
        }
      }
    }
  }

  /**
   * Resolve enemy strike against the player.
   */
  private resolveEnemyAttack(enemy: RuntimeEnemy, hero: HeroState, floatingTexts: FloatingText[]): void {
    const dist = Math.hypot(hero.x - enemy.x, hero.y - enemy.y);

    // If hero is within attack range and not in invulnerability frame
    if (dist <= enemy.def.attackRange * 1.25 && hero.invulnerableTimer <= 0) {
      const damage = enemy.def.attackDamage;
      hero.hp = Math.max(0, hero.hp - damage);
      hero.invulnerableTimer = 0.6; // Brief grace period

      floatingTexts.push({
        id: Math.random().toString(),
        text: `-${damage}`,
        x: hero.x + (Math.random() - 0.5) * 15,
        y: hero.y - 40,
        vy: -50,
        color: '#ef4444',
        alpha: 1.0,
        scale: 1.2,
        isCrit: false,
      });

      gameEvents.emit('HERO_DAMAGED', {
        damage,
        currentHp: hero.hp,
        maxHp: hero.maxHp,
        source: enemy.def.name,
      });

      gameEvents.emit('SCREEN_SHAKE', { intensity: 7, duration: 0.2 });
    }
  }

  public nextWave(hero: HeroState): boolean {
    this.currentFloor++;
    this.waveNumber = 1;
    gameEvents.emit('FLOOR_CLEARED', { floor: this.currentFloor - 1, repsSpent: 0 });
    this.spawnWave(hero);
    return true; // New duel challenger
  }
}
