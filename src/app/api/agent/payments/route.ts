import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAgentToken } from '@/lib/agentAuth';
import { applyConfirmedPaymentToDebt } from '@/lib/payments';

export const dynamic = 'force-dynamic';

const KINDS = ['DEPOSIT', 'FINAL'];
const STATUSES = ['PENDING', 'CONFIRMED'];

export async function GET(request: Request) {
    const unauthorized = requireAgentToken(request);
    if (unauthorized) return unauthorized;

    try {
        const { searchParams } = new URL(request.url);
        const clientId = searchParams.get('client_id');
        const status = searchParams.get('status');

        const params: any[] = [];
        const where: string[] = [];
        if (clientId) { params.push(clientId); where.push(`client_id = $${params.length}`); }
        if (status) { params.push(status.toUpperCase()); where.push(`status = $${params.length}`); }

        const sql =
            `SELECT id, client_id, job_id, amount as amount_cop, kind, status, payment_method,
                    external_ref, payment_date, notes
             FROM payments` +
            (where.length ? ' WHERE ' + where.join(' AND ') : '') +
            ' ORDER BY payment_date DESC';

        const result = await query(sql, params);
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
        const {
            client_id,
            job_id,
            amount_cop,
            kind,
            status,
            payment_method,
            external_ref,
            notes,
        } = body;

        if (!client_id || amount_cop === undefined || amount_cop === null) {
            return NextResponse.json(
                { error: 'Missing required fields: client_id, amount_cop' },
                { status: 400 }
            );
        }
        const amount = parseFloat(amount_cop);
        if (isNaN(amount) || amount <= 0) {
            return NextResponse.json({ error: 'amount_cop must be a positive number' }, { status: 400 });
        }
        if (kind && !KINDS.includes(kind)) {
            return NextResponse.json({ error: `kind must be one of ${KINDS.join(', ')}` }, { status: 400 });
        }
        const finalStatus = (status || 'PENDING').toUpperCase();
        if (!STATUSES.includes(finalStatus)) {
            return NextResponse.json({ error: `status must be one of ${STATUSES.join(', ')}` }, { status: 400 });
        }

        // Idempotency by external_ref.
        if (external_ref) {
            const existing = await query('SELECT * FROM payments WHERE external_ref = $1', [external_ref]);
            if (existing.rowCount && existing.rowCount > 0) {
                return NextResponse.json(existing.rows[0], { status: 200 });
            }
        }

        const inserted = await query(
            `INSERT INTO payments (client_id, job_id, amount, kind, status, payment_method, external_ref, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [
                client_id,
                job_id || null,
                amount,
                kind || null,
                finalStatus,
                payment_method || 'WhatsApp',
                external_ref || null,
                notes || null,
            ]
        );

        // Only confirmed payments touch the balance / income.
        if (finalStatus === 'CONFIRMED') {
            await applyConfirmedPaymentToDebt(client_id, amount);
        }

        return NextResponse.json(inserted.rows[0], { status: 201 });
    } catch (error: any) {
        if (error.code === '23505' && error.constraint && error.constraint.includes('external_ref')) {
            return NextResponse.json({ error: 'Duplicate external_ref' }, { status: 409 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
