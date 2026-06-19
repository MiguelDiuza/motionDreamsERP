import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { client_id, amount, payment_method, notes } = body;

        // 1. Record the payment
        const paymentResult = await query(
            'INSERT INTO payments (client_id, amount, payment_method, notes) VALUES ($1, $2, $3, $4) RETURNING *',
            [client_id, amount, payment_method, notes]
        );

        // 2. Subtract from client debt and check new balance
        const clientUpdate = await query(
            'UPDATE clients SET total_debt = GREATEST(0, total_debt - $1), updated_at = NOW() WHERE id = $2 RETURNING total_debt',
            [amount, client_id]
        );

        // 3. Mark completed jobs as PAID if account is fully settled
        if (clientUpdate.rows.length > 0 && parseFloat(clientUpdate.rows[0].total_debt) <= 0) {
            await query(
                `UPDATE jobs SET status = 'PAID' WHERE client_id = $1 AND status = 'COMPLETED'`,
                [client_id]
            );
        }

        return NextResponse.json(paymentResult.rows[0], { status: 201 });
    } catch (error) {
        console.error('Error recording payment:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const clientId = searchParams.get('client_id');
        // Default to confirmed payments only so finance/income views never include
        // unconfirmed (PENDING) agent payments. Pass ?status=all or ?status=PENDING to override.
        const status = (searchParams.get('status') || 'CONFIRMED').toUpperCase();

        let sql = 'SELECT p.*, COALESCE(c.name, \'Cliente Eliminado\') as client_name FROM payments p LEFT JOIN clients c ON p.client_id = c.id';
        const params: any[] = [];
        const where: string[] = [];

        if (clientId) {
            params.push(clientId);
            where.push(`p.client_id = $${params.length}`);
        }
        if (status !== 'ALL') {
            params.push(status);
            where.push(`p.status = $${params.length}`);
        }
        if (where.length) sql += ' WHERE ' + where.join(' AND ');

        sql += ' ORDER BY p.payment_date DESC';

        const result = await query(sql, params);
        const res = NextResponse.json(result.rows);
        res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.headers.set('Pragma', 'no-cache');
        res.headers.set('Expires', '0');
        return res;
    } catch (error) {
        console.error('Error fetching payments:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
