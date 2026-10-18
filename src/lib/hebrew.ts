const ONES = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
const TENS = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];

/** Hebrew numeral with geresh/gershayim, for 1–199 (e.g. 15 → ט״ו, 119 → קי״ט). */
export function hebNum(n: number): string {
  let rest = n;
  let s = '';
  if (rest >= 100) {
    s += 'ק';
    rest -= 100;
  }
  if (rest === 15) s += 'טו';
  else if (rest === 16) s += 'טז';
  else s += TENS[Math.floor(rest / 10)] + ONES[rest % 10];
  return s.length === 1 ? `${s}׳` : `${s.slice(0, -1)}״${s.slice(-1)}`;
}

export const ALEPH_BET = 'אבגדהוזחטיכלמנסעפצקרשת'.split('');
