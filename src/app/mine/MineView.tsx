'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BookIcon } from '@/components/Icons';
import { api, getDeviceId } from '@/components/client';
import type { MyUnit } from '@/lib/types';

export function MineView() {
  const [units, setUnits] = useState<MyUnit[] | null>(null);

  useEffect(() => {
    api<{ units: MyUnit[] }>(`/api/mine?device=${getDeviceId()}`)
      .then((r) => setUnits(r.units))
      .catch(() => setUnits([]));
  }, []);

  if (!units) return <p className="muted">טוען…</p>;
  if (!units.length) {
    return (
      <div className="empty">
        <p style={{ marginTop: 0 }}>עדיין לא לקחת פרקים במכשיר הזה.</p>
        <Link href="/#campaigns" className="btn">לחלוקות הפעילות</Link>
      </div>
    );
  }

  const byCampaign = new Map<string, MyUnit[]>();
  for (const u of units) {
    if (!byCampaign.has(u.campaignSlug)) byCampaign.set(u.campaignSlug, []);
    byCampaign.get(u.campaignSlug)!.push(u);
  }
  const open = units.filter((u) => u.status === 'taken').length;

  return (
    <div className="stack" style={{ gap: 24, paddingBottom: 24 }}>
      <div className="banner">{open ? `מחכים לך ${open} לקריאה.` : 'קראת הכל. תודה רבה!'}</div>
      {[...byCampaign.entries()].map(([slug, list]) => (
        <section key={slug} className="card" style={{ padding: '6px 18px' }}>
          <div className="row-between" style={{ padding: '12px 0 4px' }}>
            <Link href={`/c/${slug}`} className="serif" style={{ fontSize: 21 }}>{list[0].campaignTitle}</Link>
            <Link href={`/c/${slug}`} className="muted" style={{ fontSize: 14 }}>לחלוקה ←</Link>
          </div>
          {list.map((u) => (
            <div key={u.id} className={`mine-item ${u.status === 'read' ? 'is-read' : ''}`}>
              <div className="label">{u.sublabel ? `${u.sublabel} ${u.label}` : u.label}</div>
              <div className="info">
                <div>{u.detail}</div>
                <div className="muted" style={{ fontSize: 13 }}>{u.status === 'read' ? 'נקרא. תודה!' : 'ממתין לקריאה'}</div>
              </div>
              {u.status === 'taken' && (
                <div className="actions">
                  <Link className="btn btn-small" href={`/c/${slug}/read/${u.id}`}><BookIcon /> לקריאה</Link>
                </div>
              )}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
