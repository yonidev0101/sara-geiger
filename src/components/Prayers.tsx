import { prayerAfter, prayerBefore } from '@/lib/prayers';
import type { DedicationKind } from '@/lib/types';

type Dedication = { kind: DedicationKind; name: string } | null | undefined;

/** The intention before reading, folded so it doesn't push the text down. */
export function PrayerBefore({ dedication }: { dedication: Dedication }) {
  return (
    <details className="prayer">
      <summary>כוונה לפני הקריאה</summary>
      <p>{prayerBefore(dedication)}</p>
    </details>
  );
}

/** "יהי רצון" after reading, with the dedication's name. */
export function PrayerAfter({ dedication }: { dedication: Dedication }) {
  return (
    <details className="prayer" open>
      <summary>יהי רצון לאחר הקריאה</summary>
      <p>{prayerAfter(dedication)}</p>
    </details>
  );
}
