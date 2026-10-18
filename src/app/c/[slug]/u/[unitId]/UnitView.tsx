'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { AppFrame } from '@/components/AppShell';
import { BookIcon, CheckIcon, ChevronIcon } from '@/components/Icons';
import { Toast, useToast } from '@/components/Sheet';
import { api, getDeviceId, subscribeLive } from '@/components/client';
import { segmentsOf } from '@/lib/divisions';
import { site } from '@/lib/site';
import type { CampaignState, PublicUnit, ReaderUnit } from '@/lib/types';
import { nextPart, partsDone } from '@/lib/units';

export function UnitView({ unit }: { unit: ReaderUnit }) {
  const router = useRouter();
  const slug = unit.campaignSlug;
  const [me, setMe] = useState<PublicUnit | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const toast = useToast();
  const segments = segmentsOf(unit.ref);

  const refresh = useCallback(async () => {
    const s = await api<CampaignState>(`/api/c/${slug}?device=${getDeviceId()}`).catch(() => null);
    if (s) setMe(s.units.find((u) => u.id === unit.id) ?? null);
  }, [slug, unit.id]);

  useEffect(() => {
    void refresh();
    return subscribeLive(slug, () => void refresh());
  }, [slug, refresh]);

  const mine = !!me?.mine;
  const canEdit = mine && unit.campaignActive;
  const done = me ? (me.status === 'read' ? segments.map((_, i) => i) : me.progress) : [];
  const count = me ? partsDone(me) : 0;
  const next = me ? nextPart(me) : 0;

  async function toggle(i: number) {
    if (!canEdit) return;
    setBusy(i);
    const isDone = done.includes(i);
    try {
      const res = await api<{ unitRead: boolean; completed: boolean }>(`/api/c/${slug}/actions`, {
        action: 'progress', unitId: unit.id, part: i, done: !isDone, device: getDeviceId(),
      });
      if (res.unitRead && !isDone) toast.show(`סיימת את כל ${unit.label}. תודה!`);
      await refresh();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'משהו השתבש');
    } finally {
      setBusy(null);
    }
  }

  async function release() {
    if (!confirm(`לשחרר את ${unit.label} בחזרה לרשימה?`)) return;
    await api(`/api/c/${slug}/actions`, { action: 'release', unitIds: [unit.id], device: getDeviceId() }).catch(() => {});
    router.push(`/c/${slug}`);
  }

  return (
    <AppFrame title={unit.label} back={`/c/${slug}`} dock={mine && next >= 0}>
      <section className="unit-head">
        <div className="eyebrow">לעילוי נשמת {site.honoree} ז״ל</div>
        <h1 className="h1">{unit.label}</h1>
        <div className="muted">{unit.detail} · {unit.campaignTitle}</div>
      </section>

      {mine && (
        <div className="unit-progress" style={{ marginBottom: 18 }}>
          <span>{me?.status === 'read' ? 'נקרא כולו' : `${count} מתוך ${segments.length}`}</span>
          <div className="progress gold" aria-hidden="true"><div className="read" style={{ width: `${(count / segments.length) * 100}%` }} /></div>
        </div>
      )}

      <div className="list">
        {segments.map((seg, i) => {
          const isDone = done.includes(i);
          return (
            <div key={i} className={`chapter-row ${isDone ? 'done' : ''}`}>
              {canEdit ? (
                <button className={`check-circle ${isDone ? 'on' : ''}`} onClick={() => toggle(i)} disabled={busy === i}
                  aria-pressed={isDone} aria-label={`${seg.title}: ${isDone ? 'נקרא, לחצו לביטול' : 'לסמן כנקרא'}`}>
                  <CheckIcon />
                </button>
              ) : (
                <span className={`check-circle ${isDone ? 'on' : ''}`} aria-hidden="true"><CheckIcon /></span>
              )}
              <Link href={`/c/${slug}/read/${unit.id}?p=${i}`}>
                <span className="name">{seg.title}</span>
                {mine && i === next && <span className="next-tag">הבא</span>}
                <span className="chev" style={{ color: 'var(--line-strong)' }}><ChevronIcon /></span>
              </Link>
            </div>
          );
        })}
      </div>

      {canEdit && me?.status === 'taken' && (
        <button className="btn btn-ghost btn-block" style={{ marginTop: 16 }} onClick={release}>לשחרר בחזרה לרשימה</button>
      )}

      {mine && next >= 0 && (
        <div className="action-dock">
          <div className="action-dock-inner">
            <Link className="btn btn-block" href={`/c/${slug}/read/${unit.id}?p=${next}`}>
              <BookIcon /> {count === 0 ? 'להתחיל לקרוא' : `להמשיך · ${segments[next].title}`}
            </Link>
          </div>
        </div>
      )}
      <Toast message={toast.message} />
    </AppFrame>
  );
}
