import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getReaderUnit, UserError } from '@/lib/campaigns';
import { segmentsOf } from '@/lib/divisions';
import { getSegmentVerses, TEXT_CREDIT } from '@/lib/text';
import { ReaderView } from './ReaderView';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string; unitId: string }>;
  searchParams: Promise<{ p?: string }>;
};

async function load({ params, searchParams }: Props) {
  const { slug, unitId } = await params;
  const id = Number(unitId);
  if (!Number.isInteger(id)) notFound();
  let unit;
  try {
    unit = await getReaderUnit(slug, id, null);
  } catch (err) {
    if (err instanceof UserError && err.status === 404) notFound();
    throw err;
  }
  const p = Number((await searchParams).p ?? 0);
  const part = Number.isInteger(p) && p >= 0 && p < unit.parts ? p : 0;
  return { unit, part };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { unit, part } = await load(props);
  return { title: `${segmentsOf(unit.ref)[part]?.title ?? unit.detail} · ${unit.campaignTitle}` };
}

export default async function ReadPage(props: Props) {
  const { unit, part } = await load(props);
  return <ReaderView key={part} unit={unit} part={part} verses={getSegmentVerses(unit.ref, part)} credit={TEXT_CREDIT} />;
}
