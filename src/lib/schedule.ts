/**
 * Pure scheduling logic — no DB, no network. Easy to unit-test in isolation.
 *
 * Business timezone is America/Bogota (UTC-5, no DST). We store schedule start
 * times as absolute timestamps (TIMESTAMPTZ) and reason about durations in minutes.
 */

export const BOGOTA_OFFSET_HOURS = -5;
export const WORKDAY_START_HOUR = 9; // 09:00 Bogota
export const WORKDAY_END_HOUR = 18; // 18:00 Bogota

export type ScheduledItem = {
  start: Date;
  minutes: number;
};

export type Block = {
  start: Date;
  end: Date;
};

export type Slot = {
  start: Date;
  end: Date;
  minutes: number;
};

/** End time of a job that starts at `start` and lasts `minutes`. */
export function jobEnd(start: Date, minutes: number): Date {
  return new Date(start.getTime() + Math.max(0, minutes) * 60000);
}

/** True when two time ranges overlap (touching edges do NOT count as overlap). */
export function hasOverlap(a: ScheduledItem, b: ScheduledItem): boolean {
  const aStart = a.start.getTime();
  const aEnd = jobEnd(a.start, a.minutes).getTime();
  const bStart = b.start.getTime();
  const bEnd = jobEnd(b.start, b.minutes).getTime();
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Among `existing` items (already filtered to the relevant person), return those
 * that overlap the candidate. An optional `ignoreIndex`-style exclusion is handled
 * by the caller filtering out the job being edited before calling.
 */
export function findConflicts(candidate: ScheduledItem, existing: ScheduledItem[]): ScheduledItem[] {
  return existing.filter((item) => hasOverlap(candidate, item));
}

/** Convert scheduled items to sorted, merged busy blocks. */
export function getBusyBlocks(items: ScheduledItem[]): Block[] {
  const blocks: Block[] = items
    .filter((i) => i.start instanceof Date && !isNaN(i.start.getTime()))
    .map((i) => ({ start: i.start, end: jobEnd(i.start, i.minutes) }))
    .sort((x, y) => x.start.getTime() - y.start.getTime());

  const merged: Block[] = [];
  for (const b of blocks) {
    const last = merged[merged.length - 1];
    if (last && b.start.getTime() <= last.end.getTime()) {
      if (b.end.getTime() > last.end.getTime()) last.end = b.end;
    } else {
      merged.push({ start: b.start, end: b.end });
    }
  }
  return merged;
}

/**
 * Bogota workday window (as absolute UTC Dates) for a given YYYY-MM-DD date string.
 * Bogota is a fixed UTC-5 offset, so 09:00 local == 14:00 UTC.
 */
export function bogotaWorkdayBounds(
  dateStr: string,
  startHour: number = WORKDAY_START_HOUR,
  endHour: number = WORKDAY_END_HOUR
): Block {
  const [y, m, d] = dateStr.split('-').map((n) => parseInt(n, 10));
  // Local hour H in Bogota == (H - BOGOTA_OFFSET_HOURS) UTC == (H + 5) UTC.
  const start = new Date(Date.UTC(y, m - 1, d, startHour - BOGOTA_OFFSET_HOURS, 0, 0));
  const end = new Date(Date.UTC(y, m - 1, d, endHour - BOGOTA_OFFSET_HOURS, 0, 0));
  return { start, end };
}

/**
 * Free slots within [dayStart, dayEnd] not covered by busy blocks, each at least
 * `minDurationMinutes` long.
 */
export function findFreeSlots(
  busy: ScheduledItem[],
  dayStart: Date,
  dayEnd: Date,
  minDurationMinutes: number = 0
): Slot[] {
  const blocks = getBusyBlocks(busy);
  const slots: Slot[] = [];
  let cursor = dayStart.getTime();
  const limit = dayEnd.getTime();

  for (const block of blocks) {
    const bStart = Math.max(block.start.getTime(), dayStart.getTime());
    const bEnd = Math.min(block.end.getTime(), limit);
    if (bEnd <= cursor) continue; // block entirely before cursor
    if (bStart > cursor) {
      pushSlot(slots, cursor, Math.min(bStart, limit), minDurationMinutes);
    }
    cursor = Math.max(cursor, bEnd);
    if (cursor >= limit) break;
  }
  if (cursor < limit) pushSlot(slots, cursor, limit, minDurationMinutes);
  return slots;
}

function pushSlot(slots: Slot[], startMs: number, endMs: number, minDuration: number): void {
  const minutes = (endMs - startMs) / 60000;
  if (minutes >= minDuration && minutes > 0) {
    slots.push({ start: new Date(startMs), end: new Date(endMs), minutes });
  }
}

/** True when a candidate start+duration fits inside the Bogota workday for its date. */
export function isWithinWorkday(start: Date, minutes: number): boolean {
  const dateStr = bogotaDateString(start);
  const { start: dayStart, end: dayEnd } = bogotaWorkdayBounds(dateStr);
  const end = jobEnd(start, minutes);
  return start.getTime() >= dayStart.getTime() && end.getTime() <= dayEnd.getTime();
}

/** YYYY-MM-DD of a Date in Bogota local time. */
export function bogotaDateString(date: Date): string {
  const local = new Date(date.getTime() + BOGOTA_OFFSET_HOURS * 3600000);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const d = String(local.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
