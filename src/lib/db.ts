import { Pool, type PoolClient } from 'pg';

type Globals = { __pool?: Pool; __schema?: Promise<void> };
const g = globalThis as unknown as Globals;

const SCHEMA = `
create table if not exists campaigns (
  id serial primary key,
  slug text unique not null,
  admin_token text not null,
  title text not null,
  kind text not null,
  split119 boolean not null default false,
  opener_name text,
  deadline date,
  is_public boolean not null default true,
  auto_renew boolean not null default true,
  round int not null default 1,
  completed_rounds int not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists units (
  id serial primary key,
  campaign_id int not null references campaigns(id) on delete cascade,
  idx int not null,
  label text not null,
  sublabel text,
  detail text not null,
  group_label text not null,
  ref text not null,
  status text not null default 'free',
  taker_name text,
  taker_device text,
  taken_at timestamptz,
  read_at timestamptz,
  unique (campaign_id, idx)
);

create table if not exists dedications (
  id serial primary key,
  campaign_id int not null references campaigns(id) on delete cascade,
  kind text not null,
  name text not null,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists readings (
  id serial primary key,
  campaign_id int not null references campaigns(id) on delete cascade,
  unit_idx int not null,
  round int not null,
  reader_name text,
  reader_device text,
  created_at timestamptz not null default now()
);

create table if not exists activity (
  id serial primary key,
  campaign_id int not null references campaigns(id) on delete cascade,
  kind text not null,
  name text,
  device text,
  count int not null default 1,
  created_at timestamptz not null default now()
);

alter table campaigns add column if not exists release_days int;
alter table campaigns add column if not exists dedication_kind text;
alter table campaigns add column if not exists dedication_name text;
alter table campaigns add column if not exists copies int not null default 1;
alter table units add column if not exists copy int not null default 1;
alter table units add column if not exists progress int[] not null default '{}';

create index if not exists activity_campaign_idx on activity (campaign_id, created_at desc);
create index if not exists units_device_idx on units (taker_device);
create index if not exists units_campaign_idx on units (campaign_id, idx);
create index if not exists dedications_campaign_idx on dedications (campaign_id);
create index if not exists readings_campaign_idx on readings (campaign_id);
`;

type Globals2 = { __ssl?: boolean };
const g2 = globalThis as unknown as Globals2;

export class DbConfigError extends Error {}

function wantsSsl(url: string): boolean {
  if (process.env.PGSSL === 'true') return true;
  if (process.env.PGSSL === 'false') return false;
  // Railway's private network (*.railway.internal) and localhost need no SSL; public proxies usually do.
  return !/\.railway\.internal|localhost|127\.0\.0\.1/.test(url);
}

export function pool(): Pool {
  if (!g.__pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new DbConfigError('DATABASE_URL is not set. Add a Postgres service and set DATABASE_URL=${{Postgres.DATABASE_URL}}.');
    }
    g2.__ssl ??= wantsSsl(connectionString);
    g.__pool = new Pool({
      connectionString,
      max: 10,
      connectionTimeoutMillis: 10_000,
      ssl: g2.__ssl ? { rejectUnauthorized: false } : undefined,
    });
    g.__pool.on('error', (err) => console.error('[db] idle client error', err.message));
  }
  return g.__pool;
}

/** If the first connection fails because of SSL, flip the SSL setting once and retry. */
async function resetPoolOnSslMismatch(err: unknown): Promise<boolean> {
  const msg = err instanceof Error ? err.message : String(err);
  if (!/ssl|encryption|pg_hba/i.test(msg) || process.env.PGSSL) return false;
  console.warn(`[db] connection failed (${msg}); retrying with ssl=${!g2.__ssl}`);
  const old = g.__pool;
  g.__pool = undefined;
  g2.__ssl = !g2.__ssl;
  await old?.end().catch(() => {});
  return true;
}

function ensureSchema(): Promise<void> {
  if (!g.__schema) {
    g.__schema = (async () => {
      try {
        await pool().query(SCHEMA);
      } catch (err) {
        if (!(await resetPoolOnSslMismatch(err))) throw err;
        await pool().query(SCHEMA);
      }
    })().catch((err) => {
      g.__schema = undefined;
      console.error('[db] could not connect or create tables:', err instanceof Error ? err.message : err);
      throw err;
    });
  }
  return g.__schema;
}

/** Checks the database and returns a short, secret-free reason when it is not reachable. */
export async function dbHealth(): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    await ensureSchema();
    await pool().query('select 1');
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = (err as { code?: string }).code;
    return { ok: false, reason: code ? `${code}: ${msg}` : msg };
  }
}

export async function query<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  await ensureSchema();
  const res = await pool().query(text, params);
  return res.rows as T[];
}

export async function tx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  await ensureSchema();
  const client = await pool().connect();
  try {
    await client.query('begin');
    const result = await fn(client);
    await client.query('commit');
    return result;
  } catch (err) {
    await client.query('rollback').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
