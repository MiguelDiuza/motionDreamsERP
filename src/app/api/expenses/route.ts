import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        // Fallback: if is_recurring column doesn't exist yet, run without it
        let result;
        try {
            result = await query('SELECT * FROM expenses ORDER BY is_paid ASC, is_recurring DESC, due_date ASC, created_at DESC');
        } catch {
            result = await query('SELECT * FROM expenses ORDER BY is_paid ASC, due_date ASC, created_at DESC');
        }
        const res = NextResponse.json(result.rows);
        res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.headers.set('Pragma', 'no-cache');
        res.headers.set('Expires', '0');
        return res;
    } catch (error) {
        console.error('Error fetching expenses:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { description, amount, category, due_date, is_recurring = false } = body;

        if (!description || !amount || !category) {
            return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
        }

        let result;
        try {
            // Try inserting with is_recurring (requires migration)
            result = await query(
                'INSERT INTO expenses (description, amount, category, due_date, is_recurring) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                [description, amount, category, due_date, is_recurring]
            );
        } catch (colError: any) {
            // If column doesn't exist yet (pg error 42703), fall back without it
            if (colError?.message?.includes('is_recurring') || colError?.code === '42703') {
                console.warn('⚠️  Column is_recurring not found — run: ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;');
                result = await query(
                    'INSERT INTO expenses (description, amount, category, due_date) VALUES ($1, $2, $3, $4) RETURNING *',
                    [description, amount, category, due_date]
                );
            } else {
                throw colError;
            }
        }

        return NextResponse.json(result.rows[0], { status: 201 });
    } catch (error) {
        console.error('Error creating expense:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// PUT /api/expenses — generates this month's expense copies from recurring templates
export async function PUT() {
    try {
        let templates;
        try {
            templates = await query('SELECT * FROM expenses WHERE is_recurring = TRUE');
        } catch {
            return NextResponse.json({ message: 'Columna is_recurring no existe. Ejecuta la migración SQL.', count: 0 });
        }

        if (templates.rows.length === 0) {
            return NextResponse.json({ message: 'No hay gastos fijos configurados', count: 0 });
        }

        const now = new Date();
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

        let created = 0;
        let skipped = 0;

        for (const template of templates.rows) {
            const existing = await query(
                `SELECT id FROM expenses
                 WHERE description = $1
                   AND category = $2
                   AND is_recurring = FALSE
                   AND due_date >= $3
                   AND due_date <= $4`,
                [template.description, template.category, firstOfMonth, lastOfMonth]
            );

            if (existing.rows.length > 0) {
                skipped++;
                continue;
            }

            await query(
                `INSERT INTO expenses (description, amount, category, due_date, is_recurring)
                 VALUES ($1, $2, $3, $4, FALSE)`,
                [template.description, template.amount, template.category, lastOfMonth]
            );
            created++;
        }

        return NextResponse.json({
            message: `${created} gasto(s) generados para este mes. ${skipped} ya existían.`,
            created,
            skipped
        });
    } catch (error) {
        console.error('Error generating monthly expenses:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
