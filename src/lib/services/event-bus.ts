import { EventEmitter } from 'events';
import type { Agent, Alert, Task } from '@contracts';

export type MissionControlEvent =
  | { type: 'task.updated'; payload: Task }
  | { type: 'agent.updated'; payload: Agent }
  | { type: 'alert.created'; payload: Alert };

type EventHandler = (event: MissionControlEvent) => void;

class MissionEventBus {
  private emitter = new EventEmitter();

  publish(event: MissionControlEvent) {
    this.emitter.emit('event', event);
  }

  subscribe(handler: EventHandler) {
    this.emitter.on('event', handler);
    return () => this.emitter.off('event', handler);
  }
}

export const eventBus = new MissionEventBus();
