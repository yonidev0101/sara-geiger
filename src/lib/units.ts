import type { PublicUnit } from './types';

/** Parts read so far in a unit (all of them once the unit is read). */
export function partsDone(u: Pick<PublicUnit, 'status' | 'parts' | 'progress'>): number {
  return u.status === 'read' ? u.parts : u.progress.length;
}

/** Index of the next part to read, or -1 when everything is read. */
export function nextPart(u: Pick<PublicUnit, 'status' | 'parts' | 'progress'>): number {
  if (u.status === 'read') return -1;
  for (let i = 0; i < u.parts; i++) if (!u.progress.includes(i)) return i;
  return -1;
}

/** Where tapping one of "my" units should go: a multi-chapter unit opens its chapter list, a single chapter opens the reader. */
export function unitHref(slug: string, u: Pick<PublicUnit, 'id' | 'parts'>): string {
  return u.parts > 1 ? `/c/${slug}/u/${u.id}` : `/c/${slug}/read/${u.id}`;
}
