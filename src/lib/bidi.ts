// Helpers for drawing Hebrew with a renderer that only lays text out left to right.

const LTR_RUN = /([A-Za-z0-9][A-Za-z0-9.,:%/+–-]*)/;
const MIRROR: Record<string, string> = { '(': ')', ')': '(', '[': ']', ']': '[', '«': '»', '»': '«' };

/** Puts one line of right-to-left text into visual (left-to-right) order, keeping numbers and Latin runs intact. */
export function he(text: string): string {
  return text
    .split(LTR_RUN)
    .map((part, i) => (i % 2 === 1 ? part : [...part].reverse().map((ch) => MIRROR[ch] ?? ch).join('')))
    .reverse()
    .join('');
}

/** Breaks logical text into lines of at most `max` characters, at word boundaries. */
export function wrap(text: string, max: number, maxLines = 2): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line && (line + ' ' + word).length > max) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = `${kept[maxLines - 1].replace(/\s*\S*$/, '')}…`;
    return kept;
  }
  return lines;
}

/** Removes vowels and cantillation, so Hebrew can be reversed safely. */
export function plainHebrew(text: string): string {
  return text
    .replace(/[֑-ׇ]/g, (ch) => (ch === '־' ? '־' : ''))
    .replace(/יהוה/g, 'ה׳') // the divine name is not written out in shareable images
    .replace(/\s+/g, ' ')
    .trim();
}
