/**
 * 2D Dungeon Canvas Renderer.
 * High-performance 60fps rendering for procedural stone dungeons, torchlight,
 * hero animations, modular enemy archetypes, weapon slashes, lightning, and hit particles.
 */

import { HeroState, FloatingText, Particle, SlashEffect, LightningArc } from '../types/game';
import { RuntimeEnemy } from '../types/enemy';

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private floorTileSize = 64;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  public render(
    hero: HeroState,
    enemies: RuntimeEnemy[],
    particles: Particle[],
    floatingTexts: FloatingText[],
    slashEffects: SlashEffect[],
    lightningArcs: LightningArc[],
    screenShake: { x: number; y: number }
  ): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(screenShake.x, screenShake.y);

    // 1. Clear & Background
    ctx.fillStyle = '#090a0f';
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Render Dungeon Floor Tiles
    this.renderDungeonFloor(hero);

    // 3. Render Enemy Attack Telegraphs (Under entities)
    this.renderEnemyTelegraphs(enemies);

    // 4. Render Enemies
    for (const enemy of enemies) {
      this.renderEnemy(enemy);
    }

    // 5. Render Hero
    this.renderHero(hero);

    // 6. Render Weapon Slash Effects
    for (const slash of slashEffects) {
      this.renderSlash(slash);
    }

    // 7. Render Chain Lightning Arcs
    for (const arc of lightningArcs) {
      this.renderLightning(arc);
    }

    // 8. Render Particles
    for (const p of particles) {
      this.renderParticle(p);
    }

    // 9. Render Floating Damage Numbers
    for (const ft of floatingTexts) {
      this.renderFloatingText(ft);
    }

    // 10. Vignette & Torch Glow Overlay
    this.renderAtmosphericLighting(hero);

    ctx.restore();
  }

  private renderDungeonFloor(hero: HeroState): void {
    const ctx = this.ctx;
    const cols = Math.ceil(this.width / this.floorTileSize);
    const rows = Math.ceil(this.height / this.floorTileSize);

    // Stone tile grid
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * this.floorTileSize;
        const y = r * this.floorTileSize;

        const isAlt = (r + c) % 2 === 0;
        ctx.fillStyle = isAlt ? '#11131a' : '#0d0f15';
        ctx.fillRect(x, y, this.floorTileSize, this.floorTileSize);

        ctx.strokeStyle = '#181b24';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, this.floorTileSize, this.floorTileSize);
      }
    }

    // 1v1 Duel Arena Central Combat Ring
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const arenaRadius = Math.min(this.width, this.height) * 0.42;

    ctx.save();
    // Outer Arena Border Ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, arenaRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Inner Inscribed Combat Circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, arenaRadius * 0.75, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Cardinal Arena Marks
    ctx.beginPath();
    ctx.moveTo(centerX - arenaRadius, centerY);
    ctx.lineTo(centerX + arenaRadius, centerY);
    ctx.moveTo(centerX, centerY - arenaRadius);
    ctx.lineTo(centerX, centerY + arenaRadius);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Center Combat Sigil
    ctx.beginPath();
    ctx.arc(centerX, centerY, 32, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  private renderEnemyTelegraphs(enemies: RuntimeEnemy[]): void {
    const ctx = this.ctx;
    for (const enemy of enemies) {
      if (enemy.state !== 'telegraphing' || enemy.hp <= 0) continue;

      const progress = 1 - Math.max(0, enemy.stateTimer / enemy.def.attackWindup);
      const tele = enemy.def.telegraph;

      ctx.save();
      if (tele.type === 'circle') {
        const radius = tele.radius || enemy.def.attackRange;
        // Outer warning circle
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = tele.color;
        ctx.fill();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Expanding inner charge circle
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, radius * progress, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.fill();
      } else if (tele.type === 'line') {
        const range = tele.range || enemy.def.attackRange;
        ctx.beginPath();
        ctx.moveTo(enemy.x, enemy.y);
        ctx.lineTo(enemy.x + enemy.facing * range, enemy.y);
        ctx.strokeStyle = tele.color;
        ctx.lineWidth = 4 + Math.sin(progress * Math.PI) * 4;
        ctx.stroke();
      } else if (tele.type === 'cone') {
        const radius = tele.radius || enemy.def.attackRange;
        ctx.beginPath();
        ctx.moveTo(enemy.x, enemy.y);
        const centerAngle = enemy.facing === 1 ? 0 : Math.PI;
        ctx.arc(enemy.x, enemy.y, radius, centerAngle - 0.5, centerAngle + 0.5);
        ctx.closePath();
        ctx.fillStyle = tele.color;
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private renderEnemy(enemy: RuntimeEnemy): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.scale(enemy.facing * enemy.scalePulse * enemy.def.visual.scale, enemy.scalePulse * enemy.def.visual.scale);

    // KO dissolve alpha
    if (enemy.state === 'dying') {
      ctx.globalAlpha = Math.max(0, enemy.stateTimer / 0.45);
    }

    // Hit flash
    const isHitFlashing = enemy.hitFlashTimer > 0;
    const bodyColor = isHitFlashing ? '#ffffff' : enemy.def.visual.primaryColor;
    const accentColor = isHitFlashing ? '#ffffff' : enemy.def.visual.accentColor;

    // Ground shadow
    ctx.beginPath();
    ctx.ellipse(0, 16, 18, 7, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fill();

    // Body silhouette based on shape
    if (enemy.def.visual.shape === 'beast') {
      // Imp / Swarmer
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.roundRect(-14, -18, 28, 28, [10, 10, 6, 6]);
      ctx.fill();

      // Horns
      if (enemy.def.visual.hasHorns) {
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.moveTo(-8, -18);
        ctx.lineTo(-14, -28);
        ctx.lineTo(-4, -18);
        ctx.moveTo(8, -18);
        ctx.lineTo(14, -28);
        ctx.lineTo(4, -18);
        ctx.fill();
      }

      // Glowing Eyes
      ctx.fillStyle = enemy.def.visual.glowColor;
      ctx.fillRect(4, -12, 4, 4);
      ctx.fillRect(-2, -12, 4, 4);
    } else if (enemy.def.visual.shape === 'undead') {
      // Skeleton Spearman
      ctx.fillStyle = bodyColor;
      // Skull
      ctx.beginPath();
      ctx.arc(0, -18, 10, 0, Math.PI * 2);
      ctx.fill();
      // Ribcage
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(0, 12);
      ctx.moveTo(-8, -4);
      ctx.lineTo(8, -4);
      ctx.moveTo(-7, 2);
      ctx.lineTo(7, 2);
      ctx.stroke();
      // Eye sockets
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(2, -20, 3, 3);
      ctx.fillRect(-6, -20, 3, 3);
      // Spear
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-10, 14);
      ctx.lineTo(24, -16);
      ctx.stroke();
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(24, -16);
      ctx.lineTo(32, -22);
      ctx.lineTo(26, -10);
      ctx.fill();
    } else if (enemy.def.visual.shape === 'spectre') {
      // Ghost / Wraith
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.arc(0, -14, 14, Math.PI, 0);
      ctx.lineTo(14, 12);
      ctx.lineTo(7, 6);
      ctx.lineTo(0, 14);
      ctx.lineTo(-7, 6);
      ctx.lineTo(-14, 12);
      ctx.closePath();
      ctx.fill();
      // Eyes
      ctx.fillStyle = enemy.def.visual.glowColor;
      ctx.fillRect(2, -16, 4, 4);
      ctx.fillRect(-7, -16, 4, 4);
    } else {
      // Titan / Gargoyle / Boss
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.roundRect(-22, -28, 44, 44, [8, 8, 4, 4]);
      ctx.fill();

      // Armor plates
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 3;
      ctx.strokeRect(-18, -24, 36, 36);

      // Boss Horns
      ctx.fillStyle = enemy.def.visual.glowColor;
      ctx.beginPath();
      ctx.moveTo(-16, -28);
      ctx.lineTo(-26, -44);
      ctx.lineTo(-8, -28);
      ctx.moveTo(16, -28);
      ctx.lineTo(26, -44);
      ctx.lineTo(8, -28);
      ctx.fill();

      // Glowing Visor
      ctx.fillStyle = enemy.def.visual.glowColor;
      ctx.fillRect(-10, -18, 20, 5);
    }

    // Health Bar above enemy
    if (enemy.hp < enemy.maxHp && enemy.state !== 'dying') {
      const barW = 34 * enemy.def.visual.scale;
      const barH = 4;
      const hpRatio = Math.max(0, enemy.hp / enemy.maxHp);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(-barW / 2, -36, barW, barH);
      ctx.fillStyle = hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.25 ? '#eab308' : '#ef4444';
      ctx.fillRect(-barW / 2, -36, barW * hpRatio, barH);
    }

    ctx.restore();
  }

  private renderHero(hero: HeroState): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(hero.x, hero.y);

    // Hero Invulnerability Flicker
    if (hero.invulnerableTimer > 0 && Math.floor(hero.invulnerableTimer * 20) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    // Hero Ground Shadow
    ctx.beginPath();
    ctx.ellipse(0, 18, 16, 7, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fill();

    // Breathing Bob
    const bob = Math.sin(performance.now() * 0.005) * 2;

    ctx.scale(hero.facing, 1);

    // Body Armor / Cape
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(-12, -18 + bob, 24, 32, [6, 6, 4, 4]);
    ctx.fill();

    // Iron Chestplate
    ctx.fillStyle = '#475569';
    ctx.fillRect(-8, -14 + bob, 16, 18);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-8, -14 + bob, 16, 18);

    // Hero Helmet
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.arc(0, -22 + bob, 10, 0, Math.PI * 2);
    ctx.fill();

    // Glowing Cyan Visor
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(1, -24 + bob, 8, 3);

    // Equipped Weapon in Hand
    ctx.save();
    ctx.translate(8, -8 + bob);

    if (hero.isAttacking) {
      // Swing rotation
      const swingProgress = 1 - hero.attackTimer / 0.32;
      ctx.rotate(-0.8 + swingProgress * 2.2);
    } else {
      ctx.rotate(0.3);
    }

    // Weapon Hilt & Blade
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-2, -2, 4, 10); // Hilt
    ctx.fillStyle = hero.equippedWeapon.color;
    ctx.fillRect(-2, -32, 4, 30); // Blade
    ctx.fillStyle = hero.equippedWeapon.accentColor;
    ctx.fillRect(0, -32, 2, 30); // Blade Edge Highlight
    ctx.restore();

    ctx.restore();
  }

  private renderSlash(slash: SlashEffect): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(slash.x, slash.y);
    ctx.rotate(slash.angle);

    const progress = 1 - slash.life / slash.maxLife;
    const alpha = (1 - progress);

    ctx.beginPath();
    ctx.arc(0, 0, slash.radius * (0.6 + progress * 0.4), -slash.arc / 2, slash.arc / 2);
    ctx.strokeStyle = slash.color;
    ctx.lineWidth = 12 * (1 - progress);
    ctx.globalAlpha = alpha;
    ctx.stroke();

    // Bright inner core line
    ctx.beginPath();
    ctx.arc(0, 0, slash.radius * (0.6 + progress * 0.4), -slash.arc / 2, slash.arc / 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3 * (1 - progress);
    ctx.globalAlpha = alpha * 0.9;
    ctx.stroke();

    ctx.restore();
  }

  private renderLightning(arc: LightningArc): void {
    const ctx = this.ctx;
    ctx.save();
    const alpha = arc.life / arc.maxLife;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(arc.startX, arc.startY);
    for (const b of arc.branches) {
      ctx.lineTo(b.x, b.y);
    }
    ctx.lineTo(arc.endX, arc.endY);
    ctx.stroke();

    // White core
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  private renderParticle(p: Particle): void {
    const ctx = this.ctx;
    ctx.save();
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;

    if (p.shape === 'spark') {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.restore();
  }

  private renderFloatingText(ft: FloatingText): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = ft.alpha;
    ctx.font = ft.isCrit ? '900 20px "Courier New", monospace' : '700 16px "Courier New", monospace';
    ctx.textAlign = 'center';

    // Black stroke shadow
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.strokeText(ft.text, ft.x, ft.y);

    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  }

  private renderAtmosphericLighting(hero: HeroState): void {
    const ctx = this.ctx;
    // Radial torchlight centered on player
    const torchGlow = ctx.createRadialGradient(hero.x, hero.y, 60, hero.x, hero.y, 520);
    torchGlow.addColorStop(0, 'rgba(0, 0, 0, 0)');
    torchGlow.addColorStop(0.65, 'rgba(9, 10, 15, 0.4)');
    torchGlow.addColorStop(1, 'rgba(9, 10, 15, 0.95)');

    ctx.fillStyle = torchGlow;
    ctx.fillRect(0, 0, this.width, this.height);
  }
}
