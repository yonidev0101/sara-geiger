'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppFrame } from '@/components/AppShell';
import { CheckIcon, ChevronIcon } from '@/components/Icons';
import { api, getDeviceId } from '@/components/client';
import type { MyUnit } from '@/lib/types';
import { bookHref, groupMine, partsDone, unitHref, type MineEntry } from '@/lib/units';

export function MineView() {
  const [units, setUnits] = useState<MyUnit[] | null>(null);
  const [showRead, setShowRead] = useState(false);

  useEffect(() => {
    api<{ units: MyUnit[] }>(`/api/mine?device=${getDeviceId()}`)
      .then((r) => setUnits(r.units))
      .catch(() => setUnits([]));
  }, []);

  // Group first, so a book that is half read stays one entry under "לקריאה".
  const entries = groupMine(units ?? [], (u) => u.campaignKind === 'chapters');
  const isOpen = (e: (typeof entries)[number]) => (e.type === 'unit' ? e.unit.status === 'taken' : e.units.some((u) => u.status === 'taken'));
  const open = entries.filter(isOpen);
  const read = entries.filter((e) => !isOpen(e));

  return (
    <AppFrame title="הקריאה שלי">
      {!units ? (
        <p className="muted" style={{ textAlign: 'center', marginTop: 40 }}>טוען…</p>
      ) : units.length === 0 ? (
        <div className="empty" style={{ marginTop: 24 }}>
          <span>עדיין לא לקחת פרקים.<br />בחרו חלוקה ולקחו פרק לקריאה.</span>
          <Link href="/" className="btn">לחלוקות</Link>
        </div>
      ) : (
        <>
          <div className="section-label"><span>לקריאה</span><span>{open.length}</span></div>
          {open.length ? (
            <div className="list">{rows(open)}</div>
          ) : (
            <div className="banner">קראת הכל. תודה רבה!</div>
          )}

          {read.length > 0 && (
            <>
              <button className="section-label text-btn" style={{ width: '100%', background: 'none', border: 0 }} onClick={() => setShowRead(!showRead)} aria-expanded={showRead}>
                <span>נקראו ({read.length})</span>
                <span>{showRead ? 'הסתרה' : 'הצגה'}</span>
              </button>
              {showRead && <div className="list">{rows(read)}</div>}
            </>
          )}
        </>
      )}
    </AppFrame>
  );
}

function rows(entries: MineEntry<MyUnit>[]) {
  return entries.map((e) =>
    e.type === 'unit' ? <UnitRow key={e.unit.id} u={e.unit} /> : <BookRow key={`${e.units[0].campaignSlug}|${e.copy}|${e.group}`} units={e.units} />,
  );
}

function BookRow({ units }: { units: MyUnit[] }) {
  const u = units[0];
  const read = units.filter((x) => x.status === 'read').length;
  const done = read === units.length;
  return (
    <Link href={bookHref(u.campaignSlug, u.group, u.copy)} className="list-row">
      <span className="badge-num" style={done ? { background: 'var(--ink)', color: 'var(--parchment)' } : undefined}>
        {done ? <CheckIcon /> : `${read}/${units.length}`}
      </span>
      <span className="grow">
        <span className="title" style={{ display: 'block' }}>{u.group}{u.detail.includes('· תהילים') ? ` · תהילים ${u.copy}` : ''}</span>
        <span className="sub">{u.campaignTitle}{done ? '' : ` · ${read} מתוך ${units.length} פרקים`}</span>
        {!done && <div className="progress gold" style={{ marginTop: 8 }} aria-hidden="true"><div className="read" style={{ width: `${(read / units.length) * 100}%` }} /></div>}
      </span>
      <span className="chev"><ChevronIcon /></span>
    </Link>
  );
}

function UnitRow({ u }: { u: MyUnit }) {
  const done = partsDone(u);
  const read = u.status === 'read';
  return (
    <Link href={unitHref(u.campaignSlug, u)} className="list-row">
      <span className="badge-num" style={read ? { background: 'var(--ink)', color: 'var(--parchment)' } : undefined}>
        {read ? <CheckIcon /> : u.sublabel ? u.label : u.parts > 1 ? `${done}/${u.parts}` : u.label.replace(/^יום /, '')}
      </span>
      <span className="grow">
        <span className="title" style={{ display: 'block' }}>{u.parts > 1 ? u.label : u.detail}</span>
        <span className="sub">{u.campaignTitle}{u.parts > 1 && !read ? ` · ${done} מתוך ${u.parts} פרקים` : ''}</span>
        {u.parts > 1 && !read && (
          <div className="progress gold" style={{ marginTop: 8 }} aria-hidden="true"><div className="read" style={{ width: `${(done / u.parts) * 100}%` }} /></div>
        )}
      </span>
      <span className="chev"><ChevronIcon /></span>
    </Link>
  );
}
