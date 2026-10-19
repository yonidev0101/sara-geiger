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

test('chapters taken from one book are grouped into a single entry', async () => {
  const { groupMine } = await import('../src/lib/units.ts');
  const u = (id: number, group: string, copy = 1, parts = 1, status = 'taken') => ({ id, group, copy, parts, status });
  const entries = groupMine([u(1, 'ספר ראשון'), u(2, 'ספר ראשון', 1, 1, 'read'), u(3, 'ספר שני'), u(4, 'ספר ראשון', 2)], () => true);
  assert.equal(entries.length, 3);
  assert.equal(entries[0].type, 'book');
  assert.equal(entries[0].type === 'book' && entries[0].units.length, 2);
  assert.equal(entries[1].type, 'unit'); // a single chapter stays a chapter
  const multi = groupMine([u(5, 'ימי החודש', 1, 9), u(6, 'ימי החודש', 1, 6)], () => false);
  assert.ok(multi.every((e) => e.type === 'unit'));
});

test('psalm 119 sections follow the letters of a name', async () => {
  const { firstName, nameLetters, sectionRef } = await import('../src/lib/letters.ts');
  assert.equal(firstName('שרה בת צבי'), 'שרה');
  assert.equal(firstName('משה בן רחל'), 'משה');
  assert.deepEqual(nameLetters('שרה'), ['ש', 'ר', 'ה']);
  assert.deepEqual(nameLetters('יעקב צבי'), ['י', 'ע', 'ק', 'ב', 'צ', 'ב', 'י']);
  assert.deepEqual(nameLetters('נחום'), ['נ', 'ח', 'ו', 'מ']);
  assert.equal(sectionRef('א'), 'Psalms.119.1-8');
  assert.equal(sectionRef('ש'), 'Psalms.119.161-168');
  assert.equal(sectionRef('ת'), 'Psalms.119.169-176');
});
