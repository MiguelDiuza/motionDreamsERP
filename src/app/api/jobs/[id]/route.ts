import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const { status } = body; // 'PENDING' | 'COMPLETED'

        // 1. Get current job state to check for transition
        const jobResult = await query('SELECT client_id, price, status FROM jobs WHERE id = $1', [params.id]);
        if (!jobResult.rowCount || jobResult.rowCount === 0) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }
        const oldJob = jobResult.rows[0];

        // 2. Update job
        let updateQuery = 'UPDATE jobs SET status = $1';
        if (status === 'COMPLETED') {
            updateQuery += ', completion_date = NOW()';
        } else {
            updateQuery += ', completion_date = NULL';
        }
        updateQuery += ' WHERE id = $2 RETURNING *';

        const result = await query(updateQuery, [status, params.id]);

        // 3. Logic: If transitioning from PENDING to COMPLETED, add to client debt
        if (oldJob.status === 'PENDING' && status === 'COMPLETED') {
            await query('UPDATE clients SET total_debt = total_debt + $1 WHERE id = $2', [oldJob.price, oldJob.client_id]);
        }
        // If transitioning from COMPLETED back to PENDING, subtract from client debt
        else if (oldJob.status === 'COMPLETED' && status === 'PENDING') {
            await query('UPDATE clients SET total_debt = GREATEST(0, total_debt - $1) WHERE id = $2', [oldJob.price, oldJob.client_id]);
        }

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating job status:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const jobResult = await query('SELECT client_id, price, status FROM jobs WHERE id = $1', [params.id]);

        if (jobResult.rowCount && jobResult.rowCount > 0) {
            const job = jobResult.rows[0];
            // If the job was COMPLETED, it was added to the debt. Deleting means we must remove it.
            if (job.status === 'COMPLETED') {
                await query('UPDATE clients SET total_debt = GREATEST(0, total_debt - $1) WHERE id = $2', [job.price, job.client_id]);
            }
        }

        await query('DELETE FROM jobs WHERE id = $1', [params.id]);
        return NextResponse.json({ message: 'Job deleted successfully' });
    } catch (error) {
        console.error('Error deleting job:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
