'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { TopBar } from '@/components/AppShell';
import { CheckIcon, ChevronIcon } from '@/components/Icons';
import { LogoMark } from '@/components/Logo';
import { ReaderSettings, ReaderVerses, useReaderPrefs } from '@/components/ReaderText';
import { api, getDeviceId } from '@/components/client';
import { segmentsOf } from '@/lib/divisions';
import { dedicationLine } from '@/lib/dedication';
import { site } from '@/lib/site';
import type { Verse } from '@/lib/text';
import type { CampaignState, PublicUnit, ReaderUnit } from '@/lib/types';
import { bookHref, nextPart } from '@/lib/units';

type Done = null | 'part' | 'unit' | 'book';

export function ReaderView({ unit, part, verses, credit }: { unit: ReaderUnit; part: number; verses: Verse[]; credit: string }) {
  const router = useRouter();
  const prefs = useReaderPrefs();
  const slug = unit.campaignSlug;
  const segments = segmentsOf(unit.ref);
  const seg = segments[part];
  const multi = segments.length > 1;
  const [me, setMe] = useState<PublicUnit | null>(null);
  const [siblings, setSiblings] = useState<PublicUnit[]>([]);
  const inBook = !multi && siblings.length > 1;
  const back = multi ? `/c/${slug}/u/${unit.id}` : inBook && me ? bookHref(slug, me.group, me.copy) : `/c/${slug}`;
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
    api<CampaignState>(`/api/c/${slug}?device=${getDeviceId()}`)
      .then((s) => {
        const self = s.units.find((u) => u.id === unit.id) ?? null;
        setMe(self);
        // Other single chapters this person took from the same book, in order.
        if (self && s.campaign.kind === 'chapters') {
          setSiblings(s.units.filter((u) => u.mine && u.group === self.group && u.copy === self.copy));
        }
      })
      .catch(() => {});
  }, [slug, unit.id]);

  const mine = !!me?.mine && unit.campaignActive;
  const partDone = !!me && (me.status === 'read' || me.progress.includes(part));

  async function mark(isRead: boolean) {
    setBusy(true);
    setError('');
    try {
      if (isRead !== partDone) {
        const res = await api<{ unitRead: boolean; completed: boolean; progress: number[] }>(`/api/c/${slug}/actions`, {
          action: 'progress', unitId: unit.id, part, done: isRead, device: getDeviceId(),
        });
        if (isRead) {
          if (res.completed) return setDone('book');
          if (inBook) {
            const after = siblings.find((u) => u.id !== unit.id && u.status === 'taken' && u.idx > (me?.idx ?? 0))
              ?? siblings.find((u) => u.id !== unit.id && u.status === 'taken');
            if (after) return router.push(`/c/${slug}/read/${after.id}`);
            return setDone('unit');
          }
          if (res.unitRead) return setDone('unit');
          const next = nextPart({ status: 'taken', parts: segments.length, progress: res.progress });
          if (next >= 0) return router.push(`/c/${slug}/read/${unit.id}?p=${next}`);
          return setDone('unit');
        }
      } else if (isRead && multi && me) {
        const next = nextPart(me);
        if (next >= 0 && next !== part) return router.push(`/c/${slug}/read/${unit.id}?p=${next}`);
      }
      router.push(back);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'משהו השתבש');
      setBusy(false);
    }
  }

  return (
    <div className="reader-app">
      <TopBar back={back} title={seg?.title} actions={<ReaderSettings prefs={prefs} />} />
      <main className="reader-main">
        <div className="reader-head">
          <div className="eyebrow">{dedicationLine(unit.dedication)}</div>
          <h1 className="h1">{seg?.title ?? unit.detail}</h1>
          <div className="muted" style={{ fontSize: 14 }}>
            {multi ? `${unit.label} · ${part + 1} מתוך ${segments.length}`
              : inBook && me ? `${me.group} · ${siblings.findIndex((u) => u.id === unit.id) + 1} מתוך ${siblings.length}` : unit.campaignTitle}
          </div>
        </div>

        <ReaderVerses verses={verses} prefs={prefs} />

        {done ? (
          <div className="reader-end">
            {done === 'book' ? <div className="glow" style={{ alignSelf: 'center' }}><LogoMark size={64} stroke={2.5} /></div>
              : <div className="success-mark" style={{ alignSelf: 'center' }}><CheckIcon /></div>}
            <div className="q">{done === 'book' ? 'ספר התהילים הושלם!' : done === 'unit' ? `סיימת את ${multi ? unit.label : inBook && me ? me.group : seg.title}. תודה!` : 'תודה!'}</div>
            <div className="muted">יהי רצון שתהיה הקריאה {dedicationLine(unit.dedication)}</div>
            <Link className="btn btn-block" href={`/c/${slug}`}>חזרה לחלוקה</Link>
          </div>
        ) : mine ? (
          <div className="reader-end">
            <div className="q">{partDone ? 'הפרק סומן כנקרא' : 'קראת את הפרק?'}</div>
            <div className="two">
              <button className="btn" onClick={() => mark(true)} disabled={busy}>
                <CheckIcon /> {partDone ? (multi ? 'לפרק הבא' : 'סגירה') : 'קראתי'}
              </button>
              <button className="btn btn-secondary" onClick={() => mark(false)} disabled={busy}>
                {partDone ? 'לבטל סימון' : 'עוד לא'}
              </button>
            </div>
            {error && <div className="error" role="alert">{error}</div>}
          </div>
        ) : (
          <div className="reader-end" style={{ background: 'transparent', padding: 0 }}>
            <div className="two">
              {part < segments.length - 1 ? (
                <Link className="btn" href={`/c/${slug}/read/${unit.id}?p=${part + 1}`}>לפרק הבא <ChevronIcon /></Link>
              ) : <span />}
              <Link className="btn btn-secondary" href={back}>חזרה</Link>
            </div>
          </div>
        )}
        {unit.dedication && <p className="memorial-note">{site.brandName} · לעילוי נשמת {site.honoree} ז״ל</p>}
        <p className="credit">{credit}</p>
      </main>
    </div>
  );
}
