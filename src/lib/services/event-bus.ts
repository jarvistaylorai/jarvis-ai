import { EventEmitter } from 'events';
import { Client } from 'pg';
import { randomUUID } from 'crypto';
import {  Agent, Alert, Task  } from '@contracts';

export type MissionControlEvent =
  | { type: 'task.updated'; payload: Task }
  | { type: 'agent.updated'; payload: Agent }
  | { type: 'alert.created'; payload: Alert };

type EventHandler = (event: MissionControlEvent) => void;

class MissionEventBus {
  private emitter = new EventEmitter();
  private pgClient: Client | null = null;
  private isPgConnected = false;
  private instanceId = randomUUID();

  constructor() {
    this.initPostgres().catch(console.error);
  }

  private async initPostgres() {
    const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
    if (!connectionString || !connectionString.startsWith('postgres')) {
      console.log('[EventBus] No Postgres connection string found. Running in memory-only mode.');
      return;
    }

    try {
      this.pgClient = new Client({ connectionString });
      await this.pgClient.connect();
      this.isPgConnected = true;

      this.pgClient.on('notification', (msg) => {
        if (msg.channel === 'mission_control_events' && msg.payload) {
          try {
            const data = JSON.parse(msg.payload);
            // Ignore events broadcasted by this exact server instance
            if (data.senderId === this.instanceId) return;

            const event = data.event as MissionControlEvent;
            this.emitter.emit('event', event);
          } catch (err) {
            console.error('[EventBus] Failed to parse Postgres notification:', err);
          }
        }
      });

      await this.pgClient.query('LISTEN mission_control_events');
      console.log('[EventBus] Postgres LISTEN/NOTIFY active on "mission_control_events"');
    } catch (err) {
      console.error('[EventBus] Postgres connection failed. Falling back to memory-only mode.', err);
      this.isPgConnected = false;
    }
  }

  async publish(event: MissionControlEvent) {
    // 1. Emit locally for immediate response
    this.emitter.emit('event', event);

    // 2. Broadcast to other instances via Postgres NOTIFY
    if (this.isPgConnected && this.pgClient) {
      try {
        const payload = JSON.stringify({ senderId: this.instanceId, event });
        // Postgres NOTIFY payload limit is ~8000 bytes.
        if (Buffer.byteLength(payload, 'utf8') < 8000) {
          const safePayload = payload.replace(/'/g, "''");
          // Fire and forget (don't await here to avoid blocking callers)
          this.pgClient.query(`NOTIFY mission_control_events, '${safePayload}'`).catch(err => {
            console.error('[EventBus] Failed to execute NOTIFY query:', err);
          });
        } else {
          console.warn('[EventBus] Payload too large for Postgres NOTIFY, local emit only.');
        }
      } catch (err) {
        console.error('[EventBus] Failed to prepare NOTIFY payload:', err);
      }
    }
  }

  subscribe(handler: EventHandler) {
    this.emitter.on('event', handler);
    return () => this.emitter.off('event', handler);
  }
}

export const eventBus = new MissionEventBus();
