import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Income this month
    const incomeMonthResult = await query(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM payments 
      WHERE DATE_TRUNC('month', payment_date) = DATE_TRUNC('month', CURRENT_DATE)
    `);

    // 2. All-time Income
    const incomeTotalResult = await query(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM payments
    `);

    // 3. Expenses this month
    const expensesMonthResult = await query(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM expenses 
      WHERE is_paid = TRUE 
      AND DATE_TRUNC('month', COALESCE(paid_date, created_at::date)) = DATE_TRUNC('month', CURRENT_DATE)
    `);

    // 4. All-time Expenses
    const expensesTotalResult = await query(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM expenses 
      WHERE is_paid = TRUE
    `);

    // 5. Client Debt
    const debtResult = await query(`
      SELECT COALESCE(SUM(total_debt), 0) as total 
      FROM clients
    `);

    // 6. Active Jobs stats
    const jobsResult = await query(`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(price), 0) as value
      FROM jobs 
      WHERE status = 'PENDING'
    `);

    const response = {
      income_month_cop: parseFloat(incomeMonthResult.rows[0].total),
      income_total_cop: parseFloat(incomeTotalResult.rows[0].total),
      expenses_month_cop: parseFloat(expensesMonthResult.rows[0].total),
      expenses_total_cop: parseFloat(expensesTotalResult.rows[0].total),
      total_client_debt_cop: parseFloat(debtResult.rows[0].total),
      active_pending_jobs_count: parseInt(jobsResult.rows[0].count),
      active_pending_jobs_value_cop: parseFloat(jobsResult.rows[0].value),
      system_date: new Date().toISOString()
    };

    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
