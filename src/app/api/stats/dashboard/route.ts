import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // 1. Income this month (from payments table)
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

    // 3. Expenses this month (only paid ones)
    const expensesMonthPoints = await query(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM expenses 
      WHERE is_paid = TRUE 
      AND DATE_TRUNC('month', COALESCE(paid_date, created_at::date)) = DATE_TRUNC('month', CURRENT_DATE)
    `);

    // 4. All-time Expenses (paid ones)
    const expensesTotalResult = await query(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM expenses 
      WHERE is_paid = TRUE
    `);

    // 5. Client Debt (Total account receivable)
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
      incomeMonth: parseFloat(incomeMonthResult.rows[0].total),
      incomeTotal: parseFloat(incomeTotalResult.rows[0].total),
      expensesMonth: parseFloat(expensesMonthPoints.rows[0].total),
      expensesTotal: parseFloat(expensesTotalResult.rows[0].total),
      clientDebt: parseFloat(debtResult.rows[0].total),
      activeJobsCount: parseInt(jobsResult.rows[0].count),
      activeJobsValue: parseFloat(jobsResult.rows[0].value)
    };

    const res = NextResponse.json(response);
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.headers.set('Pragma', 'no-cache');
    res.headers.set('Expires', '0');
    return res;
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
