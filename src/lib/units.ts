import type { PublicUnit } from './types';

type Progressish = Pick<PublicUnit, 'status' | 'parts' | 'progress'>;

/** Parts read so far in a unit (all of them once the unit is read). */
export function partsDone(u: Progressish): number {
  return u.status === 'read' ? u.parts : u.progress.length;
}

/** Index of the next part to read, or -1 when everything is read. */
export function nextPart(u: Progressish): number {
  if (u.status === 'read') return -1;
  for (let i = 0; i < u.parts; i++) if (!u.progress.includes(i)) return i;
  return -1;
}

/** Where tapping one of "my" units should go: a multi-chapter unit opens its chapter list, a single chapter opens the reader. */
export function unitHref(slug: string, u: Pick<PublicUnit, 'id' | 'parts'>): string {
  return u.parts > 1 ? `/c/${slug}/u/${u.id}` : `/c/${slug}/read/${u.id}`;
}

/** The page listing the chapters someone took from one book of a chapters campaign. */
export function bookHref(slug: string, group: string, copy: number): string {
  return `/c/${slug}/book?g=${encodeURIComponent(group)}&copy=${copy}`;
}

type Groupable = { id: number; group: string; copy: number; parts: number; status: string };

export type MineEntry<T extends Groupable> =
  | { type: 'unit'; unit: T }
  | { type: 'book'; group: string; copy: number; units: T[] };

/**
 * Groups single chapters taken from the same book into one entry, so someone who took
 * a whole book sees one card ("ספר ראשון · 12 מתוך 41") instead of 41.
 */
export function groupMine<T extends Groupable>(units: T[], chaptersKind: (u: T) => boolean): MineEntry<T>[] {
  const out: MineEntry<T>[] = [];
  const books = new Map<string, { type: 'book'; group: string; copy: number; units: T[] }>();
  for (const u of units) {
    if (u.parts === 1 && chaptersKind(u)) {
      const key = `${u.copy}|${u.group}`;
      let entry = books.get(key);
      if (!entry) {
        entry = { type: 'book', group: u.group, copy: u.copy, units: [] };
        books.set(key, entry);
        out.push(entry);
      }
      entry.units.push(u);
    } else {
      out.push({ type: 'unit', unit: u });
    }
  }
  // A "book" of one chapter is just that chapter.
  return out.map((e) => (e.type === 'book' && e.units.length === 1 ? { type: 'unit', unit: e.units[0] } : e));
}
