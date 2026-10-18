import type { Metadata } from 'next';
import { SiteFooter, SiteHeader } from '@/components/SiteHeader';
import { NewCampaignForm } from './NewCampaignForm';

export const metadata: Metadata = { title: 'פתיחת חלוקה' };

export default function NewCampaignPage() {
  return (
    <>
      <SiteHeader />
      <main className="narrow" style={{ paddingTop: 40 }}>
        <div className="eyebrow">חלוקה חדשה</div>
        <h1 className="serif" style={{ margin: '6px 0 8px', fontSize: 38, fontWeight: 500 }}>פתיחת חלוקת תהילים</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          החלוקה תהיה לעילוי נשמת שרה בת צבי ז״ל. אפשר להוסיף גם שם נוסף. אחרי הפתיחה תקבלו קישור לשיתוף וקישור ניהול פרטי.
        </p>
        <NewCampaignForm />
      </main>
      <SiteFooter />
    </>
  );
}
