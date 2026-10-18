import type { PoolClient } from 'pg';
import { query, tx } from './db';
import { buildUnits, kindLabel, type Kind } from './divisions';
import { newSlug, newToken } from './ids';
import { publish } from './events';
import type {
  AdminState,
  CampaignState,
  CampaignSummary,
  Counts,
  DedicationKind,
  PublicCampaign,
  UnitStatus,
} from './types';

export class UserError extends Error {
  constructor(message: string, public status = 400, public extra?: Record<string, unknown>) {
    super(message);
  }
}

interface CampaignRow {
  id: number;
  slug: string;
  admin_token: string;
  title: string;
  kind: Kind;
  split119: boolean;
  opener_name: string | null;
  deadline: string | null;
  is_public: boolean;
  auto_renew: boolean;
  round: number;
  completed_rounds: number;
  status: 'active' | 'closed';
}

interface UnitRow {
  id: number;
  idx: number;
  label: string;
  sublabel: string | null;
  detail: string;
  group_label: string;
  ref: string;
  status: UnitStatus;
  taker_name: string | null;
  taker_device: string | null;
  taken_at: Date | null;
  read_at: Date | null;
}

const CAMPAIGN_COLS = `id, slug, admin_token, title, kind, split119, opener_name,
  to_char(deadline, 'YYYY-MM-DD') as deadline, is_public, auto_renew, round, completed_rounds, status`;

export const MAX_TAKE = 30;

function clean(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const s = value.replace(/\s+/g, ' ').trim().slice(0, max);
  return s.length ? s : null;
}

function cleanDevice(value: unknown): string | null {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(value) ? value : null;
}

function toPublic(c: CampaignRow): PublicCampaign {
  return {
    slug: c.slug,
    title: c.title,
    kind: c.kind,
    kindLabel: kindLabel(c.kind),
    openerName: c.opener_name,
    deadline: c.deadline,
    round: c.round,
    completedRounds: c.completed_rounds,
    status: c.status,
    isPublic: c.is_public,
    autoRenew: c.auto_renew,
  };
}

function countUnits(units: { status: UnitStatus }[]): Counts {
  const counts: Counts = { free: 0, taken: 0, read: 0, total: units.length };
  for (const u of units) counts[u.status]++;
  return counts;
}

async function findCampaign(slug: string, client?: PoolClient, lock = false): Promise<CampaignRow> {
  const sql = `select ${CAMPAIGN_COLS} from campaigns where slug = $1${lock ? ' for update' : ''}`;
  const rows = client ? (await client.query(sql, [slug])).rows : await query<CampaignRow>(sql, [slug]);
  if (!rows[0]) throw new UserError('החלוקה לא נמצאה', 404);
  return rows[0] as CampaignRow;
}

function assertActive(c: CampaignRow) {
  if (c.status !== 'active') throw new UserError('החלוקה הזאת סגורה');
}

async function addDedication(client: PoolClient, campaignId: number, kind: unknown, name: unknown) {
  const n = clean(name, 80);
  if (!n) return;
  const k: DedicationKind = kind === 'refua' || kind === 'hatzlacha' ? kind : 'ilui';
  await client.query('insert into dedications (campaign_id, kind, name) values ($1, $2, $3)', [campaignId, k, n]);
}

// ---------------------------------------------------------------- create

export interface CreateInput {
  title?: unknown;
  kind?: unknown;
  split119?: unknown;
  openerName?: unknown;
  deadline?: unknown;
  isPublic?: unknown;
  dedicationKind?: unknown;
  dedicationName?: unknown;
}

export async function createCampaign(input: CreateInput): Promise<{ slug: string; adminToken: string }> {
  const title = clean(input.title, 80);
  if (!title) throw new UserError('צריך לתת שם לחלוקה');
  const kind = input.kind as Kind;
  if (!['chapters', 'month', 'week', 'books'].includes(kind)) throw new UserError('סוג חלוקה לא תקין');
  const openerName = clean(input.openerName, 60);
  const deadline =
    typeof input.deadline === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.deadline) ? input.deadline : null;
  const split119 = kind === 'chapters' && input.split119 === true;
  const units = buildUnits(kind, split119);
  const adminToken = newToken();

  return tx(async (client) => {
    let slug = newSlug();
    for (let i = 0; i < 5; i++) {
      const exists = await client.query('select 1 from campaigns where slug = $1', [slug]);
      if (!exists.rowCount) break;
      slug = newSlug();
    }
    const res = await client.query(
      `insert into campaigns (slug, admin_token, title, kind, split119, opener_name, deadline, is_public)
       values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
      [slug, adminToken, title, kind, split119, openerName, deadline, input.isPublic !== false],
    );
    const id = res.rows[0].id as number;
    const values: unknown[] = [];
    const tuples = units.map((u, i) => {
      const o = i * 7;
      values.push(id, i, u.label, u.sublabel, u.detail, u.group, u.ref);
      return `($${o + 1}, $${o + 2}, $${o + 3}, $${o + 4}, $${o + 5}, $${o + 6}, $${o + 7})`;
    });
    await client.query(
      `insert into units (campaign_id, idx, label, sublabel, detail, group_label, ref) values ${tuples.join(', ')}`,
      values,
    );
    await addDedication(client, id, input.dedicationKind, input.dedicationName);
    return { slug, adminToken };
  });
}

// ---------------------------------------------------------------- read

async function loadUnits(campaignId: number): Promise<UnitRow[]> {
  return query<UnitRow>(
    `select id, idx, label, sublabel, detail, group_label, ref, status, taker_name, taker_device, taken_at, read_at
     from units where campaign_id = $1 order by idx`,
    [campaignId],
  );
}

export async function getState(slug: string, device: unknown): Promise<CampaignState> {
  const c = await findCampaign(slug);
  const dev = cleanDevice(device);
  const units = await loadUnits(c.id);
  const dedications = await query<{ kind: DedicationKind; name: string }>(
    `select kind, name from (
       select distinct on (kind, name) kind, name, created_at from dedications
       where campaign_id = $1 and not hidden order by kind, name, created_at
     ) d order by created_at`,
    [c.id],
  );
  return {
    campaign: toPublic(c),
    units: units.map((u) => ({
      id: u.id,
      idx: u.idx,
      label: u.label,
      sublabel: u.sublabel,
      detail: u.detail,
      group: u.group_label,
      ref: u.ref,
      status: u.status,
      takerName: u.status === 'free' ? null : u.taker_name,
      mine: !!dev && u.status !== 'free' && u.taker_device === dev,
    })),
    dedications,
    counts: countUnits(units),
  };
}

export async function listPublicCampaigns(limit = 12): Promise<CampaignSummary[]> {
  const rows = await query<{
    slug: string;
    title: string;
    kind: Kind;
    opener_name: string | null;
    round: number;
    free: number;
    taken: number;
    read: number;
    total: number;
  }>(
    `select c.slug, c.title, c.kind, c.opener_name, c.round,
       count(*) filter (where u.status = 'free')::int as free,
       count(*) filter (where u.status = 'taken')::int as taken,
       count(*) filter (where u.status = 'read')::int as read,
       count(*)::int as total
     from campaigns c join units u on u.campaign_id = c.id
     where c.is_public and c.status = 'active'
     group by c.id
     order by c.created_at desc
     limit $1`,
    [limit],
  );
  return rows.map((r) => ({
    slug: r.slug,
    title: r.title,
    kindLabel: kindLabel(r.kind),
    openerName: r.opener_name,
    round: r.round,
    counts: { free: r.free, taken: r.taken, read: r.read, total: r.total },
  }));
}

export async function getStats(): Promise<{ books: number; campaigns: number; readings: number }> {
  const [row] = await query<{ books: number; campaigns: number; readings: number }>(
    `select coalesce((select sum(completed_rounds) from campaigns), 0)::int as books,
            (select count(*) from campaigns)::int as campaigns,
            (select count(*) from readings)::int as readings`,
  );
  return row;
}

// ---------------------------------------------------------------- participant actions

export interface TakeInput {
  unitIds?: unknown;
  count?: unknown;
  name?: unknown;
  device?: unknown;
  dedicationKind?: unknown;
  dedicationName?: unknown;
}

/**
 * Takes the requested units, all or nothing. If any of them was taken by
 * someone else in the meantime, nothing is taken and the conflicts are returned.
 * With `count` instead of `unitIds`, takes the next free units in order.
 */
export async function takeUnits(slug: string, input: TakeInput): Promise<{ taken: number[] }> {
  const name = clean(input.name, 60);
  if (!name) throw new UserError('צריך למלא שם');
  const device = cleanDevice(input.device);
  if (!device) throw new UserError('מזהה מכשיר חסר');

  const result = await tx(async (client) => {
    const c = await findCampaign(slug, client);
    assertActive(c);
    let ids: number[];
    if (Array.isArray(input.unitIds)) {
      ids = [...new Set(input.unitIds.filter((x): x is number => Number.isInteger(x)))];
      if (!ids.length) throw new UserError('לא נבחרו פרקים');
      if (ids.length > MAX_TAKE) throw new UserError(`אפשר לקחת עד ${MAX_TAKE} בבת אחת`);
      const locked = await client.query(
        `select id, status, label from units where campaign_id = $1 and id = any($2::int[]) for update`,
        [c.id, ids],
      );
      if (locked.rowCount !== ids.length) throw new UserError('חלק מהפרקים לא נמצאו');
      const conflicts = locked.rows.filter((r) => r.status !== 'free');
      if (conflicts.length) {
        throw new UserError('חלק מהפרקים נלקחו בינתיים', 409, { conflicts: conflicts.map((r) => r.label) });
      }
    } else {
      const count = Number(input.count);
      if (!Number.isInteger(count) || count < 1 || count > MAX_TAKE) throw new UserError('מספר לא תקין');
      const free = await client.query(
        `select id from units where campaign_id = $1 and status = 'free' order by idx limit $2 for update skip locked`,
        [c.id, count],
      );
      ids = free.rows.map((r) => r.id as number);
      if (!ids.length) throw new UserError('לא נשארו פרקים פנויים', 409);
    }
    await client.query(
      `update units set status = 'taken', taker_name = $1, taker_device = $2, taken_at = now(), read_at = null
       where id = any($3::int[])`,
      [name, device, ids],
    );
    await addDedication(client, c.id, input.dedicationKind, input.dedicationName);
    return { taken: ids };
  });
  await publish({ slug, type: 'update' });
  return result;
}

/** Marks units as read. Completing the whole book starts a new round when auto-renew is on. */
export async function markRead(
  slug: string,
  unitIds: unknown,
  device: unknown,
  opts: { admin?: boolean } = {},
): Promise<{ completed: boolean; round: number }> {
  const dev = cleanDevice(device);
  if (!opts.admin && !dev) throw new UserError('מזהה מכשיר חסר');
  const ids = Array.isArray(unitIds) ? unitIds.filter((x): x is number => Number.isInteger(x)) : [];
  if (!ids.length) throw new UserError('לא נבחרו פרקים');

  const result = await tx(async (client) => {
    const c = await findCampaign(slug, client, true);
    assertActive(c);
    const updated = await client.query(
      `update units set status = 'read', read_at = now()
       where campaign_id = $1 and id = any($2::int[]) and status = 'taken' ${opts.admin ? '' : 'and taker_device = $3'}
       returning idx, taker_name, taker_device`,
      opts.admin ? [c.id, ids] : [c.id, ids, dev],
    );
    for (const r of updated.rows) {
      await client.query(
        'insert into readings (campaign_id, unit_idx, round, reader_name, reader_device) values ($1, $2, $3, $4, $5)',
        [c.id, r.idx, c.round, r.taker_name, r.taker_device],
      );
    }
    const left = await client.query(`select count(*)::int as n from units where campaign_id = $1 and status <> 'read'`, [c.id]);
    if (left.rows[0].n === 0) {
      await client.query('update campaigns set completed_rounds = completed_rounds + 1 where id = $1', [c.id]);
      if (c.auto_renew) await startNewRound(client, c.id);
      return { completed: true, round: c.auto_renew ? c.round + 1 : c.round };
    }
    return { completed: false, round: c.round };
  });
  await publish({ slug, type: result.completed ? 'completed' : 'update', round: result.round });
  return result;
}

export async function releaseUnits(slug: string, unitIds: unknown, device: unknown): Promise<void> {
  const dev = cleanDevice(device);
  if (!dev) throw new UserError('מזהה מכשיר חסר');
  const ids = Array.isArray(unitIds) ? unitIds.filter((x): x is number => Number.isInteger(x)) : [];
  if (!ids.length) throw new UserError('לא נבחרו פרקים');
  const c = await findCampaign(slug);
  await query(
    `update units set status = 'free', taker_name = null, taker_device = null, taken_at = null
     where campaign_id = $1 and id = any($2::int[]) and status = 'taken' and taker_device = $3`,
    [c.id, ids, dev],
  );
  await publish({ slug, type: 'update' });
}

async function startNewRound(client: PoolClient, campaignId: number) {
  await client.query('update campaigns set round = round + 1 where id = $1', [campaignId]);
  await client.query(
    `update units set status = 'free', taker_name = null, taker_device = null, taken_at = null, read_at = null
     where campaign_id = $1`,
    [campaignId],
  );
}

// ---------------------------------------------------------------- admin

export async function assertAdmin(slug: string, key: unknown): Promise<CampaignRow> {
  const c = await findCampaign(slug);
  if (typeof key !== 'string' || key !== c.admin_token) throw new UserError('קישור הניהול לא תקין', 403);
  return c;
}

export async function getAdminState(slug: string, key: unknown): Promise<AdminState> {
  const c = await assertAdmin(slug, key);
  const state = await getState(slug, null);
  const units = await loadUnits(c.id);
  const byId = new Map(units.map((u) => [u.id, u]));
  const adminDedications = await query<{ id: number; kind: DedicationKind; name: string; hidden: boolean }>(
    'select id, kind, name, hidden from dedications where campaign_id = $1 order by created_at',
    [c.id],
  );
  return {
    ...state,
    units: state.units.map((u) => ({
      ...u,
      takenAt: byId.get(u.id)?.taken_at?.toISOString() ?? null,
      readAt: byId.get(u.id)?.read_at?.toISOString() ?? null,
    })),
    adminDedications,
  };
}

export interface AdminInput {
  key?: unknown;
  action?: unknown;
  unitIds?: unknown;
  dedicationId?: unknown;
  hidden?: unknown;
  title?: unknown;
  deadline?: unknown;
  isPublic?: unknown;
  autoRenew?: unknown;
}

export async function adminAction(slug: string, input: AdminInput): Promise<void> {
  const c = await assertAdmin(slug, input.key);
  const ids = Array.isArray(input.unitIds) ? input.unitIds.filter((x): x is number => Number.isInteger(x)) : [];

  switch (input.action) {
    case 'release':
      await query(
        `update units set status = 'free', taker_name = null, taker_device = null, taken_at = null, read_at = null
         where campaign_id = $1 and id = any($2::int[])`,
        [c.id, ids],
      );
      break;
    case 'markRead':
      await markRead(slug, ids, null, { admin: true });
      return;
    case 'hideDedication':
      await query('update dedications set hidden = $1 where campaign_id = $2 and id = $3', [
        input.hidden !== false,
        c.id,
        Number(input.dedicationId),
      ]);
      break;
    case 'newRound':
      await tx((client) => startNewRound(client, c.id));
      break;
    case 'close':
      await query(`update campaigns set status = 'closed' where id = $1`, [c.id]);
      break;
    case 'reopen':
      await query(`update campaigns set status = 'active' where id = $1`, [c.id]);
      break;
    case 'settings': {
      const title = clean(input.title, 80) ?? c.title;
      const deadline =
        typeof input.deadline === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.deadline) ? input.deadline : null;
      await query('update campaigns set title = $1, deadline = $2, is_public = $3, auto_renew = $4 where id = $5', [
        title,
        deadline,
        input.isPublic !== false,
        input.autoRenew !== false,
        c.id,
      ]);
      break;
    }
    default:
      throw new UserError('פעולה לא מוכרת');
  }
  await publish({ slug, type: 'update' });
}
