import { ogDefault, OG_SIZE } from '@/lib/og';
import { site } from '@/lib/site';

export const alt = `${site.brandName} · לעילוי נשמת ${site.honoree} ז״ל`;
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image() {
  return ogDefault();
}
