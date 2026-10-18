'use client';

import { useEffect, useState } from 'react';
import { TextSizeIcon } from './Icons';
import { remember } from './client';
import { withoutTeamim } from '@/lib/hebrew';
import type { Verse } from '@/lib/text';

const SIZES = [20, 23, 26, 30, 34];

export function useReaderPrefs() {
  const [size, setSize] = useState(1);
  const [teamim, setTeamim] = useState(false);
  useEffect(() => {
    const saved = remember('reader.size');
    if (saved !== '' && Number(saved) >= 0 && Number(saved) < SIZES.length) setSize(Number(saved));
    setTeamim(remember('reader.teamim') === '1');
  }, []);
  return {
    size,
    teamim,
    setSize: (n: number) => { const v = Math.max(0, Math.min(SIZES.length - 1, n)); remember('reader.size', String(v)); setSize(v); },
    setTeamim: (v: boolean) => { remember('reader.teamim', v ? '1' : '0'); setTeamim(v); },
  };
}

type Prefs = ReturnType<typeof useReaderPrefs>;

/** The "Aa" button in the reader's top bar, with font size and cantillation options. */
export function ReaderSettings({ prefs }: { prefs: Prefs }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.popover, .aa-btn')) setOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);
  return (
    <>
      <button className="icon-btn aa-btn" aria-label="הגדרות קריאה" aria-expanded={open} onClick={() => setOpen(!open)}>
        <TextSizeIcon />
      </button>
      {open && (
        <div className="popover" role="dialog" aria-label="הגדרות קריאה">
          <div className="size-row">
            <button onClick={() => prefs.setSize(prefs.size + 1)} disabled={prefs.size === SIZES.length - 1} aria-label="טקסט גדול יותר" style={{ fontSize: 24 }}>א</button>
            <button onClick={() => prefs.setSize(prefs.size - 1)} disabled={prefs.size === 0} aria-label="טקסט קטן יותר" style={{ fontSize: 16 }}>א</button>
          </div>
          <label className="switch-row" style={{ padding: '6px 4px', minHeight: 44 }}>
            <span>טעמי המקרא</span>
            <span className="switch"><input type="checkbox" checked={prefs.teamim} onChange={(e) => prefs.setTeamim(e.target.checked)} /><span /></span>
          </label>
        </div>
      )}
    </>
  );
}

export function ReaderVerses({ verses, prefs }: { verses: Verse[]; prefs: Prefs }) {
  return (
    <div className="reader-text" style={{ fontSize: SIZES[prefs.size] }}>
      {verses.map((v) => (
        <span key={v.n} className="verse">
          <span className="verse-num" aria-hidden="true">{v.label}</span>
          {prefs.teamim ? v.text : withoutTeamim(v.text)}
        </span>
      ))}
    </div>
  );
}
