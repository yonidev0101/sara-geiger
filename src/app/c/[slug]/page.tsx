import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getState, UserError } from '@/lib/campaigns';
import { dedicationLine } from '@/lib/dedication';
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
  const description = free
    ? `${dedicationLine(state.campaign.dedication)} · נשארו ${free} מתוך ${total} פנויים. בחרו והצטרפו.`
    : `${dedicationLine(state.campaign.dedication)} · כל החלקים נלקחו.`;
  return {
    title: state.campaign.title,
    description,
  };
}

export default async function CampaignPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const initial = await load(slug);
  return <CampaignView slug={slug} initial={initial} />;
}
