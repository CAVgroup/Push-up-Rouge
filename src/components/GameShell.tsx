/**
 * Master Game Shell.
 * Orchestrates GameEngine, PushUpDetector, CameraVision, SensorDetector,
 * event bus dispatching, and game state transitions ('title' -> 'playing' -> 'paused' / 'gameover').
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameStatus, HeroState, WorkoutSessionStats } from '../types/game';
import { PushUpPhase, TrackingMode, RepValidationResult, SensitivityLevel } from '../types/fitness';
import { EnemyDefinition } from '../types/enemy';
import { GameEngine } from '../engine/gameLoop';
import { PushUpDetector } from '../fitness/pushUpDetector';
import { CameraVision } from '../fitness/cameraVision';
import { SensorDetector } from '../fitness/sensorDetector';
import { gameEvents } from '../engine/events';
import { audioSynth } from '../render/audioSynth';
import { GameCanvas } from './GameCanvas';
import { MinimalHUD } from './MinimalHUD';
import { CameraViewfinder } from './CameraViewfinder';
import { TitleScreen } from './TitleScreen';
import { PauseModal } from './PauseModal';
import { GameOverModal } from './GameOverModal';
import { ArmoryModal } from './ArmoryModal';
import { ModdingModal } from './ModdingModal';
import { AndroidMLKitGuideModal } from './AndroidMLKitGuideModal';

export const GameShell: React.FC = () => {
  const [gameStatus, setGameStatus] = useState<GameStatus>('title');
  const [trackingMode, setTrackingMode] = useState<TrackingMode>('CAMERA_VISION');
  const [sensitivity, setSensitivity] = useState<SensitivityLevel>(() => {
    try {
      return (localStorage.getItem('pushup_rogue_sensitivity') as SensitivityLevel) || 'high';
    } catch {
      return 'high';
    }
  });
  const [isMuted, setIsMuted] = useState(false);

  // Modals
  const [showArmory, setShowArmory] = useState(false);
  const [showModding, setShowModding] = useState(false);
  const [showAndroidGuide, setShowAndroidGuide] = useState(false);

  // Live HUD telemetry
  const [heroState, setHeroState] = useState<HeroState | null>(null);
  const [workoutStats, setWorkoutStats] = useState<WorkoutSessionStats | null>(null);
  const [currentFloor, setCurrentFloor] = useState(1);
  const [currentWave, setCurrentWave] = useState(1);

  // Exercise real-time metrics
  const [exercisePhase, setExercisePhase] = useState<PushUpPhase>('READY');
  const [elbowAngle, setElbowAngle] = useState(160);
  const [depthPercent, setDepthPercent] = useState(0);
  const [formFeedback, setFormFeedback] = useState('READY');

  // Singletons held in refs so canvas loop is never torn down
  const engineRef = useRef<GameEngine | null>(null);
  const detectorRef = useRef<PushUpDetector | null>(null);
  const visionRef = useRef<CameraVision | null>(null);
  const sensorRef = useRef<SensorDetector | null>(null);

  if (!engineRef.current) {
    engineRef.current = new GameEngine();
  }

  if (!detectorRef.current) {
    detectorRef.current = new PushUpDetector({
      sensitivity,
      onPhaseChange: (phase, angle, depth) => {
        setExercisePhase(phase);
        setElbowAngle(angle);
        setDepthPercent(depth);
      },
      onRepValidated: (result) => {
        setFormFeedback(result.feedback);
        gameEvents.emit('REP_VALIDATED', result);
      },
      onRepFailed: (reason, score) => {
        setFormFeedback(reason);
        gameEvents.emit('REP_FAILED', { reason, formScore: score });
      },
    });
  }

  if (!visionRef.current) {
    visionRef.current = new CameraVision(detectorRef.current, {
      onSkeletonUpdate: (skeleton, angle, depth) => {
        setElbowAngle(angle);
        setDepthPercent(depth);
      },
    });
  }

  if (!sensorRef.current) {
    sensorRef.current = new SensorDetector(detectorRef.current);
  }

  // Sync document.body.dataset.state per guidelines
  useEffect(() => {
    document.body.dataset.state = gameStatus;
  }, [gameStatus]);

  // Support ?autostart=1 query parameter per ultra-mode requirements
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        handleStartGame();
      }
    }
  }, []);

  // Wire GameEngine callbacks
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    engine.setCallbacks({
      onStatsUpdate: (hero, workout, floor, wave) => {
        // Throttled HUD update
        setHeroState({ ...hero });
        setWorkoutStats({ ...workout });
        setCurrentFloor(floor);
        setCurrentWave(wave);
      },
      onGameOver: () => {
        setGameStatus('gameover');
      },
      onVictory: () => {
        setGameStatus('victory');
      },
    });

    setHeroState(engine.getHero());
    setWorkoutStats(engine.getWorkoutStats());
  }, []);

  // Handle Tracking Mode Switch
  const handleSelectTrackingMode = useCallback(async (mode: TrackingMode) => {
    setTrackingMode(mode);
    if (mode === 'DEVICE_SENSORS' && sensorRef.current) {
      await sensorRef.current.start();
      visionRef.current?.stop();
    } else if (mode === 'CAMERA_VISION') {
      sensorRef.current?.stop();
    } else {
      sensorRef.current?.stop();
      visionRef.current?.stop();
    }
  }, []);

  // Global Keyboard listener for Escape (Pause)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (gameStatus === 'playing') {
          e.preventDefault();
          setGameStatus('paused');
          engineRef.current?.stop();
        } else if (gameStatus === 'paused') {
          e.preventDefault();
          handleResume();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameStatus]);

  const handleStartGame = () => {
    setGameStatus('playing');
    engineRef.current?.start();
  };

  const handleResume = () => {
    setGameStatus('playing');
    engineRef.current?.start();
  };

  const handleRestart = () => {
    engineRef.current?.stop();
    engineRef.current = new GameEngine();
    detectorRef.current?.reset();
    setGameStatus('playing');
    engineRef.current.start();
  };

  const handleExitToTitle = () => {
    engineRef.current?.stop();
    setGameStatus('title');
  };

  const handleToggleMute = () => {
    const muted = audioSynth.toggleMute();
    setIsMuted(muted);
  };

  const handleEquipWeapon = (weaponId: string) => {
    if (engineRef.current) {
      engineRef.current.equipWeapon(weaponId);
      audioSynth.playSlash(1.2);
      setShowArmory(false);
    }
  };

  const handleAddCustomEnemy = (def: EnemyDefinition) => {
    if (engineRef.current) {
      engineRef.current.getDungeon().registerCustomEnemy(def);
    }
  };

  const handleSelectSensitivity = (level: SensitivityLevel) => {
    setSensitivity(level);
    detectorRef.current?.setSensitivity(level);
    try {
      localStorage.setItem('pushup_rogue_sensitivity', level);
    } catch {
      // safe fallback
    }
  };

  const handleToggleSensitivity = () => {
    const next: SensitivityLevel =
      sensitivity === 'normal' ? 'high' : sensitivity === 'high' ? 'ultra' : 'normal';
    handleSelectSensitivity(next);
  };

  const currentHero = heroState || engineRef.current.getHero();
  const currentWorkout = workoutStats || engineRef.current.getWorkoutStats();

  return (
    <div className="relative w-full h-screen bg-[#090a0f] overflow-hidden select-none">
      {/* 2D Canvas Viewport */}
      <GameCanvas engine={engineRef.current} />

      {/* Title Screen Overlay */}
      {gameStatus === 'title' && (
        <TitleScreen
          onStartGame={handleStartGame}
          trackingMode={trackingMode}
          onSelectTrackingMode={handleSelectTrackingMode}
          sensitivity={sensitivity}
          onSelectSensitivity={handleSelectSensitivity}
          onOpenArmory={() => setShowArmory(true)}
          onOpenModding={() => setShowModding(true)}
          onOpenAndroidGuide={() => setShowAndroidGuide(true)}
          bestStreak={currentWorkout.bestStreak}
          totalCareerReps={currentWorkout.totalReps}
        />
      )}

      {/* Playing Minimalist HUD */}
      {gameStatus === 'playing' && (
        <>
          <MinimalHUD
            hero={currentHero}
            workout={currentWorkout}
            currentFloor={currentFloor}
            currentWave={currentWave}
            exercisePhase={exercisePhase}
            elbowAngle={elbowAngle}
            depthPercent={depthPercent}
            formFeedback={formFeedback}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            onPause={() => {
              setGameStatus('paused');
              engineRef.current?.stop();
            }}
            onOpenArmory={() => setShowArmory(true)}
          />

          {/* Sleek Mini Camera Viewfinder in Corner */}
          <CameraViewfinder
            trackingMode={trackingMode}
            cameraVision={visionRef.current!}
            depthPercent={depthPercent}
            elbowAngle={elbowAngle}
            sensitivity={sensitivity}
            onToggleSensitivity={handleToggleSensitivity}
          />
        </>
      )}

      {/* Paused Modal */}
      {gameStatus === 'paused' && (
        <PauseModal
          onResume={handleResume}
          onRestart={handleRestart}
          onExitToTitle={handleExitToTitle}
        />
      )}

      {/* Game Over or Victory Modal */}
      {(gameStatus === 'gameover' || gameStatus === 'victory') && (
        <GameOverModal
          isVictory={gameStatus === 'victory'}
          floorReached={currentFloor}
          workout={currentWorkout}
          onPlayAgain={handleRestart}
          onExitToTitle={handleExitToTitle}
        />
      )}

      {/* Armory & Weapon Unlocks Modal */}
      {showArmory && (
        <ArmoryModal
          weapons={engineRef.current.getWeapons()}
          progression={engineRef.current.getProgression()}
          workout={currentWorkout}
          onEquipWeapon={handleEquipWeapon}
          onClose={() => setShowArmory(false)}
        />
      )}

      {/* Community JSON Enemy Modding Studio */}
      {showModding && (
        <ModdingModal
          enemies={engineRef.current.getDungeon().getAllEnemyDefinitions()}
          onAddCustomEnemy={handleAddCustomEnemy}
          onClose={() => setShowModding(false)}
        />
      )}

      {/* Android ML Kit Guide Modal */}
      {showAndroidGuide && (
        <AndroidMLKitGuideModal onClose={() => setShowAndroidGuide(false)} />
      )}
    </div>
  );
};
