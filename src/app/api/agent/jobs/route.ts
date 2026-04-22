import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
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
                j.scheduled_date, 
                j.scheduled_time, 
                j.created_at
            FROM jobs j
            JOIN clients c ON j.client_id = c.id
            WHERE j.status = 'PENDING'
            ORDER BY 
                j.scheduled_date ASC NULLS LAST, 
                j.scheduled_time ASC NULLS LAST,
                j.due_date ASC
        `);
        return NextResponse.json(result.rows);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { client_id, title, description, price_cop, due_date, estimated_minutes } = body;

        if (!client_id || !title || price_cop === undefined) {
            return NextResponse.json({ error: 'Missing required fields: client_id, title, price_cop' }, { status: 400 });
        }

        const result = await query(
            `INSERT INTO jobs (client_id, title, description, price, due_date, estimated_minutes, status) 
             VALUES ($1, $2, $3, $4, $5, $6, 'PENDING') RETURNING *`,
            [client_id, title, description || null, price_cop, due_date || null, estimated_minutes || 0]
        );

        return NextResponse.json(result.rows[0], { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
