'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppFrame } from '@/components/AppShell';
import { api, remember } from '@/components/client';
import { KINDS, type Kind } from '@/lib/divisions';
import { site } from '@/lib/site';
import { DEDICATION_LABELS, type DedicationKind } from '@/lib/types';

const KIND_NUM: Record<Kind, string> = { chapters: '150', month: '30', week: '7', books: '5' };
const TITLE_IDEAS = ['לקראת היארצייט', 'חלוקה משפחתית', 'לשלושים', 'תהילים חודשי'];

export function NewCampaignWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState<Kind | null>(null);
  const [title, setTitle] = useState('');
  const [openerName, setOpenerName] = useState('');
  const [deadline, setDeadline] = useState('');
  const [split119, setSplit119] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [dedicationKind, setDedicationKind] = useState<DedicationKind>('ilui');
  const [dedicationName, setDedicationName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => setOpenerName(remember('name')), []);
  useEffect(() => window.scrollTo(0, 0), [step]);

  async function create() {
    setBusy(true);
    setError('');
    try {
      if (openerName.trim()) remember('name', openerName.trim());
      const res = await api<{ slug: string; adminToken: string }>('/api/campaigns', {
        title, kind, split119, openerName, deadline: deadline || null, isPublic, dedicationKind, dedicationName,
      });
      remember(`admin.${res.slug}`, res.adminToken);
      router.replace(`/c/${res.slug}/manage?key=${encodeURIComponent(res.adminToken)}&created=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'משהו השתבש');
      setBusy(false);
    }
  }

  return (
    <AppFrame title="חלוקה חדשה" back={step === 0 ? '/' : () => setStep(step - 1)} dock>
      <div className="steps" aria-label={`שלב ${step + 1} מתוך 3`}>
        {[0, 1, 2].map((i) => <i key={i} className={i <= step ? 'on' : ''} />)}
      </div>

      {step === 0 && (
        <>
          <div className="wizard-head">
            <h1 className="h1">איך לחלק את הספר?</h1>
            <p className="lead">החלוקה תהיה לעילוי נשמת {site.honoree} ז״ל</p>
          </div>
          {KINDS.map((k) => (
            <button key={k.value} className="option" aria-pressed={kind === k.value} onClick={() => setKind(k.value)}>
              <span className="num">{KIND_NUM[k.value]}</span>
              <span className="grow">
                <span className="t" style={{ display: 'block' }}>{k.label}</span>
                <span className="d">{k.description}</span>
              </span>
            </button>
          ))}
        </>
      )}

      {step === 1 && (
        <>
          <div className="wizard-head">
            <h1 className="h1">שם לחלוקה</h1>
            <p className="lead">כך היא תופיע למי שמקבל את הקישור</p>
          </div>
          <div className="field">
            <label htmlFor="title">שם החלוקה</label>
            <input id="title" className="input" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
            <div className="suggest">
              {TITLE_IDEAS.map((t) => <button key={t} type="button" onClick={() => setTitle(t)}>{t}</button>)}
            </div>
          </div>
          <div className="field">
            <label htmlFor="opener">השם שלך</label>
            <input id="opener" className="input" maxLength={60} value={openerName} onChange={(e) => setOpenerName(e.target.value)} placeholder="לא חובה" autoComplete="name" />
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className="wizard-head">
            <h1 className="h1">עוד כמה פרטים</h1>
            <p className="lead">הכל כאן לא חובה. אפשר לדלג ולפתוח.</p>
          </div>

          <div className="field">
            <label htmlFor="deadline">תאריך יעד</label>
            <input id="deadline" type="date" className="input" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>

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
              placeholder="לדוגמה: יוסף בן אברהם" aria-label="שם נוסף" />
          </div>

          <div className="list" style={{ marginTop: 20 }}>
            <label className="switch-row">
              <span>להציג בדף הבית</span>
              <span className="switch"><input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} /><span /></span>
            </label>
            {kind === 'chapters' && (
              <label className="switch-row">
                <span>
                  <span style={{ display: 'block' }}>לפצל את פרק קי״ט</span>
                  <span className="muted" style={{ fontSize: 13 }}>22 חלקים לפי האותיות, כי הוא ארוך</span>
                </span>
                <span className="switch"><input type="checkbox" checked={split119} onChange={(e) => setSplit119(e.target.checked)} /><span /></span>
              </label>
            )}
          </div>
          {error && <div className="error" role="alert" style={{ marginTop: 12 }}>{error}</div>}
        </>
      )}

      <div className="action-dock">
        <div className="action-dock-inner">
          {step < 2 ? (
            <button className="btn btn-block" disabled={step === 0 ? !kind : !title.trim()} onClick={() => setStep(step + 1)}>
              המשך
            </button>
          ) : (
            <button className="btn btn-block" disabled={busy} onClick={create}>{busy ? 'פותחים…' : 'פתיחת החלוקה'}</button>
          )}
        </div>
      </div>
    </AppFrame>
  );
}
