import Link from 'next/link';
import { SiteFooter, SiteHeader } from '@/components/SiteHeader';
import { getStats, listPublicCampaigns } from '@/lib/campaigns';
import { hebrewDate } from '@/lib/hebrew';
import { site } from '@/lib/site';
import type { CampaignSummary } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function load() {
  try {
    const [stats, campaigns] = await Promise.all([getStats(), listPublicCampaigns()]);
    return { stats, campaigns };
  } catch (err) {
    console.error(err);
    return { stats: null, campaigns: [] as CampaignSummary[] };
  }
}

export default async function Home() {
  const { stats, campaigns } = await load();

  return (
    <>
      <SiteHeader />
      <main>
        <section className="container hero" id="about">
          <div className="text">
            <div className="eyebrow">לעילוי נשמת</div>
            <h1>{site.honoree} ז״ל</h1>
            <div className="muted" style={{ fontSize: 17 }}>
              {site.honoreeFamilyName}
              {site.passingDateHebrew ? ` · ${site.passingDateHebrew}` : ''} · תנצב״ה
            </div>
            <hr className="rule" />
            {site.about && (
              <p className="serif" style={{ margin: 0, fontSize: 21, lineHeight: 1.8, color: 'var(--ink-soft)', maxWidth: 560 }}>
                {site.about}
              </p>
            )}
            <p style={{ margin: 0, fontSize: 18, lineHeight: 1.7, color: 'var(--ink-soft)', maxWidth: 560 }}>
              כאן מחלקים את ספר תהילים בין המשפחה, החברים וכל מי שרוצה להצטרף. בוחרים פרקים, קוראים, ורואים יחד איך
              הספר מושלם לעילוי נשמתה.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
              <Link href="#campaigns" className="btn">להצטרף לחלוקה</Link>
              <Link href="/new" className="btn btn-outline">לפתוח חלוקה חדשה</Link>
              <Link href="/tehillim" className="btn btn-ghost">לקריאה חופשית</Link>
            </div>
          </div>
          <div className="photo">
            <div className="arch">
              {site.photo ? <img src={site.photo} alt={site.honoreeFamilyName} /> : <div aria-hidden="true" />}
            </div>
          </div>
        </section>

        {stats && (
          <section className="stats" aria-label="במספרים">
            <div className="container inner">
              <div>
                <div className="num">{stats.books}</div>
                <div className="lbl">ספרי תהילים שלמים נקראו לעילוי נשמתה</div>
              </div>
              <div>
                <div className="num">{stats.readings}</div>
                <div className="lbl">פרקים וחלקים נקראו</div>
              </div>
              <div>
                <div className="num">{stats.campaigns}</div>
                <div className="lbl">חלוקות נפתחו</div>
              </div>
            </div>
          </section>
        )}

        <section className="container section" id="campaigns">
          <div className="row-between" style={{ marginBottom: 24 }}>
            <h2 style={{ margin: 0 }}>חלוקות פעילות</h2>
            <span className="muted">מתעדכן בזמן אמת</span>
          </div>
          {campaigns.length ? (
            <div className="cards">
              {campaigns.map((c) => (
                <CampaignCard key={c.slug} c={c} />
              ))}
            </div>
          ) : (
            <div className="empty">
              <p style={{ marginTop: 0 }}>עדיין אין חלוקות פעילות.</p>
              <Link href="/new" className="btn">לפתוח את החלוקה הראשונה</Link>
            </div>
          )}
        </section>

        <section className="container section" id="how">
          <h2>איך זה עובד</h2>
          <div className="steps">
            <div className="step">
              <div className="n">א׳</div>
              <div className="t">פותחים חלוקה</div>
              <p>בוחרים איך לחלק: לפי פרקים, ימי החודש, ימי השבוע או חמשת הספרים. מקבלים קישור לשיתוף וקישור ניהול פרטי.</p>
            </div>
            <div className="step">
              <div className="n">ב׳</div>
              <div className="t">משתפים ובוחרים</div>
              <p>כל אחד רואה מה פנוי ולוקח בלחיצה, בלי הרשמה. אפשר להוסיף שם נוסף לעילוי נשמה, לרפואה או להצלחה.</p>
            </div>
            <div className="step">
              <div className="n">ג׳</div>
              <div className="t">קוראים ומסיימים יחד</div>
              <p>קוראים את הפרק כאן באתר, בגופן נוח ובגודל שמתאים לכם, ומסמנים ״קראתי״. כשהספר מושלם, מתחיל סבב חדש מעצמו.</p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function CampaignCard({ c }: { c: CampaignSummary }) {
  const readPct = c.counts.total ? (c.counts.read / c.counts.total) * 100 : 0;
  const takenPct = c.counts.total ? (c.counts.taken / c.counts.total) * 100 : 0;
  return (
    <Link href={`/c/${c.slug}`} className="card campaign-card">
      <div className="row-between" style={{ alignItems: 'flex-start' }}>
        <div className="serif" style={{ fontSize: 23, fontWeight: 500, lineHeight: 1.25 }}>{c.title}</div>
        <span className="chip">{c.kindLabel}</span>
      </div>
      <div className="meta">
        {c.openerName && <span>נפתח ע״י {c.openerName}</span>}
        {c.deadline && <span>עד {hebrewDate(c.deadline)}</span>}
        <span>{c.participants} משתתפים</span>
      </div>
      <div className="progress" aria-hidden="true">
        <div className="read" style={{ width: `${readPct}%` }} />
        <div className="taken" style={{ width: `${takenPct}%` }} />
      </div>
      <div className="row-between" style={{ fontSize: 14 }}>
        <span><b>{Math.round(readPct)}%</b> נקרא · {c.counts.free} פנויים</span>
        <span style={{ color: 'var(--gold-text)', fontWeight: 600 }}>להצטרפות ←</span>
      </div>
    </Link>
  );
}
