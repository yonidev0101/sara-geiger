'use client';

import { useEffect } from 'react';

export default function ErrorScreen({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="app">
      <main className="screen no-nav">
        <div className="empty" style={{ marginTop: 60 }}>
          <span>משהו השתבש בטעינת הדף.</span>
          <button className="btn" onClick={() => { reset(); window.location.reload(); }}>נסו שוב</button>
          <a href="/" className="text-btn">לדף הבית</a>
        </div>
      </main>
    </div>
  );
}
