/** Circular progress: the dark arc is what was read, the light arc what is being read. */
export function Ring({ read, taken = 0, total, size = 76, label }: { read: number; taken?: number; total: number; size?: number; label?: string }) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const readLen = total ? (read / total) * c : 0;
  const takenLen = total ? (taken / total) * c : 0;
  const pct = total ? Math.round((read / total) * 100) : 0;
  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={`${pct}% נקרא`}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#D9C59A" strokeWidth={stroke}
          strokeDasharray={`${readLen + takenLen} ${c}`} strokeLinecap={readLen + takenLen > 0 ? 'round' : 'butt'} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ink)" strokeWidth={stroke}
          strokeDasharray={`${readLen} ${c}`} strokeLinecap={readLen > 0 ? 'round' : 'butt'} style={{ transition: 'stroke-dasharray .5s ease' }} />
      </svg>
      <div className="ring-label">
        <b>{pct}%</b>
        <span>{label ?? 'נקרא'}</span>
      </div>
    </div>
  );
}
