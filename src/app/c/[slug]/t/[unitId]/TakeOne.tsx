'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppFrame } from '@/components/AppShell';
import { BookIcon, CheckIcon } from '@/components/Icons';
import { api, ApiError, getDeviceId, remember } from '@/components/client';
import { dedicationLine } from '@/lib/dedication';
import type { CampaignState, PublicUnit, ReaderUnit } from '@/lib/types';
import { unitHref } from '@/lib/units';

/** Opened from a per-chapter link shared in WhatsApp: take this chapter in one step. */
export function TakeOne({ unit }: { unit: ReaderUnit }) {
  const router = useRouter();
  const slug = unit.campaignSlug;
  const [me, setMe] = useState<PublicUnit | null>(null);
  const [nextFree, setNextFree] = useState<PublicUnit | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setName(remember('name'));
    api<CampaignState>(`/api/c/${slug}?device=${getDeviceId()}`)
      .then((s) => {
        const self = s.units.find((u) => u.id === unit.id) ?? null;
        setMe(self);
        if (self && self.status !== 'free') {
          setNextFree(s.units.find((u) => u.status === 'free' && u.idx > self.idx) ?? s.units.find((u) => u.status === 'free') ?? null);
        }
      })
      .finally(() => setLoaded(true));
  }, [slug, unit.id]);

  async function take(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      remember('name', name.trim());
      await api(`/api/c/${slug}/actions`, { action: 'take', unitIds: [unit.id], name, device: getDeviceId() });
      router.replace(unitHref(slug, unit));
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setMe((m) => (m ? { ...m, status: 'taken' } : m));
        setError('מישהו הקדים אותך ולקח את הפרק הזה.');
      } else {
        setError(err instanceof Error ? err.message : 'משהו השתבש');
      }
      setBusy(false);
    }
  }

  const free = me?.status === 'free';
  const mine = !!me?.mine;

  return (
    <AppFrame title={unit.campaignTitle} back={`/c/${slug}`} nav={false}>
      <section className="success" style={{ paddingTop: 36 }}>
        <div className="eyebrow">{dedicationLine(unit.dedication)}</div>
        <h1 className="h1" style={{ fontSize: 40 }}>{unit.parts > 1 ? unit.label : unit.detail}</h1>
        {unit.parts > 1 && <div className="muted">{unit.detail}</div>}
        <div className="muted" style={{ fontSize: 14 }}>{unit.campaignTitle}</div>
      </section>

      <div style={{ marginTop: 28 }}>
        {!loaded ? (
          <p className="muted" style={{ textAlign: 'center' }}>טוען…</p>
        ) : mine ? (
          <div className="stack">
            <div className="banner" style={{ textAlign: 'center' }}><CheckIcon /> הפרק הזה כבר שלך</div>
            <Link className="btn btn-block" href={unitHref(slug, unit)}><BookIcon /> לקריאה</Link>
          </div>
        ) : free && unit.campaignActive ? (
          <form className="card stack" onSubmit={take}>
            <div className="field">
              <label htmlFor="one-name">השם שלך</label>
              <input id="one-name" className="input" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </div>
            {error && <div className="error" role="alert">{error}</div>}
            <button className="btn btn-block" disabled={busy || !name.trim()}>{busy ? 'שומרים…' : 'לקחת ולקרוא'}</button>
          </form>
        ) : (
          <div className="stack">
            <div className="banner" style={{ textAlign: 'center' }}>
              {error || (me?.status === 'read' ? 'הפרק הזה כבר נקרא. תודה!' : unit.campaignActive ? 'הפרק הזה כבר נלקח.' : 'החלוקה סגורה כרגע.')}
            </div>
            {nextFree && unit.campaignActive && (
              <Link className="btn btn-block" href={`/c/${slug}/t/${nextFree.id}`}>לקחת במקומו את {nextFree.parts > 1 ? nextFree.label : nextFree.detail}</Link>
            )}
            <Link className="btn btn-secondary btn-block" href={`/c/${slug}`}>לכל החלוקה</Link>
          </div>
        )}
      </div>
    </AppFrame>
  );
}
