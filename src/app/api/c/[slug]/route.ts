import { getState } from '@/lib/campaigns';
import { handle } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const device = new URL(req.url).searchParams.get('device');
  return handle(() => getState(slug, device));
}
