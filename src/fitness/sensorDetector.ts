/**
 * Device Motion & Accelerometer Sensor Detector for Android / Mobile.
 * Tracks physical push-ups when the phone is rested on the floor mat beneath the chest
 * or secured in an arm-band.
 */

import { PushUpDetector } from './pushUpDetector';

export class SensorDetector {
  private active = false;
  private supported = false;
  private pushUpDetector: PushUpDetector;
  private motionHandler: ((event: DeviceMotionEvent) => void) | null = null;
  private lastZ = 0;
  private baselineZ = 9.8;
  private currentDepth = 0;
  private smoothingAlpha = 0.2;

  constructor(pushUpDetector: PushUpDetector) {
    this.pushUpDetector = pushUpDetector;
    this.checkSupport();
  }

  private checkSupport(): void {
    if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
      this.supported = true;
    }
  }

  public isSupported(): boolean {
    return this.supported;
  }

  public isActive(): boolean {
    return this.active;
  }

  public async start(): Promise<boolean> {
    if (!this.supported) return false;

    // iOS 13+ requires permission request; Android Chrome grants directly
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const response = await (DeviceMotionEvent as any).requestPermission();
        if (response !== 'granted') return false;
      } catch (err) {
        console.warn('Sensor permission error:', err);
        return false;
      }
    }

    this.motionHandler = (event: DeviceMotionEvent) => {
      const acc = event.accelerationIncludingGravity || event.acceleration;
      if (!acc || acc.z === null) return;

      const rawZ = acc.z ?? 9.8;
      // Exponential moving average filter
      this.lastZ = this.lastZ * (1 - this.smoothingAlpha) + rawZ * this.smoothingAlpha;
      const deltaZ = this.lastZ - this.baselineZ;

      // Increased sensitivity impulse mapping
      let sensFactor = 1.0;
      if (this.pushUpDetector.getSensitivity() === 'ultra') sensFactor = 1.6;
      else if (this.pushUpDetector.getSensitivity() === 'high') sensFactor = 1.3;

      const normalizedImpulse = Math.max(-1, Math.min(1, (deltaZ / 2.0) * sensFactor));
      if (normalizedImpulse < -0.16) {
        this.currentDepth = Math.min(1.0, this.currentDepth + 0.16);
      } else if (normalizedImpulse > 0.20) {
        this.currentDepth = Math.max(0.0, this.currentDepth - 0.20);
      }

      const simulatedAngle = 160 - this.currentDepth * (160 - 75);
      this.pushUpDetector.processAngle(simulatedAngle, performance.now());
    };

    window.addEventListener('devicemotion', this.motionHandler, false);
    this.active = true;
    return true;
  }

  public stop(): void {
    if (this.motionHandler && typeof window !== 'undefined') {
      window.removeEventListener('devicemotion', this.motionHandler, false);
      this.motionHandler = null;
    }
    this.active = false;
  }
}
