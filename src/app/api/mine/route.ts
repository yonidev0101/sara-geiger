import { getMyUnits } from '@/lib/campaigns';
import { handle } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const device = new URL(req.url).searchParams.get('device');
  return handle(async () => ({ units: await getMyUnits(device) }));
}
