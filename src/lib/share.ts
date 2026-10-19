import { dedicationLine } from './dedication';
import type { CampaignState } from './types';

const MAX_LINKS = 40;

/**
 * A WhatsApp message listing the free chapters, each with its own link that takes
 * it in one tap. Long lists stop after MAX_LINKS and point to the full campaign.
 */
export function freeListMessage(origin: string, state: CampaignState): string {
  const { campaign, units, counts } = state;
  const isChapters = campaign.kind === 'chapters';
  const many = isChapters ? 'פרקים' : 'חלקים';
  const free = units.filter((u) => u.status === 'free');
  const lines = [
    `*${campaign.title}*`,
    dedicationLine(campaign.dedication),
    '',
    free.length
      ? `נשארו ${counts.free} ${many} פנויים. לחצו על ${isChapters ? 'פרק' : 'חלק'} כדי לקחת אותו:`
      : `כל ה${many} נלקחו. תודה לכולם!`,
  ];
  let lastGroup = '';
  for (const u of free.slice(0, MAX_LINKS)) {
    const group = campaign.copies > 1 ? `${u.group} · תהילים ${u.copy}` : u.group;
    if (isChapters && group !== lastGroup) {
      lines.push('', `_${group}_`);
      lastGroup = group;
    }
    const label = isChapters ? `פרק ${u.sublabel ? `${u.sublabel} ${u.label}` : u.label}` : `${u.label} (${u.detail})`;
    lines.push(`${label} ← ${origin}/c/${campaign.slug}/t/${u.id}`);
  }
  if (free.length > MAX_LINKS) lines.push('', `ועוד ${free.length - MAX_LINKS} פנויים בקישור:`);
  else lines.push('', 'כל החלוקה:');
  lines.push(`${origin}/c/${campaign.slug}`);
  return lines.join('\n');
}
