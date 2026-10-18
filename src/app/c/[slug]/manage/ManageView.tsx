'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { SiteHeader } from '@/components/SiteHeader';
import { CopyIcon, ShareIcon } from '@/components/Icons';
import { api, remember, shareLink, subscribeLive } from '@/components/client';
import { site } from '@/lib/site';
import { DEDICATION_LABELS, type AdminState, type AdminUnit } from '@/lib/types';

export function ManageView({ slug, initialKey, created }: { slug: string; initialKey: string; created: boolean }) {
  const [key, setKey] = useState(initialKey);
  const [state, setState] = useState<AdminState | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    setOrigin(window.location.origin);
    const k = initialKey || remember(`admin.${slug}`);
    if (k) remember(`admin.${slug}`, k);
    setKey(k);
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
      if (done) flash(done);
      await load();
    } catch (err) {
      flash(err instanceof Error ? err.message : 'משהו השתבש');
    }
  }

  function flash(text: string) {
    setMsg(text);
    setTimeout(() => setMsg(''), 3000);
  }

  const publicUrl = `${origin}/c/${slug}`;
  const adminUrl = `${origin}/c/${slug}/manage?key=${encodeURIComponent(key)}`;

  if (!key || (error && !state)) {
    return (
      <>
        <SiteHeader />
        <main className="narrow" style={{ paddingTop: 48 }}>
          <h1 className="serif" style={{ fontWeight: 500 }}>ניהול החלוקה</h1>
          <p className="error">{error || 'כדי לנהל את החלוקה צריך את קישור הניהול שקיבלתם כשפתחתם אותה.'}</p>
          <Link href={`/c/${slug}`} className="btn btn-outline">לדף החלוקה</Link>
        </main>
      </>
    );
  }

  if (!state) {
    return (
      <>
        <SiteHeader />
        <main className="narrow" style={{ paddingTop: 48 }}><p className="muted">טוען…</p></main>
      </>
    );
  }

  const { campaign, counts } = state;
  const taken = state.units.filter((u) => u.status !== 'free');

  return (
    <>
      <SiteHeader />
      <main className="container stack" style={{ paddingTop: 32, paddingBottom: 40, maxWidth: 900, gap: 24 }}>
        {created && (
          <div className="banner dark">
            <b>החלוקה נפתחה!</b> שמרו את הדף הזה: זה קישור הניהול שלכם. את הקישור לשיתוף שלחו לכל מי שרוצה להשתתף.
          </div>
        )}

        <div className="row-between">
          <div>
            <div className="eyebrow">ניהול החלוקה</div>
            <h1 className="serif" style={{ margin: '4px 0 0', fontSize: 34, fontWeight: 500 }}>{campaign.title}</h1>
            <div className="muted" style={{ fontSize: 14 }}>
              {campaign.kindLabel} · סבב {campaign.round} · {counts.read} נקראו, {counts.taken} בקריאה, {counts.free} פנויים · {state.participants} משתתפים
              {campaign.status === 'closed' ? ' · סגורה' : ''}
            </div>
          </div>
          <Link href={`/c/${slug}`} className="btn btn-outline">לדף החלוקה</Link>
        </div>

        <section className="card stack">
          <CopyField label="קישור לשיתוף" value={publicUrl} onCopied={() => flash('הקישור הועתק')} />
          <div className="pills">
            <button className="btn" onClick={() => shareLink(publicUrl, `${campaign.title}\nחלוקת תהילים לעילוי נשמת ${site.honoree} ז״ל. בחרו פרק והצטרפו:`)}>
              <ShareIcon /> שיתוף הקישור
            </button>
            <button className="btn btn-outline" onClick={() => shareLink(publicUrl, statusMessage(state))}>
              שליחת עדכון מצב
            </button>
          </div>
          <CopyField label="קישור הניהול (פרטי, לא לשתף)" value={adminUrl} onCopied={() => flash('קישור הניהול הועתק')} />
        </section>

        <Settings state={state} onSave={(values) => run('settings', values, 'ההגדרות נשמרו')} />

        <section className="card stack">
          <h2 className="serif" style={{ margin: 0, fontSize: 22, fontWeight: 500 }}>פעולות</h2>
          <div className="pills">
            <button className="btn btn-outline btn-small" onClick={() => confirm('להתחיל סבב חדש? כל הפרקים יחזרו להיות פנויים.') && run('newRound', {}, 'סבב חדש התחיל')}>
              להתחיל סבב חדש
            </button>
            {campaign.status === 'active' ? (
              <button className="btn btn-danger btn-small" onClick={() => confirm('לסגור את החלוקה? לא יהיה אפשר לבחור פרקים עד שתפתחו אותה שוב.') && run('close', {}, 'החלוקה נסגרה')}>
                סגירת החלוקה
              </button>
            ) : (
              <button className="btn btn-small" onClick={() => run('reopen', {}, 'החלוקה נפתחה מחדש')}>פתיחה מחדש</button>
            )}
          </div>
        </section>

        <section className="stack" style={{ gap: 12 }}>
          <div className="row-between">
            <h2 className="serif" style={{ margin: 0, fontSize: 22, fontWeight: 500 }}>מי לקח מה ({taken.length})</h2>
            {taken.length > 0 && <button className="btn btn-outline btn-small" onClick={() => downloadCsv(campaign.title, taken)}>הורדה לאקסל</button>}
          </div>
          {taken.length === 0 ? (
            <div className="empty">עדיין אף אחד לא לקח. שתפו את הקישור!</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>חלק</th><th>מצב</th><th>שם</th><th>מתי</th><th /></tr>
                </thead>
                <tbody>
                  {taken.map((u) => (
                    <UnitRow key={u.id} u={u}
                      onRelease={() => run('release', { unitIds: [u.id] }, 'שוחרר')}
                      onRead={() => run('markRead', { unitIds: [u.id] }, 'סומן כנקרא')} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="stack" style={{ gap: 12 }}>
          <h2 className="serif" style={{ margin: 0, fontSize: 22, fontWeight: 500 }}>שמות נוספים ({state.adminDedications.length})</h2>
          {state.adminDedications.length === 0 ? (
            <div className="empty">אין שמות נוספים.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <tbody>
                  {state.adminDedications.map((d) => (
                    <tr key={d.id} style={{ opacity: d.hidden ? 0.5 : 1 }}>
                      <td className="muted">{DEDICATION_LABELS[d.kind]}</td>
                      <td className="serif" style={{ fontSize: 16 }}>{d.name}</td>
                      <td style={{ textAlign: 'left' }}>
                        <button className="btn btn-ghost btn-small" onClick={() => run('hideDedication', { dedicationId: d.id, hidden: !d.hidden })}>
                          {d.hidden ? 'להציג' : 'להסתיר'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
      {msg && <div className="toast" role="status">{msg}</div>}
    </>
  );
}

function CopyField({ label, value, onCopied }: { label: string; value: string; onCopied: () => void }) {
  return (
    <div className="field">
      <span className="label">{label}</span>
      <div className="copy-row">
        <input className="input" readOnly value={value} onFocus={(e) => e.target.select()} aria-label={label} />
        <button className="btn btn-outline" aria-label={`העתקת ${label}`}
          onClick={() => navigator.clipboard?.writeText(value).then(onCopied)}>
          <CopyIcon />
        </button>
      </div>
    </div>
  );
}

function Settings({ state, onSave }: { state: AdminState; onSave: (v: Record<string, unknown>) => void }) {
  const c = state.campaign;
  const [title, setTitle] = useState(c.title);
  const [deadline, setDeadline] = useState(c.deadline ?? '');
  const [isPublic, setIsPublic] = useState(c.isPublic);
  const [autoRenew, setAutoRenew] = useState(c.autoRenew);
  const [releaseDays, setReleaseDays] = useState(c.releaseDays ? String(c.releaseDays) : '');
  return (
    <form className="card stack" onSubmit={(e) => { e.preventDefault(); onSave({ title, deadline: deadline || null, isPublic, autoRenew, releaseDays: releaseDays ? Number(releaseDays) : null }); }}>
      <h2 className="serif" style={{ margin: 0, fontSize: 22, fontWeight: 500 }}>הגדרות</h2>
      <div className="field">
        <label htmlFor="s-title">שם החלוקה</label>
        <input id="s-title" className="input" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="s-deadline">תאריך יעד</label>
        <input id="s-deadline" type="date" className="input" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="s-release">פרקים שנלקחו ולא נקראו</label>
        <select id="s-release" className="input" value={releaseDays} onChange={(e) => setReleaseDays(e.target.value)}>
          <option value="">נשארים שמורים עד שמשחררים אותם</option>
          <option value="2">משתחררים אוטומטית אחרי יומיים</option>
          <option value="3">משתחררים אוטומטית אחרי 3 ימים</option>
          <option value="7">משתחררים אוטומטית אחרי שבוע</option>
          <option value="14">משתחררים אוטומטית אחרי שבועיים</option>
        </select>
      </div>
      <label className="check"><input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />להציג בדף הבית</label>
      <label className="check"><input type="checkbox" checked={autoRenew} onChange={(e) => setAutoRenew(e.target.checked)} />כשהספר מושלם, להתחיל סבב חדש אוטומטית</label>
      <div><button className="btn">שמירה</button></div>
    </form>
  );
}

function UnitRow({ u, onRelease, onRead }: { u: AdminUnit; onRelease: () => void; onRead: () => void }) {
  const when = u.readAt ?? u.takenAt;
  return (
    <tr>
      <td className="serif" style={{ fontSize: 16 }}>{u.detail}</td>
      <td>
        <i className="status-dot" style={{ background: u.status === 'read' ? 'var(--ink)' : 'var(--sand)' }} />
        {u.status === 'read' ? 'נקרא' : 'בקריאה'}
      </td>
      <td>{u.takerName ?? '—'}</td>
      <td className="muted">{when ? new Date(when).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' }) : ''}</td>
      <td style={{ textAlign: 'left' }}>
        {u.status === 'taken' && <button className="btn btn-ghost btn-small" onClick={onRead}>סימון כנקרא</button>}
        <button className="btn btn-ghost btn-small" onClick={() => confirm('לשחרר את החלק הזה בחזרה לרשימה?') && onRelease()}>שחרור</button>
      </td>
    </tr>
  );
}

function statusMessage(state: AdminState): string {
  const { campaign, counts } = state;
  const lines = [
    `${campaign.title} · עדכון`,
    `לעילוי נשמת ${site.honoree} ז״ל`,
    '',
    `נקראו ${counts.read} מתוך ${counts.total}.`,
    counts.free ? `נשארו ${counts.free} פנויים. מי שעוד לא לקח, זה הזמן:` : 'כל החלקים נלקחו. מי שעוד לא סיים, נשמח שתסמנו ״קראתי״ כשתסיימו.',
  ];
  return lines.join('\n');
}

function downloadCsv(title: string, units: AdminUnit[]) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const rows = [
    ['חלק', 'מצב', 'שם', 'נלקח', 'נקרא'],
    ...units.map((u) => [
      u.detail,
      u.status === 'read' ? 'נקרא' : 'בקריאה',
      u.takerName ?? '',
      u.takenAt ? new Date(u.takenAt).toLocaleString('he-IL') : '',
      u.readAt ? new Date(u.readAt).toLocaleString('he-IL') : '',
    ]),
  ];
  const csv = '\uFEFF' + rows.map((r) => r.map(esc).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
