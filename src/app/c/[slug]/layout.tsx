import type { Metadata } from 'next';
import { getState } from '@/lib/campaigns';
import { dedicationLine, dedicationParts } from '@/lib/dedication';

// Link previews for every page inside a campaign: the campaign's dedication leads.
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const { campaign, counts } = await getState(slug, null);
    const d = dedicationParts(campaign.dedication);
    const description = counts.free
      ? `${campaign.title} · נשארו ${counts.free} מתוך ${counts.total} פנויים. בחרו והצטרפו.`
      : `${campaign.title} · כל החלקים נלקחו.`;
    return {
      openGraph: { title: `${d.label} ${d.name} · חלוקת תהילים`, description },
      twitter: { title: dedicationLine(campaign.dedication), description },
    };
  } catch {
    return {};
  }
}

export default function CampaignLayout({ children }: { children: React.ReactNode }) {
  return children;
}
