import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/clients/[id]/jobs — returns all jobs for a specific client
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const result = await query(
            `SELECT id, title, price, status, due_date, completion_date, created_at
             FROM jobs
             WHERE client_id = $1
             ORDER BY
               CASE WHEN status = 'PENDING' THEN 0 ELSE 1 END,
               created_at DESC`,
            [params.id]
        );
        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Error fetching client jobs:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
