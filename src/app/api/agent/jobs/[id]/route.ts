import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const { status, progress_level, scheduled_date, scheduled_time, actual_minutes } = body;

        // 1. Get current job state
        const jobResult = await query('SELECT client_id, price, status, estimated_minutes FROM jobs WHERE id = $1', [params.id]);
        if (!jobResult.rowCount || jobResult.rowCount === 0) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }
        const oldJob = jobResult.rows[0];

        // 2. Update job
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
        
        if (scheduled_date !== undefined) {
            updateQuery += `, scheduled_date = $${paramIndex++}`;
            queryParams.push(scheduled_date || null);
        }

        if (scheduled_time !== undefined) {
            updateQuery += `, scheduled_time = $${paramIndex++}`;
            queryParams.push(scheduled_time || null);
        }

        updateQuery += ` WHERE id = $${paramIndex} RETURNING *`;
        queryParams.push(params.id);

        const result = await query(updateQuery, queryParams);

        // 3. Logic: If transitioning from PENDING to COMPLETED, add to client debt
        if (oldJob.status === 'PENDING' && status === 'COMPLETED') {
            await query('UPDATE clients SET total_debt = total_debt + $1 WHERE id = $2', [oldJob.price, oldJob.client_id]);
            
            // Log time if actual_minutes is provided
            if (actual_minutes !== undefined) {
                await query(
                    'INSERT INTO time_logs (job_id, estimated_minutes, actual_minutes) VALUES ($1, $2, $3)',
                    [params.id, oldJob.estimated_minutes || 0, actual_minutes]
                );
            }
        }
        // If transitioning from COMPLETED back to PENDING, subtract from client debt
        else if (oldJob.status === 'COMPLETED' && status === 'PENDING') {
            await query('UPDATE clients SET total_debt = GREATEST(0, total_debt - $1) WHERE id = $2', [oldJob.price, oldJob.client_id]);
        }

        return NextResponse.json(result.rows[0]);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
