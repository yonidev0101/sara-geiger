import tehillim from '@/data/tehillim.json';
import { segmentsOf } from './divisions';
import { hebNum } from './hebrew';

// Text: "Miqra according to the Masorah" (Sefaria export of he.wikisource), CC BY-SA 3.0.
export const TEXT_CREDIT = 'נוסח המקרא: ״מקרא על פי המסורה״ מוויקיטקסט, באדיבות ספריא · רישיון\u00a0CC\u00a0BY\u2011SA\u00a03.0';

const TEXT = tehillim as string[][];

export interface Verse {
  n: number;
  label: string;
  text: string;
}

/** The verses of one segment (a chapter, or part of chapter 119) of a unit. */
export function getSegmentVerses(ref: string, index: number): Verse[] {
  const seg = segmentsOf(ref)[index];
  if (!seg || seg.chapter < 1 || seg.chapter > 150) return [];
  const all = TEXT[seg.chapter - 1];
  const from = seg.from ?? 1;
  const to = seg.to ?? all.length;
  return all.slice(from - 1, to).map((text, i) => ({ n: from + i, label: hebNum(from + i), text }));
}
