import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const { is_paid } = body;

        let updateQuery = 'UPDATE expenses SET is_paid = $1';
        if (is_paid) {
            updateQuery += ', paid_date = NOW()';
        } else {
            updateQuery += ', paid_date = NULL';
        }
        updateQuery += ' WHERE id = $2 RETURNING *';

        const result = await query(updateQuery, [is_paid, params.id]);

        if (result.rowCount === 0) {
            return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
        }

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating expense status:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await query('DELETE FROM expenses WHERE id = $1', [params.id]);
        return NextResponse.json({ message: 'Expense deleted successfully' });
    } catch (error) {
        console.error('Error deleting expense:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
