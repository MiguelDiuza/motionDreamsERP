import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  jobEnd,
  hasOverlap,
  findConflicts,
  getBusyBlocks,
  bogotaWorkdayBounds,
  findFreeSlots,
  isWithinWorkday,
  bogotaDateString,
} from '../src/lib/schedule.ts';

const at = (iso: string) => new Date(iso);

test('jobEnd adds duration in minutes', () => {
  assert.equal(jobEnd(at('2026-06-17T14:00:00Z'), 90).toISOString(), '2026-06-17T15:30:00.000Z');
});

test('hasOverlap: partial overlap', () => {
  assert.equal(
    hasOverlap({ start: at('2026-06-17T14:00:00Z'), minutes: 60 }, { start: at('2026-06-17T14:30:00Z'), minutes: 60 }),
    true
  );
});

test('hasOverlap: containment', () => {
  assert.equal(
    hasOverlap({ start: at('2026-06-17T14:00:00Z'), minutes: 180 }, { start: at('2026-06-17T15:00:00Z'), minutes: 30 }),
    true
  );
});

test('hasOverlap: adjacent edges do NOT overlap', () => {
  assert.equal(
    hasOverlap({ start: at('2026-06-17T14:00:00Z'), minutes: 60 }, { start: at('2026-06-17T15:00:00Z'), minutes: 60 }),
    false
  );
});

test('hasOverlap: separate ranges', () => {
  assert.equal(
    hasOverlap({ start: at('2026-06-17T14:00:00Z'), minutes: 30 }, { start: at('2026-06-17T16:00:00Z'), minutes: 30 }),
    false
  );
});

test('findConflicts returns overlapping items only', () => {
  const existing = [
    { start: at('2026-06-17T14:00:00Z'), minutes: 60 }, // 14:00-15:00 -> conflicts
    { start: at('2026-06-17T16:00:00Z'), minutes: 60 }, // 16:00-17:00 -> no
  ];
  const conflicts = findConflicts({ start: at('2026-06-17T14:30:00Z'), minutes: 60 }, existing);
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].start.toISOString(), '2026-06-17T14:00:00.000Z');
});

test('getBusyBlocks sorts and merges overlapping blocks', () => {
  const blocks = getBusyBlocks([
    { start: at('2026-06-17T16:00:00Z'), minutes: 60 },
    { start: at('2026-06-17T14:00:00Z'), minutes: 60 },
    { start: at('2026-06-17T14:30:00Z'), minutes: 60 }, // merges with 14:00-15:00 -> 14:00-15:30
  ]);
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].start.toISOString(), '2026-06-17T14:00:00.000Z');
  assert.equal(blocks[0].end.toISOString(), '2026-06-17T15:30:00.000Z');
});

test('bogotaWorkdayBounds maps 09:00-18:00 Bogota to 14:00-23:00 UTC', () => {
  const { start, end } = bogotaWorkdayBounds('2026-06-17');
  assert.equal(start.toISOString(), '2026-06-17T14:00:00.000Z');
  assert.equal(end.toISOString(), '2026-06-17T23:00:00.000Z');
});

test('findFreeSlots: empty day returns whole workday', () => {
  const { start, end } = bogotaWorkdayBounds('2026-06-17');
  const slots = findFreeSlots([], start, end);
  assert.equal(slots.length, 1);
  assert.equal(slots[0].minutes, 540); // 9 hours
});

test('findFreeSlots: gap before and after a busy block', () => {
  const { start, end } = bogotaWorkdayBounds('2026-06-17');
  // Busy 12:00-13:00 Bogota == 17:00-18:00 UTC
  const slots = findFreeSlots([{ start: at('2026-06-17T17:00:00Z'), minutes: 60 }], start, end);
  assert.equal(slots.length, 2);
  assert.equal(slots[0].start.toISOString(), '2026-06-17T14:00:00.000Z'); // 09:00
  assert.equal(slots[0].end.toISOString(), '2026-06-17T17:00:00.000Z'); // 12:00
  assert.equal(slots[1].start.toISOString(), '2026-06-17T18:00:00.000Z'); // 13:00
});

test('findFreeSlots respects minimum duration', () => {
  const { start, end } = bogotaWorkdayBounds('2026-06-17');
  // Busy 09:00-17:30 Bogota leaves only a 30-min tail; require 60 -> no slots
  const slots = findFreeSlots([{ start, minutes: 510 }], start, end, 60);
  assert.equal(slots.length, 0);
});

test('isWithinWorkday: inside and outside', () => {
  // 10:00 Bogota = 15:00 UTC, 60 min -> inside
  assert.equal(isWithinWorkday(at('2026-06-17T15:00:00Z'), 60), true);
  // 17:30 Bogota = 22:30 UTC, 60 min -> ends 18:30, outside
  assert.equal(isWithinWorkday(at('2026-06-17T22:30:00Z'), 60), false);
});

test('bogotaDateString returns local date even across UTC midnight', () => {
  // 2026-06-18T02:00:00Z == 2026-06-17 21:00 Bogota
  assert.equal(bogotaDateString(at('2026-06-18T02:00:00Z')), '2026-06-17');
});
