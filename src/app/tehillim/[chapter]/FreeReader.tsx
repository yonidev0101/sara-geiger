'use client';

import Link from 'next/link';
import { ReaderControls, ReaderText, useReaderPrefs } from '@/components/ReaderText';
import { hebNum } from '@/lib/hebrew';
import { site } from '@/lib/site';
import type { PassageChapter } from '@/lib/text';

export function FreeReader({ chapter, chapters, credit }: { chapter: number; chapters: PassageChapter[]; credit: string }) {
  const prefs = useReaderPrefs();
  return (
    <div className="reader">
      <header className="reader-bar">
        <div className="reader-bar-inner">
          <Link href="/tehillim" className="back-link" aria-label="לכל הפרקים">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
            <span>כל הפרקים</span>
          </Link>
          <div className="reader-bar-title">פרק {hebNum(chapter)}</div>
          <ReaderControls prefs={prefs} />
        </div>
      </header>
      <main className="reader-main">
        <div className="reader-head">
          <div className="eyebrow">לעילוי נשמת {site.honoree} ז״ל</div>
          <h1 className="serif">תהילים פרק {hebNum(chapter)}</h1>
        </div>
        <ReaderText chapters={chapters} prefs={prefs} />
        <div className="reader-end">
          <div className="row" style={{ display: 'flex', gap: 10 }}>
            {chapter < 150 && <Link className="btn" style={{ flex: 1 }} href={`/tehillim/${chapter + 1}`}>לפרק {hebNum(chapter + 1)}</Link>}
            {chapter > 1 && <Link className="btn btn-outline" style={{ flex: 1 }} href={`/tehillim/${chapter - 1}`}>לפרק {hebNum(chapter - 1)}</Link>}
          </div>
          <p className="credit">{credit}</p>
        </div>
      </main>
    </div>
  );
}
