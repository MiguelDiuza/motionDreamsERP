import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    console.log('[GET /api/stats/finances] Fetching finance stats...');

    // 1. Monthly Income (Payments this month)
    const incomeMonthResult = await query(`
            SELECT COALESCE(SUM(amount), 0) as total 
            FROM payments 
            WHERE DATE_TRUNC('month', payment_date) = DATE_TRUNC('month', CURRENT_DATE)
        `);

    // 2. All-Time Income
    const incomeTotalResult = await query(`
            SELECT COALESCE(SUM(amount), 0) as total 
            FROM payments
        `);

    // 3. Monthly Business Expenses (Paid this month)
    const bizMonthResult = await query(`
            SELECT COALESCE(SUM(amount), 0) as total 
            FROM expenses 
            WHERE category = 'BUSINESS' AND is_paid = TRUE
            AND DATE_TRUNC('month', COALESCE(paid_date, created_at::date)) = DATE_TRUNC('month', CURRENT_DATE)
        `);

    // 4. All-Time Business Expenses (Paid)
    const bizTotalResult = await query(`
            SELECT COALESCE(SUM(amount), 0) as total 
            FROM expenses 
            WHERE category = 'BUSINESS' AND is_paid = TRUE
        `);

    // 5. Monthly Personal Expenses (Paid this month)
    const personalMonthResult = await query(`
            SELECT COALESCE(SUM(amount), 0) as total 
            FROM expenses 
            WHERE category = 'PERSONAL' AND is_paid = TRUE
            AND DATE_TRUNC('month', COALESCE(paid_date, created_at::date)) = DATE_TRUNC('month', CURRENT_DATE)
        `);

    // 6. All-Time Personal Expenses (Paid)
    const personalTotalResult = await query(`
            SELECT COALESCE(SUM(amount), 0) as total 
            FROM expenses 
            WHERE category = 'PERSONAL' AND is_paid = TRUE
        `);

    // 7. Pending Expenses (Not paid - All time)
    const pendingResult = await query(`
            SELECT COALESCE(SUM(amount), 0) as total 
            FROM expenses 
            WHERE is_paid = FALSE
        `);

    const incomeMonth = parseFloat(incomeMonthResult.rows[0].total);
    const incomeTotal = parseFloat(incomeTotalResult.rows[0].total);

    const bizMonth = parseFloat(bizMonthResult.rows[0].total);
    const bizTotal = parseFloat(bizTotalResult.rows[0].total);

    const personalMonth = parseFloat(personalMonthResult.rows[0].total);
    const personalTotal = parseFloat(personalTotalResult.rows[0].total);

    const pending = parseFloat(pendingResult.rows[0].total);

    const response = {
      // Monthly stats
      incomeMonth: incomeMonth,
      expensesBusinessMonth: bizMonth,
      expensesPersonalMonth: personalMonth,
      totalExpensesPaidMonth: bizMonth + personalMonth,
      realProfitMonth: incomeMonth - (bizMonth + personalMonth),

      // All-time stats (The "Ingresos Totales" user requested)
      incomeTotal: incomeTotal,
      expensesBusinessTotal: bizTotal,
      expensesPersonalTotal: personalTotal,
      totalExpensesPaidTotal: bizTotal + personalTotal,
      realProfitTotal: incomeTotal - (bizTotal + personalTotal),

      // Backward compatibility / Legacy fields
      expensesBusiness: bizMonth, // Kept for UI that uses this name
      expensesPersonal: personalMonth,
      totalExpensesPaid: bizMonth + personalMonth,
      pendingToPay: pending,
      realProfit: incomeMonth - (bizMonth + personalMonth)
    };

    console.log('[GET /api/stats/finances] Results:', response);

    const res = NextResponse.json(response);
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
