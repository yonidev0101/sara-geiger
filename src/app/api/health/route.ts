import { NextResponse } from 'next/server';
import { dbHealth } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = await dbHealth();
  return NextResponse.json({ ok: db.ok, database: db }, { status: db.ok ? 200 : 503 });
}
