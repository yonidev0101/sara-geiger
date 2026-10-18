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

create index if not exists units_campaign_idx on units (campaign_id, idx);
create index if not exists dedications_campaign_idx on dedications (campaign_id);
create index if not exists readings_campaign_idx on readings (campaign_id);
`;

export function pool(): Pool {
  if (!g.__pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL is not set');
    g.__pool = new Pool({
      connectionString,
      max: 10,
      ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
    });
  }
  return g.__pool;
}

function ensureSchema(): Promise<void> {
  if (!g.__schema) {
    g.__schema = pool()
      .query(SCHEMA)
      .then(() => undefined)
      .catch((err) => {
        g.__schema = undefined;
        throw err;
      });
  }
  return g.__schema;
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
