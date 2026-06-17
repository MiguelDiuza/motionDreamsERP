import { query } from '@/lib/db';
import { findConflicts, type ScheduledItem } from '@/lib/schedule';

export type Conflict = {
  id: string;
  title: string;
  scheduled_at: string;
  estimated_minutes: number;
};

/**
 * Returns active (PENDING) jobs assigned to the same person whose scheduled time
 * overlaps the candidate slot. `excludeJobId` skips the job being edited.
 *
 * No conflict check is possible (returns []) unless both an assignee and a start
 * time are provided.
 */
export async function findScheduleConflicts(params: {
  assignedTo: string | null | undefined;
  scheduledAt: string | Date | null | undefined;
  minutes: number;
  excludeJobId?: string;
}): Promise<Conflict[]> {
  const { assignedTo, scheduledAt, minutes, excludeJobId } = params;
  if (!assignedTo || !scheduledAt) return [];

  const candidateStart = scheduledAt instanceof Date ? scheduledAt : new Date(scheduledAt);
  if (isNaN(candidateStart.getTime())) return [];

  const rows = (
    await query(
      `SELECT id, title, scheduled_at, COALESCE(estimated_minutes, 0) AS estimated_minutes
       FROM jobs
       WHERE assigned_to = $1
         AND scheduled_at IS NOT NULL
         AND status = 'PENDING'
         AND ($2::uuid IS NULL OR id <> $2)`,
      [assignedTo, excludeJobId || null]
    )
  ).rows as Conflict[];

  const candidate: ScheduledItem = { start: candidateStart, minutes: minutes || 0 };
  const existing: ScheduledItem[] = rows.map((r) => ({
    start: new Date(r.scheduled_at),
    minutes: r.estimated_minutes || 0,
  }));

  const overlapping = findConflicts(candidate, existing);
  const overlapStarts = new Set(overlapping.map((o) => o.start.getTime()));
  return rows.filter((r) => overlapStarts.has(new Date(r.scheduled_at).getTime()));
}
