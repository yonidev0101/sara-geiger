import { adminAction, getAdminState } from '@/lib/campaigns';
import { handle, rateLimited, readJson, tooMany } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const key = new URL(req.url).searchParams.get('key');
  return handle(() => getAdminState(slug, key));
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (rateLimited(req)) return tooMany();
  const { slug } = await params;
  const body = await readJson(req);
  return handle(() => adminAction(slug, body));
}
