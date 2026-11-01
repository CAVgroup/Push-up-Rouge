/**
 * Modular Enemy Schema for easy community JSON modding and dungeon encounters.
 */

export type EnemyBehavior = 
  | 'swarmer'   // Moves directly to player, attacks rapidly in numbers
  | 'kiter'     // Maintains distance, fires ranged energy bolts, retreats if cornered
  | 'charger'   // Winds up with red telegraph line, charges at high speed
  | 'flanker'   // Circles around player's flank before lunging
  | 'boss'      // Multi-phase giant with ground slam rings and shockwaves
  | 'turret';   // Stationary, periodically telegraphs wide area denial

export type EnemyShape = 'beast' | 'undead' | 'gargoyle' | 'demon' | 'spectre' | 'dragon';

export interface EnemyVisualConfig {
  primaryColor: string;
  accentColor: string;
  glowColor: string;
  scale: number;
  shape: EnemyShape;
  hasHorns?: boolean;
  hasWings?: boolean;
  hasShield?: boolean;
}

export interface EnemyTelegraphConfig {
  type: 'circle' | 'line' | 'cone';
  color: string;
  radius?: number;
  range?: number;
}

/**
 * The JSON Schema for modular enemies defined in .json files.
 */
export interface EnemyDefinition {
  id: string;
  name: string;
  lore: string;
  hp: number;
  speed: number;
  attackDamage: number;
  attackRange: number;
  attackWindup: number;     // seconds of telegraph warning before dealing damage
  attackCooldown: number;   // seconds between attacks
  behavior: EnemyBehavior;
  visual: EnemyVisualConfig;
  telegraph: EnemyTelegraphConfig;
  dropXP: number;
  dropEssence: number;
}

export type EnemyRuntimeState = 
  | 'spawning'
  | 'chasing'
  | 'telegraphing'
  | 'attacking'
  | 'recovering'
  | 'hit'
  | 'dying';

export interface RuntimeEnemy {
  uid: string;              // unique instance ID
  defId: string;            // references EnemyDefinition.id
  def: EnemyDefinition;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  state: EnemyRuntimeState;
  stateTimer: number;       // tracks telegraph windup, cooldown, or recovery
  facing: 1 | -1;
  hitFlashTimer: number;    // white hit flash duration in seconds
  knockbackTimer: number;
  orbitAngle: number;       // for flankers
  scalePulse: number;       // visual squash & stretch
}
