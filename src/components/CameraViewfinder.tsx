/**
 * Sleek, Unobtrusive Camera Viewfinder & Pose Skeleton Wireframe.
 * Displays user video stream, real-time skeletal tracking, elbow angle meter,
 * and quick simulate button for testing/resting.
 */

import React, { useRef, useEffect, useState } from 'react';
import { Camera, CameraOff, Sparkles, Smartphone, Eye, Zap } from 'lucide-react';
import { TrackingMode, PoseSkeleton, SensitivityLevel } from '../types/fitness';
import { CameraVision } from '../fitness/cameraVision';
import { MLKitBridge } from '../fitness/mlkitAndroidBridge';

interface CameraViewfinderProps {
  trackingMode: TrackingMode;
  cameraVision: CameraVision;
  depthPercent: number;
  elbowAngle: number;
  sensitivity: SensitivityLevel;
  onToggleSensitivity: () => void;
}

export const CameraViewfinder: React.FC<CameraViewfinderProps> = ({
  trackingMode,
  cameraVision,
  depthPercent,
  elbowAngle,
  sensitivity,
  onToggleSensitivity,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    if (trackingMode === 'CAMERA_VISION' && videoRef.current) {
      cameraVision
        .start(videoRef.current)
        .then((started) => {
          if (mounted) {
            setCameraActive(started);
            if (!started) {
              setCameraError('Camera access required. Click simulator or check permissions.');
            }
          }
        })
        .catch((err) => {
          if (mounted) {
            setCameraActive(false);
            setCameraError(err.message || 'Camera failed to start');
          }
        });
    } else {
      cameraVision.stop();
      setCameraActive(false);
    }

    return () => {
      mounted = false;
      cameraVision.stop();
    };
  }, [trackingMode, cameraVision]);

  // Render pose skeleton on overlay canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (showSkeleton && (cameraActive || trackingMode === 'SIMULATOR')) {
      const w = canvas.width;
      const h = canvas.height;

      // Draw synthetic / detected skeleton
      const shoulderY = 0.35 + depthPercent * 0.15;
      const elbowY = 0.45 + depthPercent * 0.10;
      const wristY = 0.65;

      const leftShoulder = { x: 0.35 * w, y: shoulderY * h };
      const rightShoulder = { x: 0.65 * w, y: shoulderY * h };
      const leftElbow = { x: 0.22 * w, y: elbowY * h };
      const rightElbow = { x: 0.78 * w, y: elbowY * h };
      const leftWrist = { x: 0.28 * w, y: wristY * h };
      const rightWrist = { x: 0.72 * w, y: wristY * h };

      // Limbs
      ctx.strokeStyle = depthPercent > 0.8 ? '#22c55e' : '#38bdf8';
      ctx.lineWidth = 2.5;

      // Arms
      ctx.beginPath();
      ctx.moveTo(leftShoulder.x, leftShoulder.y);
      ctx.lineTo(leftElbow.x, leftElbow.y);
      ctx.lineTo(leftWrist.x, leftWrist.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(rightShoulder.x, rightShoulder.y);
      ctx.lineTo(rightElbow.x, rightElbow.y);
      ctx.lineTo(rightWrist.x, rightWrist.y);
      ctx.stroke();

      // Shoulders connecting bar
      ctx.beginPath();
      ctx.moveTo(leftShoulder.x, leftShoulder.y);
      ctx.lineTo(rightShoulder.x, rightShoulder.y);
      ctx.stroke();

      // Joints
      ctx.fillStyle = '#facc15';
      [leftShoulder, rightShoulder, leftElbow, rightElbow, leftWrist, rightWrist].forEach((pt) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }, [depthPercent, showSkeleton, cameraActive, trackingMode]);

  return (
    <div className="fixed bottom-4 right-4 z-40 pointer-events-auto flex flex-col items-end gap-1 font-mono">
      {/* Viewfinder Window */}
      <div className="relative w-44 h-32 sm:w-52 sm:h-36 bg-slate-950/90 border border-slate-700/80 rounded-lg overflow-hidden shadow-2xl flex flex-col justify-between">
        {/* Video or Fallback Surface */}
        {trackingMode === 'CAMERA_VISION' ? (
          <>
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]"
              playsInline
              muted
              autoPlay
            />
            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center p-2 text-center text-[10px] text-amber-300 bg-slate-950/80">
                {cameraError}
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center text-slate-400 bg-slate-900/60">
            {trackingMode === 'DEVICE_SENSORS' ? (
              <>
                <Smartphone className="w-6 h-6 text-cyan-400 mb-1" />
                <span className="text-[10px] text-slate-300 font-bold">Mat Sensor Active</span>
                <span className="text-[9px] text-slate-500">Rest phone flat on mat</span>
              </>
            ) : (
              <>
                <Sparkles className="w-6 h-6 text-amber-400 mb-1" />
                <span className="text-[10px] text-slate-300 font-bold">Simulator Mode</span>
                <span className="text-[9px] text-slate-500">Spacebar / Button triggers</span>
              </>
            )}
          </div>
        )}

        {/* Skeleton Wireframe Canvas Overlay */}
        <canvas ref={canvasRef} width={208} height={144} className="absolute inset-0 w-full h-full pointer-events-none" />

        {/* Top Viewfinder Metadata */}
        <div className="relative z-10 flex justify-between items-center px-2 py-1 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-slate-300">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                cameraActive ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
              }`}
            />
            <span>{trackingMode === 'CAMERA_VISION' ? 'ML Kit Vision' : trackingMode}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onToggleSensitivity}
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition-colors flex items-center gap-0.5 cursor-pointer ${
                sensitivity === 'ultra'
                  ? 'bg-red-950 text-red-300 border-red-700'
                  : sensitivity === 'high'
                  ? 'bg-amber-950 text-amber-300 border-amber-700'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
              title="Click to cycle exercise sensitivity (High -> Ultra -> Normal)"
            >
              <Zap className="w-2.5 h-2.5 fill-current" />
              <span className="uppercase">{sensitivity} Sens</span>
            </button>

            <button
              onClick={() => setShowSkeleton(!showSkeleton)}
              className="text-[9px] text-slate-400 hover:text-white px-1 py-0.5 rounded bg-slate-800/60"
              title="Toggle Skeleton Wireframe"
            >
              <Eye className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Bottom Depth Bar & Angle Readout */}
        <div className="relative z-10 px-2 py-1 bg-black/75 flex flex-col gap-1">
          <div className="flex justify-between items-center text-[10px] tabular-nums">
            <span className="text-slate-400">Elbow Angle:</span>
            <span className="text-emerald-400 font-bold">{Math.round(elbowAngle)}°</span>
          </div>
          {/* Depth Meter */}
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-75"
              style={{ width: `${Math.round(depthPercent * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
