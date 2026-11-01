/**
 * Real-Time Camera Vision & Optical Kinematics Engine.
 * Captures user video feed, tracks posture and chest displacement,
 * generates skeletal landmarks, and bridges Google ML Kit signals into the PushUpDetector.
 */

import { PushUpDetector } from './pushUpDetector';
import { PoseSkeleton, Landmark2D } from '../types/fitness';
import { MLKitBridge } from './mlkitAndroidBridge';

export interface CameraVisionOptions {
  onSkeletonUpdate?: (skeleton: PoseSkeleton, angle: number, depth: number) => void;
  onError?: (err: Error) => void;
}

export class CameraVision {
  private videoEl: HTMLVideoElement | null = null;
  private hiddenCanvas: HTMLCanvasElement | null = null;
  private hiddenCtx: CanvasRenderingContext2D | null = null;
  private stream: MediaStream | null = null;
  private animFrameId: number | null = null;
  private pushUpDetector: PushUpDetector;
  private options: CameraVisionOptions;
  private isRunning = false;

  // Optical flow / motion centroid tracking
  private prevFrameData: Uint8ClampedArray | null = null;
  private baselineCentroidY = 0.45;
  private currentDisplacement = 0;
  private filteredAngle = 160;

  constructor(pushUpDetector: PushUpDetector, options: CameraVisionOptions = {}) {
    this.pushUpDetector = pushUpDetector;
    this.options = options;

    // Listen to native Android ML Kit pose landmarks if available
    MLKitBridge.getInstance().onPose((skeleton) => {
      this.pushUpDetector.processSkeleton(skeleton);
      if (this.options.onSkeletonUpdate && skeleton.leftElbow) {
        const angle = PushUpDetector.calculateAngle(
          skeleton.leftShoulder || { x: 0.5, y: 0.3, confidence: 1 },
          skeleton.leftElbow,
          skeleton.leftWrist || { x: 0.5, y: 0.7, confidence: 1 }
        );
        this.options.onSkeletonUpdate(skeleton, angle, Math.max(0, (160 - angle) / 85));
      }
    });
  }

  public async start(videoElement: HTMLVideoElement): Promise<boolean> {
    this.videoEl = videoElement;

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        });

        this.videoEl.srcObject = this.stream;
        await this.videoEl.play();

        // Setup hidden processing canvas
        this.hiddenCanvas = document.createElement('canvas');
        this.hiddenCanvas.width = 160;
        this.hiddenCanvas.height = 120;
        this.hiddenCtx = this.hiddenCanvas.getContext('2d', { willReadFrequently: true });

        this.isRunning = true;
        this.loop();
        return true;
      }
      return false;
    } catch (err: any) {
      console.warn('Camera access denied or unavailable:', err);
      if (this.options.onError) {
        this.options.onError(err);
      }
      return false;
    }
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.videoEl) {
      this.videoEl.srcObject = null;
    }
    this.prevFrameData = null;
  }

  private loop = (): void => {
    if (!this.isRunning) return;

    if (this.videoEl && this.videoEl.readyState >= 2 && this.hiddenCtx && this.hiddenCanvas) {
      this.hiddenCtx.drawImage(this.videoEl, 0, 0, this.hiddenCanvas.width, this.hiddenCanvas.height);
      const frame = this.hiddenCtx.getImageData(0, 0, this.hiddenCanvas.width, this.hiddenCanvas.height);
      this.processVideoFrame(frame);
    }

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  /**
   * Fast real-time optical frame kinematic processing:
   * Detects the vertical shift of the user's upper body mass in frame.
   * Maps chest descent to elbow flexion angle (160° down to 75°).
   */
  private processVideoFrame(frame: ImageData): void {
    const { width, height, data } = frame;
    let motionYSum = 0;
    let motionCount = 0;

    let sensitivityMult = 1.6;
    if (this.pushUpDetector.getSensitivity() === 'ultra') sensitivityMult = 2.4;
    else if (this.pushUpDetector.getSensitivity() === 'normal') sensitivityMult = 1.0;

    if (this.prevFrameData && this.prevFrameData.length === data.length) {
      // Step by 4 pixels for maximum speed and 60fps throughput
      for (let i = 0; i < data.length; i += 16) {
        const diffR = Math.abs(data[i] - this.prevFrameData[i]);
        const diffG = Math.abs(data[i + 1] - this.prevFrameData[i + 1]);
        const diffB = Math.abs(data[i + 2] - this.prevFrameData[i + 2]);
        const totalDiff = diffR + diffG + diffB;

        // Increased sensitivity: lowered threshold from 60 to 28
        if (totalDiff > 28) {
          const pixelIndex = i / 4;
          const y = Math.floor(pixelIndex / width);
          motionYSum += y;
          motionCount++;
        }
      }
    }

    // Save copy of current frame for next difference
    if (!this.prevFrameData || this.prevFrameData.length !== data.length) {
      this.prevFrameData = new Uint8ClampedArray(data.length);
    }
    this.prevFrameData.set(data);

    // Lowered motion threshold from 15 to 6 for high sensitivity
    if (motionCount > 6) {
      const avgYNormalized = motionYSum / motionCount / height;
      // Smooth centroid tracking
      if (this.baselineCentroidY === 0.45) {
        this.baselineCentroidY = avgYNormalized;
      }

      // Displacement from neutral: higher Y means lower body position in frame
      const verticalDelta = avgYNormalized - this.baselineCentroidY;
      this.currentDisplacement = this.currentDisplacement * 0.65 + verticalDelta * 0.35;

      // Map to angle with higher sensitivity multiplier (7.5 * sensitivityMult)
      const rawTargetAngle = 160 - Math.max(0, Math.min(1, this.currentDisplacement * (7.5 * sensitivityMult))) * (160 - 75);
      this.filteredAngle = this.filteredAngle * 0.55 + rawTargetAngle * 0.45;
    }

    const depthPercent = Math.max(0, Math.min(1, (160 - this.filteredAngle) / (160 - 75)));

    // Generate simulated skeletal landmark points for visual wireframe HUD
    const syntheticSkeleton: PoseSkeleton = {
      leftShoulder: { x: 0.35, y: 0.38 + depthPercent * 0.18, confidence: 0.95 },
      rightShoulder: { x: 0.65, y: 0.38 + depthPercent * 0.18, confidence: 0.95 },
      leftElbow: { x: 0.25, y: 0.46 + depthPercent * 0.12, confidence: 0.95 },
      rightElbow: { x: 0.75, y: 0.46 + depthPercent * 0.12, confidence: 0.95 },
      leftWrist: { x: 0.30, y: 0.62, confidence: 0.95 },
      rightWrist: { x: 0.70, y: 0.62, confidence: 0.95 },
      leftHip: { x: 0.40, y: 0.55 + depthPercent * 0.08, confidence: 0.9 },
      rightHip: { x: 0.60, y: 0.55 + depthPercent * 0.08, confidence: 0.9 },
    };

    this.pushUpDetector.processAngle(this.filteredAngle, performance.now());

    if (this.options.onSkeletonUpdate) {
      this.options.onSkeletonUpdate(syntheticSkeleton, this.filteredAngle, depthPercent);
    }
  }
}
