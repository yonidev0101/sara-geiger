'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppFrame } from '@/components/AppShell';
import { CheckIcon, InfoIcon, SettingsIcon, ShareIcon } from '@/components/Icons';
import { LogoMark } from '@/components/Logo';
import { Ring } from '@/components/Ring';
import { Sheet, Toast, useToast } from '@/components/Sheet';
import { api, ApiError, getDeviceId, remember, shareLink, subscribeLive, timeAgo } from '@/components/client';
import { hebNum, hebrewDate } from '@/lib/hebrew';
import { site } from '@/lib/site';
import { DEDICATION_LABELS, type CampaignState, type DedicationKind, type PublicUnit } from '@/lib/types';
import { partsDone, unitHref } from '@/lib/units';

type Filter = 'all' | 'free';

export function CampaignView({ slug, initial }: { slug: string; initial: CampaignState }) {
  const router = useRouter();
  const [state, setState] = useState(initial);
  const [selected, setSelected] = useState<number[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [sheet, setSheet] = useState<null | 'take' | 'auto' | 'info'>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const toast = useToast();
  const fetching = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async () => {
    if (fetching.current) return fetching.current;
    fetching.current = (async () => {
      try {
        const next = await api<CampaignState>(`/api/c/${slug}?device=${getDeviceId()}`);
        setState(next);
        setSelected((sel) => sel.filter((id) => next.units.find((u) => u.id === id)?.status === 'free'));
      } catch {
        // keep the last state; the next event will retry
      } finally {
        fetching.current = null;
      }
    })();
    return fetching.current;
  }, [slug]);

  useEffect(() => {
    setIsAdmin(!!remember(`admin.${slug}`));
    void refresh();
    return subscribeLive(slug, (evt) => {
      if (evt.type === 'completed') setCelebrate(true);
      void refresh();
    });
  }, [slug, refresh]);

  const { campaign, units, counts } = state;
  const isChapters = campaign.kind === 'chapters';
  const one = isChapters ? 'פרק' : 'חלק';
  const many = isChapters ? 'פרקים' : 'חלקים';
  const active = campaign.status === 'active';
  const mine = units.filter((u) => u.mine);

  const groups = useMemo(() => {
    const visible = units.filter((u) => filter === 'all' || u.status === 'free');
    const map = new Map<string, PublicUnit[]>();
    for (const u of visible) {
      if (!map.has(u.group)) map.set(u.group, []);
      map.get(u.group)!.push(u);
    }
    return [...map.entries()];
  }, [units, filter]);

  function onUnit(u: PublicUnit) {
    if (u.status === 'free') {
      if (active) setSelected((sel) => (sel.includes(u.id) ? sel.filter((x) => x !== u.id) : [...sel, u.id]));
    } else if (u.mine) {
      router.push(unitHref(slug, u));
    } else {
      toast.show(`${u.detail} ${u.status === 'read' ? 'כבר נקרא' : 'בקריאה'}${u.takerName ? ` · ${u.takerName}` : ''}`);
    }
  }

  function afterTake(ids: number[]) {
    setSelected([]);
    setSheet(null);
    if (ids.length === 1) {
      const u = units.find((x) => x.id === ids[0]);
      router.push(unitHref(slug, { id: ids[0], parts: u?.parts ?? 1 }));
      return;
    }
    toast.show(`${ids.length} ${many} נשמרו על שמך`);
    void refresh();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const shareText = `${campaign.title}\nחלוקת תהילים לעילוי נשמת ${site.honoree} ז״ל.\n${
    counts.free ? `נשארו ${counts.free} ${many} פנויים, בחרו ${one} והצטרפו:` : 'כל החלקים נלקחו. תודה לכולם!'
  }`;
  const share = () => shareLink(`${window.location.origin}/c/${slug}`, shareText);

  return (
    <AppFrame
      title={campaign.title}
      back="/"
      dock={active}
      actions={
        <>
          <button className="icon-btn" onClick={() => setSheet('info')} aria-label="פרטי החלוקה"><InfoIcon /></button>
          <button className="icon-btn" onClick={share} aria-label="שיתוף"><ShareIcon /></button>
        </>
      }
    >
      <section className="card camp-head" aria-label="מצב החלוקה">
        <Ring read={counts.read} taken={counts.taken} total={counts.total} />
        <div className="grow">
          <div className="eyebrow">לעילוי נשמת {site.honoree} ז״ל</div>
          <h1 className="h1">{campaign.title}</h1>
          <div className="camp-meta">
            {counts.free > 0 ? `${counts.free} ${many} פנויים` : `כל ה${many} נלקחו`}
            {state.participants > 0 && ` · ${state.participants} משתתפים`}
          </div>
          {campaign.deadline && <div className="camp-meta">עד {hebrewDate(campaign.deadline)}</div>}
        </div>
      </section>

      {!active && <div className="banner" style={{ marginTop: 12 }}>החלוקה סגורה כרגע.</div>}

      {mine.length > 0 && (
        <>
          <div className="section-label"><span>הקריאה שלי</span><span>{mine.filter((u) => u.status === 'read').length}/{mine.length}</span></div>
          <div className="mine-strip">
            {mine.map((u) => <MineCard key={u.id} slug={slug} u={u} />)}
          </div>
        </>
      )}

      <div className="section-label" style={{ marginBottom: 12 }}>
        <span>{active ? `בחרו ${many} לקריאה` : `ה${many}`}</span>
      </div>
      <div className="seg" role="group" aria-label="תצוגה">
        <button aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>הכל</button>
        <button aria-pressed={filter === 'free'} onClick={() => setFilter('free')}>פנויים ({counts.free})</button>
      </div>

      {groups.length === 0 ? (
        <div className="empty" style={{ marginTop: 16 }}>אין {many} פנויים כרגע.</div>
      ) : isChapters ? (
        groups.map(([group, list]) => {
          const plain = list.filter((u) => !u.sublabel);
          return (
            <div key={group}>
              <div className="group-title">
                <span>{group}</span>
                <span className="line" />
                {plain.length > 0 && <span className="range">{plain[0].label}–{plain[plain.length - 1].label}</span>}
              </div>
              <div className="grid">
                {list.map((u) => <Cell key={u.id} u={u} selected={selected.includes(u.id)} onClick={() => onUnit(u)} />)}
              </div>
            </div>
          );
        })
      ) : (
        <div className="list" style={{ marginTop: 14 }}>
          {groups.flatMap(([, list]) => list).map((u) => (
            <PartRow key={u.id} u={u} selected={selected.includes(u.id)} onClick={() => onUnit(u)} />
          ))}
        </div>
      )}

      {isChapters && filter === 'all' && (
        <div className="legend" aria-hidden="true">
          <span><i className="swatch" style={{ background: 'var(--paper)', border: '1px solid var(--line-strong)' }} />פנוי</span>
          <span><i className="swatch" style={{ background: 'var(--sand)' }} />בקריאה</span>
          <span><i className="swatch" style={{ background: 'var(--ink)' }} />נקרא</span>
          <span><i className="swatch" style={{ background: 'var(--paper)', boxShadow: 'inset 0 0 0 2px var(--gold)' }} />שלי</span>
        </div>
      )}

      {active && (
        <div className="action-dock">
          <div className="action-dock-inner">
            {selected.length > 0 ? (
              <>
                <button className="btn grow" onClick={() => setSheet('take')}>
                  לקחת {selected.length === 1 ? `${one} אחד` : `${selected.length} ${many}`}
                </button>
                <button className="btn btn-secondary" onClick={() => setSelected([])}>ביטול</button>
              </>
            ) : (
              <button className="btn btn-block" onClick={() => setSheet('auto')} disabled={counts.free === 0}>
                {counts.free === 0 ? `כל ה${many} נלקחו` : `בחרו בשבילי`}
              </button>
            )}
          </div>
        </div>
      )}

      {(sheet === 'take' || sheet === 'auto') && (
        <TakeSheet slug={slug} units={sheet === 'take' ? units.filter((u) => selected.includes(u.id)) : undefined}
          maxFree={counts.free} one={one} many={many} onClose={() => setSheet(null)} onDone={afterTake}
          onConflict={async (msg) => { setSheet(null); toast.show(msg); await refresh(); }} />
      )}
      {sheet === 'info' && <InfoSheet state={state} slug={slug} isAdmin={isAdmin} one={one} many={many} onClose={() => setSheet(null)} />}
      {celebrate && <Celebration books={campaign.completedRounds} onClose={() => setCelebrate(false)} onShare={share} />}
      <Toast message={toast.message} />
    </AppFrame>
  );
}

function MineCard({ slug, u }: { slug: string; u: PublicUnit }) {
  const done = partsDone(u);
  const read = u.status === 'read';
  return (
    <Link href={unitHref(slug, u)} className={`mine-card ${read ? 'done' : ''}`}>
      <div className="t">{u.parts > 1 ? u.label : u.detail}</div>
      <div className="s">{read ? 'נקרא, תודה!' : u.parts > 1 ? `${done} מתוך ${u.parts} פרקים` : 'ממתין לקריאה'}</div>
      {u.parts > 1 && (
        <div className="progress" aria-hidden="true"><div className="read" style={{ width: `${(done / u.parts) * 100}%` }} /></div>
      )}
    </Link>
  );
}

function Cell({ u, selected, onClick }: { u: PublicUnit; selected: boolean; onClick: () => void }) {
  const cls = [u.status !== 'free' ? u.status : '', u.mine ? 'mine' : '', selected ? 'selected' : ''].join(' ');
  const status = selected ? 'נבחר' : u.status === 'free' ? 'פנוי' : u.status === 'taken' ? 'בקריאה' : 'נקרא';
  return (
    <button className={`cell ${cls}`} onClick={onClick} aria-pressed={selected} aria-label={`${u.detail}, ${status}${u.mine ? ', שלי' : ''}`}>
      {u.sublabel && <small>{u.sublabel}</small>}
      <span>{u.label}</span>
    </button>
  );
}

function PartRow({ u, selected, onClick }: { u: PublicUnit; selected: boolean; onClick: () => void }) {
  const done = partsDone(u);
  return (
    <button className={`list-row part-row ${selected ? 'is-selected' : ''}`} onClick={onClick} aria-pressed={selected}>
      {u.status === 'free' ? (
        <span className="sel-dot" aria-hidden="true"><CheckIcon /></span>
      ) : (
        <span className="badge-num" aria-hidden="true" style={u.status === 'read' ? { background: 'var(--ink)', color: 'var(--parchment)' } : undefined}>
          {u.status === 'read' ? <CheckIcon /> : `${Math.round((done / u.parts) * 100)}%`}
        </span>
      )}
      <span className="grow">
        <span className="title" style={{ display: 'block' }}>{u.label}</span>
        <span className="sub">{u.detail}</span>
      </span>
      {u.mine ? (
        <span className="status-tag mine">שלי</span>
      ) : u.status !== 'free' ? (
        <span className={`status-tag ${u.status}`}>{u.status === 'read' ? 'נקרא' : u.takerName ?? 'בקריאה'}</span>
      ) : null}
    </button>
  );
}

function TakeSheet({ slug, units, maxFree, one, many, onClose, onDone, onConflict }: {
  slug: string;
  units?: PublicUnit[];
  maxFree: number;
  one: string;
  many: string;
  onClose: () => void;
  onDone: (ids: number[]) => void;
  onConflict: (msg: string) => void;
}) {
  const auto = !units;
  const [name, setName] = useState('');
  const [count, setCount] = useState(Math.min(auto && many === 'פרקים' ? 5 : 1, maxFree) || 1);
  const [showDedication, setShowDedication] = useState(false);
  const [dedicationKind, setDedicationKind] = useState<DedicationKind>('ilui');
  const [dedicationName, setDedicationName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => setName(remember('name')), []);

  const options = [...new Set([1, 3, 5, 10, maxFree < 10 ? maxFree : 0])].filter((n) => n > 0 && n <= maxFree).sort((a, b) => a - b);
  const n = auto ? count : units.length;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      remember('name', name.trim());
      const res = await api<{ taken: number[] }>(`/api/c/${slug}/actions`, {
        action: 'take',
        ...(auto ? { count } : { unitIds: units.map((u) => u.id) }),
        name,
        device: getDeviceId(),
        dedicationKind,
        dedicationName: showDedication ? dedicationName : '',
      });
      onDone(res.taken);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const conflicts = (err.data.conflicts as string[] | undefined)?.join(', ');
        onConflict(conflicts ? `מישהו הקדים אותך: ${conflicts}` : err.message);
      } else {
        setError(err instanceof Error ? err.message : 'משהו השתבש');
        setBusy(false);
      }
    }
  }

  return (
    <Sheet label={`לקיחת ${many}`} onClose={onClose}>
      <form onSubmit={submit} className="stack" style={{ gap: 18 }}>
        <div>
          <h2 className="sheet-title">{auto ? `כמה ${many}?` : n === 1 ? units[0].parts > 1 ? units[0].label : units[0].detail : `${n} ${many}`}</h2>
          <div className="muted" style={{ fontSize: 14 }}>
            {auto ? `נבחר בשבילך את ה${many} הפנויים הבאים` : `יישמר על שמך, ותוכלו לקרוא כאן באתר`}
          </div>
        </div>

        {auto ? (
          <div className="pills">
            {options.map((o) => (
              <button type="button" key={o} className="pill" style={{ minWidth: 56, fontSize: 16 }} aria-pressed={count === o} onClick={() => setCount(o)}>{o}</button>
            ))}
          </div>
        ) : n > 1 ? (
          <div className="pills">
            {units.map((u) => <span key={u.id} className="chip" style={{ fontSize: 14, fontFamily: 'var(--serif)' }}>{u.sublabel ? `${u.sublabel} ${u.label}` : u.label}</span>)}
          </div>
        ) : null}

        <div className="field">
          <label htmlFor="take-name">השם שלך</label>
          <input id="take-name" className="input" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </div>

        {showDedication ? (
          <div className="field" style={{ marginTop: 0 }}>
            <div className="pills">
              {(Object.keys(DEDICATION_LABELS) as DedicationKind[]).map((k) => (
                <button type="button" key={k} className="pill" aria-pressed={dedicationKind === k} onClick={() => setDedicationKind(k)}>{DEDICATION_LABELS[k]}</button>
              ))}
            </div>
            <input className="input" maxLength={80} value={dedicationName} onChange={(e) => setDedicationName(e.target.value)}
              placeholder="לדוגמה: יוסף בן אברהם" aria-label="שם נוסף" autoFocus />
          </div>
        ) : (
          <button type="button" className="text-btn" style={{ alignSelf: 'flex-start' }} onClick={() => setShowDedication(true)}>+ להוסיף שם נוסף</button>
        )}

        {error && <div className="error" role="alert">{error}</div>}
        <button className="btn btn-block" disabled={busy || !name.trim() || n === 0}>{busy ? 'שומרים…' : 'אישור'}</button>
      </form>
    </Sheet>
  );
}

function InfoSheet({ state, slug, isAdmin, one, many, onClose }: { state: CampaignState; slug: string; isAdmin: boolean; one: string; many: string; onClose: () => void }) {
  const { campaign, dedications, activity } = state;
  return (
    <Sheet label="פרטי החלוקה" onClose={onClose}>
      <h2 className="sheet-title">{campaign.title}</h2>
      <div className="stack" style={{ gap: 14 }}>
        <div className="info-block">
          <div className="k">סוג החלוקה</div>
          <div className="v">{campaign.kindLabel} · סבב {hebNum(campaign.round)}</div>
        </div>
        {campaign.openerName && <div className="info-block"><div className="k">נפתחה ע״י</div><div className="v">{campaign.openerName}</div></div>}
        {campaign.deadline && <div className="info-block"><div className="k">תאריך יעד</div><div className="v">{hebrewDate(campaign.deadline)}</div></div>}
        {campaign.completedRounds > 0 && (
          <div className="info-block"><div className="k">הושלם</div><div className="v">{campaign.completedRounds === 1 ? 'פעם אחת' : `${campaign.completedRounds} פעמים`}</div></div>
        )}
        {(Object.keys(DEDICATION_LABELS) as DedicationKind[]).map((k) => {
          const names = dedications.filter((d) => d.kind === k).map((d) => d.name);
          if (!names.length) return null;
          return (
            <div key={k} className="info-block">
              <div className="k">{k === 'ilui' ? 'בנוסף, לעילוי נשמת' : DEDICATION_LABELS[k]}</div>
              <div className="v">{names.join(' · ')}</div>
            </div>
          );
        })}
        {activity.length > 0 && (
          <div className="info-block">
            <div className="k">פעילות אחרונה</div>
            <ul className="activity-list">
              {activity.map((a, i) => (
                <li key={i}>
                  <span className={`dot ${a.kind}`} aria-hidden="true" />
                  <span>{a.kind === 'complete' ? 'הספר הושלם!' : <><b>{a.name ?? 'משתתף'}</b> {a.kind === 'take' ? 'לקח/ה' : 'סיים/ה'} {a.count === 1 ? `${one} אחד` : `${a.count} ${many}`}</>}</span>
                  <time className="when" dateTime={a.at}>{timeAgo(a.at)}</time>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {isAdmin && (
        <Link href={`/c/${slug}/manage`} className="btn btn-secondary btn-block"><SettingsIcon /> ניהול החלוקה</Link>
      )}
    </Sheet>
  );
}

function Celebration({ books, onClose, onShare }: { books: number; onClose: () => void; onShare: () => void }) {
  return (
    <div className="backdrop center" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="celebrate" role="dialog" aria-modal="true" aria-label="הספר הושלם">
        <div className="glow"><LogoMark size={70} stroke={2.5} /></div>
        <div className="eyebrow">ספר תהילים שלם</div>
        <h2 className="h1">הספר הושלם!</h2>
        <p>תודה לכל מי שקרא. ספר התהילים הושלם לעילוי נשמת <b>{site.honoree} ז״ל</b>{books > 1 ? `, כבר ${books} פעמים` : ''}. תנצב״ה.</p>
        <button className="btn btn-block" onClick={onShare}><ShareIcon /> לשתף ולהמשיך לסבב הבא</button>
        <button className="btn btn-ghost btn-block" onClick={onClose}>סגירה</button>
      </div>
    </div>
  );
}
