import Link from 'next/link';
import { AppFrame } from '@/components/AppShell';

export default function NotFound() {
  return (
    <AppFrame>
      <div className="empty" style={{ marginTop: 40 }}>
        <span>הדף לא נמצא. אולי הקישור השתנה.</span>
        <Link href="/" className="btn">לדף הבית</Link>
      </div>
    </AppFrame>
  );
}
