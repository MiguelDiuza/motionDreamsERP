import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const { amount, action } = body; // action: 'add_charge' | 'add_payment'

        // In a production app, you would use a transaction and also log to jobs or payments table
        let updateQuery = '';
        if (action === 'add_charge') {
            updateQuery = 'UPDATE clients SET total_debt = total_debt + $1, updated_at = NOW() WHERE id = $2 RETURNING *';
        } else if (action === 'add_payment') {
            updateQuery = 'UPDATE clients SET total_debt = GREATEST(0, total_debt - $1), updated_at = NOW() WHERE id = $2 RETURNING *';
        } else {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        const result = await query(updateQuery, [amount, params.id]);

        if (result.rowCount === 0) {
            return NextResponse.json({ error: 'Client not found' }, { status: 404 });
        }

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating client balance:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await query('DELETE FROM clients WHERE id = $1', [params.id]);
        return NextResponse.json({ message: 'Client deleted successfully' });
    } catch (error) {
        console.error('Error deleting client:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
