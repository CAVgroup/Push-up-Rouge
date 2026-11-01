/**
 * Push-Up Kinematic Detector & Exercise Form Validator.
 * Decoupled pure logic: processes skeletal landmarks or depth signals through a robust state machine.
 */

import { Landmark2D, PoseSkeleton, PushUpPhase, FormQuality, RepValidationResult, SensitivityLevel } from '../types/fitness';

export interface PushUpDetectorOptions {
  sensitivity?: SensitivityLevel;
  minDepthAngle?: number;    // Elbow angle threshold for bottom
  lockoutAngle?: number;     // Elbow angle threshold for top lockout
  minRepDurationMs?: number; // Reject unrealistically fast twitch bounces
  maxRepDurationMs?: number; // Time out stagnant pauses
  onPhaseChange?: (phase: PushUpPhase, angle: number, depth: number) => void;
  onRepValidated?: (result: RepValidationResult) => void;
  onRepFailed?: (reason: string, score: number) => void;
}

export class PushUpDetector {
  private phase: PushUpPhase = 'READY';
  private repCount = 0;
  private currentStreak = 0;
  private bestStreak = 0;
  private minAngleThisRep = 180;
  private repStartTime = 0;
  private bottomReachTime = 0;
  private lastRepEndTime = 0;
  private recentRepTimestamps: number[] = [];
  private options: Required<PushUpDetectorOptions>;
  private sensitivity: SensitivityLevel = 'high'; // Default HIGHER sensitivity

  constructor(options: PushUpDetectorOptions = {}) {
    this.sensitivity = options.sensitivity ?? 'high';
    const thresholds = this.getSensitivityThresholds(this.sensitivity);

    this.options = {
      sensitivity: this.sensitivity,
      minDepthAngle: options.minDepthAngle ?? thresholds.minDepthAngle,
      lockoutAngle: options.lockoutAngle ?? thresholds.lockoutAngle,
      minRepDurationMs: options.minRepDurationMs ?? 400,
      maxRepDurationMs: options.maxRepDurationMs ?? 8000,
      onPhaseChange: options.onPhaseChange ?? (() => {}),
      onRepValidated: options.onRepValidated ?? (() => {}),
      onRepFailed: options.onRepFailed ?? (() => {}),
    };
  }

  public getSensitivity(): SensitivityLevel {
    return this.sensitivity;
  }

  public setSensitivity(level: SensitivityLevel): void {
    this.sensitivity = level;
    const thresholds = this.getSensitivityThresholds(level);
    this.options.minDepthAngle = thresholds.minDepthAngle;
    this.options.lockoutAngle = thresholds.lockoutAngle;
  }

  private getSensitivityThresholds(level: SensitivityLevel) {
    switch (level) {
      case 'ultra':
        return { minDepthAngle: 120, lockoutAngle: 135, startDescent: 152 };
      case 'high':
        return { minDepthAngle: 110, lockoutAngle: 140, startDescent: 148 };
      case 'normal':
      default:
        return { minDepthAngle: 95, lockoutAngle: 148, startDescent: 138 };
    }
  }

  public getPhase(): PushUpPhase {
    return this.phase;
  }

  public getRepCount(): number {
    return this.repCount;
  }

  public getStreak(): number {
    return this.currentStreak;
  }

  public getBestStreak(): number {
    return this.bestStreak;
  }

  public reset(): void {
    this.phase = 'READY';
    this.repCount = 0;
    this.currentStreak = 0;
    this.minAngleThisRep = 180;
    this.repStartTime = 0;
    this.bottomReachTime = 0;
    this.recentRepTimestamps = [];
  }

  /**
   * Calculate 2D angle in degrees formed by three points: A -> B -> C (angle at vertex B).
   */
  public static calculateAngle(a: Landmark2D, b: Landmark2D, c: Landmark2D): number {
    const abX = a.x - b.x;
    const abY = a.y - b.y;
    const cbX = c.x - b.x;
    const cbY = c.y - b.y;

    const dot = abX * cbX + abY * cbY;
    const magAB = Math.hypot(abX, abY);
    const magCB = Math.hypot(cbX, cbY);

    if (magAB === 0 || magCB === 0) return 180;

    const cosAngle = Math.max(-1, Math.min(1, dot / (magAB * magCB)));
    return (Math.acos(cosAngle) * 180) / Math.PI;
  }

  /**
   * Process a full pose skeleton from Google ML Kit or MediaPipe.
   */
  public processSkeleton(skeleton: PoseSkeleton, now = performance.now()): RepValidationResult | null {
    // Determine the most visible side (left or right arm)
    let elbowAngle = 180;
    let confidence = 0;

    const hasLeft = skeleton.leftShoulder && skeleton.leftElbow && skeleton.leftWrist;
    const hasRight = skeleton.rightShoulder && skeleton.rightElbow && skeleton.rightWrist;

    if (hasLeft && hasRight) {
      const leftConf = (skeleton.leftShoulder!.confidence + skeleton.leftElbow!.confidence + skeleton.leftWrist!.confidence) / 3;
      const rightConf = (skeleton.rightShoulder!.confidence + skeleton.rightElbow!.confidence + skeleton.rightWrist!.confidence) / 3;

      const angleL = PushUpDetector.calculateAngle(skeleton.leftShoulder!, skeleton.leftElbow!, skeleton.leftWrist!);
      const angleR = PushUpDetector.calculateAngle(skeleton.rightShoulder!, skeleton.rightElbow!, skeleton.rightWrist!);

      if (leftConf > rightConf + 0.15) {
        elbowAngle = angleL;
        confidence = leftConf;
      } else if (rightConf > leftConf + 0.15) {
        elbowAngle = angleR;
        confidence = rightConf;
      } else {
        // Average both for balanced stability
        elbowAngle = (angleL + angleR) / 2;
        confidence = (leftConf + rightConf) / 2;
      }
    } else if (hasLeft) {
      elbowAngle = PushUpDetector.calculateAngle(skeleton.leftShoulder!, skeleton.leftElbow!, skeleton.leftWrist!);
      confidence = (skeleton.leftShoulder!.confidence + skeleton.leftElbow!.confidence + skeleton.leftWrist!.confidence) / 3;
    } else if (hasRight) {
      elbowAngle = PushUpDetector.calculateAngle(skeleton.rightShoulder!, skeleton.rightElbow!, skeleton.rightWrist!);
      confidence = (skeleton.rightShoulder!.confidence + skeleton.rightElbow!.confidence + skeleton.rightWrist!.confidence) / 3;
    } else {
      // No arm keypoints visible
      return null;
    }

    // Check spine alignment if hips & ankles are available
    let spineAlignmentPenalty = 0;
    if (skeleton.leftShoulder && skeleton.leftHip && skeleton.leftAnkle) {
      const bodyAngle = PushUpDetector.calculateAngle(skeleton.leftShoulder, skeleton.leftHip, skeleton.leftAnkle);
      if (Math.abs(bodyAngle - 180) > 28) {
        spineAlignmentPenalty = 15; // Hips sagging or pike
      }
    }

    return this.processAngle(elbowAngle, now, spineAlignmentPenalty);
  }

  /**
   * Process raw elbow angle signal or simulated depth angle.
   */
  public processAngle(elbowAngle: number, now = performance.now(), spinePenalty = 0): RepValidationResult | null {
    // Normalize depth: 0 = top lockout (160°), 1 = full chest depth (75°)
    const clampedAngle = Math.max(60, Math.min(180, elbowAngle));
    const depthPercent = Math.max(0, Math.min(1, (160 - clampedAngle) / (160 - 75)));

    let result: RepValidationResult | null = null;

    switch (this.phase) {
      case 'READY': {
        const startDescentAngle = this.getSensitivityThresholds(this.sensitivity).startDescent;
        if (clampedAngle < startDescentAngle) {
          // Started descent
          this.phase = 'DESCENDING';
          this.repStartTime = now;
          this.minAngleThisRep = clampedAngle;
          this.options.onPhaseChange(this.phase, clampedAngle, depthPercent);
        }
        break;
      }

      case 'DESCENDING':
        if (clampedAngle < this.minAngleThisRep) {
          this.minAngleThisRep = clampedAngle;
        }

        if (clampedAngle <= this.options.minDepthAngle) {
          this.phase = 'BOTTOM_HOLD';
          this.bottomReachTime = now;
          this.options.onPhaseChange(this.phase, clampedAngle, depthPercent);
        } else if (clampedAngle > this.options.lockoutAngle - 4 && now - this.repStartTime > 300) {
          // Ascended before reaching target depth -> Shallow rep
          this.phase = 'READY';
          this.currentStreak = 0;
          this.options.onRepFailed(`Insufficient depth (Target <= ${this.options.minDepthAngle}°)`, 40);
          this.options.onPhaseChange('READY', clampedAngle, depthPercent);
        }
        break;

      case 'BOTTOM_HOLD': {
        if (clampedAngle < this.minAngleThisRep) {
          this.minAngleThisRep = clampedAngle;
        }

        const ascentThreshold = Math.min(this.options.minDepthAngle + 8, this.minAngleThisRep + 8);
        if (clampedAngle > ascentThreshold) {
          // Started ascending
          this.phase = 'ASCENDING';
          this.options.onPhaseChange(this.phase, clampedAngle, depthPercent);

          // If already at or past lockout angle in same reading, proceed directly to lockout validation
          if (clampedAngle >= this.options.lockoutAngle) {
            const duration = now - this.repStartTime;
            if (duration >= this.options.minRepDurationMs && duration <= this.options.maxRepDurationMs) {
              result = this.validateRep(now, duration, spinePenalty);
              this.phase = 'READY';
              this.options.onPhaseChange('READY', clampedAngle, depthPercent);
            }
          }
        }
        break;
      }

      case 'ASCENDING':
        if (clampedAngle >= this.options.lockoutAngle) {
          const duration = now - this.repStartTime;

          // Check for valid rep criteria
          if (duration >= this.options.minRepDurationMs && duration <= this.options.maxRepDurationMs) {
            result = this.validateRep(now, duration, spinePenalty);
            this.phase = 'READY';
            this.options.onPhaseChange('READY', clampedAngle, depthPercent);
          } else if (duration < this.options.minRepDurationMs) {
            this.phase = 'READY';
            this.options.onRepFailed('Rep was too fast/uncontrolled', 45);
            this.options.onPhaseChange('READY', clampedAngle, depthPercent);
          } else {
            this.phase = 'READY';
            this.options.onRepFailed('Rep timed out', 30);
            this.options.onPhaseChange('READY', clampedAngle, depthPercent);
          }
        }
        break;
    }

    return result;
  }

  /**
   * Evaluates form quality, calculates cadence, and updates streak counters.
   */
  private validateRep(now: number, durationMs: number, spinePenalty: number): RepValidationResult {
    this.repCount++;
    this.currentStreak++;
    if (this.currentStreak > this.bestStreak) {
      this.bestStreak = this.currentStreak;
    }

    this.lastRepEndTime = now;
    this.recentRepTimestamps.push(now);

    // Filter timestamps within last 60 seconds to compute live Cadence BPM
    const oneMinAgo = now - 60000;
    this.recentRepTimestamps = this.recentRepTimestamps.filter((t) => t > oneMinAgo);
    const cadenceBpm = this.recentRepTimestamps.length;

    // Quality grading
    let quality: FormQuality = 'GOOD';
    let baseScore = 75;
    let bonusMultiplier = 1.2;
    let feedback = 'Good Push-Up!';

    if (this.minAngleThisRep <= 80 && spinePenalty === 0) {
      quality = 'PERFECT';
      baseScore = 100;
      bonusMultiplier = 2.5;
      feedback = 'PERFECT FORM! 2.5x Critical Power!';
    } else if (this.minAngleThisRep <= 90) {
      quality = 'GREAT';
      baseScore = 88 - spinePenalty;
      bonusMultiplier = 1.8;
      feedback = 'Great Depth & Lockout!';
    } else if (spinePenalty > 0) {
      quality = 'HIPS_SAG';
      baseScore = 65;
      bonusMultiplier = 1.0;
      feedback = 'Keep your core braced straight!';
    }

    const finalScore = Math.max(50, Math.min(100, baseScore - spinePenalty));

    const result: RepValidationResult = {
      repNumber: this.repCount,
      quality,
      formScore: finalScore,
      elbowAngle: this.minAngleThisRep,
      depthPercent: Math.max(0, Math.min(1, (160 - this.minAngleThisRep) / (160 - 75))),
      durationMs,
      cadenceBpm,
      bonusMultiplier,
      feedback,
    };

    this.options.onRepValidated(result);
    return result;
  }

  /**
   * Directly inject a simulated validated rep (useful for simulator mode, testing, and keyboard triggers).
   */
  public triggerSimulatedRep(quality: FormQuality = 'PERFECT'): RepValidationResult {
    this.repCount++;
    this.currentStreak++;
    if (this.currentStreak > this.bestStreak) {
      this.bestStreak = this.currentStreak;
    }

    const now = performance.now();
    this.recentRepTimestamps.push(now);
    const cadenceBpm = Math.min(35, this.recentRepTimestamps.length * 6);

    let baseScore = 95;
    let bonusMultiplier = 2.5;
    let feedback = 'PERFECT FORM! 2.5x Power!';

    if (quality === 'GREAT') {
      baseScore = 85;
      bonusMultiplier = 1.8;
      feedback = 'Great Push-Up!';
    } else if (quality === 'GOOD') {
      baseScore = 75;
      bonusMultiplier = 1.2;
      feedback = 'Standard Rep Validated';
    }

    const result: RepValidationResult = {
      repNumber: this.repCount,
      quality,
      formScore: baseScore,
      elbowAngle: 78,
      depthPercent: 0.95,
      durationMs: 1400,
      cadenceBpm,
      bonusMultiplier,
      feedback,
    };

    this.options.onRepValidated(result);
    return result;
  }
}
