import Link from 'next/link';
import { AppFrame } from '@/components/AppShell';
import { ChevronIcon } from '@/components/Icons';
import { getStats, listPublicCampaigns } from '@/lib/campaigns';
import { dedicationLine } from '@/lib/dedication';
import { site } from '@/lib/site';
import type { CampaignSummary } from '@/lib/types';
import { ContinueReading } from './ContinueReading';

export const dynamic = 'force-dynamic';

async function load() {
  try {
    const [stats, campaigns] = await Promise.all([getStats(), listPublicCampaigns(20)]);
    return { stats, campaigns };
  } catch (err) {
    console.error(err);
    return { stats: null, campaigns: [] as CampaignSummary[] };
  }
}

export default async function Home() {
  const { stats, campaigns } = await load();

  return (
    <AppFrame>
      <section className="hero">
        <div className="eyebrow">לעילוי נשמת</div>
        <h1 className="hero-name">{site.honoree} ז״ל</h1>
        <div className="hero-sub">{site.honoreeFamilyName}{site.passingDateHebrew ? ` · ${site.passingDateHebrew}` : ''} · תנצב״ה</div>
        {site.about && <p className="lead" style={{ maxWidth: 440 }}>{site.about}</p>}
      </section>

      <ContinueReading />

      <div className="section-label">
        <span>חלוקות פעילות</span>
        {campaigns.length > 0 && <span>{campaigns.length}</span>}
      </div>
      {campaigns.length ? (
        <div className="list">
          {campaigns.map((c) => <CampaignRow key={c.slug} c={c} />)}
        </div>
      ) : (
        <div className="empty">
          <span>עדיין אין חלוקות פעילות.</span>
          <Link href="/new" className="btn">פתיחת חלוקה ראשונה</Link>
        </div>
      )}

      {campaigns.length > 0 && (
        <Link href="/new" className="btn btn-secondary btn-block" style={{ marginTop: 16 }}>פתיחת חלוקה חדשה</Link>
      )}

      {stats && stats.books > 0 && (
        <div className="tally">
          <b>{stats.books}</b> {stats.books === 1 ? 'ספר תהילים שלם הושלם' : 'ספרי תהילים שלמים הושלמו'} לעילוי נשמתה
        </div>
      )}
    </AppFrame>
  );
}

function CampaignRow({ c }: { c: CampaignSummary }) {
  const pct = c.counts.total ? (c.counts.read / c.counts.total) * 100 : 0;
  const takenPct = c.counts.total ? (c.counts.taken / c.counts.total) * 100 : 0;
  return (
    <Link href={`/c/${c.slug}`} className="list-row">
      <div className="grow">
        <div className="title serif" style={{ fontSize: 18, fontWeight: 500 }}>{c.title}</div>
        {c.dedication && <div className="sub" style={{ color: 'var(--gold-text)' }}>{dedicationLine(c.dedication)}</div>}
        <div className="sub">{c.kindLabel}{c.copies > 1 ? ` · ${c.copies} ספרים` : ''} · {c.counts.free > 0 ? `${c.counts.free} פנויים` : 'הכל נלקח'}</div>
        <div className="progress" style={{ marginTop: 10 }} aria-hidden="true">
          <div className="read" style={{ width: `${pct}%` }} />
          <div className="taken" style={{ width: `${takenPct}%` }} />
        </div>
      </div>
      <span className="chev"><ChevronIcon /></span>
    </Link>
  );
}
