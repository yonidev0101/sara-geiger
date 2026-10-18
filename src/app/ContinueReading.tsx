'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChevronIcon } from '@/components/Icons';
import { api, getDeviceId } from '@/components/client';
import { partsDone, unitHref } from '@/lib/units';
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
  const u = open[0];
  const done = partsDone(u);
  return (
    <Link href={unitHref(u.campaignSlug, u)} className="continue">
      <div className="grow">
        <div className="k">{open.length > 1 ? `להמשיך לקרוא · עוד ${open.length - 1} מחכים` : 'להמשיך לקרוא'}</div>
        <div className="v">{u.parts > 1 ? u.label : u.detail}</div>
        {u.parts > 1 && <div className="k">{done} מתוך {u.parts} פרקים</div>}
      </div>
      <span className="go"><ChevronIcon /></span>
    </Link>
  );
}
