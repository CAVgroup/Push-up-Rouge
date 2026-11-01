/**
 * Event-Driven Game Bus.
 * Connects exercise detection events directly to combat actions and animations.
 */

import { GameEventMap, GameEventListener, GameEventPayloads } from '../types/events';

type ListenerMap = {
  [K in keyof GameEventPayloads]?: Set<GameEventListener<K>>;
};

export class GameEventEmitter {
  private listeners: ListenerMap = {};

  public on<K extends keyof GameEventPayloads>(event: K, listener: GameEventListener<K>): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set() as any;
    }
    (this.listeners[event] as Set<GameEventListener<K>>).add(listener);

    return () => {
      this.off(event, listener);
    };
  }

  public off<K extends keyof GameEventPayloads>(event: K, listener: GameEventListener<K>): void {
    const set = this.listeners[event];
    if (set) {
      (set as Set<GameEventListener<K>>).delete(listener);
    }
  }

  public emit<K extends keyof GameEventPayloads>(event: K, payload: GameEventPayloads[K]): void {
    const set = this.listeners[event];
    if (set) {
      set.forEach((listener) => {
        try {
          listener(payload);
        } catch (err) {
          console.error(`Error in event listener for ${String(event)}:`, err);
        }
      });
    }
  }

  public clear(): void {
    this.listeners = {};
  }
}

// Global singleton instance for game-wide event dispatching
export const gameEvents = new GameEventEmitter();
