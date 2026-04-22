import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
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
