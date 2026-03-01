import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        const result = await query('SELECT * FROM clients ORDER BY total_debt DESC, created_at DESC');
        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Error fetching clients:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, company_name, phone } = body;

        const result = await query(
            'INSERT INTO clients (name, company_name, phone) VALUES ($1, $2, $3) RETURNING *',
            [name, company_name, phone]
        );

        return NextResponse.json(result.rows[0], { status: 201 });
    } catch (error) {
        console.error('Error creating client:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
