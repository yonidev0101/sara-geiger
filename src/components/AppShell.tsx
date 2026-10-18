'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BackIcon, BookIcon, HomeIcon, ListIcon, PlusIcon } from './Icons';
import { LogoMark } from './Logo';
import { site } from '@/lib/site';

/** Sticky top bar: back button or brand on the start side, a title, and actions on the end side. */
export function TopBar({ title, back, actions }: { title?: string; back?: string | true | (() => void); actions?: React.ReactNode }) {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`topbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="topbar-inner">
        <div className="topbar-start">
          {back ? (
            typeof back === 'string' ? (
              <Link href={back} className="icon-btn" aria-label="חזרה"><BackIcon /></Link>
            ) : typeof back === 'function' ? (
              <button className="icon-btn" aria-label="חזרה" onClick={back}><BackIcon /></button>
            ) : (
              <button className="icon-btn" aria-label="חזרה" onClick={() => (history.length > 1 ? router.back() : router.push('/'))}><BackIcon /></button>
            )
          ) : (
            <Link href="/" className="brand" aria-label={`${site.brandName}, לדף הבית`}>
              <LogoMark size={30} />
              {!title && <span className="brand-name">{site.brandName}</span>}
            </Link>
          )}
        </div>
        <div className="topbar-title">{title}</div>
        <div className="topbar-end">{actions}</div>
      </div>
    </header>
  );
}

const TABS = [
  { href: '/', label: 'בית', icon: <HomeIcon />, match: (p: string) => p === '/' || p.startsWith('/c/') },
  { href: '/mine', label: 'הקריאה שלי', icon: <ListIcon />, match: (p: string) => p.startsWith('/mine') },
  { href: '/tehillim', label: 'תהילים', icon: <BookIcon />, match: (p: string) => p.startsWith('/tehillim') },
  { href: '/new', label: 'חלוקה חדשה', icon: <PlusIcon />, match: (p: string) => p.startsWith('/new') },
];

export function BottomNav() {
  const pathname = usePathname() ?? '/';
  return (
    <nav className="bottomnav" aria-label="ניווט ראשי">
      <div className="bottomnav-inner">
        {TABS.map((t) => (
          <Link key={t.href} href={t.href} className="tab-link" aria-current={t.match(pathname) ? 'page' : undefined}>
            {t.icon}
            <span>{t.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

/** A full app screen: top bar, centered content column, bottom tab bar. */
export function AppFrame({
  title,
  back,
  actions,
  children,
  nav = true,
  dock = false,
}: {
  title?: string;
  back?: string | true | (() => void);
  actions?: React.ReactNode;
  children: React.ReactNode;
  nav?: boolean;
  dock?: boolean;
}) {
  return (
    <div className="app">
      <TopBar title={title} back={back} actions={actions} />
      <main className={`screen ${dock ? 'with-action' : ''} ${nav ? '' : 'no-nav'}`}>{children}</main>
      {nav && <BottomNav />}
    </div>
  );
}
