'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SiteHeader } from '@/components/SiteHeader';
import { BookIcon, CheckIcon, ShareIcon } from '@/components/Icons';
import { api, ApiError, getDeviceId, remember, shareLink, subscribeLive } from '@/components/client';
import { sefariaUrl } from '@/lib/divisions';
import { site } from '@/lib/site';
import { DEDICATION_LABELS, type CampaignState, type DedicationKind, type PublicUnit } from '@/lib/types';

type Filter = 'all' | 'free' | 'mine';

export function CampaignView({ slug, initial }: { slug: string; initial: CampaignState }) {
  const [state, setState] = useState(initial);
  const [selected, setSelected] = useState<number[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [sheet, setSheet] = useState<null | { mode: 'pick' } | { mode: 'auto' } | { mode: 'unit'; unit: PublicUnit }>(null);
  const [toast, setToast] = useState('');
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
      if (evt.type === 'completed') showToast('הספר הושלם! תודה לכל המשתתפים. סבב חדש התחיל.');
      void refresh();
    });
  }, [slug, refresh, showToast]);

  const { campaign, units, counts, dedications } = state;
  const isChapters = campaign.kind === 'chapters';
  const unitWord = isChapters ? 'פרקים' : 'חלקים';
  const active = campaign.status === 'active';
  const mine = units.filter((u) => u.mine && u.status === 'taken');
  const mineRead = units.filter((u) => u.mine && u.status === 'read');

  const groups = useMemo(() => {
    const visible = units.filter((u) => (filter === 'free' ? u.status === 'free' : filter === 'mine' ? u.mine : true));
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
      showToast(`${u.detail} · נלקח ע״י ${u.takerName ?? 'משתתף'}`);
    } else {
      showToast(`${u.detail} · נקרא${u.takerName ? ` ע״י ${u.takerName}` : ''}`);
    }
  }

  async function act(action: 'read' | 'release', unitIds: number[]) {
    try {
      const res = await api<{ completed?: boolean }>(`/api/c/${slug}/actions`, { action, unitIds, device: getDeviceId() });
      if (action === 'read') showToast(res.completed ? 'הספר הושלם! תודה רבה.' : 'תודה! סומן כנקרא.');
      else showToast('הפרק שוחרר וחזר להיות פנוי');
      setSheet(null);
      await refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'משהו השתבש');
    }
  }

  const readPct = counts.total ? (counts.read / counts.total) * 100 : 0;
  const takenPct = counts.total ? (counts.taken / counts.total) * 100 : 0;
  const share = () => shareLink(window.location.href, `${campaign.title} · חלוקת תהילים לעילוי נשמת ${site.honoree} ז״ל`);
  const selectedUnits = units.filter((u) => selected.includes(u.id));

  return (
    <>
      <SiteHeader>
        <button className="icon-btn" onClick={share} aria-label="שיתוף החלוקה">
          <ShareIcon />
        </button>
      </SiteHeader>

      <main className="narrow">
        <div className="memorial">
          <div className="eyebrow">לעילוי נשמת</div>
          <h1 className="name">{site.honoree} ז״ל</h1>
          <hr className="rule" />
          {site.passingDateHebrew && <div className="muted" style={{ fontSize: 14 }}>{site.passingDateHebrew} · תנצב״ה</div>}
        </div>

        <section className="card stack" aria-label="פרטי החלוקה">
          <div className="row-between" style={{ alignItems: 'flex-start' }}>
            <div>
              <h2 className="serif" style={{ margin: 0, fontSize: 23, fontWeight: 500 }}>{campaign.title}</h2>
              <div className="muted" style={{ fontSize: 13 }}>
                סבב {campaign.round}
                {campaign.openerName ? ` · נפתח ע״י ${campaign.openerName}` : ''}
                {campaign.deadline ? ` · עד ${new Date(campaign.deadline).toLocaleDateString('he-IL')}` : ''}
                {campaign.completedRounds ? ` · הושלם ${campaign.completedRounds} פעמים` : ''}
              </div>
            </div>
            <span className="chip">{campaign.kindLabel}</span>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <div className="progress" role="img" aria-label={`${counts.read} נקראו, ${counts.taken} בקריאה, ${counts.free} פנויים`}>
              <div className="read" style={{ width: `${readPct}%` }} />
              <div className="taken" style={{ width: `${takenPct}%` }} />
            </div>
            <div className="counts">
              <span><b>{counts.read}</b> נקראו</span>
              <span><b>{counts.taken}</b> בקריאה</span>
              <span><b>{counts.free}</b> פנויים</span>
            </div>
          </div>
          {dedications.length > 0 && (
            <div style={{ borderTop: '1px solid var(--track)', paddingTop: 12 }} className="stack">
              {(Object.keys(DEDICATION_LABELS) as DedicationKind[]).map((k) => {
                const names = dedications.filter((d) => d.kind === k).map((d) => d.name);
                if (!names.length) return null;
                return (
                  <div key={k}>
                    <div className="muted" style={{ fontSize: 12 }}>{k === 'ilui' ? 'בנוסף לעילוי נשמת' : DEDICATION_LABELS[k]}</div>
                    <div className="serif" style={{ fontSize: 16, lineHeight: 1.6 }}>{names.join(' · ')}</div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {!active && <div className="banner" style={{ marginTop: 16 }}>החלוקה הזאת סגורה כרגע לבחירת פרקים.</div>}

        {(mine.length > 0 || mineRead.length > 0) && filter !== 'mine' && (
          <button className="banner" style={{ marginTop: 16, width: '100%', textAlign: 'right', border: '1px solid var(--sand)' }}
            onClick={() => setFilter('mine')}>
            {mine.length > 0 ? `יש לך ${mine.length} ${unitWord} לקריאה. לחצו כאן כדי לראות אותם.` : `קראת ${mineRead.length} ${unitWord}. תודה!`}
          </button>
        )}

        <section style={{ paddingTop: 24 }} aria-label={`${unitWord} תהילים`}>
          <div className="row-between">
            <h2 className="serif" style={{ margin: 0, fontSize: 22, fontWeight: 500 }}>{isChapters ? 'פרקי תהילים' : 'חלקי החלוקה'}</h2>
            {active && <span className="muted" style={{ fontSize: 13 }}>הקישו על {isChapters ? 'פרק' : 'חלק'} פנוי</span>}
          </div>
          <div className="tabs" style={{ margin: '12px 0' }}>
            <button className="tab" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>הכל</button>
            <button className="tab" aria-pressed={filter === 'free'} onClick={() => setFilter('free')}>פנויים ({counts.free})</button>
            <button className="tab" aria-pressed={filter === 'mine'} onClick={() => setFilter('mine')}>שלי ({mine.length + mineRead.length})</button>
          </div>
          <div className="legend">
            <span><i className="swatch" style={{ background: 'var(--paper)', border: '1px solid var(--line-strong)' }} />פנוי</span>
            <span><i className="swatch" style={{ background: 'var(--sand)' }} />נלקח</span>
            <span><i className="swatch" style={{ background: 'var(--ink)' }} />נקרא</span>
            <span><i className="swatch" style={{ background: 'var(--paper)', boxShadow: 'inset 0 0 0 2px var(--gold)' }} />שלי</span>
          </div>

          {filter === 'mine' ? (
            <MineList units={units.filter((u) => u.mine)} onRead={(id) => act('read', [id])} onRelease={(id) => act('release', [id])}
              onReadAll={() => act('read', mine.map((u) => u.id))} active={active} />
          ) : groups.length === 0 ? (
            <div className="empty" style={{ marginTop: 16 }}>אין כרגע {unitWord} פנויים.</div>
          ) : (
            groups.map(([group, list]) => (
              <div key={group}>
                <div className="group-title">
                  <span>{group}</span>
                  <span className="line" />
                  {isChapters && <span className="range">{list[0].label}–{list[list.length - 1].label}</span>}
                </div>
                <div className={isChapters ? 'grid' : 'part-list'}>
                  {list.map((u) => (
                    <UnitButton key={u.id} u={u} compact={isChapters} selected={selected.includes(u.id)} onClick={() => onUnit(u)} />
                  ))}
                </div>
              </div>
            ))
          )}
        </section>

        {active && (
          <div className="action-bar">
            {selected.length > 0 ? (
              <div className="row">
                <button className="btn grow" onClick={() => setSheet({ mode: 'pick' })}>
                  לקחת {selected.length} {selected.length === 1 ? (isChapters ? 'פרק' : 'חלק') : unitWord}
                </button>
                <button className="btn btn-outline" onClick={() => setSelected([])}>ניקוי</button>
              </div>
            ) : (
              <div className="row">
                <button className="btn grow" onClick={() => setSheet({ mode: 'auto' })} disabled={counts.free === 0}>
                  {counts.free === 0 ? `כל ה${unitWord} נלקחו` : `תנו לי ${unitWord}`}
                </button>
                <button className="btn btn-outline" onClick={share}>שיתוף</button>
              </div>
            )}
          </div>
        )}
        <div style={{ height: 24 }} />
      </main>

      {sheet?.mode === 'pick' && (
        <TakeSheet slug={slug} units={selectedUnits} unitWord={unitWord} onClose={() => setSheet(null)}
          onDone={async (msg) => { setSelected([]); setSheet(null); showToast(msg); setFilter('mine'); await refresh(); }}
          onConflict={async (msg) => { showToast(msg); await refresh(); }} />
      )}
      {sheet?.mode === 'auto' && (
        <TakeSheet slug={slug} auto maxFree={counts.free} unitWord={unitWord} onClose={() => setSheet(null)}
          onDone={async (msg) => { setSheet(null); showToast(msg); setFilter('mine'); await refresh(); }}
          onConflict={async (msg) => { showToast(msg); await refresh(); }} />
      )}
      {sheet?.mode === 'unit' && (
        <UnitSheet unit={sheet.unit} onClose={() => setSheet(null)} onRead={() => act('read', [sheet.unit.id])}
          onRelease={() => act('release', [sheet.unit.id])} active={active} />
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}

function UnitButton({ u, compact, selected, onClick }: { u: PublicUnit; compact: boolean; selected: boolean; onClick: () => void }) {
  const status = u.status === 'free' ? 'פנוי' : u.status === 'taken' ? `נלקח${u.takerName ? ` ע״י ${u.takerName}` : ''}` : 'נקרא';
  const cls = [u.status !== 'free' ? u.status : '', u.mine ? 'mine' : '', selected ? 'selected' : ''].join(' ');
  if (compact) {
    return (
      <button className={`cell ${cls}`} onClick={onClick} aria-pressed={selected} aria-label={`${u.detail}, ${selected ? 'נבחר' : status}`}>
        {u.sublabel && <small>{u.sublabel}</small>}
        <span>{u.label}</span>
      </button>
    );
  }
  return (
    <button className={`part ${cls}`} onClick={onClick} aria-pressed={selected} aria-label={`${u.label}, ${u.detail}, ${selected ? 'נבחר' : status}`}>
      <span className="t">{u.label}</span>
      <span className="d">{u.detail}</span>
      {u.status !== 'free' && <span className="who">{u.mine ? 'שלי' : status}</span>}
    </button>
  );
}

function MineList({ units, onRead, onRelease, onReadAll, active }: {
  units: PublicUnit[];
  onRead: (id: number) => void;
  onRelease: (id: number) => void;
  onReadAll: () => void;
  active: boolean;
}) {
  if (!units.length) {
    return <div className="empty" style={{ marginTop: 16 }}>עדיין לא לקחת פרקים בחלוקה הזאת.</div>;
  }
  const open = units.filter((u) => u.status === 'taken');
  return (
    <div style={{ marginTop: 8 }}>
      {units.map((u) => (
        <div key={u.id} className="mine-item">
          <div className="label">{u.sublabel ? `${u.sublabel} ${u.label}` : u.label}</div>
          <div className="info">
            <div>{u.detail}</div>
            <div className="muted" style={{ fontSize: 13 }}>{u.status === 'read' ? 'נקרא. תודה!' : 'ממתין לקריאה'}</div>
          </div>
          <div className="actions">
            <a className="btn btn-small btn-outline" href={sefariaUrl(u.ref)} target="_blank" rel="noopener noreferrer">
              <BookIcon /> לקריאה
            </a>
            {u.status === 'taken' && active && (
              <>
                <button className="btn btn-small" onClick={() => onRead(u.id)}><CheckIcon /> קראתי</button>
                <button className="btn btn-small btn-ghost" onClick={() => onRelease(u.id)} aria-label={`לשחרר את ${u.detail}`}>שחרור</button>
              </>
            )}
          </div>
        </div>
      ))}
      {open.length > 1 && active && (
        <button className="btn btn-block" style={{ marginTop: 16 }} onClick={onReadAll}>
          <CheckIcon /> קראתי את כולם ({open.length})
        </button>
      )}
    </div>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
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

function TakeSheet({ slug, units, auto, maxFree = 0, unitWord, onClose, onDone, onConflict }: {
  slug: string;
  units?: PublicUnit[];
  auto?: boolean;
  maxFree?: number;
  unitWord: string;
  onClose: () => void;
  onDone: (msg: string) => void;
  onConflict: (msg: string) => void;
}) {
  const [name, setName] = useState('');
  const [count, setCount] = useState(Math.min(5, maxFree) || 1);
  const [dedicationKind, setDedicationKind] = useState<DedicationKind>('ilui');
  const [dedicationName, setDedicationName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => setName(remember('name')), []);

  const options = [1, 3, 5, 10].filter((n) => n <= maxFree);
  if (auto && maxFree > 0 && !options.includes(maxFree) && maxFree < 10) options.push(maxFree);
  const n = auto ? count : units?.length ?? 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      remember('name', name);
      const res = await api<{ taken: number[] }>(`/api/c/${slug}/actions`, {
        action: 'take',
        ...(auto ? { count } : { unitIds: units!.map((u) => u.id) }),
        name,
        device: getDeviceId(),
        dedicationKind,
        dedicationName,
      });
      const one = unitWord === 'פרקים' ? 'פרק' : 'חלק';
      onDone(res.taken.length === 1 ? `נלקח ${one} אחד. קריאה מהנה!` : `נלקחו ${res.taken.length} ${unitWord}. קריאה מהנה!`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const conflicts = (err.data.conflicts as string[] | undefined)?.join(', ');
        onConflict(conflicts ? `${err.message}: ${conflicts}. בחרו אחרים.` : err.message);
        if (!auto) onClose();
      } else {
        setError(err instanceof Error ? err.message : 'משהו השתבש');
      }
      setBusy(false);
    }
  }

  return (
    <Sheet title="לקיחת פרקים" onClose={onClose}>
      <form onSubmit={submit} className="stack" style={{ gap: 18 }}>
        <div>
          <h2>{auto ? `כמה ${unitWord} לקחת?` : `לקחת ${n} ${n === 1 ? (unitWord === 'פרקים' ? 'פרק' : 'חלק') : unitWord}`}</h2>
          <div className="muted" style={{ fontSize: 14 }}>
            {auto ? `נבחר עבורך את ה${unitWord} הפנויים הבאים לפי הסדר.` : 'הם יישמרו על שמך. אפשר לסמן ״קראתי״ בכל רגע.'}
          </div>
        </div>

        {auto ? (
          <div className="pills">
            {options.map((o) => (
              <button type="button" key={o} className="pill" aria-pressed={count === o} onClick={() => setCount(o)}>{o}</button>
            ))}
          </div>
        ) : (
          <div className="pills">
            {units!.map((u) => (
              <span key={u.id} className="chip" style={{ fontSize: 15, padding: '6px 12px', fontFamily: 'var(--serif)', color: 'var(--ink)' }}>
                {u.sublabel ? `${u.sublabel} ${u.label}` : u.label}
              </span>
            ))}
          </div>
        )}

        <div className="field">
          <label htmlFor="take-name">השם שלך</label>
          <input id="take-name" className="input" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </div>

        <div className="field">
          <span className="label">להוסיף גם שם <span className="muted" style={{ fontWeight: 400 }}>(לא חובה)</span></span>
          <div className="pills">
            {(Object.keys(DEDICATION_LABELS) as DedicationKind[]).map((k) => (
              <button type="button" key={k} className="pill" aria-pressed={dedicationKind === k} onClick={() => setDedicationKind(k)}>
                {DEDICATION_LABELS[k]}
              </button>
            ))}
          </div>
          <input className="input" maxLength={80} value={dedicationName} onChange={(e) => setDedicationName(e.target.value)}
            placeholder="לדוגמה: יוסף בן אברהם" aria-label="שם נוסף" />
        </div>

        {error && <div className="error" role="alert">{error}</div>}
        <div className="stack" style={{ gap: 6 }}>
          <button className="btn btn-block" disabled={busy || !name.trim() || n === 0}>{busy ? 'שומרים…' : 'אישור'}</button>
          <button type="button" className="btn btn-block btn-ghost" onClick={onClose}>ביטול</button>
        </div>
      </form>
    </Sheet>
  );
}

function UnitSheet({ unit, onClose, onRead, onRelease, active }: {
  unit: PublicUnit;
  onClose: () => void;
  onRead: () => void;
  onRelease: () => void;
  active: boolean;
}) {
  return (
    <Sheet title={unit.detail} onClose={onClose}>
      <div>
        <h2>{unit.detail}</h2>
        <div className="muted" style={{ fontSize: 14 }}>{unit.status === 'read' ? 'קראת את זה. תודה!' : 'נלקח על שמך'}</div>
      </div>
      <a className="btn btn-block btn-outline" href={sefariaUrl(unit.ref)} target="_blank" rel="noopener noreferrer">
        <BookIcon /> פתיחת הטקסט לקריאה
      </a>
      {unit.status === 'taken' && active && (
        <>
          <button className="btn btn-block" onClick={onRead}><CheckIcon /> קראתי</button>
          <button className="btn btn-block btn-ghost" onClick={onRelease}>לשחרר בחזרה לרשימה</button>
        </>
      )}
      <button className="btn btn-block btn-ghost" onClick={onClose}>סגירה</button>
    </Sheet>
  );
}
