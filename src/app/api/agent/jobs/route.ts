import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAgentToken } from '@/lib/agentAuth';
import { findScheduleConflicts } from '@/lib/scheduleConflict';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const unauthorized = requireAgentToken(request);
    if (unauthorized) return unauthorized;

    try {
        const result = await query(`
            SELECT
                j.id,
                j.client_id,
                c.name as client_name,
                j.title,
                j.description,
                j.price as price_cop,
                j.due_date,
                j.status,
                j.completion_date,
                j.progress_level,
                j.estimated_minutes,
                j.actual_minutes,
                j.scheduled_at,
                (j.scheduled_at IS NOT NULL) as is_scheduled,
                j.assigned_to,
                tm.name as assigned_to_name,
                tm.role as assigned_to_role,
                j.source,
                j.external_ref,
                j.created_at
            FROM jobs j
            JOIN clients c ON j.client_id = c.id
            LEFT JOIN team_members tm ON j.assigned_to = tm.id
            WHERE j.status = 'PENDING'
            ORDER BY j.scheduled_at ASC NULLS LAST, j.due_date ASC
        `);
        return NextResponse.json(result.rows);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const unauthorized = requireAgentToken(request);
    if (unauthorized) return unauthorized;

    try {
        const body = await request.json();
        const {
            client_id,
            title,
            description,
            price_cop,
            due_date,
            estimated_minutes,
            assigned_to_id,
            scheduled_at,
            external_ref,
            source,
        } = body;

        if (!client_id || !title) {
            return NextResponse.json(
                { error: 'Missing required fields: client_id, title' },
                { status: 400 }
            );
        }

        // Idempotency: if a job with this external_ref already exists, return it.
        if (external_ref) {
            const existing = await query('SELECT * FROM jobs WHERE external_ref = $1', [external_ref]);
            if (existing.rowCount && existing.rowCount > 0) {
                return NextResponse.json(existing.rows[0], { status: 200 });
            }
        }

        // Conflict guard when both assignee and time are given.
        if (assigned_to_id && scheduled_at) {
            const conflicts = await findScheduleConflicts({
                assignedTo: assigned_to_id,
                scheduledAt: scheduled_at,
                minutes: estimated_minutes || 0,
            });
            if (conflicts.length > 0) {
                return NextResponse.json({ error: 'Conflicto de horario', conflicts }, { status: 409 });
            }
        }

        const result = await query(
            `INSERT INTO jobs (client_id, title, description, price, due_date, estimated_minutes,
                               assigned_to, scheduled_at, external_ref, source, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PENDING') RETURNING *`,
            [
                client_id,
                title,
                description || null,
                price_cop || 0,
                due_date || null,
                estimated_minutes || 0,
                assigned_to_id || null,
                scheduled_at || null,
                external_ref || null,
                source || 'WHATSAPP',
            ]
        );

        return NextResponse.json(result.rows[0], { status: 201 });
    } catch (error: any) {
        // Unique violation on external_ref (race) -> the job already exists.
        if (error.code === '23505' && error.constraint && error.constraint.includes('external_ref')) {
            return NextResponse.json({ error: 'Duplicate external_ref' }, { status: 409 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
