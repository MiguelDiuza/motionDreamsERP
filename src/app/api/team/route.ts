import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const result = await query(
            `SELECT id, name, role, active FROM team_members WHERE active = TRUE
             ORDER BY CASE WHEN role = 'CEO' THEN 0 ELSE 1 END, name`
        );
        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Error fetching team members:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
