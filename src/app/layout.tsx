import type { Metadata, Viewport } from 'next';
import { SwRegister } from '@/components/SwRegister';
import { site } from '@/lib/site';
import './globals.css';

function siteUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return new URL(explicit);
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return new URL(`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`);
  return new URL(`http://localhost:${process.env.PORT ?? 3000}`);
}

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  openGraph: {
    type: 'website',
    locale: 'he_IL',
    siteName: site.brandName,
    title: `${site.brandName} · לעילוי נשמת ${site.honoree} ז״ל`,
    description: `חלוקת ספר תהילים משותפת לעילוי נשמת ${site.honoree} ז״ל. בוחרים פרק, קוראים ומסמנים.`,
  },
  twitter: { card: 'summary_large_image' },
  title: { default: `${site.brandName} · לעילוי נשמת ${site.honoree} ז״ל`, template: `%s · ${site.brandName}` },
  description: `חלוקת ספר תהילים משותפת לעילוי נשמת ${site.honoree} ז״ל. בוחרים פרקים, קוראים ומסמנים, ורואים יחד מה נשאר.`,
  applicationName: site.brandName,
  appleWebApp: { capable: true, title: site.brandName, statusBarStyle: 'default' },
  icons: { apple: '/icons/apple-touch-icon.png' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#F7F2E8',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@300;400;500;700&family=Assistant:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
