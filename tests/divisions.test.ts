import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hebNum } from '../src/lib/hebrew.ts';
import { buildUnits } from '../src/lib/divisions.ts';

test('hebrew numerals', () => {
  assert.equal(hebNum(1), 'א׳');
  assert.equal(hebNum(15), 'ט״ו');
  assert.equal(hebNum(16), 'ט״ז');
  assert.equal(hebNum(23), 'כ״ג');
  assert.equal(hebNum(100), 'ק׳');
  assert.equal(hebNum(115), 'קט״ו');
  assert.equal(hebNum(119), 'קי״ט');
  assert.equal(hebNum(150), 'ק״נ');
});

test('chapters division covers 150 chapters', () => {
  assert.equal(buildUnits('chapters', false).length, 150);
  const split = buildUnits('chapters', true);
  assert.equal(split.length, 149 + 22);
  assert.equal(split.filter((u) => u.ref.startsWith('Psalms.119.')).at(-1)!.ref, 'Psalms.119.169-176');
});

test('month, week and books divisions', () => {
  const month = buildUnits('month', false);
  assert.equal(month.length, 30);
  assert.equal(month[0].ref, 'Psalms.1-9');
  assert.equal(month[24].ref, 'Psalms.119.1-96');
  assert.equal(month[29].ref, 'Psalms.145-150');
  const week = buildUnits('week', false);
  assert.equal(week.length, 7);
  assert.equal(week[6].label, 'שבת קודש');
  assert.equal(buildUnits('books', false).length, 5);
});

test('month and week divisions are contiguous over 1–150', () => {
  for (const kind of ['month', 'week', 'books'] as const) {
    let next = 1;
    for (const u of buildUnits(kind, false)) {
      const m = u.ref.match(/^Psalms\.(\d+)(?:-(\d+))?$/);
      if (!m) continue; // verse ranges of chapter 119
      const a = Number(m[1]);
      const b = Number(m[2] ?? m[1]);
      if (a !== next) assert.equal(a, 120, `${kind}: gap before ${a}`); // 119 is covered by verse ranges
      next = b + 1;
    }
    assert.equal(next, 151, kind);
  }
});

test('larger hebrew numerals for years', () => {
  assert.equal(hebNum(787), 'תשפ״ז');
  assert.equal(hebNum(176), 'קע״ו');
});
