'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, remember } from '@/components/client';
import { KINDS, type Kind } from '@/lib/divisions';
import { DEDICATION_LABELS, type DedicationKind } from '@/lib/types';

export function NewCampaignForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<Kind>('chapters');
  const [split119, setSplit119] = useState(false);
  const [openerName, setOpenerName] = useState('');
  const [deadline, setDeadline] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [dedicationKind, setDedicationKind] = useState<DedicationKind>('ilui');
  const [dedicationName, setDedicationName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => setOpenerName(remember('name')), []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (openerName) remember('name', openerName);
      const res = await api<{ slug: string; adminToken: string }>('/api/campaigns', {
        title,
        kind,
        split119,
        openerName,
        deadline: deadline || null,
        isPublic,
        dedicationKind,
        dedicationName,
      });
      remember(`admin.${res.slug}`, res.adminToken);
      router.push(`/c/${res.slug}/manage?key=${encodeURIComponent(res.adminToken)}&created=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'משהו השתבש');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="stack" style={{ gap: 22, paddingBottom: 24 }}>
      <div className="field">
        <label htmlFor="title">שם החלוקה</label>
        <input id="title" className="input" required maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="לדוגמה: לקראת היארצייט" />
      </div>

      <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="label" style={{ marginBottom: 6 }}>איך לחלק</legend>
        <div className="stack" style={{ gap: 8 }}>
          {KINDS.map((k) => (
            <label key={k.value} className="choice">
              <input type="radio" name="kind" value={k.value} checked={kind === k.value} onChange={() => setKind(k.value)} />
              <span>
                <span style={{ fontWeight: 600, display: 'block' }}>{k.label}</span>
                <span className="muted" style={{ fontSize: 14 }}>{k.description}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {kind === 'chapters' && (
        <label className="check">
          <input type="checkbox" checked={split119} onChange={(e) => setSplit119(e.target.checked)} />
          <span>לפצל את פרק קי״ט (176 פסוקים) ל-22 חלקים לפי האותיות</span>
        </label>
      )}

      <div className="field">
        <label htmlFor="opener">השם שלך</label>
        <input id="opener" className="input" maxLength={60} value={openerName} onChange={(e) => setOpenerName(e.target.value)}
          placeholder="יופיע כ״נפתח ע״י״" />
      </div>

      <div className="field">
        <label htmlFor="deadline">תאריך יעד <span className="muted" style={{ fontWeight: 400 }}>(לא חובה)</span></label>
        <input id="deadline" type="date" className="input" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      </div>

      <div className="field">
        <span className="label">להוסיף לחלוקה גם שם נוסף <span className="muted" style={{ fontWeight: 400 }}>(לא חובה)</span></span>
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

      <label className="check">
        <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
        <span>להציג את החלוקה בדף הבית</span>
      </label>

      {error && <div className="error" role="alert">{error}</div>}
      <button className="btn btn-block" disabled={busy || !title.trim()}>
        {busy ? 'פותחים…' : 'פתיחת החלוקה'}
      </button>
    </form>
  );
}
