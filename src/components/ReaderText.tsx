'use client';

import { useEffect, useState } from 'react';
import { remember } from './client';
import { withoutTeamim } from '@/lib/hebrew';
import type { PassageChapter } from '@/lib/text';

const SIZES = [20, 23, 26, 30, 34];

export function useReaderPrefs() {
  const [size, setSize] = useState(1);
  const [teamim, setTeamim] = useState(false);
  useEffect(() => {
    const s = Number(remember('reader.size'));
    if (s >= 0 && s < SIZES.length && remember('reader.size') !== '') setSize(s);
    setTeamim(remember('reader.teamim') === '1');
  }, []);
  return {
    size,
    teamim,
    bigger: () => setSize((s) => { const n = Math.min(SIZES.length - 1, s + 1); remember('reader.size', String(n)); return n; }),
    smaller: () => setSize((s) => { const n = Math.max(0, s - 1); remember('reader.size', String(n)); return n; }),
    toggleTeamim: () => setTeamim((t) => { remember('reader.teamim', t ? '0' : '1'); return !t; }),
  };
}

export function ReaderControls({ prefs }: { prefs: ReturnType<typeof useReaderPrefs> }) {
  return (
    <div className="reader-controls" role="group" aria-label="הגדרות קריאה">
      <button className="ctl" onClick={prefs.smaller} aria-label="הקטנת הטקסט" disabled={prefs.size === 0}>
        <span style={{ fontSize: 14 }}>א</span>
      </button>
      <button className="ctl" onClick={prefs.bigger} aria-label="הגדלת הטקסט" disabled={prefs.size === SIZES.length - 1}>
        <span style={{ fontSize: 20 }}>א</span>
      </button>
      <button className="ctl ctl-wide" onClick={prefs.toggleTeamim} aria-pressed={prefs.teamim}>
        טעמים
      </button>
    </div>
  );
}

export function ReaderText({ chapters, prefs }: { chapters: PassageChapter[]; prefs: ReturnType<typeof useReaderPrefs> }) {
  const fontSize = SIZES[prefs.size];
  return (
    <div className="reader-text" style={{ fontSize }}>
      {chapters.map((ch) => (
        <section key={ch.chapter} aria-label={ch.title} className="reader-chapter">
          {chapters.length > 1 && <h2 className="reader-chapter-title">{ch.title}</h2>}
          <p className="reader-verses">
            {ch.verses.map((v) => (
              <span key={v.n} className="verse">
                <span className="verse-num" aria-hidden="true">{v.label}</span>
                {prefs.teamim ? v.text : withoutTeamim(v.text)}{' '}
              </span>
            ))}
          </p>
        </section>
      ))}
    </div>
  );
}
