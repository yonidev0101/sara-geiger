import type { Metadata } from 'next';
import { MineView } from './MineView';

export const metadata: Metadata = { title: 'הקריאה שלי', robots: { index: false } };

export default function MinePage() {
  return <MineView />;
}
