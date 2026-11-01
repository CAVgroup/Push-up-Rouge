/**
 * Community Modding Studio & Modular JSON Enemy Editor.
 * Enables players to inspect, mod, paste, import, and export custom .json enemies,
 * scaling dungeon encounters modularly.
 */

import React, { useState } from 'react';
import { X, Wrench, Download, Upload, Plus, Check, AlertCircle } from 'lucide-react';
import { EnemyDefinition } from '../types/enemy';

interface ModdingModalProps {
  enemies: EnemyDefinition[];
  onAddCustomEnemy: (def: EnemyDefinition) => void;
  onClose: () => void;
}

export const ModdingModal: React.FC<ModdingModalProps> = ({
  enemies,
  onAddCustomEnemy,
  onClose,
}) => {
  const [selectedEnemy, setSelectedEnemy] = useState<EnemyDefinition>(enemies[0]);
  const [jsonInput, setJsonInput] = useState<string>(JSON.stringify(enemies[0], null, 2));
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const handleSelect = (enemy: EnemyDefinition) => {
    setSelectedEnemy(enemy);
    setJsonInput(JSON.stringify(enemy, null, 2));
    setStatusMessage(null);
  };

  const handleApplyJson = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (!parsed.id || !parsed.name || !parsed.hp || !parsed.behavior) {
        throw new Error('Missing required fields: id, name, hp, behavior');
      }
      onAddCustomEnemy(parsed as EnemyDefinition);
      setSelectedEnemy(parsed as EnemyDefinition);
      setStatusMessage({ text: `Enemy "${parsed.name}" successfully added to dungeon spawns!`, isError: false });
    } catch (err: any) {
      setStatusMessage({ text: `JSON Error: ${err.message}`, isError: true });
    }
  };

  const handleCreateNewTemplate = () => {
    const template: EnemyDefinition = {
      id: `custom_foe_${Date.now()}`,
      name: 'Void Shadow Fiend',
      lore: 'Created in the community modding workshop.',
      hp: 65,
      speed: 70,
      attackDamage: 16,
      attackRange: 50,
      attackWindup: 0.6,
      attackCooldown: 1.5,
      behavior: 'charger',
      visual: {
        primaryColor: '#8b5cf6',
        accentColor: '#c4b5fd',
        glowColor: '#7c3aed',
        scale: 1.2,
        shape: 'demon',
        hasHorns: true,
      },
      telegraph: {
        type: 'circle',
        color: 'rgba(139, 92, 246, 0.45)',
        radius: 50,
      },
      dropXP: 40,
      dropEssence: 12,
    };
    setSelectedEnemy(template);
    setJsonInput(JSON.stringify(template, null, 2));
    setStatusMessage({ text: 'New custom enemy template generated. Edit parameters and click "Save & Mod Dungeon".', isError: false });
  };

  const handleExportJson = () => {
    const blob = new Blob([jsonInput], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedEnemy.id || 'custom_enemy'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 select-none font-mono">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <Wrench className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base font-bold text-white uppercase tracking-wider">
                Modular Enemy JSON Modding Studio
              </h2>
              <p className="text-xs text-slate-400">
                Easily scale and mod enemy encounters via JSON files.
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

        {/* Studio Content */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800">
          {/* Left Column: Enemy Roster List */}
          <div className="p-4 overflow-y-auto max-h-[70vh]">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs uppercase text-slate-400 font-bold">Roster ({enemies.length})</span>
              <button
                onClick={handleCreateNewTemplate}
                className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 font-bold px-2 py-1 rounded bg-amber-950/50 border border-amber-800/60"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              {enemies.map((enemy) => {
                const isSelected = selectedEnemy.id === enemy.id;
                return (
                  <button
                    key={enemy.id}
                    onClick={() => handleSelect(enemy)}
                    className={`text-left p-2.5 rounded border transition-colors ${
                      isSelected
                        ? 'bg-amber-950/40 border-amber-500 text-white'
                        : 'bg-slate-950/50 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: enemy.visual.primaryColor }}
                      />
                      <span className="text-xs font-bold truncate">{enemy.name}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                      <span className="uppercase">{enemy.behavior}</span>
                      <span className="tabular-nums">{enemy.hp} HP</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Middle & Right Columns: JSON Editor & Preview */}
          <div className="md:col-span-2 p-4 flex flex-col justify-between overflow-y-auto max-h-[70vh] bg-slate-950/40">
            <div className="flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-slate-400 font-bold uppercase">
                  Enemy Definition (.json)
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={handleExportJson}
                    className="flex items-center gap-1 text-xs text-slate-300 hover:text-white px-2.5 py-1 bg-slate-800 rounded border border-slate-700"
                    title="Export JSON File"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export</span>
                  </button>
                </div>
              </div>

              {/* JSON Textarea */}
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                className="w-full flex-1 min-h-[300px] p-3 bg-slate-950 border border-slate-800 rounded font-mono text-xs text-emerald-400 focus:outline-none focus:border-amber-500 leading-relaxed resize-none"
                spellCheck={false}
              />

              {/* Feedback status */}
              {statusMessage && (
                <div
                  className={`mt-2 p-2 rounded text-xs flex items-center gap-1.5 ${
                    statusMessage.isError
                      ? 'bg-red-950/60 border border-red-800 text-red-300'
                      : 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                  }`}
                >
                  {statusMessage.isError ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                  <span>{statusMessage.text}</span>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end gap-3">
              <button
                onClick={handleApplyJson}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Save & Mod Dungeon Spawns</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
