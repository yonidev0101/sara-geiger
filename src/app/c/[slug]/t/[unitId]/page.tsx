import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getReaderUnit, UserError } from '@/lib/campaigns';
import { dedicationLine } from '@/lib/dedication';
import { TakeOne } from './TakeOne';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ slug: string; unitId: string }> };

async function load({ params }: Params) {
  const { slug, unitId } = await params;
  const id = Number(unitId);
  if (!Number.isInteger(id)) notFound();
  try {
    return await getReaderUnit(slug, id, null);
  } catch (err) {
    if (err instanceof UserError && err.status === 404) notFound();
    throw err;
  }
}

export async function generateMetadata(props: Params): Promise<Metadata> {
  const unit = await load(props);
  const title = `${unit.detail} · ${dedicationLine(unit.dedication)}`;
  return { title, openGraph: { title, description: `${unit.campaignTitle} · לחצו כדי לקחת את ה${unit.parts > 1 ? 'חלק' : 'פרק'} ולקרוא` } };
}

export default async function TakeOnePage(props: Params) {
  return <TakeOne unit={await load(props)} />;
}
