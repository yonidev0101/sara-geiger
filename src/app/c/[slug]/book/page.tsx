import type { Metadata } from 'next';
import { BookView } from './BookView';

export const metadata: Metadata = { title: 'הספר שלי' };

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ g?: string; copy?: string }>;
}) {
  const { slug } = await params;
  const { g, copy } = await searchParams;
  return <BookView slug={slug} group={g ?? ''} copy={Number(copy) || 1} />;
}
