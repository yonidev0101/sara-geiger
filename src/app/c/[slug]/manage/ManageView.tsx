'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AppFrame } from '@/components/AppShell';
import { CheckIcon, CopyIcon, ShareIcon } from '@/components/Icons';
import { Ring } from '@/components/Ring';
import { Toast, useToast } from '@/components/Sheet';
import { api, remember, shareLink, subscribeLive } from '@/components/client';
import { dedicationLine } from '@/lib/dedication';
import { site } from '@/lib/site';
import { DEDICATION_LABELS, type AdminState, type AdminUnit, type DedicationKind } from '@/lib/types';

export function ManageView({ slug, initialKey, created: justCreated }: { slug: string; initialKey: string; created: boolean }) {
  const [created, setCreated] = useState(justCreated);
  const [key, setKey] = useState(initialKey);
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<AdminState | null>(null);
  const [error, setError] = useState('');
  const [origin, setOrigin] = useState('');
  const toast = useToast();

  useEffect(() => {
    setOrigin(window.location.origin);
    const k = initialKey || remember(`admin.${slug}`);
    if (k) remember(`admin.${slug}`, k);
    setKey(k);
    setReady(true);
  }, [initialKey, slug]);

  const load = useCallback(async () => {
    if (!key) return;
    try {
      setState(await api<AdminState>(`/api/c/${slug}/admin?key=${encodeURIComponent(key)}`));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'משהו השתבש');
    }
  }, [key, slug]);

  useEffect(() => {
    if (!key) return;
    void load();
    return subscribeLive(slug, () => void load());
  }, [key, slug, load]);

  async function run(action: string, extra: Record<string, unknown> = {}, done?: string) {
    try {
      await api(`/api/c/${slug}/admin`, { key, action, ...extra });
      if (done) toast.show(done);
      await load();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'משהו השתבש');
    }
  }

  const publicUrl = `${origin}/c/${slug}`;
  const adminUrl = `${origin}/c/${slug}/manage?key=${encodeURIComponent(key)}`;
  const copy = (text: string, msg: string) => navigator.clipboard?.writeText(text).then(() => toast.show(msg));

  if (ready && (!key || (error && !state))) {
    return (
      <AppFrame title="ניהול" back={`/c/${slug}`}>
        <div className="empty" style={{ marginTop: 24 }}>
          <span>{error || 'כדי לנהל את החלוקה צריך את קישור הניהול שקיבלתם כשפתחתם אותה.'}</span>
          <Link href={`/c/${slug}`} className="btn">לדף החלוקה</Link>
        </div>
      </AppFrame>
    );
  }
  if (!state) {
    return <AppFrame title="ניהול" back={`/c/${slug}`}><p className="muted" style={{ textAlign: 'center', marginTop: 40 }}>טוען…</p></AppFrame>;
  }

  const { campaign, counts } = state;
  const people = state.units.filter((u) => u.status !== 'free');
  const shareText = `${campaign.title}\nחלוקת תהילים ${dedicationLine(campaign.dedication)}. בחרו פרק והצטרפו:`;

  return (
    <AppFrame title={created ? 'החלוקה נפתחה' : 'ניהול החלוקה'} back={`/c/${slug}`}>
      {created ? (
        <section className="success">
          <div className="success-mark"><CheckIcon /></div>
          <h1 className="h1">החלוקה נפתחה!</h1>
          <p className="lead">עכשיו שלחו את הקישור למשפחה ולחברים</p>
          <button className="btn btn-block" style={{ marginTop: 12 }} onClick={() => shareLink(publicUrl, shareText)}><ShareIcon /> שיתוף הקישור</button>
          <button className="btn btn-secondary btn-block" onClick={() => copy(publicUrl, 'הקישור הועתק')}><CopyIcon /> העתקת הקישור</button>
          <Link href={`/c/${slug}`} className="btn btn-ghost btn-block">לדף החלוקה</Link>
          <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
            הניהול נשמר במכשיר הזה. בכל רגע אפשר להגיע אליו מכפתור המידע בדף החלוקה.
          </p>
          <button className="text-btn" onClick={() => setCreated(false)}>להגדרות וניהול</button>
        </section>
      ) : (
        <section className="card camp-head">
          <Ring read={counts.read} taken={counts.taken} total={counts.total} />
          <div className="grow">
            <h1 className="h1">{campaign.title}</h1>
            <div className="camp-meta">
              {campaign.kindLabel} · {counts.free} פנויים · {state.participants} משתתפים{campaign.status === 'closed' ? ' · סגורה' : ''}
            </div>
          </div>
        </section>
      )}

      {!created && (
        <>
          <div className="section-label"><span>שיתוף</span></div>
          <div className="list">
            <button className="list-row" onClick={() => shareLink(publicUrl, shareText)}><ShareIcon /><span className="grow title">שיתוף הקישור</span></button>
            <button className="list-row" onClick={() => shareLink(publicUrl, statusMessage(state))}><span style={{ width: 22 }} /><span className="grow title">שליחת עדכון מצב</span></button>
            <button className="list-row" onClick={() => copy(publicUrl, 'הקישור הועתק')}><CopyIcon /><span className="grow title">העתקת הקישור</span></button>
          </div>
        </>
      )}

      {!created && (<>
      <div className="section-label">
        <span>מי קורא ({people.length})</span>
        {people.length > 0 && <button className="text-btn" style={{ padding: 0, fontSize: 13 }} onClick={() => downloadCsv(campaign.title, people)}>הורדה לאקסל</button>}
      </div>
      {people.length === 0 ? (
        <div className="empty">עדיין אף אחד לא לקח. שתפו את הקישור!</div>
      ) : (
        <div className="list">
          {people.map((u) => (
            <div key={u.id} className="person-row">
              <div className="grow">
                <div style={{ fontWeight: 600 }}>{u.takerName ?? 'משתתף'}</div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {u.parts > 1 ? u.label : u.detail}
                  {u.status === 'taken' && u.parts > 1 ? ` · ${u.progress.length}/${u.parts}` : ''}
                </div>
              </div>
              <span className={`status-tag ${u.status}`}>{u.status === 'read' ? 'נקרא' : 'בקריאה'}</span>
              <UnitMenu u={u} onRead={() => run('markRead', { unitIds: [u.id] }, 'סומן כנקרא')}
                onRelease={() => confirm('לשחרר בחזרה לרשימה?') && run('release', { unitIds: [u.id] }, 'שוחרר')} />
            </div>
          ))}
        </div>
      )}

      {state.adminDedications.length > 0 && (
        <>
          <div className="section-label"><span>שמות נוספים</span></div>
          <div className="list">
            {state.adminDedications.map((d) => (
              <label key={d.id} className="switch-row">
                <span>
                  <span className="muted" style={{ fontSize: 12, display: 'block' }}>{DEDICATION_LABELS[d.kind]}</span>
                  <span className="serif" style={{ fontSize: 17 }}>{d.name}</span>
                </span>
                <span className="switch" title="להציג">
                  <input type="checkbox" checked={!d.hidden} aria-label={`להציג את ${d.name}`}
                    onChange={(e) => run('hideDedication', { dedicationId: d.id, hidden: !e.target.checked })} />
                  <span />
                </span>
              </label>
            ))}
          </div>
        </>
      )}

      <div className="section-label"><span>הגדרות</span></div>
      <Settings state={state} onSave={(v) => run('settings', v, 'נשמר')} />

      <div className="section-label"><span>עוד</span></div>
      <div className="list">
        <button className="list-row" onClick={() => copy(adminUrl, 'קישור הניהול הועתק. אל תשתפו אותו.')}>
          <span className="grow"><span className="title" style={{ display: 'block' }}>העתקת קישור הניהול</span><span className="sub">לגישה מטלפון אחר. פרטי, לא לשתף.</span></span>
        </button>
        <button className="list-row" onClick={() => confirm('להתחיל סבב חדש? כל הפרקים יחזרו להיות פנויים.') && run('newRound', {}, 'סבב חדש התחיל')}>
          <span className="grow title">להתחיל סבב חדש</span>
        </button>
        {campaign.status === 'active' ? (
          <button className="list-row" onClick={() => confirm('לסגור את החלוקה?') && run('close', {}, 'החלוקה נסגרה')}>
            <span className="grow title" style={{ color: 'var(--danger)' }}>סגירת החלוקה</span>
          </button>
        ) : (
          <button className="list-row" onClick={() => run('reopen', {}, 'החלוקה נפתחה מחדש')}><span className="grow title">פתיחה מחדש</span></button>
        )}
      </div>
      </>)}
      <Toast message={toast.message} />
    </AppFrame>
  );
}

function UnitMenu({ u, onRead, onRelease }: { u: AdminUnit; onRead: () => void; onRelease: () => void }) {
  return (
    <details className="more" style={{ position: 'relative' }}>
      <summary className="icon-btn" aria-label="פעולות">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="12" cy="19" r="1.6" /></svg>
      </summary>
      <div className="popover" style={{ top: 44, width: 180, insetInlineEnd: 0, padding: 6, gap: 0 }}>
        {u.status === 'taken' && <button className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }} onClick={onRead}>סימון כנקרא</button>}
        <button className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }} onClick={onRelease}>שחרור</button>
      </div>
    </details>
  );
}

function Settings({ state, onSave }: { state: AdminState; onSave: (v: Record<string, unknown>) => void }) {
  const c = state.campaign;
  const [title, setTitle] = useState(c.title);
  const [deadline, setDeadline] = useState(c.deadline ?? '');
  const [isPublic, setIsPublic] = useState(c.isPublic);
  const [autoRenew, setAutoRenew] = useState(c.autoRenew);
  const [releaseDays, setReleaseDays] = useState(c.releaseDays ? String(c.releaseDays) : '');
  const [forSara, setForSara] = useState(!c.dedication);
  const [dedicationKind, setDedicationKind] = useState<DedicationKind>(c.dedication?.kind ?? 'ilui');
  const [dedicationName, setDedicationName] = useState(c.dedication?.name ?? '');
  return (
    <form className="card" onSubmit={(e) => { e.preventDefault(); onSave({
      title, deadline: deadline || null, isPublic, autoRenew, releaseDays: releaseDays ? Number(releaseDays) : null,
      dedicationKind, dedicationName: forSara ? '' : dedicationName,
    }); }}>
      <div className="field">
        <span className="label">למי מוקדשת החלוקה</span>
        <div className="pills">
          <button type="button" className="pill" aria-pressed={forSara} onClick={() => setForSara(true)}>{site.honoree} ז״ל</button>
          {(Object.keys(DEDICATION_LABELS) as DedicationKind[]).map((k) => (
            <button type="button" key={k} className="pill" aria-pressed={!forSara && dedicationKind === k}
              onClick={() => { setForSara(false); setDedicationKind(k); }}>{DEDICATION_LABELS[k]}…</button>
          ))}
        </div>
        {!forSara && (
          <input className="input" maxLength={80} value={dedicationName} onChange={(e) => setDedicationName(e.target.value)}
            placeholder="השם" aria-label={DEDICATION_LABELS[dedicationKind]} />
        )}
      </div>
      <div className="field">
        <label htmlFor="s-title">שם החלוקה</label>
        <input id="s-title" className="input" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="s-deadline">תאריך יעד</label>
        <input id="s-deadline" type="date" className="input" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="s-release">פרק שנלקח ולא נקרא</label>
        <select id="s-release" className="input" value={releaseDays} onChange={(e) => setReleaseDays(e.target.value)}>
          <option value="">נשאר שמור</option>
          <option value="2">משתחרר אחרי יומיים</option>
          <option value="3">משתחרר אחרי 3 ימים</option>
          <option value="7">משתחרר אחרי שבוע</option>
          <option value="14">משתחרר אחרי שבועיים</option>
        </select>
      </div>
      <div style={{ margin: '12px -18px 0' }}>
        <label className="switch-row">
          <span>להציג בדף הבית</span>
          <span className="switch"><input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} /><span /></span>
        </label>
        <label className="switch-row">
          <span>סבב חדש אוטומטית בסיום</span>
          <span className="switch"><input type="checkbox" checked={autoRenew} onChange={(e) => setAutoRenew(e.target.checked)} /><span /></span>
        </label>
      </div>
      <button className="btn btn-block" style={{ marginTop: 8 }}>שמירה</button>
    </form>
  );
}

function statusMessage(state: AdminState): string {
  const { campaign, counts } = state;
  return [
    `${campaign.title} · עדכון`,
    dedicationLine(campaign.dedication),
    '',
    `נקראו ${counts.read} מתוך ${counts.total}.`,
    counts.free ? `נשארו ${counts.free} פנויים. מי שעוד לא לקח, זה הזמן:` : 'כל החלקים נלקחו. מי שעוד לא סיים, נשמח שתסמנו ״קראתי״.',
  ].join('\n');
}

function downloadCsv(title: string, units: AdminUnit[]) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const rows = [
    ['חלק', 'מצב', 'שם', 'התקדמות', 'נלקח', 'נקרא'],
    ...units.map((u) => [
      u.detail,
      u.status === 'read' ? 'נקרא' : 'בקריאה',
      u.takerName ?? '',
      u.status === 'read' ? `${u.parts}/${u.parts}` : `${u.progress.length}/${u.parts}`,
      u.takenAt ? new Date(u.takenAt).toLocaleString('he-IL') : '',
      u.readAt ? new Date(u.readAt).toLocaleString('he-IL') : '',
    ]),
  ];
  const csv = '﻿' + rows.map((r) => r.map(esc).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
