import { query } from '@/lib/db';

/**
 * Applies a CONFIRMED payment to a client's balance: reduces total_debt and, when the
 * account reaches zero, marks their COMPLETED jobs as PAID. Mirrors the behaviour of the
 * UI payments endpoint so confirmed agent payments and manual payments are equivalent.
 */
export async function applyConfirmedPaymentToDebt(clientId: string, amount: number): Promise<void> {
    const clientUpdate = await query(
        'UPDATE clients SET total_debt = GREATEST(0, total_debt - $1), updated_at = NOW() WHERE id = $2 RETURNING total_debt',
        [amount, clientId]
    );

    if (clientUpdate.rows.length > 0 && parseFloat(clientUpdate.rows[0].total_debt) <= 0) {
        await query(
            `UPDATE jobs SET status = 'PAID' WHERE client_id = $1 AND status = 'COMPLETED'`,
            [clientId]
        );
    }
}
