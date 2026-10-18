import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getReaderUnit, UserError } from '@/lib/campaigns';
import { UnitView } from './UnitView';

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
  return { title: `${unit.label} · ${unit.campaignTitle}` };
}

export default async function UnitPage(props: Params) {
  const unit = await load(props);
  return <UnitView unit={unit} />;
}
