import tehillim from '@/data/tehillim.json';
import { hebNum } from './hebrew';

// Text: "Miqra according to the Masorah" (Sefaria export of he.wikisource), CC BY-SA 3.0.
export const TEXT_CREDIT = 'נוסח המקרא: ״מקרא על פי המסורה״ מוויקיטקסט, באדיבות ספריא · רישיון CC BY-SA 3.0';

const TEXT = tehillim as string[][];

export interface PassageChapter {
  chapter: number;
  title: string;
  verses: { n: number; label: string; text: string }[];
}

/** Parses refs like "Psalms.23", "Psalms.1-9" and "Psalms.119.1-96". */
export function parseRef(ref: string): { chapter: number; from: number; to: number }[] {
  const verseRange = ref.match(/^Psalms\.(\d+)\.(\d+)-(\d+)$/);
  if (verseRange) {
    const [, ch, a, b] = verseRange.map(Number);
    return [{ chapter: ch, from: a, to: b }];
  }
  const range = ref.match(/^Psalms\.(\d+)(?:-(\d+))?$/);
  if (!range) return [];
  const a = Number(range[1]);
  const b = Number(range[2] ?? range[1]);
  const out = [];
  for (let ch = a; ch <= b; ch++) out.push({ chapter: ch, from: 1, to: TEXT[ch - 1]?.length ?? 0 });
  return out;
}

export function getPassage(ref: string): PassageChapter[] {
  return parseRef(ref)
    .filter((s) => s.chapter >= 1 && s.chapter <= 150)
    .map(({ chapter, from, to }) => ({
      chapter,
      title: `פרק ${hebNum(chapter)}`,
      verses: TEXT[chapter - 1].slice(from - 1, to).map((text, i) => ({ n: from + i, label: hebNum(from + i), text })),
    }));
}

export function chapterCount(): number {
  return TEXT.length;
}
