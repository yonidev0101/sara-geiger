const ONES = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
const TENS = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
const HUNDREDS: [number, string][] = [[400, 'ת'], [300, 'ש'], [200, 'ר'], [100, 'ק']];

/** Hebrew numeral with geresh/gershayim, for 1–999 (e.g. 15 → ט״ו, 119 → קי״ט, 787 → תשפ״ז). */
export function hebNum(n: number): string {
  let rest = n;
  let s = '';
  for (const [value, letter] of HUNDREDS) {
    while (rest >= value) {
      s += letter;
      rest -= value;
    }
  }
  if (rest === 15) s += 'טו';
  else if (rest === 16) s += 'טז';
  else s += TENS[Math.floor(rest / 10)] + ONES[rest % 10];
  return s.length === 1 ? `${s}׳` : `${s.slice(0, -1)}״${s.slice(-1)}`;
}

export const ALEPH_BET = 'אבגדהוזחטיכלמנסעפצקרשת'.split('');

/** A date in the Hebrew calendar, e.g. "י׳ בכסלו תשפ״ז". */
export function hebrewDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T12:00:00` : date) : date;
  const parts = new Intl.DateTimeFormat('he-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric' }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const day = Number(get('day'));
  const year = Number(get('year'));
  const month = get('month');
  if (!day || !year || !month) return d.toLocaleDateString('he-IL');
  return `${hebNum(day)} ${month} ${hebNum(year % 1000)}`;
}

const NIKKUD_ONLY = /[֑-ֽ֯]/g;

/** Removes cantillation marks (ta'amim) and meteg, keeping the vowels. */
export function withoutTeamim(text: string): string {
  return text.replace(NIKKUD_ONLY, '');
}
