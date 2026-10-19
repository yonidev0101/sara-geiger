import { ALEPH_BET } from './hebrew.ts';

const FINALS: Record<string, string> = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };

/** The first name, e.g. "שרה" from "שרה בת צבי" or "משה" from "משה בן רחל". */
export function firstName(full: string): string {
  return full.trim().split(/\s+(?:בן|בת)\s+/)[0].trim();
}

/** Hebrew letters of a name in order, with final forms normalised (ך → כ). */
export function nameLetters(name: string): string[] {
  return [...name]
    .map((ch) => FINALS[ch] ?? ch)
    .filter((ch) => ALEPH_BET.includes(ch));
}

/** The 8-verse section of Psalm 119 for a letter, e.g. ש → verses 161–168. */
export function sectionRef(letter: string): string {
  const i = ALEPH_BET.indexOf(letter);
  return `Psalms.119.${i * 8 + 1}-${i * 8 + 8}`;
}
