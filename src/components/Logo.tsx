/** The brand mark: five lines for the five books of Tehillim, with a flame above. */
export function LogoMark({ size = 32, ink = 'var(--ink)', flame = 'var(--gold)', stroke = 3 }: {
  size?: number;
  ink?: string;
  flame?: string;
  stroke?: number;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <path d="M50 14 C57 23 58 31 50 41 C42 31 43 23 50 14 Z" fill={flame} />
      <g stroke={ink} strokeWidth={stroke} strokeLinecap="round">
        <path d="M38 54 H62" />
        <path d="M34 62 H66" />
        <path d="M30 70 H70" />
        <path d="M26 78 H74" />
        <path d="M22 86 H78" />
      </g>
    </svg>
  );
}
