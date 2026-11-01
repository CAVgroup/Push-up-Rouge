/**
 * Android Google ML Kit Architecture & Integration Guide.
 * Explains how Google ML Kit accurately detects exercise form,
 * and provides the complete native Android Kotlin bridge code.
 */

import React, { useState } from 'react';
import { X, Smartphone, Code, Check, Copy, ExternalLink, ShieldCheck } from 'lucide-react';
import { MLKitBridge } from '../fitness/mlkitAndroidBridge';

interface AndroidMLKitGuideModalProps {
  onClose: () => void;
}

export const AndroidMLKitGuideModal: React.FC<AndroidMLKitGuideModalProps> = ({ onClose }) => {
  const [copied, setCopied] = useState(false);
  const kotlinCode = MLKitBridge.getAndroidKotlinSnippet();

  const handleCopy = () => {
    navigator.clipboard.writeText(kotlinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 select-none font-mono">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-base font-bold text-white uppercase tracking-wider">
                Google ML Kit Android Integration
              </h2>
              <p className="text-xs text-slate-400">
                Exercise Form & Kinematic Rep Detection on Android Devices
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-slate-950/70 border border-slate-800">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm mb-2">
                <ShieldCheck className="w-4 h-4" />
                <span>Camera Form Tracking</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Uses Google ML Kit's 33 skeletal landmarks. Calculates 2D elbow flexion ($A \to B \to C$) between Shoulder, Elbow, and Wrist. Validates full 90° chest depth and lockout.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-950/70 border border-slate-800">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm mb-2">
                <Smartphone className="w-4 h-4" />
                <span>Mat Accelerometer Sensor</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                On Android mobile devices, phone can be laid flat on the workout mat beneath your chest. The Z-axis accelerometer registers kinematic downward drops and lockout impulses!
              </p>
            </div>
          </div>

          {/* Android Kotlin Bridge Code */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-white uppercase flex items-center gap-1.5">
                <Code className="w-4 h-4 text-emerald-400" />
                <span>Android Kotlin Native ML Kit Bridge (MLKitPushUpBridge.kt)</span>
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>

            <pre className="p-3 bg-slate-950 border border-slate-800 rounded text-[11px] text-cyan-300 overflow-x-auto leading-relaxed max-h-56">
              {kotlinCode}
            </pre>
          </div>

          {/* Best Setup Advice */}
          <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-lg">
            <h4 className="font-bold text-white mb-2 uppercase">Optimal Push-Up Camera Positioning</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>Place device on floor or low stand 4 to 6 feet away, angled at ~45° toward your mat.</li>
              <li>Ensure upper body (shoulders, elbows, hands, and hips) remains visible in the frame.</li>
              <li>Lower until elbow angle breaks 90° for 'GREAT' form, or &le; 80° for 'PERFECT FORM' 2.5x critical attack bonus!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
