import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const { is_paid } = body;

        console.log(`[PATCH /api/expenses/${params.id}] Updating expense:`, { id: params.id, is_paid, newValue: !is_paid });

        let updateQuery = 'UPDATE expenses SET is_paid = $1';
        if (is_paid) {
            updateQuery += ', paid_date = CURRENT_DATE';
            console.log('[PATCH /api/expenses] Setting paid_date to CURRENT_DATE');
        } else {
            updateQuery += ', paid_date = NULL';
            console.log('[PATCH /api/expenses] Clearing paid_date');
        }
        updateQuery += ' WHERE id = $2 RETURNING *';

        const result = await query(updateQuery, [is_paid, params.id]);

        if (result.rowCount === 0) {
            console.error(`[PATCH /api/expenses] Expense not found: ${params.id}`);
            return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
        }

        const updatedExpense = result.rows[0];
        console.log('[PATCH /api/expenses] Successfully updated:', { 
            id: updatedExpense.id, 
            is_paid: updatedExpense.is_paid, 
            paid_date: updatedExpense.paid_date 
        });

        return NextResponse.json(updatedExpense);
    } catch (error: any) {
        console.error('[PATCH /api/expenses] Error updating expense status:', error);
        return NextResponse.json({ 
            error: 'Internal Server Error',
            details: error.message,
            code: error.code
        }, { status: 500 });
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
