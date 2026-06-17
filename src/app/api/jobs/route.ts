import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { findScheduleConflicts } from '@/lib/scheduleConflict';

export async function GET() {
    try {
        const result = await query(`
      SELECT j.*,
             c.name as client_name,
             c.company_name,
             tm.name as assigned_to_name,
             tm.role as assigned_to_role,
             (j.scheduled_at IS NOT NULL) as is_scheduled
      FROM jobs j
      JOIN clients c ON j.client_id = c.id
      LEFT JOIN team_members tm ON j.assigned_to = tm.id
      WHERE j.status = 'PENDING'
         OR (j.status = 'COMPLETED' AND j.completion_date >= NOW() - INTERVAL '7 days')
      ORDER BY
        CASE WHEN j.status = 'PENDING' THEN 0 ELSE 1 END,
        j.scheduled_at ASC NULLS LAST,
        j.due_date ASC,
        j.created_at DESC
    `);
        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Error fetching jobs:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { client_id, title, price, due_date, estimated_minutes, assigned_to, scheduled_at } = body;

        if (!client_id || !title) {
            return NextResponse.json({ error: 'Missing required fields: client_id, title' }, { status: 400 });
        }

        // Guard against double-booking the same person.
        if (assigned_to && scheduled_at) {
            const conflicts = await findScheduleConflicts({
                assignedTo: assigned_to,
                scheduledAt: scheduled_at,
                minutes: estimated_minutes || 0,
            });
            if (conflicts.length > 0) {
                return NextResponse.json(
                    { error: 'Conflicto de horario', conflicts },
                    { status: 409 }
                );
            }
        }

        const result = await query(
            `INSERT INTO jobs (client_id, title, price, due_date, estimated_minutes, assigned_to, scheduled_at, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING') RETURNING *`,
            [client_id, title, price || 0, due_date || null, estimated_minutes || 0, assigned_to || null, scheduled_at || null]
        );

        // Debt is added ONLY when job is marked COMPLETED (handled in PATCH).
        return NextResponse.json(result.rows[0], { status: 201 });
    } catch (error) {
        console.error('Error creating job:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
