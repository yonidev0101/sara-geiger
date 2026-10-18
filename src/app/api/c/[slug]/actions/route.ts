import { markRead, releaseUnits, takeUnits, UserError } from '@/lib/campaigns';
import { handle, rateLimited, readJson, tooMany } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (rateLimited(req)) return tooMany();
  const { slug } = await params;
  const body = await readJson(req);
  return handle(async () => {
    switch (body.action) {
      case 'take':
        return takeUnits(slug, body);
      case 'read':
        return markRead(slug, body.unitIds, body.device);
      case 'release':
        return releaseUnits(slug, body.unitIds, body.device);
      default:
        throw new UserError('פעולה לא מוכרת');
    }
  });
}
