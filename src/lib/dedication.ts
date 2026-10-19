import { site } from './site';
import { DEDICATION_LABELS, type DedicationKind } from './types';

type Dedication = { kind: DedicationKind; name: string } | null | undefined;

/** The line a campaign is dedicated to: its own dedication if it has one, otherwise Sara's. */
export function dedicationParts(d: Dedication): { label: string; name: string } {
  if (d?.name) return { label: DEDICATION_LABELS[d.kind], name: d.name };
  return { label: 'לעילוי נשמת', name: `${site.honoree} ז״ל` };
}

export function dedicationLine(d: Dedication): string {
  const p = dedicationParts(d);
  return `${p.label} ${p.name}`;
}
