import { hebNum } from '@/lib/hebrew';
import { ogChapter, ogDefault, OG_SIZE } from '@/lib/og';
import { getSegmentVerses } from '@/lib/text';

export const alt = 'ספר תהילים';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ chapter: string }> }) {
  const n = Number((await params).chapter);
  if (!Number.isInteger(n) || n < 1 || n > 150) return ogDefault();
  return ogChapter(hebNum(n), getSegmentVerses(`Psalms.${n}`, 0)[0]?.text ?? '');
}
