'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { TopBar } from '@/components/AppShell';
import { PrayerAfter, PrayerBefore } from '@/components/Prayers';
import { ReaderSettings, ReaderVerses, useReaderPrefs } from '@/components/ReaderText';
import { hebNum } from '@/lib/hebrew';
import { site } from '@/lib/site';
import type { Verse } from '@/lib/text';

export function FreeReader({ chapter, verses, credit }: { chapter: number; verses: Verse[]; credit: string }) {
  const prefs = useReaderPrefs();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  return (
    <div className="reader-app">
      <TopBar back="/tehillim" title={`פרק ${hebNum(chapter)}`} actions={<ReaderSettings prefs={prefs} />} />
      <main className="reader-main">
        <div className="reader-head">
          <div className="eyebrow">לעילוי נשמת {site.honoree} ז״ל</div>
          <h1 className="h1">תהילים פרק {hebNum(chapter)}</h1>
        </div>
        <PrayerBefore dedication={null} />
        <ReaderVerses verses={verses} prefs={prefs} />
        <PrayerAfter dedication={null} />
        <div className="reader-end" style={{ background: 'transparent', padding: 0 }}>
          <div className="two">
            {chapter < 150 ? <Link className="btn" href={`/tehillim/${chapter + 1}`}>לפרק {hebNum(chapter + 1)}</Link> : <span />}
            {chapter > 1 ? <Link className="btn btn-secondary" href={`/tehillim/${chapter - 1}`}>לפרק {hebNum(chapter - 1)}</Link> : <span />}
          </div>
        </div>
        <p className="credit">{credit}</p>
      </main>
    </div>
  );
}
