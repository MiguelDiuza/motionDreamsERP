import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAgentToken } from '@/lib/agentAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const unauthorized = requireAgentToken(request);
    if (unauthorized) return unauthorized;

    try {
        const result = await query(
            `SELECT id, name, role, active FROM team_members WHERE active = TRUE
             ORDER BY CASE WHEN role = 'CEO' THEN 0 ELSE 1 END, name`
        );
        return NextResponse.json(result.rows);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
