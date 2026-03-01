import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        // 1. Total Income (Payments)
        const incomeResult = await query(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM payments 
      WHERE DATE_TRUNC('month', payment_date) = DATE_TRUNC('month', CURRENT_DATE)
    `);

        // 2. Business Expenses (Paid)
        const bizResult = await query(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM expenses 
      WHERE category = 'BUSINESS' AND is_paid = TRUE
      AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
    `);

        // 3. Personal Expenses (Paid)
        const personalResult = await query(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM expenses 
      WHERE category = 'PERSONAL' AND is_paid = TRUE
      AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
    `);

        // 4. Pending Expenses (Not paid)
        const pendingResult = await query(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM expenses 
      WHERE is_paid = FALSE
    `);

        const income = parseFloat(incomeResult.rows[0].total);
        const biz = parseFloat(bizResult.rows[0].total);
        const personal = parseFloat(personalResult.rows[0].total);
        const pending = parseFloat(pendingResult.rows[0].total);

        return NextResponse.json({
            incomeMonth: income,
            expensesBusiness: biz,
            expensesPersonal: personal,
            totalExpensesPaid: biz + personal,
            pendingToPay: pending,
            realProfit: income - (biz + personal)
        });
    } catch (error) {
        console.error('Error fetching finance stats:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
