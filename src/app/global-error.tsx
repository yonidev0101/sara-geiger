'use client';

export default function GlobalError() {
  return (
    <html lang="he" dir="rtl">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#F7F2E8', color: '#1C2638' }}>
        <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center' }}>
          <p style={{ fontSize: 18, margin: 0 }}>משהו השתבש בטעינת האתר.</p>
          <button onClick={() => window.location.reload()}
            style={{ minHeight: 48, padding: '0 24px', borderRadius: 14, border: 0, background: '#1C2638', color: '#F7F2E8', fontSize: 16, fontWeight: 600 }}>
            נסו שוב
          </button>
        </div>
      </body>
    </html>
  );
}
