/**
 * Focused Pause Status Modal.
 * Conforms to game guidelines: single focused modal card in the world's palette.
 */

import React from 'react';
import { Play, RotateCcw, Home } from 'lucide-react';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onExitToTitle: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onExitToTitle,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 select-none font-mono">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl flex flex-col items-center text-center">
        <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-1">
          Dungeon Paused
        </h2>
        <p className="text-xs text-slate-400 mb-6">Take a breath. Your dungeon awaits.</p>

        <div className="w-full flex flex-col gap-2.5">
          <button
            onClick={onResume}
            className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Resume (Esc)</span>
          </button>

          <button
            onClick={onRestart}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-slate-700 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restart Dungeon</span>
          </button>

          <button
            onClick={onExitToTitle}
            className="w-full py-2.5 bg-transparent hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 rounded font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Exit to Title</span>
          </button>
        </div>
      </div>
    </div>
  );
};
