import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAgentToken } from '@/lib/agentAuth';
import {
    bogotaWorkdayBounds,
    findFreeSlots,
    findConflicts,
    type ScheduledItem,
} from '@/lib/schedule';

export const dynamic = 'force-dynamic';

/**
 * GET /api/agent/availability?member_id=<uuid>&date=YYYY-MM-DD&duration=<min>&at=<ISO>
 *
 * Returns the busy blocks and free slots for a team member on a given day
 * (Bogota workday 09:00-18:00). If `at` (an ISO start time) is provided, also
 * reports whether that specific slot of length `duration` is free.
 */
export async function GET(request: Request) {
    const unauthorized = requireAgentToken(request);
    if (unauthorized) return unauthorized;

    try {
        const { searchParams } = new URL(request.url);
        const memberId = searchParams.get('member_id');
        const date = searchParams.get('date'); // YYYY-MM-DD (Bogota)
        const duration = parseInt(searchParams.get('duration') || '0', 10) || 0;
        const at = searchParams.get('at'); // optional ISO datetime

        if (!memberId || !date) {
            return NextResponse.json(
                { error: 'Missing required query params: member_id, date' },
                { status: 400 }
            );
        }

        const { start: dayStart, end: dayEnd } = bogotaWorkdayBounds(date);

        // Pending scheduled jobs for this member that fall on this Bogota day.
        const rows = (
            await query(
                `SELECT id, title, scheduled_at, COALESCE(estimated_minutes, 0) AS estimated_minutes
                 FROM jobs
                 WHERE assigned_to = $1
                   AND status = 'PENDING'
                   AND scheduled_at IS NOT NULL
                   AND scheduled_at >= $2 AND scheduled_at < $3
                 ORDER BY scheduled_at ASC`,
                [memberId, dayStart.toISOString(), dayEnd.toISOString()]
            )
        ).rows;

        const items: ScheduledItem[] = rows.map((r) => ({
            start: new Date(r.scheduled_at),
            minutes: r.estimated_minutes || 0,
        }));

        const busy = rows.map((r) => ({
            job_id: r.id,
            title: r.title,
            start: new Date(r.scheduled_at).toISOString(),
            minutes: r.estimated_minutes || 0,
        }));

        const freeSlots = findFreeSlots(items, dayStart, dayEnd, duration).map((s) => ({
            start: s.start.toISOString(),
            end: s.end.toISOString(),
            minutes: s.minutes,
        }));

        const response: any = {
            member_id: memberId,
            date,
            workday: { start: dayStart.toISOString(), end: dayEnd.toISOString() },
            busy,
            free_slots: freeSlots,
        };

        if (at) {
            const candidate: ScheduledItem = { start: new Date(at), minutes: duration };
            const conflicts = findConflicts(candidate, items);
            response.requested_slot = { at, duration };
            response.is_available = conflicts.length === 0;
        }

        return NextResponse.json(response);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
