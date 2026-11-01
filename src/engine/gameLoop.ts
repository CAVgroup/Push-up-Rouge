/**
 * 60 FPS Simulation Game Loop.
 * Handles clamped delta time, sim-level hitstop, screenshake decay,
 * particle buffers, floating damage numbers, and weapon unlock checks.
 */

import { HeroState, FloatingText, Particle, SlashEffect, LightningArc, WorkoutSessionStats } from '../types/game';
import { DungeonManager } from './dungeon';
import { CombatEngine } from './combat';
import { RepValidationResult } from '../types/fitness';
import { WeaponDefinition, PlayerWeaponProgression } from '../types/weapon';
import defaultWeapons from '../data/weapons.json';
import { gameEvents } from './events';
import { audioSynth } from '../render/audioSynth';

export class GameEngine {
  private hero: HeroState;
  private dungeon: DungeonManager;
  private floatingTexts: FloatingText[] = [];
  private particles: Particle[] = [];
  private slashEffects: SlashEffect[] = [];
  private lightningArcs: LightningArc[] = [];
  private hitstopTimer = 0;
  private screenTrauma = 0;
  private isRunning = false;
  private lastTime = 0;
  private animId: number | null = null;

  // Keyboard controls for hero movement
  private keysPressed: Set<string> = new Set();

  // Weapon progression
  private weapons: WeaponDefinition[] = defaultWeapons as WeaponDefinition[];
  private progression: PlayerWeaponProgression = {
    unlockedWeaponIds: ['novice_blade'],
    equippedWeaponId: 'novice_blade',
    unlockedAt: { novice_blade: new Date().toISOString() },
  };

  // Workout Session Tracker
  private workoutStats: WorkoutSessionStats = {
    totalReps: 0,
    validReps: 0,
    failedReps: 0,
    currentStreak: 0,
    bestStreak: 0,
    perfectReps: 0,
    sessionStartTime: Date.now(),
    totalActiveSeconds: 0,
    avgCadenceBpm: 0,
    avgFormScore: 0,
    estimatedCalories: 0,
  };

  // Callbacks for UI updates
  private onStatsUpdate?: (hero: HeroState, workout: WorkoutSessionStats, floor: number, wave: number) => void;
  private onGameOver?: () => void;
  private onVictory?: () => void;

  constructor() {
    this.dungeon = new DungeonManager();
    const defaultWeapon = this.weapons.find((w) => w.id === 'novice_blade') || this.weapons[0];

    this.hero = {
      x: 600,
      y: 400,
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
      equippedWeapon: defaultWeapon,
    };

    this.loadProgression();
    this.setupEventListeners();
  }

  private loadProgression(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem('pushup_rogue_progression');
        if (saved) {
          const parsed = JSON.parse(saved);
          this.progression = { ...this.progression, ...parsed };
          const equipped = this.weapons.find((w) => w.id === this.progression.equippedWeaponId);
          if (equipped) {
            this.hero.equippedWeapon = equipped;
          }
        }
      } catch (e) {
        console.warn('Could not load progression from localStorage:', e);
      }
    }
  }

  private saveProgression(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('pushup_rogue_progression', JSON.stringify(this.progression));
      } catch {
        // Safe fallback
      }
    }
  }

  public getHero(): HeroState {
    return this.hero;
  }

  public getDungeon(): DungeonManager {
    return this.dungeon;
  }

  public getFloatingTexts(): FloatingText[] {
    return this.floatingTexts;
  }

  public getParticles(): Particle[] {
    return this.particles;
  }

  public getSlashEffects(): SlashEffect[] {
    return this.slashEffects;
  }

  public getLightningArcs(): LightningArc[] {
    return this.lightningArcs;
  }

  public getWeapons(): WeaponDefinition[] {
    return this.weapons;
  }

  public getProgression(): PlayerWeaponProgression {
    return this.progression;
  }

  public getWorkoutStats(): WorkoutSessionStats {
    return this.workoutStats;
  }

  public setCallbacks(options: {
    onStatsUpdate?: (hero: HeroState, workout: WorkoutSessionStats, floor: number, wave: number) => void;
    onGameOver?: () => void;
    onVictory?: () => void;
  }): void {
    this.onStatsUpdate = options.onStatsUpdate;
    this.onGameOver = options.onGameOver;
    this.onVictory = options.onVictory;
  }

  private setupEventListeners(): void {
    gameEvents.on('REP_VALIDATED', (rep) => {
      this.handleRepValidated(rep);
    });

    gameEvents.on('REP_FAILED', (fail) => {
      this.workoutStats.failedReps++;
      this.workoutStats.currentStreak = 0;
      audioSynth.playFormWarning();
    });

    gameEvents.on('SCREEN_SHAKE', (shake) => {
      this.screenTrauma = Math.min(1.0, this.screenTrauma + shake.intensity / 20);
    });
  }

  /**
   * Event-Driven: Trigger hero attack immediately once physical rep is validated!
   */
  public handleRepValidated(rep: RepValidationResult): void {
    // 1. Update workout session stats
    this.workoutStats.totalReps++;
    this.workoutStats.validReps++;
    this.workoutStats.currentStreak++;
    if (this.workoutStats.currentStreak > this.workoutStats.bestStreak) {
      this.workoutStats.bestStreak = this.workoutStats.currentStreak;
    }
    if (rep.quality === 'PERFECT') {
      this.workoutStats.perfectReps++;
    }
    this.workoutStats.avgCadenceBpm = rep.cadenceBpm;
    this.workoutStats.avgFormScore = Math.round(
      (this.workoutStats.avgFormScore * (this.workoutStats.validReps - 1) + rep.formScore) / this.workoutStats.validReps
    );
    // ~0.35 - 0.5 calories per push-up
    this.workoutStats.estimatedCalories = Math.round(this.workoutStats.validReps * 0.42);

    // 2. Play audible dopamine chime
    audioSynth.playRepValidated(rep.quality);
    audioSynth.playSlash();

    // 3. Execute combat logic
    const combat = CombatEngine.executeRepAttack(
      this.hero,
      this.dungeon.getEnemies(),
      this.hero.equippedWeapon,
      rep,
      this.floatingTexts,
      this.slashEffects,
      this.lightningArcs
    );

    // 4. Hit audio feedback
    if (combat.enemiesHit > 0) {
      audioSynth.playHit(combat.isCrit);
      this.spawnBloodSparks(this.hero.x, this.hero.y, combat.isCrit ? 22 : 12);
    }

    // 5. Apply hitstop
    if (combat.hitstopDuration > 0) {
      this.hitstopTimer = combat.hitstopDuration;
    }

    // 6. Check weapon unlock progression
    this.checkWeaponUnlocks();

    // 7. Check if all wave enemies are dead
    const aliveEnemies = this.dungeon.getEnemies().filter((e) => e.hp > 0 && e.state !== 'dying');
    if (aliveEnemies.length === 0) {
      const isNewFloor = this.dungeon.nextWave(this.hero);
      if (this.dungeon.getCurrentFloor() > 10 && this.onVictory) {
        this.onVictory();
      }
    }
  }

  private checkWeaponUnlocks(): void {
    for (const weapon of this.weapons) {
      if (this.progression.unlockedWeaponIds.includes(weapon.id)) continue;

      let meetsRequirement = false;
      const req = weapon.requirement;

      switch (req.metric) {
        case 'total_reps':
          meetsRequirement = this.workoutStats.totalReps >= req.threshold;
          break;
        case 'streak':
          meetsRequirement = this.workoutStats.currentStreak >= req.threshold;
          break;
        case 'intensity_cadence':
          meetsRequirement = this.workoutStats.avgCadenceBpm >= req.threshold;
          break;
        case 'perfect_reps':
          meetsRequirement = this.workoutStats.perfectReps >= req.threshold;
          break;
      }

      if (meetsRequirement) {
        this.progression.unlockedWeaponIds.push(weapon.id);
        this.progression.unlockedAt[weapon.id] = new Date().toISOString();
        this.saveProgression();

        audioSynth.playWeaponUnlocked();
        gameEvents.emit('WEAPON_UNLOCKED', { weapon });

        this.floatingTexts.push({
          id: Math.random().toString(),
          text: `WEAPON UNLOCKED: ${weapon.name}!`,
          x: this.hero.x,
          y: this.hero.y - 70,
          vy: -40,
          color: '#fbbf24',
          alpha: 1.0,
          scale: 1.5,
          isCrit: true,
        });
      }
    }
  }

  public equipWeapon(weaponId: string): boolean {
    if (!this.progression.unlockedWeaponIds.includes(weaponId)) return false;
    const weapon = this.weapons.find((w) => w.id === weaponId);
    if (weapon) {
      this.hero.equippedWeapon = weapon;
      this.progression.equippedWeaponId = weaponId;
      this.saveProgression();
      return true;
    }
    return false;
  }

  private spawnBloodSparks(x: number, y: number, count = 10): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 120;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: Math.random() > 0.4 ? '#ef4444' : '#fbbf24',
        size: 3 + Math.random() * 3,
        life: 0.35,
        maxLife: 0.35,
        shape: Math.random() > 0.5 ? 'spark' : 'square',
      });
    }
  }

  public start(): void {
    this.isRunning = true;
    this.lastTime = performance.now();
    this.dungeon.spawnWave(this.hero);
    this.loop();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  public handleKeyDown(code: string): void {
    this.keysPressed.add(code);
  }

  public handleKeyUp(code: string): void {
    this.keysPressed.delete(code);
  }

  public clearInputs(): void {
    this.keysPressed.clear();
  }

  private loop = (time = performance.now()): void => {
    if (!this.isRunning) return;

    const rawDt = (time - this.lastTime) / 1000;
    this.lastTime = time;
    // Strict dt clamping per guidelines
    const dt = Math.min(rawDt, 0.05);

    this.update(dt);
    this.animId = requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    // 1. Simulation hitstop handling
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      // Visuals still tick during hitstop
      this.updateVisualEffects(dt);
      return;
    }

    // 2. Hero Movement from keyboard inputs (WASD or Arrow keys)
    const moveSpeed = 160;
    let mx = 0;
    let my = 0;

    if (this.keysPressed.has('KeyA') || this.keysPressed.has('ArrowLeft')) mx -= 1;
    if (this.keysPressed.has('KeyD') || this.keysPressed.has('ArrowRight')) mx += 1;
    if (this.keysPressed.has('KeyW') || this.keysPressed.has('ArrowUp')) my -= 1;
    if (this.keysPressed.has('KeyS') || this.keysPressed.has('ArrowDown')) my += 1;

    if (mx !== 0 && my !== 0) {
      mx *= 0.7071;
      my *= 0.7071;
    }

    this.hero.x = Math.max(80, Math.min(1120, this.hero.x + mx * moveSpeed * dt));
    this.hero.y = Math.max(80, Math.min(720, this.hero.y + my * moveSpeed * dt));

    if (mx > 0) this.hero.facing = 1;
    else if (mx < 0) this.hero.facing = -1;

    // 3. Timers
    if (this.hero.isAttacking) {
      this.hero.attackTimer -= dt;
      if (this.hero.attackTimer <= 0) {
        this.hero.isAttacking = false;
      }
    }

    if (this.hero.invulnerableTimer > 0) {
      this.hero.invulnerableTimer -= dt;
    }

    if (this.hero.comboTimer > 0) {
      this.hero.comboTimer -= dt;
      if (this.hero.comboTimer <= 0) {
        this.hero.comboCount = 0;
      }
    }

    // 4. Update Dungeon AI & Enemies
    this.dungeon.update(dt, this.hero, this.floatingTexts);

    // 5. Check Player Death
    if (this.hero.hp <= 0 && this.onGameOver) {
      this.onGameOver();
    }

    // 6. Update Visual Effects & Particles
    this.updateVisualEffects(dt);

    // 7. Update Workout session active time
    this.workoutStats.totalActiveSeconds = Math.round((Date.now() - this.workoutStats.sessionStartTime) / 1000);

    // 8. Report stats to UI
    if (this.onStatsUpdate) {
      this.onStatsUpdate(this.hero, this.workoutStats, this.dungeon.getCurrentFloor(), this.dungeon.getWaveNumber());
    }
  }

  private updateVisualEffects(dt: number): void {
    // Camera shake decay (trauma * trauma)
    if (this.screenTrauma > 0) {
      this.screenTrauma = Math.max(0, this.screenTrauma - dt * 2.5);
    }

    // Slash effects
    this.slashEffects = this.slashEffects.filter((slash) => {
      slash.life -= dt;
      return slash.life > 0;
    });

    // Lightning arcs
    this.lightningArcs = this.lightningArcs.filter((arc) => {
      arc.life -= dt;
      return arc.life > 0;
    });

    // Particles
    this.particles = this.particles.filter((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      return p.life > 0;
    });

    // Floating damage texts
    this.floatingTexts = this.floatingTexts.filter((ft) => {
      ft.y += ft.vy * dt;
      ft.alpha -= dt * 1.6;
      return ft.alpha > 0;
    });
  }

  public getScreenShakeOffset(): { x: number; y: number } {
    if (this.screenTrauma <= 0) return { x: 0, y: 0 };
    const intensity = this.screenTrauma * this.screenTrauma * 16;
    return {
      x: (Math.random() - 0.5) * intensity,
      y: (Math.random() - 0.5) * intensity,
    };
  }
}
