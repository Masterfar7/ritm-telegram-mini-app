import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addDays, dailyProgress, setCompletion, streak, weekStart } from './dist/model.mjs';

test('uses Monday as the start of the week, including across a year boundary', () => {
  assert.equal(weekStart('2026-01-04'), '2025-12-29');
  assert.equal(weekStart('2026-01-05'), '2026-01-05');
  assert.equal(addDays('2024-02-28', 1), '2024-02-29');
});

test('toggles past completions without mutating the original and counts consecutive days', () => {
  const original = { dates: ['2026-06-09', '2026-06-10'] };
  const updated = setCompletion(original, '2026-06-11');
  assert.equal(streak(updated, '2026-06-11'), 3);
  assert.equal(streak(updated, '2026-06-12'), 3);
  assert.equal(streak(updated, '2026-06-13'), 0);
  assert.deepEqual(setCompletion(updated, '2026-06-11'), original);
  assert.equal(original.dates.length, 2);
});

test('omits habits that did not yet exist on the selected day', () => {
  const active = { created: '2026-06-08', dates: ['2026-06-09'] };
  const future = { created: '2026-06-10', dates: [] };
  assert.deepEqual(dailyProgress([active, future], '2026-06-09'), { active: [active], complete: 1 });
});
