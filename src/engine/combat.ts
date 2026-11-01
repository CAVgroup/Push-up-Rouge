/**
 * Pure Combat Engine.
 * Resolves event-driven player attacks when physical push-ups are validated,
 * applying weapon arcs, special effects, hitstop, and critical damage scaling.
 */

import { HeroState, FloatingText, SlashEffect, LightningArc } from '../types/game';
import { RuntimeEnemy } from '../types/enemy';
import { WeaponDefinition } from '../types/weapon';
import { RepValidationResult } from '../types/fitness';
import { gameEvents } from './events';

export interface CombatResult {
  totalDamage: number;
  enemiesHit: number;
  enemiesKilled: number;
  isCrit: boolean;
  hitstopDuration: number;
}

export class CombatEngine {
  /**
   * Resolve an attack triggered by a validated push-up rep.
   */
  public static executeRepAttack(
    hero: HeroState,
    enemies: RuntimeEnemy[],
    weapon: WeaponDefinition,
    rep: RepValidationResult,
    floatingTexts: FloatingText[],
    slashEffects: SlashEffect[],
    lightningArcs: LightningArc[]
  ): CombatResult {
    // Determine critical roll: base crit + form quality boost
    const formCritBoost = rep.quality === 'PERFECT' ? 0.35 : rep.quality === 'GREAT' ? 0.15 : 0;
    const isCrit = Math.random() < (weapon.critChance + formCritBoost);

    // Calculate final attack power
    const critMultiplier = isCrit ? weapon.critMultiplier : 1.0;
    const totalPowerMultiplier = rep.bonusMultiplier * critMultiplier;
    const rawDamage = Math.round(weapon.baseDamage * totalPowerMultiplier);

    // Direction angle towards closest enemy or player's current facing
    let attackAngle = hero.facing === 1 ? 0 : Math.PI;
    const livingEnemies = enemies.filter((e) => e.hp > 0 && e.state !== 'dying');

    if (livingEnemies.length > 0) {
      // Find closest enemy to orient attack slash
      let closest = livingEnemies[0];
      let minDistSq = Infinity;
      for (const e of livingEnemies) {
        const dSq = (e.x - hero.x) ** 2 + (e.y - hero.y) ** 2;
        if (dSq < minDistSq) {
          minDistSq = dSq;
          closest = e;
        }
      }
      attackAngle = Math.atan2(closest.y - hero.y, closest.x - hero.x);
    }

    // Spawn visual slash wave
    slashEffects.push({
      x: hero.x,
      y: hero.y,
      angle: attackAngle,
      radius: weapon.attackRange,
      arc: (weapon.attackArc * Math.PI) / 180,
      color: weapon.color,
      life: 0.28,
      maxLife: 0.28,
    });

    let enemiesHit = 0;
    let enemiesKilled = 0;
    let totalDamage = 0;

    // Check hit logic for each living enemy
    for (const enemy of livingEnemies) {
      const dx = enemy.x - hero.x;
      const dy = enemy.y - hero.y;
      const distance = Math.hypot(dx, dy);

      let isHit = false;

      if (weapon.specialEffect === 'lightning_chain') {
        // Lightning hits all enemies within broad screen range
        if (distance <= 450) {
          isHit = true;
          // Spawn lightning visual arc from hero to enemy
          lightningArcs.push({
            startX: hero.x,
            startY: hero.y,
            endX: enemy.x,
            endY: enemy.y,
            life: 0.22,
            maxLife: 0.22,
            branches: [
              { x: (hero.x + enemy.x) / 2 + (Math.random() - 0.5) * 40, y: (hero.y + enemy.y) / 2 + (Math.random() - 0.5) * 40 },
            ],
          });
        }
      } else if (weapon.specialEffect === 'dimension_rift') {
        // Piercing ray in attack direction
        const enemyAngle = Math.atan2(dy, dx);
        let angleDiff = Math.abs(enemyAngle - attackAngle);
        while (angleDiff > Math.PI) angleDiff = Math.abs(angleDiff - 2 * Math.PI);

        if (distance <= weapon.attackRange * 1.5 && angleDiff < 0.8) {
          isHit = true;
        }
      } else {
        // Standard arc / cleave check
        const enemyAngle = Math.atan2(dy, dx);
        let angleDiff = Math.abs(enemyAngle - attackAngle);
        while (angleDiff > Math.PI) angleDiff = Math.abs(angleDiff - 2 * Math.PI);

        const halfArcRad = ((weapon.attackArc / 2) * Math.PI) / 180;
        if (distance <= weapon.attackRange && angleDiff <= halfArcRad) {
          isHit = true;
        }
      }

      if (isHit) {
        enemiesHit++;
        const damageDealt = Math.min(enemy.hp, rawDamage);
        enemy.hp -= damageDealt;
        totalDamage += damageDealt;

        // Knockback vector
        const knockbackDist = isCrit ? 60 : 35;
        const normDist = Math.max(1, distance);
        enemy.vx = (dx / normDist) * knockbackDist;
        enemy.vy = (dy / normDist) * knockbackDist;
        enemy.hitFlashTimer = 0.08;
        enemy.state = 'hit';
        enemy.stateTimer = 0.2;

        // Floating combat damage numbers
        floatingTexts.push({
          id: Math.random().toString(),
          text: isCrit ? `${damageDealt} CRIT!` : `${damageDealt}`,
          x: enemy.x + (Math.random() - 0.5) * 20,
          y: enemy.y - 30,
          vy: -60,
          color: isCrit ? '#fef08a' : rep.quality === 'PERFECT' ? '#38bdf8' : '#ffffff',
          alpha: 1.0,
          scale: isCrit ? 1.4 : 1.0,
          isCrit,
        });

        gameEvents.emit('ENEMY_HIT', {
          enemyUid: enemy.uid,
          damage: damageDealt,
          isCrit,
          knockbackX: enemy.vx,
          knockbackY: enemy.vy,
          targetX: enemy.x,
          targetY: enemy.y,
        });

        if (enemy.hp <= 0) {
          enemiesKilled++;
          enemy.state = 'dying';
          enemy.stateTimer = 0.45; // KO dissolve duration
          hero.essence += enemy.def.dropEssence;
          hero.xp += enemy.def.dropXP;

          gameEvents.emit('ENEMY_KILLED', {
            enemyUid: enemy.uid,
            enemyName: enemy.def.name,
            dropXP: enemy.def.dropXP,
            dropEssence: enemy.def.dropEssence,
            x: enemy.x,
            y: enemy.y,
          });
        }
      }
    }

    // Trigger hero visual attack state
    hero.isAttacking = true;
    hero.attackTimer = 0.32;
    hero.attackSlashAngle = attackAngle;
    hero.comboCount++;
    hero.comboTimer = 2.5;

    // Dispatch HERO_ATTACK event
    gameEvents.emit('HERO_ATTACK', {
      weapon,
      powerMultiplier: totalPowerMultiplier,
      isCrit,
      hitCount: enemiesHit,
      formQuality: rep.quality,
    });

    // Camera shake scaled to impact
    const shakeIntensity = isCrit ? 12 : enemiesHit > 1 ? 8 : 4;
    gameEvents.emit('SCREEN_SHAKE', { intensity: shakeIntensity, duration: 0.18 });

    return {
      totalDamage,
      enemiesHit,
      enemiesKilled,
      isCrit,
      hitstopDuration: enemiesHit > 0 ? weapon.hitstopDuration : 0,
    };
  }
}
