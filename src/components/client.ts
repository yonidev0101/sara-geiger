'use client';

export function getDeviceId(): string {
  const KEY = 'mizmor.device';
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).replace(/[^A-Za-z0-9]/g, '').slice(0, 32);
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return 'anonymous-device';
  }
}

export function remember(key: string, value?: string): string {
  try {
    if (value !== undefined) localStorage.setItem(`mizmor.${key}`, value);
    return localStorage.getItem(`mizmor.${key}`) ?? '';
  } catch {
    return value ?? '';
  }
}

export class ApiError extends Error {
  constructor(message: string, public status: number, public data: Record<string, unknown>) {
    super(message);
  }
}

export async function api<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? 'משהו השתבש', res.status, data);
  return data as T;
}

/** Opens the native share sheet, or WhatsApp where that isn't available. */
export async function shareLink(url: string, text: string) {
  if (navigator.share) {
    try {
      await navigator.share({ title: text, text, url });
      return;
    } catch {
      // cancelled; fall through to nothing
      return;
    }
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, '_blank', 'noopener');
}

/** Subscribes to live updates for a campaign. Calls onChange on every change and after reconnects. */
export function subscribeLive(slug: string, onEvent: (evt: { type: string; round?: number }) => void): () => void {
  let es: EventSource | null = null;
  let closed = false;
  let retry: ReturnType<typeof setTimeout> | null = null;

  const connect = () => {
    if (closed) return;
    es = new EventSource(`/api/c/${slug}/events`);
    es.onmessage = (msg) => {
      try {
        onEvent(JSON.parse(msg.data));
      } catch {
        // ignore
      }
    };
    es.onerror = () => {
      es?.close();
      retry = setTimeout(connect, 3000);
    };
  };
  connect();

  const onVisible = () => {
    if (document.visibilityState === 'visible') onEvent({ type: 'update' });
  };
  document.addEventListener('visibilitychange', onVisible);

  return () => {
    closed = true;
    if (retry) clearTimeout(retry);
    es?.close();
    document.removeEventListener('visibilitychange', onVisible);
  };
}
