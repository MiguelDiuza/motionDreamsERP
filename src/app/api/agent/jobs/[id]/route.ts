import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAgentToken } from '@/lib/agentAuth';
import { findScheduleConflicts } from '@/lib/scheduleConflict';

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    const unauthorized = requireAgentToken(request);
    if (unauthorized) return unauthorized;

    try {
        const body = await request.json();
        const { status, progress_level, scheduled_at, assigned_to_id, actual_minutes } = body;

        const jobResult = await query(
            'SELECT client_id, price, status, estimated_minutes, assigned_to, scheduled_at FROM jobs WHERE id = $1',
            [params.id]
        );
        if (!jobResult.rowCount || jobResult.rowCount === 0) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }
        const oldJob = jobResult.rows[0];

        const finalStatus = status || oldJob.status;
        const finalAssignedTo = assigned_to_id !== undefined ? assigned_to_id : oldJob.assigned_to;
        const finalScheduledAt = scheduled_at !== undefined ? scheduled_at : oldJob.scheduled_at;

        const schedulingTouched = scheduled_at !== undefined || assigned_to_id !== undefined;
        if (schedulingTouched && finalStatus === 'PENDING' && finalAssignedTo && finalScheduledAt) {
            const conflicts = await findScheduleConflicts({
                assignedTo: finalAssignedTo,
                scheduledAt: finalScheduledAt,
                minutes: oldJob.estimated_minutes || 0,
                excludeJobId: params.id,
            });
            if (conflicts.length > 0) {
                return NextResponse.json({ error: 'Conflicto de horario', conflicts }, { status: 409 });
            }
        }

        let updateQuery = 'UPDATE jobs SET status = COALESCE($1, status)';
        const queryParams: any[] = [status || oldJob.status];
        let paramIndex = 2;

        if (status === 'COMPLETED') {
            updateQuery += `, completion_date = NOW(), progress_level = 3`;
        } else if (status === 'PENDING') {
            updateQuery += `, completion_date = NULL`;
        }

        if (progress_level !== undefined) {
            updateQuery += `, progress_level = $${paramIndex++}`;
            queryParams.push(progress_level);
        }
        if (scheduled_at !== undefined) {
            updateQuery += `, scheduled_at = $${paramIndex++}`;
            queryParams.push(scheduled_at || null);
        }
        if (assigned_to_id !== undefined) {
            updateQuery += `, assigned_to = $${paramIndex++}`;
            queryParams.push(assigned_to_id || null);
        }
        if (actual_minutes !== undefined) {
            updateQuery += `, actual_minutes = $${paramIndex++}`;
            queryParams.push(actual_minutes);
        }

        updateQuery += ` WHERE id = $${paramIndex} RETURNING *`;
        queryParams.push(params.id);

        const result = await query(updateQuery, queryParams);

        if (oldJob.status === 'PENDING' && status === 'COMPLETED') {
            await query('UPDATE clients SET total_debt = total_debt + $1 WHERE id = $2', [oldJob.price, oldJob.client_id]);
            if (actual_minutes !== undefined) {
                await query(
                    'INSERT INTO time_logs (job_id, estimated_minutes, actual_minutes) VALUES ($1, $2, $3)',
                    [params.id, oldJob.estimated_minutes || 0, actual_minutes]
                );
            }
        } else if (oldJob.status === 'COMPLETED' && status === 'PENDING') {
            await query('UPDATE clients SET total_debt = GREATEST(0, total_debt - $1) WHERE id = $2', [oldJob.price, oldJob.client_id]);
        }

        return NextResponse.json(result.rows[0]);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
