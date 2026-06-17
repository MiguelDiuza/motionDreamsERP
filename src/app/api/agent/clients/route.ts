import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAgentToken } from '@/lib/agentAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const unauthorized = requireAgentToken(request);
    if (unauthorized) return unauthorized;

    try {
        const result = await query(`
            SELECT
                id,
                name,
                company_name,
                phone,
                total_debt as total_debt_cop,
                created_at
            FROM clients
            ORDER BY total_debt DESC, name ASC
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
        const { name, company_name, phone } = body;

        if (!name) {
            return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 });
        }

        // De-dupe by phone when provided, to avoid agents creating duplicates.
        if (phone) {
            const existing = await query('SELECT * FROM clients WHERE phone = $1 LIMIT 1', [phone]);
            if (existing.rowCount && existing.rowCount > 0) {
                return NextResponse.json(existing.rows[0], { status: 200 });
            }
        }

        const result = await query(
            'INSERT INTO clients (name, company_name, phone) VALUES ($1, $2, $3) RETURNING *',
            [name, company_name || null, phone || null]
        );
        return NextResponse.json(result.rows[0], { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
