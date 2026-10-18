import { randomBytes } from 'node:crypto';

const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

export function newSlug(length = 7): string {
  const bytes = randomBytes(length);
  let s = '';
  for (const b of bytes) s += ALPHABET[b % ALPHABET.length];
  return s;
}

export function newToken(): string {
  return randomBytes(24).toString('base64url');
}
