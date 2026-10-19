import type { Metadata } from 'next';
import Link from 'next/link';
import { AppFrame } from '@/components/AppShell';
import { ChevronIcon } from '@/components/Icons';
import { hebNum } from '@/lib/hebrew';

export const metadata: Metadata = { title: 'ספר תהילים', description: 'כל 150 פרקי תהילים לקריאה נוחה.' };

const BOOKS: [string, number, number][] = [
  ['ספר ראשון', 1, 41],
  ['ספר שני', 42, 72],
  ['ספר שלישי', 73, 89],
  ['ספר רביעי', 90, 106],
  ['ספר חמישי', 107, 150],
];

export default function TehillimIndex() {
  return (
    <AppFrame title="ספר תהילים">
      <Link href="/tehillim/letters" className="feature-card">
        <span className="badge-num">קי״ט</span>
        <span className="grow">
          <span style={{ display: 'block', fontWeight: 700 }}>פרק קי״ט לפי אותיות השם</span>
          <span className="muted" style={{ fontSize: 13 }}>הפסוקים של אותיות השם ואותיות נשמה, כמנהג ביארצייט</span>
        </span>
        <span className="chev" style={{ color: 'var(--line-strong)' }}><ChevronIcon /></span>
      </Link>
      <p className="lead" style={{ textAlign: 'center', margin: '18px 0 4px' }}>או בחרו פרק לקריאה חופשית</p>
      {BOOKS.map(([name, a, b]) => (
        <div key={name}>
          <div className="group-title">
            <span>{name}</span>
            <span className="line" />
            <span className="range">{hebNum(a)}–{hebNum(b)}</span>
          </div>
          <div className="grid">
            {Array.from({ length: b - a + 1 }, (_, i) => a + i).map((ch) => (
              <Link key={ch} href={`/tehillim/${ch}`} className="cell" aria-label={`פרק ${hebNum(ch)}`}>{hebNum(ch)}</Link>
            ))}
          </div>
        </div>
      ))}
    </AppFrame>
  );
}
