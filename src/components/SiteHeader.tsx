import Link from 'next/link';
import { LogoMark } from './Logo';
import { site } from '@/lib/site';

export function SiteHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="site-header">
      <div className="container inner">
        <Link href="/" className="brand" aria-label={`${site.brandName}, לדף הבית`}>
          <LogoMark size={34} />
          <span className="brand-name">{site.brandName}</span>
        </Link>
        {children ?? (
          <nav className="nav" aria-label="ניווט ראשי">
            <Link href="/#campaigns">חלוקות פעילות</Link>
            <Link href="/#how">איך זה עובד</Link>
            <Link href="/new" className="btn btn-small">פתיחת חלוקה</Link>
          </nav>
        )}
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container inner">
        <span className="serif" style={{ fontSize: 17, color: 'var(--ink)' }}>
          {site.brandName} · לעילוי נשמת {site.honoree} ז״ל
        </span>
        <span>תנצב״ה</span>
      </div>
    </footer>
  );
}
