import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hebNum } from '@/lib/hebrew';
import { getPassage, TEXT_CREDIT } from '@/lib/text';
import { FreeReader } from './FreeReader';

type Params = { params: Promise<{ chapter: string }> };

function chapterOf(raw: string): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 150) notFound();
  return n;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const n = chapterOf((await params).chapter);
  return { title: `תהילים פרק ${hebNum(n)}` };
}

export default async function ChapterPage({ params }: Params) {
  const n = chapterOf((await params).chapter);
  return <FreeReader chapter={n} chapters={getPassage(`Psalms.${n}`)} credit={TEXT_CREDIT} />;
}
