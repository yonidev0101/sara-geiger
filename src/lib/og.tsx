import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { he, plainHebrew, wrap } from './bidi';
import { site } from './site';

// Open Graph images (1200×630) for links shared on WhatsApp and elsewhere.
// The image renderer lays text out left to right only, so Hebrew is put into
// visual order here (see `he`) and wrapped into lines by hand (see `wrap`).

export const OG_SIZE = { width: 1200, height: 630 };

const C = {
  parchment: '#F7F2E8',
  paper: '#FFFDF8',
  ink: '#1C2638',
  inkSoft: '#3A4354',
  muted: '#646B7A',
  gold: '#B08A45',
  goldText: '#7A5A22',
  sand: '#EADCBC',
  sandSoft: '#F3EAD7',
  track: '#EADFCB',
};

let fontsPromise: Promise<{ name: string; data: Buffer; weight: 400 | 500 | 600; style: 'normal' }[]> | null = null;

function fonts() {
  fontsPromise ??= (async () => {
    const dir = path.join(process.cwd(), 'src/assets/fonts');
    const load = (f: string) => readFile(path.join(dir, f));
    const [serif, serifMedium, sans, sansBold] = await Promise.all([
      load('FrankRuhlLibre-Regular.ttf'),
      load('FrankRuhlLibre-Medium.ttf'),
      load('Assistant-Regular.ttf'),
      load('Assistant-SemiBold.ttf'),
    ]);
    return [
      { name: 'Serif', data: serif, weight: 400 as const, style: 'normal' as const },
      { name: 'Serif', data: serifMedium, weight: 500 as const, style: 'normal' as const },
      { name: 'Sans', data: sans, weight: 400 as const, style: 'normal' as const },
      { name: 'Sans', data: sansBold, weight: 600 as const, style: 'normal' as const },
    ];
  })();
  return fontsPromise;
}

function Mark({ size, ink = C.ink, flame = C.gold }: { size: number; ink?: string; flame?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <path d="M50 14 C57 23 58 31 50 41 C42 31 43 23 50 14 Z" fill={flame} />
      <path d="M38 54 H62 M34 62 H66 M30 70 H70 M26 78 H74 M22 86 H78" stroke={ink} strokeWidth={4} strokeLinecap="round" />
    </svg>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', background: C.parchment, padding: 28 }}>
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          border: `2px solid ${C.sand}`,
          borderRadius: 28,
          padding: '48px 64px',
          background: C.parchment,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** Brand line: name on the right, the mark beside it (visual order: mark then name, right-aligned). */
function Brand({ size = 34 }: { size?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ fontFamily: 'Serif', fontWeight: 500, fontSize: size, color: C.ink }}>{he(site.brandName)}</div>
      <Mark size={size * 1.5} />
    </div>
  );
}

async function render(node: React.ReactElement) {
  return new ImageResponse(node, { ...OG_SIZE, fonts: await fonts() });
}

// ---------------------------------------------------------------- images

export function ogDefault() {
  return render(
    <Frame>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <Mark size={120} />
        <div style={{ fontFamily: 'Sans', fontWeight: 600, fontSize: 34, color: C.goldText, marginTop: 10 }}>{he('לעילוי נשמת')}</div>
        <div style={{ fontFamily: 'Serif', fontWeight: 500, fontSize: 108, color: C.ink, lineHeight: 1.1 }}>{he(`${site.honoree} ז״ל`)}</div>
        <div style={{ width: 90, height: 2, background: C.gold, margin: '18px 0 14px' }} />
        <div style={{ fontFamily: 'Sans', fontSize: 32, color: C.muted }}>{he(`${site.brandName} · חלוקת ספר תהילים משותפת`)}</div>
      </div>
    </Frame>,
  );
}

export function ogCampaign(c: {
  title: string;
  kindLabel: string;
  free: number;
  taken: number;
  read: number;
  total: number;
  unitWord: string;
  participants: number;
  dedication: string;
}) {
  const titleLines = wrap(c.title, 20, 2);
  const titleSize = titleLines.length > 1 ? 76 : c.title.length > 14 ? 84 : 96;
  const readPct = c.total ? (c.read / c.total) * 100 : 0;
  const takenPct = c.total ? (c.taken / c.total) * 100 : 0;
  const status = c.free > 0 ? `נשארו ${c.free} ${c.unitWord} פנויים · בחרו והצטרפו` : `כל ה${c.unitWord} נלקחו · ${Math.round(readPct)}% נקרא`;
  return render(
    <Frame>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', fontFamily: 'Sans', fontWeight: 600, fontSize: 26, color: C.goldText, background: C.sandSoft, borderRadius: 999, padding: '8px 22px' }}>
          {he(c.kindLabel)}
        </div>
        <Brand />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'Sans', fontWeight: 600, fontSize: 32, color: C.goldText, marginBottom: 6 }}>{he(c.dedication)}</div>
        {titleLines.map((line, i) => (
          <div key={i} style={{ fontFamily: 'Serif', fontWeight: 500, fontSize: titleSize, color: C.ink, lineHeight: 1.12 }}>{he(line)}</div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', height: 16, borderRadius: 8, background: C.track, overflow: 'hidden' }}>
          <div style={{ width: `${takenPct}%`, background: '#D9C59A' }} />
          <div style={{ width: `${readPct}%`, background: C.ink }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'Sans', fontSize: 30 }}>
          <div style={{ color: C.muted }}>{c.participants > 0 ? he(`${c.participants} משתתפים`) : ''}</div>
          <div style={{ color: C.ink, fontWeight: 600 }}>{he(status)}</div>
        </div>
      </div>
    </Frame>,
  );
}

export function ogChapter(chapterLabel: string, firstVerse: string) {
  const lines = wrap(plainHebrew(firstVerse), 38, 2);
  return render(
    <Frame>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Brand />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        <div style={{ fontFamily: 'Sans', fontWeight: 600, fontSize: 34, color: C.goldText }}>{he('ספר תהילים')}</div>
        <div style={{ fontFamily: 'Serif', fontWeight: 500, fontSize: 120, color: C.ink, lineHeight: 1.05 }}>{he(`פרק ${chapterLabel}`)}</div>
        <div style={{ width: 90, height: 2, background: C.gold, margin: '18px 0 18px' }} />
        {lines.map((line, i) => (
          <div key={i} style={{ fontFamily: 'Serif', fontSize: 38, color: C.inkSoft, lineHeight: 1.4 }}>{he(line)}</div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', fontFamily: 'Sans', fontSize: 28, color: C.muted }}>
        {he(`לעילוי נשמת ${site.honoree} ז״ל`)}
      </div>
    </Frame>,
  );
}
