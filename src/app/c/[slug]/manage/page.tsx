import type { Metadata } from 'next';
import { ManageView } from './ManageView';

export const metadata: Metadata = { title: 'ניהול החלוקה', robots: { index: false } };

export default async function ManagePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ key?: string; created?: string }>;
}) {
  const { slug } = await params;
  const { key, created } = await searchParams;
  return <ManageView slug={slug} initialKey={key ?? ''} created={created === '1'} />;
}
