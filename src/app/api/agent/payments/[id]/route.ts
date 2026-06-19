import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAgentToken } from '@/lib/agentAuth';
import { applyConfirmedPaymentToDebt } from '@/lib/payments';

/**
 * PATCH /api/agent/payments/<id>
 * Body: { status: 'CONFIRMED' }  (CEO confirms a pending payment)
 *
 * Confirming a PENDING payment reduces the client's debt and stamps payment_date NOW().
 * Idempotent: confirming an already-confirmed payment does nothing extra.
 */
export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    const unauthorized = requireAgentToken(request);
    if (unauthorized) return unauthorized;

    try {
        const body = await request.json();
        const status = (body.status || '').toUpperCase();

        const existing = await query('SELECT * FROM payments WHERE id = $1', [params.id]);
        if (!existing.rowCount) {
            return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
        }
        const payment = existing.rows[0];

        if (status === 'CONFIRMED') {
            if (payment.status === 'CONFIRMED') {
                return NextResponse.json(payment); // already applied, no-op
            }
            const updated = await query(
                `UPDATE payments SET status = 'CONFIRMED', payment_date = NOW() WHERE id = $1 RETURNING *`,
                [params.id]
            );
            await applyConfirmedPaymentToDebt(payment.client_id, parseFloat(payment.amount));
            return NextResponse.json(updated.rows[0]);
        }

        if (status === 'PENDING') {
            // Reverting a confirmed payment is not supported (would require re-adding debt).
            if (payment.status === 'CONFIRMED') {
                return NextResponse.json(
                    { error: 'Cannot revert a CONFIRMED payment to PENDING' },
                    { status: 409 }
                );
            }
            return NextResponse.json(payment);
        }

        return NextResponse.json({ error: "status must be 'CONFIRMED'" }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
