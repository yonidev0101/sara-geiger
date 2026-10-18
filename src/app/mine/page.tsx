import type { Metadata } from 'next';
import { SiteFooter, SiteHeader } from '@/components/SiteHeader';
import { MineView } from './MineView';

export const metadata: Metadata = { title: 'הפרקים שלי', robots: { index: false } };

export default function MinePage() {
  return (
    <>
      <SiteHeader />
      <main className="narrow" style={{ paddingTop: 36, minHeight: '60vh' }}>
        <div className="eyebrow">אישי</div>
        <h1 className="serif page-title">הפרקים שלי</h1>
        <p className="muted" style={{ marginTop: 0 }}>כל מה שלקחת, מכל החלוקות, במכשיר הזה.</p>
        <MineView />
      </main>
      <SiteFooter />
    </>
  );
}
