import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function DELETE() {
    try {
        // Delete in FK-safe order: payments and jobs reference clients
        await query('DELETE FROM payments');
        await query('DELETE FROM jobs');
        await query('DELETE FROM expenses');
        await query('DELETE FROM clients');

        return NextResponse.json({ message: 'Base de datos limpiada exitosamente.' });
    } catch (error) {
        console.error('Error clearing database:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
