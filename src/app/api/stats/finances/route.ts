import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        console.log('[GET /api/stats/finances] Fetching finance stats...');
        
        // 1. Total Income (Payments)
        const incomeResult = await query(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM payments 
      WHERE DATE_TRUNC('month', payment_date) = DATE_TRUNC('month', CURRENT_DATE)
    `);

        // 2. Business Expenses (Paid) - Use paid_date when expense is marked paid
        const bizResult = await query(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM expenses 
      WHERE category = 'BUSINESS' AND is_paid = TRUE
      AND TO_CHAR(COALESCE(paid_date, created_at::date), 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
    `);

        // 3. Personal Expenses (Paid) - Use paid_date when expense is marked paid
        const personalResult = await query(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM expenses 
      WHERE category = 'PERSONAL' AND is_paid = TRUE
      AND TO_CHAR(COALESCE(paid_date, created_at::date), 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
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

        const response = {
            incomeMonth: income,
            expensesBusiness: biz,
            expensesPersonal: personal,
            totalExpensesPaid: biz + personal,
            pendingToPay: pending,
            realProfit: income - (biz + personal)
        };

        console.log('[GET /api/stats/finances] Results:', response);
        
        const res = NextResponse.json(response);
        // Prevenir caché - siempre obtener datos frescos
        res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.headers.set('Pragma', 'no-cache');
        res.headers.set('Expires', '0');
        return res;
    } catch (error: any) {
        console.error('[GET /api/stats/finances] Error fetching finance stats:', error);
        return NextResponse.json({ 
            error: 'Internal Server Error',
            details: error.message,
            code: error.code 
        }, { status: 500 });
    }
}
