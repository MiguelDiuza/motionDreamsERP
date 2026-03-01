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

        // 2. Subtract from client debt
        await query(
            'UPDATE clients SET total_debt = GREATEST(0, total_debt - $1), updated_at = NOW() WHERE id = $2',
            [amount, client_id]
        );

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

        let sql = 'SELECT p.*, c.name as client_name FROM payments p JOIN clients c ON p.client_id = c.id';
        const params = [];

        if (clientId) {
            sql += ' WHERE p.client_id = $1';
            params.push(clientId);
        }

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
