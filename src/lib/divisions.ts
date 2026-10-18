import { ALEPH_BET, hebNum } from './hebrew.ts';

export type Kind = 'chapters' | 'month' | 'week' | 'books';

export const KINDS: { value: Kind; label: string; description: string }[] = [
  { value: 'chapters', label: 'לפי פרקים', description: '150 פרקים. כל אחד בוחר אילו פרקים לקרוא.' },
  { value: 'month', label: 'לפי ימי החודש', description: '30 חלקים, כפי שנהוג לקרוא תהילים בכל חודש.' },
  { value: 'week', label: 'לפי ימי השבוע', description: '7 חלקים, מיום ראשון ועד שבת קודש.' },
  { value: 'books', label: 'חמשת הספרים', description: '5 חלקים, ספר אחד לכל משתתף.' },
];

export function kindLabel(kind: Kind): string {
  return KINDS.find((k) => k.value === kind)?.label ?? kind;
}

export function isKind(value: unknown): value is Kind {
  return KINDS.some((k) => k.value === value);
}

export interface UnitDef {
  label: string;
  sublabel: string | null;
  detail: string;
  group: string;
  ref: string;
}

const BOOKS: [string, number, number][] = [
  ['ספר ראשון', 1, 41],
  ['ספר שני', 42, 72],
  ['ספר שלישי', 73, 89],
  ['ספר רביעי', 90, 106],
  ['ספר חמישי', 107, 150],
];

// The customary monthly division. Days 25–26 split chapter 119 by verses.
const MONTH: ([number, number] | { ch119: [number, number] })[] = [
  [1, 9], [10, 17], [18, 22], [23, 28], [29, 34], [35, 38], [39, 43], [44, 48], [49, 54], [55, 59],
  [60, 65], [66, 68], [69, 71], [72, 76], [77, 78], [79, 82], [83, 87], [88, 89], [90, 96], [97, 103],
  [104, 105], [106, 107], [108, 112], [113, 118], { ch119: [1, 96] }, { ch119: [97, 176] },
  [120, 134], [135, 139], [140, 144], [145, 150],
];

const WEEK: [string, number, number][] = [
  ['יום ראשון', 1, 29],
  ['יום שני', 30, 50],
  ['יום שלישי', 51, 72],
  ['יום רביעי', 73, 89],
  ['יום חמישי', 90, 106],
  ['יום שישי', 107, 119],
  ['שבת קודש', 120, 150],
];

function rangeDetail(a: number, b: number): string {
  return a === b ? `פרק ${hebNum(a)}` : `פרקים ${hebNum(a)}–${hebNum(b)}`;
}

function rangeRef(a: number, b: number): string {
  return a === b ? `Psalms.${a}` : `Psalms.${a}-${b}`;
}

function bookOf(ch: number): string {
  return BOOKS.find(([, a, b]) => ch >= a && ch <= b)![0];
}

export function buildUnits(kind: Kind, split119: boolean): UnitDef[] {
  switch (kind) {
    case 'chapters': {
      const units: UnitDef[] = [];
      for (let ch = 1; ch <= 150; ch++) {
        if (ch === 119 && split119) {
          ALEPH_BET.forEach((letter, i) => {
            const from = i * 8 + 1;
            units.push({
              label: `${letter}׳`,
              sublabel: 'קי״ט',
              detail: `פרק קי״ט, אות ${letter}׳ (פסוקים ${from}–${from + 7})`,
              group: bookOf(ch),
              ref: `Psalms.119.${from}-${from + 7}`,
            });
          });
          continue;
        }
        units.push({ label: hebNum(ch), sublabel: null, detail: `פרק ${hebNum(ch)}`, group: bookOf(ch), ref: `Psalms.${ch}` });
      }
      return units;
    }
    case 'month':
      return MONTH.map((r, i) => {
        const day = `יום ${hebNum(i + 1)}`;
        if (Array.isArray(r)) {
          return { label: day, sublabel: null, detail: rangeDetail(r[0], r[1]), group: 'ימי החודש', ref: rangeRef(r[0], r[1]) };
        }
        const [a, b] = r.ch119;
        return { label: day, sublabel: null, detail: `פרק קי״ט, פסוקים ${a}–${b}`, group: 'ימי החודש', ref: `Psalms.119.${a}-${b}` };
      });
    case 'week':
      return WEEK.map(([name, a, b]) => ({ label: name, sublabel: null, detail: rangeDetail(a, b), group: 'ימי השבוע', ref: rangeRef(a, b) }));
    case 'books':
      return BOOKS.map(([name, a, b]) => ({ label: name, sublabel: null, detail: rangeDetail(a, b), group: 'חמשת הספרים', ref: rangeRef(a, b) }));
  }
}

export function sefariaUrl(ref: string): string {
  return `https://www.sefaria.org/${ref}?lang=he`;
}
