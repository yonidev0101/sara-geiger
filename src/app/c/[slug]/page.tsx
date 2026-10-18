import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getState, UserError } from '@/lib/campaigns';
import { site } from '@/lib/site';
import { CampaignView } from './CampaignView';

export const dynamic = 'force-dynamic';

async function load(slug: string) {
  try {
    return await getState(slug, null);
  } catch (err) {
    if (err instanceof UserError && err.status === 404) notFound();
    throw err;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const state = await load(slug);
  const { free, total } = state.counts;
  return {
    title: state.campaign.title,
    description: `חלוקת תהילים לעילוי נשמת ${site.honoree} ז״ל · ${free} מתוך ${total} עדיין פנויים. בחרו פרקים והצטרפו.`,
  };
}

export default async function CampaignPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const initial = await load(slug);
  return <CampaignView slug={slug} initial={initial} />;
}
