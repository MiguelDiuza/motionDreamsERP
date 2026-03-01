import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        const result = await query(`
      SELECT j.*, c.name as client_name, c.company_name 
      FROM jobs j
      JOIN clients c ON j.client_id = c.id
      ORDER BY 
        CASE WHEN j.status = 'PENDING' THEN 0 ELSE 1 END,
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
        const { client_id, title, price, due_date } = body;

        const result = await query(
            'INSERT INTO jobs (client_id, title, price, due_date, status) VALUES ($1, $2, $3, $4, \'PENDING\') RETURNING *',
            [client_id, title, price, due_date]
        );

        // User requested that debt is added ONLY when job is marked as COMPLETED.
        // So we do nothing to the client table here.

        return NextResponse.json(result.rows[0], { status: 201 });
    } catch (error) {
        console.error('Error creating job:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
