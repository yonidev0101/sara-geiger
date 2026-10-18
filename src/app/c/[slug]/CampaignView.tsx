'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SiteHeader } from '@/components/SiteHeader';
import { BookIcon, CheckIcon, ShareIcon } from '@/components/Icons';
import { LogoMark } from '@/components/Logo';
import { api, ApiError, getDeviceId, remember, shareLink, subscribeLive, timeAgo } from '@/components/client';
import { hebNum, hebrewDate } from '@/lib/hebrew';
import { site } from '@/lib/site';
import {
  DEDICATION_LABELS,
  type ActivityItem,
  type CampaignState,
  type DedicationKind,
  type PublicUnit,
} from '@/lib/types';

type Filter = 'all' | 'free' | 'mine';
type SheetState = null | { mode: 'pick' } | { mode: 'auto' } | { mode: 'unit'; unit: PublicUnit };

export function CampaignView({ slug, initial }: { slug: string; initial: CampaignState }) {
  const [state, setState] = useState(initial);
  const [selected, setSelected] = useState<number[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [sheet, setSheet] = useState<SheetState>(null);
  const [toast, setToast] = useState('');
  const [celebrate, setCelebrate] = useState(false);
  const [flashId, setFlashId] = useState<number | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetching = useRef<Promise<void> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3500);
  }, []);

  const refresh = useCallback(async () => {
    if (fetching.current) return fetching.current;
    fetching.current = (async () => {
      try {
        const next = await api<CampaignState>(`/api/c/${slug}?device=${getDeviceId()}`);
        setState(next);
        // Drop selections that someone else just took.
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
    void refresh();
    return subscribeLive(slug, (evt) => {
      if (evt.type === 'completed') setCelebrate(true);
      void refresh();
    });
  }, [slug, refresh]);

  const { campaign, units, counts, dedications } = state;
  const isChapters = campaign.kind === 'chapters';
  const one = isChapters ? 'פרק' : 'חלק';
  const many = isChapters ? 'פרקים' : 'חלקים';
  const active = campaign.status === 'active';
  const mineOpen = units.filter((u) => u.mine && u.status === 'taken');
  const mineAll = units.filter((u) => u.mine);

  const groups = useMemo(() => {
    const visible = units.filter((u) => (filter === 'free' ? u.status === 'free' : true));
    const map = new Map<string, PublicUnit[]>();
    for (const u of visible) {
      if (!map.has(u.group)) map.set(u.group, []);
      map.get(u.group)!.push(u);
    }
    return [...map.entries()];
  }, [units, filter]);

  function onUnit(u: PublicUnit) {
    if (u.status === 'free') {
      if (!active) return;
      setSelected((sel) => (sel.includes(u.id) ? sel.filter((x) => x !== u.id) : [...sel, u.id]));
    } else if (u.mine) {
      setSheet({ mode: 'unit', unit: u });
    } else if (u.status === 'taken') {
      showToast(`${u.detail} נלקח ע״י ${u.takerName ?? 'משתתף'}`);
    } else {
      showToast(`${u.detail} כבר נקרא${u.takerName ? ` ע״י ${u.takerName}` : ''}`);
    }
  }

  async function act(action: 'read' | 'release', unitIds: number[]) {
    try {
      const res = await api<{ completed?: boolean }>(`/api/c/${slug}/actions`, { action, unitIds, device: getDeviceId() });
      if (action === 'read') {
        if (res.completed) setCelebrate(true);
        else showToast(unitIds.length > 1 ? 'תודה! כולם סומנו כנקראו.' : 'תודה! סומן כנקרא.');
      } else {
        showToast(`ה${one} שוחרר וחזר לרשימה`);
      }
      setSheet(null);
      await refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'משהו השתבש');
    }
  }

  function jumpTo(chapter: number) {
    const target = units.find((u) => u.ref === `Psalms.${chapter}` || u.ref.startsWith(`Psalms.${chapter}.`));
    if (!target) return showToast('לא נמצא פרק כזה');
    setFilter('all');
    requestAnimationFrame(() => {
      document.getElementById(`u-${target.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setFlashId(target.id);
      setTimeout(() => setFlashId(null), 1600);
    });
  }

  const readPct = counts.total ? (counts.read / counts.total) * 100 : 0;
  const takenPct = counts.total ? (counts.taken / counts.total) * 100 : 0;
  const shareText = `${campaign.title}\nחלוקת תהילים לעילוי נשמת ${site.honoree} ז״ל.\n${
    counts.free ? `נשארו ${counts.free} ${many} פנויים. בחרו ${one} והצטרפו:` : 'כל החלקים נלקחו. תודה לכולם!'
  }`;
  const share = () => shareLink(window.location.href.split('?')[0], shareText);
  const selectedUnits = units.filter((u) => selected.includes(u.id));

  return (
    <>
      <SiteHeader>
        <nav className="nav" aria-label="ניווט">
          <Link href="/mine">הפרקים שלי</Link>
          <button className="icon-btn" onClick={share} aria-label="שיתוף החלוקה">
            <ShareIcon />
          </button>
        </nav>
      </SiteHeader>

      <main className="narrow">
        <div className="memorial compact">
          <div className="eyebrow">לעילוי נשמת</div>
          <h1 className="name">{site.honoree} ז״ל</h1>
          {site.passingDateHebrew && <div className="muted" style={{ fontSize: 14 }}>{site.passingDateHebrew} · תנצב״ה</div>}
        </div>

        <section className="card stack campaign-head" aria-label="פרטי החלוקה">
          <div className="row-between" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
            <div style={{ minWidth: 0 }}>
              <h2 className="serif campaign-title">{campaign.title}</h2>
              <div className="meta">
                <span>סבב {hebNum(campaign.round)}</span>
                {campaign.openerName && <span>נפתח ע״י {campaign.openerName}</span>}
                {campaign.deadline && <span>עד {hebrewDate(campaign.deadline)}</span>}
              </div>
            </div>
            <span className="chip">{campaign.kindLabel}</span>
          </div>

          <div className="stack" style={{ gap: 8 }}>
            <div className="progress" role="img" aria-label={`${counts.read} נקראו, ${counts.taken} בקריאה, ${counts.free} פנויים`}>
              <div className="read" style={{ width: `${readPct}%` }} />
              <div className="taken" style={{ width: `${takenPct}%` }} />
            </div>
            <div className="stat-row">
              <div><b>{counts.read}</b><span>נקראו</span></div>
              <div><b>{counts.taken}</b><span>בקריאה</span></div>
              <div><b>{counts.free}</b><span>פנויים</span></div>
              <div><b>{state.participants}</b><span>משתתפים</span></div>
            </div>
          </div>

          {campaign.completedRounds > 0 && (
            <div className="completed-note">
              <LogoMark size={22} stroke={4} />
              <span>הספר הושלם בחלוקה הזאת {campaign.completedRounds === 1 ? 'פעם אחת' : `${campaign.completedRounds} פעמים`}</span>
            </div>
          )}

          {dedications.length > 0 && (
            <div className="dedications">
              {(Object.keys(DEDICATION_LABELS) as DedicationKind[]).map((k) => {
                const names = dedications.filter((d) => d.kind === k).map((d) => d.name);
                if (!names.length) return null;
                return (
                  <div key={k}>
                    <div className="muted" style={{ fontSize: 12 }}>{k === 'ilui' ? 'בנוסף, לעילוי נשמת' : DEDICATION_LABELS[k]}</div>
                    <div className="serif" style={{ fontSize: 16, lineHeight: 1.6 }}>{names.join(' · ')}</div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {!active && <div className="banner" style={{ marginTop: 16 }}>החלוקה סגורה כרגע לבחירת {many}.</div>}

        {mineOpen.length > 0 && filter !== 'mine' && (
          <section className="my-next" aria-label="הבא בתור לקריאה">
            <div>
              <div className="muted" style={{ fontSize: 13 }}>מחכים לך {mineOpen.length === 1 ? `${one} אחד` : `${mineOpen.length} ${many}`}</div>
              <div className="serif" style={{ fontSize: 19 }}>{mineOpen[0].detail}</div>
            </div>
            <Link className="btn btn-small" href={`/c/${slug}/read/${mineOpen[0].id}`}>
              <BookIcon /> לקריאה
            </Link>
          </section>
        )}

        {mineAll.length === 0 && active && counts.free > 0 && (
          <ol className="how-strip" aria-label="איך משתתפים">
            <li><b>א׳</b> בוחרים {one} פנוי</li>
            <li><b>ב׳</b> קוראים כאן באתר</li>
            <li><b>ג׳</b> מסמנים ״קראתי״</li>
          </ol>
        )}

        <section style={{ paddingTop: 20 }} aria-label={`${many} תהילים`}>
          <div className="toolbar">
            <div className="tabs" role="group" aria-label="סינון">
              <button className="tab" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>הכל</button>
              <button className="tab" aria-pressed={filter === 'free'} onClick={() => setFilter('free')}>פנויים · {counts.free}</button>
              <button className="tab" aria-pressed={filter === 'mine'} onClick={() => setFilter('mine')}>שלי · {mineAll.length}</button>
            </div>
            {isChapters && filter !== 'mine' && <JumpBox onJump={jumpTo} />}
          </div>

          {filter !== 'mine' && (
            <div className="legend">
              <span><i className="swatch" style={{ background: 'var(--paper)', border: '1px solid var(--line-strong)' }} />פנוי</span>
              <span><i className="swatch" style={{ background: 'var(--sand)' }} />נלקח</span>
              <span><i className="swatch" style={{ background: 'var(--ink)' }} />נקרא</span>
              <span><i className="swatch" style={{ background: 'var(--paper)', boxShadow: 'inset 0 0 0 2px var(--gold)' }} />שלי</span>
            </div>
          )}

          {filter === 'mine' ? (
            <MineList slug={slug} units={mineAll} active={active} one={one}
              onRead={(id) => act('read', [id])} onRelease={(id) => act('release', [id])}
              onReadAll={() => act('read', mineOpen.map((u) => u.id))} />
          ) : groups.length === 0 ? (
            <div className="empty" style={{ marginTop: 16 }}>אין כרגע {many} פנויים.</div>
          ) : (
            groups.map(([group, list]) => (
              <div key={group}>
                <div className="group-title">
                  <span>{group}</span>
                  <span className="line" />
                  {isChapters && <span className="range">{list.filter((u) => !u.sublabel).at(0)?.label}–{list.filter((u) => !u.sublabel).at(-1)?.label}</span>}
                </div>
                <div className={isChapters ? 'grid' : 'part-list'}>
                  {list.map((u) => (
                    <UnitButton key={u.id} u={u} compact={isChapters} selected={selected.includes(u.id)} flash={flashId === u.id} onClick={() => onUnit(u)} />
                  ))}
                </div>
              </div>
            ))
          )}
        </section>

        {state.activity.length > 0 && <ActivityFeed items={state.activity} many={many} one={one} />}

        {active && (
          <div className="action-bar">
            {selected.length > 0 ? (
              <div className="row">
                <button className="btn grow" onClick={() => setSheet({ mode: 'pick' })}>
                  המשך עם {selected.length === 1 ? `${one} אחד` : `${selected.length} ${many}`}
                </button>
                <button className="btn btn-outline" onClick={() => setSelected([])}>ניקוי</button>
              </div>
            ) : (
              <div className="row">
                <button className="btn grow" onClick={() => setSheet({ mode: 'auto' })} disabled={counts.free === 0}>
                  {counts.free === 0 ? `כל ה${many} נלקחו` : `בחרו לי ${many}`}
                </button>
                <button className="btn btn-outline" onClick={share}><ShareIcon /> שיתוף</button>
              </div>
            )}
          </div>
        )}
        <div style={{ height: 24 }} />
      </main>

      {sheet?.mode === 'pick' && (
        <TakeSheet slug={slug} units={selectedUnits} one={one} many={many} onClose={() => setSheet(null)}
          onDone={async (ids) => { setSelected([]); setSheet(null); await refresh(); afterTake(ids); }}
          onConflict={async (msg) => { showToast(msg); await refresh(); }} />
      )}
      {sheet?.mode === 'auto' && (
        <TakeSheet slug={slug} auto maxFree={counts.free} one={one} many={many} onClose={() => setSheet(null)}
          onDone={async (ids) => { setSheet(null); await refresh(); afterTake(ids); }}
          onConflict={async (msg) => { showToast(msg); await refresh(); }} />
      )}
      {sheet?.mode === 'unit' && (
        <UnitSheet slug={slug} unit={sheet.unit} onClose={() => setSheet(null)} onRead={() => act('read', [sheet.unit.id])}
          onRelease={() => act('release', [sheet.unit.id])} active={active} one={one} />
      )}
      {celebrate && <Celebration books={state.campaign.completedRounds} onClose={() => setCelebrate(false)} onShare={share} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );

  function afterTake(ids: number[]) {
    showToast(ids.length === 1 ? `ה${one} שלך! קריאה נעימה.` : `${ids.length} ${many} נשמרו על שמך. קריאה נעימה!`);
    setFilter('mine');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function JumpBox({ onJump }: { onJump: (chapter: number) => void }) {
  const [value, setValue] = useState('');
  return (
    <form className="jump" onSubmit={(e) => { e.preventDefault(); const n = Number(value); if (n >= 1 && n <= 150) { onJump(n); setValue(''); } }}>
      <label htmlFor="jump" className="sr-only">מעבר לפרק</label>
      <input id="jump" className="jump-input" inputMode="numeric" pattern="[0-9]*" maxLength={3} placeholder="פרק מס׳"
        value={value} onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))} />
      <button className="jump-btn" aria-label="מעבר לפרק">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5" /></svg>
      </button>
    </form>
  );
}

function UnitButton({ u, compact, selected, flash, onClick }: { u: PublicUnit; compact: boolean; selected: boolean; flash: boolean; onClick: () => void }) {
  const status = u.status === 'free' ? 'פנוי' : u.status === 'taken' ? `נלקח${u.takerName ? ` ע״י ${u.takerName}` : ''}` : 'נקרא';
  const cls = [u.status !== 'free' ? u.status : '', u.mine ? 'mine' : '', selected ? 'selected' : '', flash ? 'flash' : ''].join(' ');
  if (compact) {
    return (
      <button id={`u-${u.id}`} className={`cell ${cls}`} onClick={onClick} aria-pressed={selected} aria-label={`${u.detail}, ${selected ? 'נבחר' : status}`}>
        {u.sublabel && <small>{u.sublabel}</small>}
        <span>{u.label}</span>
      </button>
    );
  }
  return (
    <button id={`u-${u.id}`} className={`part ${cls}`} onClick={onClick} aria-pressed={selected} aria-label={`${u.label}, ${u.detail}, ${selected ? 'נבחר' : status}`}>
      <span className="t">{u.label}</span>
      <span className="d">{u.detail}</span>
      <span className="who">{u.status === 'free' ? (selected ? 'נבחר' : 'פנוי') : u.mine ? 'שלי' : status}</span>
    </button>
  );
}

function MineList({ slug, units, active, one, onRead, onRelease, onReadAll }: {
  slug: string;
  units: PublicUnit[];
  active: boolean;
  one: string;
  onRead: (id: number) => void;
  onRelease: (id: number) => void;
  onReadAll: () => void;
}) {
  if (!units.length) {
    return <div className="empty" style={{ marginTop: 16 }}>עדיין לא לקחת {one} בחלוקה הזאת. חזרו ל״הכל״ ובחרו {one} פנוי.</div>;
  }
  const open = units.filter((u) => u.status === 'taken');
  const read = units.length - open.length;
  const ordered = [...open, ...units.filter((u) => u.status === 'read')];
  return (
    <div style={{ marginTop: 8 }}>
      <div className="mine-summary">
        <span>קראת {read} מתוך {units.length}</span>
        <div className="progress" style={{ flex: 1 }} aria-hidden="true">
          <div className="read" style={{ width: `${(read / units.length) * 100}%` }} />
        </div>
      </div>
      {ordered.map((u) => (
        <div key={u.id} className={`mine-item ${u.status === 'read' ? 'is-read' : ''}`}>
          <div className="label">{u.sublabel ? `${u.sublabel} ${u.label}` : u.label}</div>
          <div className="info">
            <div>{u.detail}</div>
            <div className="muted" style={{ fontSize: 13 }}>{u.status === 'read' ? 'נקרא. תודה!' : 'ממתין לקריאה'}</div>
          </div>
          {u.status === 'read' ? null : (
          <div className="actions">
            <Link className="btn btn-small" href={`/c/${slug}/read/${u.id}`}>
              <BookIcon /> לקריאה
            </Link>
            {active && (
              <>
                <button className="btn btn-small btn-outline" onClick={() => onRead(u.id)}><CheckIcon /> קראתי</button>
                <button className="btn btn-small btn-ghost" onClick={() => onRelease(u.id)} aria-label={`לשחרר את ${u.detail}`}>שחרור</button>
              </>
            )}
          </div>
          )}
        </div>
      ))}
      {open.length > 1 && active && (
        <button className="btn btn-block btn-outline" style={{ marginTop: 16 }} onClick={onReadAll}>
          <CheckIcon /> קראתי את כולם ({open.length})
        </button>
      )}
    </div>
  );
}

function ActivityFeed({ items, many, one }: { items: ActivityItem[]; many: string; one: string }) {
  return (
    <section className="activity" aria-label="פעילות אחרונה">
      <h2 className="serif section-title">פעילות אחרונה</h2>
      <ul>
        {items.map((a, i) => (
          <li key={i}>
            <span className={`dot ${a.kind}`} aria-hidden="true" />
            <span className="what">
              {a.kind === 'complete'
                ? <b>ספר התהילים הושלם! (פעם {hebNum(a.count)})</b>
                : <><b>{a.name ?? 'משתתף'}</b> {a.kind === 'take' ? 'לקח/ה' : 'קרא/ה'} {a.count === 1 ? `${one} אחד` : `${a.count} ${many}`}</>}
            </span>
            <time className="when" dateTime={a.at}>{timeAgo(a.at)}</time>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);
  return (
    <div className="backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="handle" />
        {children}
      </div>
    </div>
  );
}

function TakeSheet({ slug, units, auto, maxFree = 0, one, many, onClose, onDone, onConflict }: {
  slug: string;
  units?: PublicUnit[];
  auto?: boolean;
  maxFree?: number;
  one: string;
  many: string;
  onClose: () => void;
  onDone: (ids: number[]) => void;
  onConflict: (msg: string) => void;
}) {
  const [name, setName] = useState('');
  const [count, setCount] = useState(Math.min(5, maxFree) || 1);
  const [showDedication, setShowDedication] = useState(false);
  const [dedicationKind, setDedicationKind] = useState<DedicationKind>('ilui');
  const [dedicationName, setDedicationName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => setName(remember('name')), []);

  const options = [...new Set([1, 3, 5, 10, maxFree < 10 ? maxFree : 0].filter((n) => n > 0 && n <= maxFree))].sort((a, b) => a - b);
  const n = auto ? count : units?.length ?? 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      remember('name', name.trim());
      const res = await api<{ taken: number[] }>(`/api/c/${slug}/actions`, {
        action: 'take',
        ...(auto ? { count } : { unitIds: units!.map((u) => u.id) }),
        name,
        device: getDeviceId(),
        dedicationKind,
        dedicationName: showDedication ? dedicationName : '',
      });
      onDone(res.taken);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const conflicts = (err.data.conflicts as string[] | undefined)?.join(', ');
        onConflict(conflicts ? `מישהו הקדים אותך: ${conflicts}. בחרו ${many} אחרים.` : err.message);
        if (!auto) onClose();
      } else {
        setError(err instanceof Error ? err.message : 'משהו השתבש');
      }
      setBusy(false);
    }
  }

  return (
    <Sheet title={`לקיחת ${many}`} onClose={onClose}>
      <form onSubmit={submit} className="stack" style={{ gap: 18 }}>
        <div>
          <h2>{auto ? `כמה ${many} לקחת?` : n === 1 ? `לקחת ${one} אחד` : `לקחת ${n} ${many}`}</h2>
          <div className="muted" style={{ fontSize: 14 }}>
            {auto ? `נבחר עבורך את ה${many} הפנויים הבאים לפי הסדר.` : `ה${many} יישמרו על שמך, ותוכלו לקרוא אותם כאן באתר.`}
          </div>
        </div>

        {auto ? (
          <div className="pills" role="group" aria-label="כמות">
            {options.map((o) => (
              <button type="button" key={o} className="pill pill-num" aria-pressed={count === o} onClick={() => setCount(o)}>{o}</button>
            ))}
          </div>
        ) : (
          <div className="pills">
            {units!.map((u) => (
              <span key={u.id} className="unit-chip">{u.sublabel ? `${u.sublabel} ${u.label}` : u.label}</span>
            ))}
          </div>
        )}

        <div className="field">
          <label htmlFor="take-name">השם שלך</label>
          <input id="take-name" className="input" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="כפי שיופיע ברשימה" />
        </div>

        {showDedication ? (
          <div className="field">
            <span className="label">להוסיף גם שם</span>
            <div className="pills">
              {(Object.keys(DEDICATION_LABELS) as DedicationKind[]).map((k) => (
                <button type="button" key={k} className="pill" aria-pressed={dedicationKind === k} onClick={() => setDedicationKind(k)}>
                  {DEDICATION_LABELS[k]}
                </button>
              ))}
            </div>
            <input className="input" maxLength={80} value={dedicationName} onChange={(e) => setDedicationName(e.target.value)}
              placeholder="לדוגמה: יוסף בן אברהם" aria-label="שם נוסף" autoFocus />
          </div>
        ) : (
          <button type="button" className="link-btn" onClick={() => setShowDedication(true)}>+ להוסיף שם לעילוי נשמה, לרפואה או להצלחה</button>
        )}

        {error && <div className="error" role="alert">{error}</div>}
        <div className="stack" style={{ gap: 6 }}>
          <button className="btn btn-block btn-lg" disabled={busy || !name.trim() || n === 0}>{busy ? 'שומרים…' : 'אישור'}</button>
          <button type="button" className="btn btn-block btn-ghost" onClick={onClose}>ביטול</button>
        </div>
      </form>
    </Sheet>
  );
}

function UnitSheet({ slug, unit, onClose, onRead, onRelease, active, one }: {
  slug: string;
  unit: PublicUnit;
  onClose: () => void;
  onRead: () => void;
  onRelease: () => void;
  active: boolean;
  one: string;
}) {
  return (
    <Sheet title={unit.detail} onClose={onClose}>
      <div>
        <h2>{unit.detail}</h2>
        <div className="muted" style={{ fontSize: 14 }}>{unit.status === 'read' ? 'קראת את זה. תודה!' : 'שמור על שמך'}</div>
      </div>
      <Link className="btn btn-block btn-lg" href={`/c/${slug}/read/${unit.id}`}>
        <BookIcon /> {unit.status === 'read' ? 'לקרוא שוב' : `לקריאת ה${one}`}
      </Link>
      {unit.status === 'taken' && active && (
        <>
          <button className="btn btn-block btn-outline" onClick={onRead}><CheckIcon /> כבר קראתי</button>
          <button className="btn btn-block btn-ghost" onClick={onRelease}>לשחרר בחזרה לרשימה</button>
        </>
      )}
      <button className="btn btn-block btn-ghost" onClick={onClose}>סגירה</button>
    </Sheet>
  );
}

function Celebration({ books, onClose, onShare }: { books: number; onClose: () => void; onShare: () => void }) {
  return (
    <div className="backdrop celebrate" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="celebrate-card" role="dialog" aria-modal="true" aria-label="הספר הושלם">
        <div className="celebrate-glow"><LogoMark size={72} stroke={2.5} /></div>
        <div className="eyebrow">ספר תהילים שלם</div>
        <h2 className="serif">הספר הושלם!</h2>
        <p>
          תודה לכל מי שקרא. ספר התהילים הושלם לעילוי נשמת <b>{site.honoree} ז״ל</b>
          {books > 1 ? `, כבר ${books} פעמים בחלוקה הזאת` : ''}. תנצב״ה.
        </p>
        <div className="stack" style={{ gap: 8, width: '100%' }}>
          <button className="btn btn-block" onClick={onShare}><ShareIcon /> לשתף ולהמשיך לסבב הבא</button>
          <button className="btn btn-block btn-ghost" onClick={onClose}>סגירה</button>
        </div>
      </div>
    </div>
  );
}
