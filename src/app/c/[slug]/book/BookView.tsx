'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AppFrame } from '@/components/AppShell';
import { BookIcon, CheckIcon, ChevronIcon } from '@/components/Icons';
import { Toast, useToast } from '@/components/Sheet';
import { api, getDeviceId, subscribeLive } from '@/components/client';
import { dedicationLine } from '@/lib/dedication';
import type { CampaignState } from '@/lib/types';

/** The chapters someone took from one book, with a check for each. */
export function BookView({ slug, group, copy }: { slug: string; group: string; copy: number }) {
  const [state, setState] = useState<CampaignState | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const toast = useToast();

  const refresh = useCallback(async () => {
    const s = await api<CampaignState>(`/api/c/${slug}?device=${getDeviceId()}`).catch(() => null);
    if (s) setState(s);
  }, [slug]);

  useEffect(() => {
    void refresh();
    return subscribeLive(slug, () => void refresh());
  }, [slug, refresh]);

  const units = state?.units.filter((u) => u.mine && u.group === group && u.copy === copy) ?? [];
  const copies = state?.campaign.copies ?? 1;
  const active = state?.campaign.status === 'active';
  const read = units.filter((u) => u.status === 'read').length;
  const next = units.find((u) => u.status === 'taken');
  const title = copies > 1 ? `${group} · תהילים ${copy}` : group;

  async function toggle(id: number, isRead: boolean) {
    if (!active) return;
    setBusy(id);
    try {
      const res = await api<{ completed: boolean }>(`/api/c/${slug}/actions`, {
        action: 'progress', unitId: id, part: 0, done: !isRead, device: getDeviceId(),
      });
      if (res.completed) toast.show('ספר התהילים הושלם! תודה.');
      await refresh();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'משהו השתבש');
    } finally {
      setBusy(null);
    }
  }

  async function releaseRest() {
    const open = units.filter((u) => u.status === 'taken').map((u) => u.id);
    if (!open.length || !confirm(`לשחרר ${open.length} פרקים שעוד לא נקראו?`)) return;
    await api(`/api/c/${slug}/actions`, { action: 'release', unitIds: open, device: getDeviceId() }).catch(() => {});
    await refresh();
  }

  return (
    <AppFrame title={title} back={`/c/${slug}`} dock={!!next && active}>
      <section className="unit-head">
        <div className="eyebrow">{state ? dedicationLine(state.campaign.dedication) : ' '}</div>
        <h1 className="h1">{title}</h1>
        <div className="muted">{state?.campaign.title}</div>
      </section>

      {!state ? (
        <p className="muted" style={{ textAlign: 'center' }}>טוען…</p>
      ) : units.length === 0 ? (
        <div className="empty">
          <span>אין לך פרקים מהספר הזה.</span>
          <Link href={`/c/${slug}`} className="btn">לחלוקה</Link>
        </div>
      ) : (
        <>
          <div className="unit-progress" style={{ marginBottom: 18 }}>
            <span>{read === units.length ? 'נקרא כולו' : `${read} מתוך ${units.length}`}</span>
            <div className="progress gold" aria-hidden="true"><div className="read" style={{ width: `${(read / units.length) * 100}%` }} /></div>
          </div>
          <div className="list">
            {units.map((u) => {
              const isRead = u.status === 'read';
              return (
                <div key={u.id} className={`chapter-row ${isRead ? 'done' : ''}`}>
                  {active ? (
                    <button className={`check-circle ${isRead ? 'on' : ''}`} onClick={() => toggle(u.id, isRead)} disabled={busy === u.id}
                      aria-pressed={isRead} aria-label={`${u.detail}: ${isRead ? 'נקרא, לחצו לביטול' : 'לסמן כנקרא'}`}>
                      <CheckIcon />
                    </button>
                  ) : (
                    <span className={`check-circle ${isRead ? 'on' : ''}`} aria-hidden="true"><CheckIcon /></span>
                  )}
                  <Link href={`/c/${slug}/read/${u.id}`}>
                    <span className="name">פרק {u.sublabel ? `${u.sublabel} ${u.label}` : u.label}</span>
                    {next?.id === u.id && <span className="next-tag">הבא</span>}
                    <span className="chev" style={{ color: 'var(--line-strong)' }}><ChevronIcon /></span>
                  </Link>
                </div>
              );
            })}
          </div>
          {active && next && (
            <button className="btn btn-ghost btn-block" style={{ marginTop: 16 }} onClick={releaseRest}>לשחרר את מה שעוד לא נקרא</button>
          )}
        </>
      )}

      {active && next && (
        <div className="action-dock">
          <div className="action-dock-inner">
            <Link className="btn btn-block" href={`/c/${slug}/read/${next.id}`}>
              <BookIcon /> {read === 0 ? 'להתחיל לקרוא' : `להמשיך · פרק ${next.label}`}
            </Link>
          </div>
        </div>
      )}
      <Toast message={toast.message} />
    </AppFrame>
  );
}
