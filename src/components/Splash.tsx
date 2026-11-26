import { site } from '@/lib/site';

/**
 * Opening animation, shown once per visit (per browser tab session): the five lines
 * rise from the widest up, then the flame lights. It is part of the server HTML so it
 * covers the page from the first paint. A tiny inline script hides it at once on later
 * pages of the same visit, and fades it out when it ends or when tapped. The script only
 * toggles classes on <html>, so React's hydration is untouched.
 */
const script = `(function(){
  var d=document.documentElement, K='mizmor.splash', seen=false;
  try { seen = sessionStorage.getItem(K)==='1'; sessionStorage.setItem(K,'1'); } catch(e) {}
  if (seen) { d.classList.add('splash-off'); return; }
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var done = false;
  function end(){ if(done) return; done=true; d.classList.add('splash-out'); setTimeout(function(){ d.classList.add('splash-off'); }, 450); }
  setTimeout(end, reduce ? 900 : 2700);
  var el = document.getElementById('splash');
  if (el) el.addEventListener('click', end);
})();`;

export function Splash() {
  return (
    <>
      <div id="splash" aria-hidden="true">
        <svg viewBox="0 0 100 100" fill="none">
          <defs>
            <radialGradient id="splash-glow">
              <stop offset="0" stopColor="#E9C77E" stopOpacity=".55" />
              <stop offset="1" stopColor="#E9C77E" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle className="s-glow" cx="50" cy="29" r="20" fill="url(#splash-glow)" />
          <path className="s-flame" d="M50 14 C57 23 58 31 50 41 C42 31 43 23 50 14 Z" fill="#B08A45" />
          <g stroke="#F7F2E8" strokeWidth="3" strokeLinecap="round">
            <path className="s-bar" d="M38 54 H62" />
            <path className="s-bar" d="M34 62 H66" />
            <path className="s-bar" d="M30 70 H70" />
            <path className="s-bar" d="M26 78 H74" />
            <path className="s-bar" d="M22 86 H78" />
          </g>
        </svg>
        <div className="s-name">{site.brandName}</div>
        <div className="s-sub">לעילוי נשמת {site.honoree} ז״ל</div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: script }} />
    </>
  );
}
