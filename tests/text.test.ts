import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { withoutTeamim } from '../src/lib/hebrew.ts';

const text = JSON.parse(readFileSync(new URL('../src/data/tehillim.json', import.meta.url), 'utf8')) as string[][];

test('the bundled text has all 150 chapters and 2527 verses', () => {
  assert.equal(text.length, 150);
  assert.equal(text.reduce((n, ch) => n + ch.length, 0), 2527);
  assert.equal(text[118].length, 176);
  assert.ok(text.every((ch) => ch.every((v) => v.length > 0 && !/[<>{}[\]&]/.test(v))));
});

test('removing teamim keeps the vowels', () => {
  const v = withoutTeamim(text[22][0]);
  assert.ok(!/[֑-֯]/.test(v));
  assert.ok(v.startsWith('מִזְמוֹר לְדָוִד'));
});

test('hebrew is put into visual order with numbers kept intact', async () => {
  const { he, wrap, plainHebrew } = await import('../src/lib/bidi.ts');
  assert.equal(he('שרה בת צבי ז״ל'), 'ל״ז יבצ תב הרש');
  assert.equal(he('נשארו 23 פרקים'), 'םיקרפ 23 וראשנ');
  assert.equal(he('(א)'), '(א)');
  assert.deepEqual(wrap('אחת שתיים שלוש ארבע', 9), ['אחת שתיים', 'שלוש ארבע']);
  assert.equal(plainHebrew('יְהֹוָ֥ה רֹ֝עִ֗י'), 'ה׳ רעי');
});
