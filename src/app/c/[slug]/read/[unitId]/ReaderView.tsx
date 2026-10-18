'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CheckIcon } from '@/components/Icons';
import { ReaderControls, ReaderText, useReaderPrefs } from '@/components/ReaderText';
import { api, getDeviceId } from '@/components/client';
import { site } from '@/lib/site';
import type { PassageChapter } from '@/lib/text';
import type { CampaignState, PublicUnit, ReaderUnit } from '@/lib/types';

export function ReaderView({ unit, chapters, credit }: { unit: ReaderUnit; chapters: PassageChapter[]; credit: string }) {
  const prefs = useReaderPrefs();
  const [me, setMe] = useState<PublicUnit | null>(null);
  const [nextMine, setNextMine] = useState<PublicUnit | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const back = `/c/${unit.campaignSlug}`;

  useEffect(() => {
    api<CampaignState>(`/api/c/${unit.campaignSlug}?device=${getDeviceId()}`)
      .then((s) => {
        setMe(s.units.find((u) => u.id === unit.id) ?? null);
        setNextMine(s.units.find((u) => u.mine && u.status === 'taken' && u.id !== unit.id) ?? null);
      })
      .catch(() => {});
    window.scrollTo(0, 0);
  }, [unit.campaignSlug, unit.id]);

  const canMark = !done && unit.campaignActive && me?.mine && me.status === 'taken';

  async function markRead() {
    setBusy(true);
    setError('');
    try {
      await api(`/api/c/${unit.campaignSlug}/actions`, { action: 'read', unitIds: [unit.id], device: getDeviceId() });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'משהו השתבש');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="reader">
      <header className="reader-bar">
        <div className="reader-bar-inner">
          <Link href={back} className="back-link" aria-label="חזרה לחלוקה">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
            <span>חזרה</span>
          </Link>
          <div className="reader-bar-title">{unit.detail}</div>
          <ReaderControls prefs={prefs} />
        </div>
      </header>

      <main className="reader-main">
        <div className="reader-head">
          <div className="eyebrow">לעילוי נשמת {site.honoree} ז״ל</div>
          <h1 className="serif">{unit.detail}</h1>
          <div className="muted" style={{ fontSize: 14 }}>{unit.campaignTitle}</div>
        </div>

        <ReaderText chapters={chapters} prefs={prefs} />

        <div className="reader-end">
          {done ? (
            <div className="reader-done" role="status">
              <div className="done-mark"><CheckIcon /></div>
              <div className="serif" style={{ fontSize: 24 }}>תודה! סומן כנקרא.</div>
              <div className="muted">יהי רצון שתהיה הקריאה לעילוי נשמת {site.honoree} ז״ל.</div>
              <div className="pills" style={{ justifyContent: 'center', marginTop: 8 }}>
                {nextMine && (
                  <Link className="btn" href={`/c/${unit.campaignSlug}/read/${nextMine.id}`}>להמשיך ל{nextMine.detail}</Link>
                )}
                <Link className={nextMine ? 'btn btn-outline' : 'btn'} href={back}>חזרה לחלוקה</Link>
              </div>
            </div>
          ) : canMark ? (
            <div className="stack" style={{ gap: 8 }}>
              <button className="btn btn-block btn-lg" onClick={markRead} disabled={busy}>
                <CheckIcon /> {busy ? 'שומרים…' : 'סיימתי לקרוא'}
              </button>
              {error && <div className="error" role="alert">{error}</div>}
            </div>
          ) : me?.status === 'read' && me.mine ? (
            <div className="muted" style={{ textAlign: 'center' }}>קראת את זה כבר. תודה!</div>
          ) : (
            <Link className="btn btn-outline btn-block" href={back}>חזרה לחלוקה</Link>
          )}
          <p className="credit">{credit}</p>
        </div>
      </main>
    </div>
  );
}
