'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChevronIcon } from '@/components/Icons';
import { api, getDeviceId } from '@/components/client';
import { bookHref, groupMine, partsDone, unitHref } from '@/lib/units';
import type { MyUnit } from '@/lib/types';

/** "Continue reading" card for whoever has chapters waiting on this device. */
export function ContinueReading() {
  const [open, setOpen] = useState<MyUnit[]>([]);
  useEffect(() => {
    api<{ units: MyUnit[] }>(`/api/mine?device=${getDeviceId()}`)
      .then((r) => setOpen(r.units.filter((u) => u.status === 'taken' && u.campaignActive)))
      .catch(() => {});
  }, []);
  if (!open.length) return null;
  const entries = groupMine(open, (x) => x.campaignKind === 'chapters');
  const first = entries[0];
  const u = first.type === 'unit' ? first.unit : first.units[0];
  const href = first.type === 'unit' ? unitHref(u.campaignSlug, u) : bookHref(u.campaignSlug, first.group, first.copy);
  const title = first.type === 'book' ? first.group : u.parts > 1 ? u.label : u.detail;
  const sub = first.type === 'book' ? `${first.units.length} פרקים מחכים` : u.parts > 1 ? `${partsDone(u)} מתוך ${u.parts} פרקים` : '';
  return (
    <Link href={href} className="continue">
      <div className="grow">
        <div className="k">{entries.length > 1 ? `להמשיך לקרוא · ועוד ${entries.length - 1}` : 'להמשיך לקרוא'}</div>
        <div className="v">{title}</div>
        {sub && <div className="k">{sub}</div>}
      </div>
      <span className="go"><ChevronIcon /></span>
    </Link>
  );
}
