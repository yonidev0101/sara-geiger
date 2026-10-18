import { EventEmitter } from 'node:events';
import type { Client } from 'pg';
import { pool } from './db';

// Live updates. Every change is sent through Postgres NOTIFY, and each server
// process LISTENs once and fans the event out to its open SSE connections.
// This keeps updates working even if Railway runs more than one replica.

export type LiveEvent = { slug: string; type: 'update' | 'completed'; round?: number };

const CHANNEL = 'mizmor_events';

type Globals = { __bus?: EventEmitter; __listener?: Promise<Client | null> };
const g = globalThis as unknown as Globals;

function bus(): EventEmitter {
  if (!g.__bus) {
    g.__bus = new EventEmitter();
    g.__bus.setMaxListeners(0);
  }
  return g.__bus;
}

function startListener(): Promise<Client | null> {
  if (!g.__listener) {
    g.__listener = (async () => {
      try {
        const client = await pool().connect();
        client.on('notification', (msg) => {
          if (msg.channel !== CHANNEL || !msg.payload) return;
          try {
            const evt = JSON.parse(msg.payload) as LiveEvent;
            bus().emit(evt.slug, evt);
          } catch {
            // ignore malformed payloads
          }
        });
        client.on('error', () => {
          g.__listener = undefined;
        });
        await client.query(`listen ${CHANNEL}`);
        return client as unknown as Client;
      } catch {
        g.__listener = undefined;
        return null;
      }
    })();
  }
  return g.__listener;
}

export async function publish(evt: LiveEvent): Promise<void> {
  const listener = await startListener();
  if (listener) {
    await pool().query('select pg_notify($1, $2)', [CHANNEL, JSON.stringify(evt)]);
  } else {
    bus().emit(evt.slug, evt);
  }
}

export function subscribe(slug: string, fn: (evt: LiveEvent) => void): () => void {
  void startListener();
  bus().on(slug, fn);
  return () => bus().off(slug, fn);
}
