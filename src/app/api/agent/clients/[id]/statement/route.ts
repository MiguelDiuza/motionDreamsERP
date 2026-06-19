import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAgentToken } from '@/lib/agentAuth';
import { buildAccountStatementPdf } from '@/lib/serverStatementPdf';

export const dynamic = 'force-dynamic';

/**
 * GET /api/agent/clients/<id>/statement
 * Returns the client's account-statement PDF (application/pdf) so the agent can send it
 * over WhatsApp. Uses the authoritative current balance and only CONFIRMED payments.
 */
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const unauthorized = requireAgentToken(request);
    if (unauthorized) return unauthorized;

    try {
        const clientRes = await query('SELECT id, name, company_name, total_debt FROM clients WHERE id = $1', [params.id]);
        if (!clientRes.rowCount) {
            return NextResponse.json({ error: 'Client not found' }, { status: 404 });
        }
        const client = clientRes.rows[0];

        const jobsRes = await query(
            `SELECT title, price, status, due_date, completion_date, created_at
             FROM jobs WHERE client_id = $1 ORDER BY created_at ASC`,
            [params.id]
        );
        const paymentsRes = await query(
            `SELECT amount, payment_method, payment_date
             FROM payments WHERE client_id = $1 AND status = 'CONFIRMED' ORDER BY payment_date ASC`,
            [params.id]
        );

        const pdf = buildAccountStatementPdf(
            { name: client.name, company_name: client.company_name },
            parseFloat(client.total_debt || 0),
            jobsRes.rows,
            paymentsRes.rows
        );

        const safeName = (client.name || 'cliente').replace(/[^a-z0-9]+/gi, '_');
        return new NextResponse(pdf as any, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="Estado_Cuenta_${safeName}.pdf"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
