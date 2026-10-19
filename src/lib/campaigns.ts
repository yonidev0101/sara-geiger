import type { PoolClient } from 'pg';
import { query, tx } from './db';
import { buildUnits, kindLabel, segmentsOf, type Kind } from './divisions';
import { newSlug, newToken } from './ids';
import { publish } from './events';
import type {
  ActivityItem,
  AdminState,
  CampaignState,
  CampaignSummary,
  Counts,
  DedicationKind,
  MyUnit,
  PublicCampaign,
  ReaderUnit,
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
  release_days: number | null;
  dedication_kind: DedicationKind | null;
  dedication_name: string | null;
  copies: number;
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
  progress: number[];
  copy: number;
}

const CAMPAIGN_COLS = `id, slug, admin_token, title, kind, split119, opener_name,
  to_char(deadline, 'YYYY-MM-DD') as deadline, is_public, auto_renew, round, completed_rounds, status, release_days, dedication_kind, dedication_name, copies`;

export const MAX_TAKE = 200;
export const MAX_COPIES = 20;

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
    releaseDays: c.release_days,
    dedication: mainDedication(c),
    copies: c.copies ?? 1,
  };
}

function cleanDedicationKind(kind: unknown): DedicationKind {
  return kind === 'refua' || kind === 'hatzlacha' ? kind : 'ilui';
}

function mainDedication(c: { dedication_kind: DedicationKind | null; dedication_name: string | null }) {
  return c.dedication_name ? { kind: c.dedication_kind ?? 'ilui', name: c.dedication_name } : null;
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

type Db = Pick<PoolClient, 'query'>;

async function logActivity(db: Db, campaignId: number, kind: ActivityItem['kind'], name: string | null, device: string | null, count: number) {
  await db.query('insert into activity (campaign_id, kind, name, device, count) values ($1, $2, $3, $4, $5)', [
    campaignId,
    kind,
    name,
    device,
    count,
  ]);
}

/** Frees units that were taken more than `release_days` days ago and never marked as read. */
async function releaseStale(c: CampaignRow): Promise<boolean> {
  if (!c.release_days || c.status !== 'active') return false;
  const res = await query(
    `update units set status = 'free', taker_name = null, taker_device = null, taken_at = null, progress = '{}'
     where campaign_id = $1 and status = 'taken' and taken_at < now() - make_interval(days => $2) returning id`,
    [c.id, c.release_days],
  );
  return res.length > 0;
}

async function addDedication(client: PoolClient, campaignId: number, kind: unknown, name: unknown) {
  const n = clean(name, 80);
  if (!n) return;
  const k = cleanDedicationKind(kind);
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
  copies?: unknown;
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
  const dedicationName = clean(input.dedicationName, 80);
  const copiesRaw = Number(input.copies ?? 1);
  const copies = Number.isInteger(copiesRaw) && copiesRaw >= 1 && copiesRaw <= MAX_COPIES ? copiesRaw : 1;
  const base = buildUnits(kind, split119);
  const units = Array.from({ length: copies }, (_, c) =>
    base.map((u) => ({ ...u, copy: c + 1, detail: copies > 1 ? `${u.detail} · תהילים ${c + 1}` : u.detail })),
  ).flat();
  const adminToken = newToken();

  return tx(async (client) => {
    let slug = newSlug();
    for (let i = 0; i < 5; i++) {
      const exists = await client.query('select 1 from campaigns where slug = $1', [slug]);
      if (!exists.rowCount) break;
      slug = newSlug();
    }
    const res = await client.query(
      `insert into campaigns (slug, admin_token, title, kind, split119, opener_name, deadline, is_public, dedication_kind, dedication_name, copies)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) returning id`,
      [slug, adminToken, title, kind, split119, openerName, deadline, input.isPublic !== false,
        dedicationName ? cleanDedicationKind(input.dedicationKind) : null, dedicationName, copies],
    );
    const id = res.rows[0].id as number;
    // Insert in batches to stay well under Postgres's limit on query parameters.
    for (let start = 0; start < units.length; start += 1000) {
      const values: unknown[] = [];
      const tuples = units.slice(start, start + 1000).map((u, j) => {
        const o = j * 8;
        values.push(id, start + j, u.label, u.sublabel, u.detail, u.group, u.ref, u.copy);
        return `($${o + 1}, $${o + 2}, $${o + 3}, $${o + 4}, $${o + 5}, $${o + 6}, $${o + 7}, $${o + 8})`;
      });
      await client.query(
        `insert into units (campaign_id, idx, label, sublabel, detail, group_label, ref, copy) values ${tuples.join(', ')}`,
        values,
      );
    }
    return { slug, adminToken };
  });
}

// ---------------------------------------------------------------- read

async function loadUnits(campaignId: number): Promise<UnitRow[]> {
  return query<UnitRow>(
    `select id, idx, label, sublabel, detail, group_label, ref, status, taker_name, taker_device, taken_at, read_at, progress, copy
     from units where campaign_id = $1 order by idx`,
    [campaignId],
  );
}

export async function getState(slug: string, device: unknown): Promise<CampaignState> {
  const c = await findCampaign(slug);
  const dev = cleanDevice(device);
  if (await releaseStale(c)) await publish({ slug, type: 'update' });
  const units = await loadUnits(c.id);
  const dedications = await query<{ kind: DedicationKind; name: string }>(
    `select kind, name from (
       select distinct on (kind, name) kind, name, created_at from dedications
       where campaign_id = $1 and not hidden order by kind, name, created_at
     ) d order by created_at`,
    [c.id],
  );
  const activity = await query<{ kind: ActivityItem['kind']; name: string | null; count: number; at: Date }>(
    'select kind, name, count, created_at as at from activity where campaign_id = $1 order by created_at desc limit 8',
    [c.id],
  );
  const [{ participants }] = await query<{ participants: number }>(
    'select count(distinct device)::int as participants from activity where campaign_id = $1 and device is not null',
    [c.id],
  );
  return {
    campaign: toPublic(c),
    activity: activity.map((a) => ({ kind: a.kind, name: a.name, count: a.count, at: a.at.toISOString() })),
    participants,
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
      parts: segmentsOf(u.ref).length,
      progress: u.progress ?? [],
      copy: u.copy ?? 1,
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
    dedication_kind: DedicationKind | null;
    dedication_name: string | null;
    copies: number;
    deadline: string | null;
    participants: number;
    free: number;
    taken: number;
    read: number;
    total: number;
  }>(
    `select c.slug, c.title, c.kind, c.opener_name, c.round, c.dedication_kind, c.dedication_name, c.copies, to_char(c.deadline, 'YYYY-MM-DD') as deadline,
       (select count(distinct device) from activity a where a.campaign_id = c.id and a.device is not null)::int as participants,
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
    dedication: mainDedication(r),
    copies: r.copies ?? 1,
    kindLabel: kindLabel(r.kind),
    openerName: r.opener_name,
    round: r.round,
    deadline: r.deadline,
    participants: r.participants,
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
    if (c.release_days) {
      await client.query(
        `update units set status = 'free', taker_name = null, taker_device = null, taken_at = null, progress = '{}'
         where campaign_id = $1 and status = 'taken' and taken_at < now() - make_interval(days => $2)`,
        [c.id, c.release_days],
      );
    }
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
      `update units set status = 'taken', taker_name = $1, taker_device = $2, taken_at = now(), read_at = null, progress = '{}'
       where id = any($3::int[])`,
      [name, device, ids],
    );
    await addDedication(client, c.id, input.dedicationKind, input.dedicationName);
    await logActivity(client, c.id, 'take', name, device, ids.length);
    return { taken: ids };
  });
  await publish({ slug, type: 'update' });
  return result;
}

/** Marks units as read. Completing the whole book starts a new round when auto-renew is on. */
/**
 * Marks taken units as read inside a transaction and logs the reading.
 * When the whole book is read, counts it and starts a new round if auto-renew is on.
 */
async function finishUnits(
  client: PoolClient,
  c: CampaignRow,
  ids: number[],
  device: string | null,
): Promise<{ completed: boolean; round: number }> {
  const updated = await client.query(
    `update units set status = 'read', read_at = now()
     where campaign_id = $1 and id = any($2::int[]) and status = 'taken' ${device ? 'and taker_device = $3' : ''}
     returning idx, taker_name, taker_device`,
    device ? [c.id, ids, device] : [c.id, ids],
  );
  if (updated.rowCount) {
    const first = updated.rows[0];
    await logActivity(client, c.id, 'read', first.taker_name, first.taker_device, updated.rowCount);
  }
  for (const r of updated.rows) {
    await client.query(
      'insert into readings (campaign_id, unit_idx, round, reader_name, reader_device) values ($1, $2, $3, $4, $5)',
      [c.id, r.idx, c.round, r.taker_name, r.taker_device],
    );
  }
  const left = await client.query(`select count(*)::int as n from units where campaign_id = $1 and status <> 'read'`, [c.id]);
  if (left.rows[0].n === 0) {
    const books = c.copies ?? 1;
    await client.query('update campaigns set completed_rounds = completed_rounds + $2 where id = $1', [c.id, books]);
    await logActivity(client, c.id, 'complete', null, null, c.completed_rounds + books);
    if (c.auto_renew) await startNewRound(client, c.id);
    return { completed: true, round: c.auto_renew ? c.round + 1 : c.round };
  }
  return { completed: false, round: c.round };
}

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
    return finishUnits(client, c, ids, opts.admin ? null : dev);
  });
  await publish({ slug, type: result.completed ? 'completed' : 'update', round: result.round });
  return result;
}

/**
 * Marks one chapter (part) of a unit as read or not read. When every part is read
 * the unit becomes read; un-marking a part of a read unit returns it to "taken".
 */
export async function setPartProgress(
  slug: string,
  input: { unitId?: unknown; part?: unknown; done?: unknown; device?: unknown },
): Promise<{ completed: boolean; unitRead: boolean; progress: number[] }> {
  const dev = cleanDevice(input.device);
  if (!dev) throw new UserError('מזהה מכשיר חסר');
  const unitId = Number(input.unitId);
  const part = Number(input.part);
  const done = input.done !== false;

  const result = await tx(async (client) => {
    const c = await findCampaign(slug, client, true);
    assertActive(c);
    const { rows } = await client.query(
      'select id, idx, ref, status, progress, taker_device from units where campaign_id = $1 and id = $2 for update',
      [c.id, unitId],
    );
    const u = rows[0];
    if (!u) throw new UserError('החלק לא נמצא', 404);
    if (u.status === 'free' || u.taker_device !== dev) throw new UserError('החלק הזה לא שמור על שמך', 403);
    const parts = segmentsOf(u.ref).length;
    if (!Number.isInteger(part) || part < 0 || part >= parts) throw new UserError('פרק לא תקין');

    let progress: number[] = u.status === 'read' ? Array.from({ length: parts }, (_, i) => i) : [...(u.progress ?? [])];
    progress = done ? [...new Set([...progress, part])] : progress.filter((p) => p !== part);
    progress.sort((a, b) => a - b);

    if (progress.length === parts) {
      await client.query('update units set progress = $1 where id = $2', [progress, u.id]);
      if (u.status === 'taken') return { ...(await finishUnits(client, c, [u.id], dev)), unitRead: true, progress };
      return { completed: false, round: c.round, unitRead: true, progress };
    }
    if (u.status === 'read') {
      await client.query(`update units set status = 'taken', read_at = null, progress = $1 where id = $2`, [progress, u.id]);
      await client.query(
        `delete from readings where id = (
           select id from readings where campaign_id = $1 and unit_idx = $2 and round = $3 order by id desc limit 1)`,
        [c.id, u.idx, c.round],
      );
    } else {
      await client.query('update units set progress = $1 where id = $2', [progress, u.id]);
    }
    return { completed: false, round: c.round, unitRead: false, progress };
  });
  await publish({ slug, type: result.completed ? 'completed' : 'update', round: result.round });
  return { completed: result.completed, unitRead: result.unitRead, progress: result.progress };
}

export async function releaseUnits(slug: string, unitIds: unknown, device: unknown): Promise<void> {
  const dev = cleanDevice(device);
  if (!dev) throw new UserError('מזהה מכשיר חסר');
  const ids = Array.isArray(unitIds) ? unitIds.filter((x): x is number => Number.isInteger(x)) : [];
  if (!ids.length) throw new UserError('לא נבחרו פרקים');
  const c = await findCampaign(slug);
  await query(
    `update units set status = 'free', taker_name = null, taker_device = null, taken_at = null, progress = '{}'
     where campaign_id = $1 and id = any($2::int[]) and status = 'taken' and taker_device = $3`,
    [c.id, ids, dev],
  );
  await publish({ slug, type: 'update' });
}

async function startNewRound(client: PoolClient, campaignId: number) {
  await client.query('update campaigns set round = round + 1 where id = $1', [campaignId]);
  await client.query(
    `update units set status = 'free', taker_name = null, taker_device = null, taken_at = null, progress = '{}', read_at = null
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
  releaseDays?: unknown;
  dedicationKind?: unknown;
  dedicationName?: unknown;
}

export async function adminAction(slug: string, input: AdminInput): Promise<void> {
  const c = await assertAdmin(slug, input.key);
  const ids = Array.isArray(input.unitIds) ? input.unitIds.filter((x): x is number => Number.isInteger(x)) : [];

  switch (input.action) {
    case 'release':
      await query(
        `update units set status = 'free', taker_name = null, taker_device = null, taken_at = null, progress = '{}', read_at = null
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
      const days = Number(input.releaseDays);
      const releaseDays = Number.isInteger(days) && days > 0 && days <= 60 ? days : null;
      await query(
        'update campaigns set title = $1, deadline = $2, is_public = $3, auto_renew = $4, release_days = $5 where id = $6',
        [title, deadline, input.isPublic !== false, input.autoRenew !== false, releaseDays, c.id],
      );
      if ('dedicationName' in input) {
        const name = clean(input.dedicationName, 80);
        await query('update campaigns set dedication_kind = $1, dedication_name = $2 where id = $3', [
          name ? cleanDedicationKind(input.dedicationKind) : null,
          name,
          c.id,
        ]);
      }
      break;
    }
    default:
      throw new UserError('פעולה לא מוכרת');
  }
  await publish({ slug, type: 'update' });
}

// ---------------------------------------------------------------- reader and "my chapters"

export async function getReaderUnit(slug: string, unitId: number, device: unknown): Promise<ReaderUnit> {
  const c = await findCampaign(slug);
  const dev = cleanDevice(device);
  const [u] = await query<UnitRow>(
    `select id, idx, label, sublabel, detail, group_label, ref, status, taker_name, taker_device, taken_at, read_at, progress
     from units where campaign_id = $1 and id = $2`,
    [c.id, unitId],
  );
  if (!u) throw new UserError('החלק לא נמצא', 404);
  return {
    dedication: mainDedication(c),
    id: u.id,
    label: u.label,
    detail: u.detail,
    ref: u.ref,
    parts: segmentsOf(u.ref).length,
    status: u.status,
    mine: !!dev && u.status !== 'free' && u.taker_device === dev,
    campaignSlug: c.slug,
    campaignTitle: c.title,
    campaignActive: c.status === 'active',
  };
}

export async function getMyUnits(device: unknown): Promise<MyUnit[]> {
  const dev = cleanDevice(device);
  if (!dev) return [];
  const rows = await query<{
    id: number;
    label: string;
    sublabel: string | null;
    detail: string;
    ref: string;
    progress: number[];
    group_label: string;
    copy: number;
    kind: Kind;
    status: 'taken' | 'read';
    slug: string;
    title: string;
    cstatus: string;
  }>(
    `select u.id, u.label, u.sublabel, u.detail, u.ref, u.progress, u.group_label, u.copy, c.kind, u.status, c.slug, c.title, c.status as cstatus
     from units u join campaigns c on c.id = u.campaign_id
     where u.taker_device = $1 and u.status in ('taken', 'read')
     order by (u.status = 'read'), c.created_at desc, u.idx
     limit 300`,
    [dev],
  );
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    sublabel: r.sublabel,
    detail: r.detail,
    ref: r.ref,
    parts: segmentsOf(r.ref).length,
    progress: r.progress ?? [],
    group: r.group_label,
    copy: r.copy ?? 1,
    campaignKind: r.kind,
    status: r.status,
    campaignSlug: r.slug,
    campaignTitle: r.title,
    campaignActive: r.cstatus === 'active',
  }));
}
