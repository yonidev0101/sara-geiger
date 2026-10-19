'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { TopBar } from '@/components/AppShell';
import { ReaderSettings, ReaderVerses, useReaderPrefs } from '@/components/ReaderText';
import type { Verse } from '@/lib/text';

export interface LetterSection {
  letter: string;
  verses: Verse[];
}

export function LettersReader({ name, nameSections, neshamaSections, back, credit, withNeshama }: {
  name: string;
  nameSections: LetterSection[];
  neshamaSections: LetterSection[];
  back: string;
  credit: string;
  withNeshama: boolean;
}) {
  const router = useRouter();
  const prefs = useReaderPrefs();
  const [draft, setDraft] = useState(name);
  const [neshama, setNeshama] = useState(withNeshama);

  function apply(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(window.location.search);
    params.set('name', draft.trim());
    router.replace(`/tehillim/letters?${params.toString()}`);
  }

  return (
    <div className="reader-app">
      <TopBar back={back} title="קי״ט לפי אותיות" actions={<ReaderSettings prefs={prefs} />} />
      <main className="reader-main">
        <div className="reader-head">
          <div className="eyebrow">פרק קי״ט לפי אותיות השם</div>
          <h1 className="h1">{name || 'הזינו שם'}</h1>
          <div className="letters-strip" aria-label="האותיות">
            {nameSections.map((s, i) => <span key={i}>{s.letter}</span>)}
            {neshama && <><i aria-hidden="true">·</i>{neshamaSections.map((s, i) => <span key={`n${i}`}>{s.letter}</span>)}</>}
          </div>
        </div>

        <form className="letters-form" onSubmit={apply}>
          <label htmlFor="letters-name" className="sr-only">שם</label>
          <input id="letters-name" className="input" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={40} placeholder="שם פרטי, למשל שרה" />
          <button className="btn btn-sm" style={{ minHeight: 52 }} disabled={!draft.trim() || draft.trim() === name}>עדכון</button>
        </form>
        <label className="switch-row" style={{ padding: '10px 4px' }}>
          <span>להוסיף אותיות נ־ש־מ־ה</span>
          <span className="switch"><input type="checkbox" checked={neshama} onChange={(e) => setNeshama(e.target.checked)} /><span /></span>
        </label>

        {nameSections.length === 0 && <div className="empty" style={{ marginTop: 16 }}>הזינו שם בעברית כדי לראות את הפסוקים.</div>}
        {nameSections.map((s, i) => <Section key={i} s={s} prefs={prefs} />)}
        {neshama && nameSections.length > 0 && (
          <>
            <div className="letters-divider">נשמה</div>
            {neshamaSections.map((s, i) => <Section key={`n${i}`} s={s} prefs={prefs} />)}
          </>
        )}
        <p className="credit">{credit}</p>
      </main>
    </div>
  );
}

function Section({ s, prefs }: { s: LetterSection; prefs: ReturnType<typeof useReaderPrefs> }) {
  return (
    <section className="letter-section" aria-label={`האות ${s.letter}`}>
      <div className="letter-badge" aria-hidden="true">{s.letter}</div>
      <ReaderVerses verses={s.verses} prefs={prefs} />
    </section>
  );
}
