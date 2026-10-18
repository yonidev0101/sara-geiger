import { createCampaign } from '@/lib/campaigns';
import { handle, rateLimited, readJson, tooMany } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (rateLimited(req, 10)) return tooMany();
  const body = await readJson(req);
  return handle(() => createCampaign(body));
}
