import { NextResponse } from 'next/server';
import { UserError } from './campaigns';

type Globals = { __hits?: Map<string, { n: number; reset: number }> };
const g = globalThis as unknown as Globals;

/** A small in-memory limit on writes per IP, enough to stop accidental floods. */
export function rateLimited(req: Request, max = 60, windowMs = 60_000): boolean {
  const hits = (g.__hits ??= new Map());
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || entry.reset < now) {
    hits.set(ip, { n: 1, reset: now + windowMs });
    if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
    return false;
  }
  entry.n++;
  return entry.n > max;
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function handle(fn: () => Promise<unknown>) {
  return fn()
    .then((data) => NextResponse.json(data ?? { ok: true }))
    .catch((err: unknown) => {
      if (err instanceof UserError) {
        return NextResponse.json({ error: err.message, ...err.extra }, { status: err.status });
      }
      console.error(err);
      return NextResponse.json({ error: 'משהו השתבש. נסו שוב בעוד רגע.' }, { status: 500 });
    });
}

export function tooMany() {
  return NextResponse.json({ error: 'יותר מדי בקשות. נסו שוב בעוד דקה.' }, { status: 429 });
}
