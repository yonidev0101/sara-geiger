import { getState } from '@/lib/campaigns';
import { ogCampaign, ogDefault, OG_SIZE } from '@/lib/og';
import { dedicationLine } from '@/lib/dedication';
import { site } from '@/lib/site';

export const dynamic = 'force-dynamic';
export const alt = `חלוקת תהילים · ${site.brandName}`;
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const s = await getState(slug, null);
    return ogCampaign({
      title: s.campaign.title,
      kindLabel: s.campaign.kindLabel,
      ...s.counts,
      unitWord: s.campaign.kind === 'chapters' ? 'פרקים' : 'חלקים',
      participants: s.participants,
      dedication: dedicationLine(s.campaign.dedication),
    });
  } catch {
    return ogDefault();
  }
}
