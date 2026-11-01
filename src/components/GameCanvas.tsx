/**
 * Isolated Game Canvas Surface.
 * Decoupled from React reconciliation so HUD updates never tear down the canvas.
 * Manages ResizeObserver, window input listeners, and the 60 FPS CanvasRenderer.
 */

import React, { useEffect, useRef } from 'react';
import { GameEngine } from '../engine/gameLoop';
import { CanvasRenderer } from '../render/canvasRenderer';

interface GameCanvasProps {
  engine: GameEngine;
  onCanvasClick?: () => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ engine, onCanvasClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize renderer
    const renderer = new CanvasRenderer(ctx, container.clientWidth, container.clientHeight);
    rendererRef.current = renderer;

    const handleResize = () => {
      if (!container || !canvas) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      canvas.width = width;
      canvas.height = height;
      renderer.resize(width, height);
    };

    handleResize();

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);

    // Global Key Listeners for WASD / Arrows
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].includes(e.code)) {
        engine.handleKeyDown(e.code);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].includes(e.code)) {
        engine.handleKeyUp(e.code);
      }
    };

    // Clean inputs on window blur so keys never stick
    const handleBlur = () => {
      engine.clearInputs();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleBlur);

    // Render loop synced to browser display
    let animId: number;
    const renderLoop = () => {
      const hero = engine.getHero();
      const dungeon = engine.getDungeon();
      const particles = engine.getParticles();
      const floatingTexts = engine.getFloatingTexts();
      const slashEffects = engine.getSlashEffects();
      const lightningArcs = engine.getLightningArcs();
      const screenShake = engine.getScreenShakeOffset();

      renderer.render(
        hero,
        dungeon.getEnemies(),
        particles,
        floatingTexts,
        slashEffects,
        lightningArcs,
        screenShake
      );

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleBlur);
    };
  }, [engine]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full overflow-hidden bg-[#090a0f] cursor-crosshair"
      onClick={onCanvasClick}
      data-testid="game-canvas-container"
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};
