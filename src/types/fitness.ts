/**
 * Types for physical exercise detection, kinematic analysis, and sensor tracking.
 */

export type PushUpPhase = 
  | 'READY'         // At top in plank position, elbows extended (>150°)
  | 'DESCENDING'    // Elbows flexing down (<140°)
  | 'BOTTOM_HOLD'   // Target depth reached (elbows <= 90°)
  | 'ASCENDING'     // Pressing back up (>100° and increasing)
  | 'REP_COMPLETE'  // Returned to top plank position (>150°)
  | 'FORM_FAULT';   // Depth insufficient, hips sagged, or asymmetric

export type FormQuality = 
  | 'PERFECT'       // Depth <= 80°, aligned hips, smooth tempo (100% bonus)
  | 'GREAT'         // Depth <= 90°, good spine alignment (50% bonus)
  | 'GOOD'          // Depth <= 100°, acceptable form (standard damage)
  | 'SHALLOW'       // Half rep, elbows didn't reach target depth
  | 'HIPS_SAG'      // Core sagged during descent
  | 'TOO_FAST';     // Bounced without controlled eccentric phase

export interface Landmark2D {
  x: number; // 0 to 1 normalized
  y: number; // 0 to 1 normalized
  confidence: number;
}

export interface PoseSkeleton {
  leftShoulder?: Landmark2D;
  rightShoulder?: Landmark2D;
  leftElbow?: Landmark2D;
  rightElbow?: Landmark2D;
  leftWrist?: Landmark2D;
  rightWrist?: Landmark2D;
  leftHip?: Landmark2D;
  rightHip?: Landmark2D;
  leftKnee?: Landmark2D;
  rightKnee?: Landmark2D;
  leftAnkle?: Landmark2D;
  rightAnkle?: Landmark2D;
  nose?: Landmark2D;
}

export interface RepValidationResult {
  repNumber: number;
  quality: FormQuality;
  formScore: number; // 0 to 100
  elbowAngle: number; // in degrees
  depthPercent: number; // 0 (top) to 1 (full bottom)
  durationMs: number;
  cadenceBpm: number;
  bonusMultiplier: number; // 1.0 to 2.5x damage
  feedback: string;
}

export type TrackingMode = 'CAMERA_VISION' | 'DEVICE_SENSORS' | 'SIMULATOR';

export type SensitivityLevel = 'normal' | 'high' | 'ultra';

export interface DeviceSensorData {
  accelX: number;
  accelY: number;
  accelZ: number;
  depthZ: number;
  supported: boolean;
  active: boolean;
}
