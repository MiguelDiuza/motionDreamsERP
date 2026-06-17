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

    // 3. Expenses this month (only paid ones) - BOTH BUSINESS AND PERSONAL
    const expensesMonthPoints = await query(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM expenses 
      WHERE is_paid = TRUE 
      AND DATE_TRUNC('month', COALESCE(paid_date, created_at::date)) = DATE_TRUNC('month', CURRENT_DATE)
    `);

    // 4. All-time Expenses (paid ones) - BOTH BUSINESS AND PERSONAL
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

    // 7. Real scheduled workload for the current week (Bogota), per assignee.
    const weekLoadResult = await query(`
      SELECT tm.id, tm.name, tm.role,
             COUNT(j.id) as jobs,
             COALESCE(SUM(j.estimated_minutes), 0) as minutes
      FROM jobs j
      JOIN team_members tm ON j.assigned_to = tm.id
      WHERE j.status = 'PENDING'
        AND j.scheduled_at IS NOT NULL
        AND (j.scheduled_at AT TIME ZONE 'America/Bogota')::date
            >= date_trunc('week', (NOW() AT TIME ZONE 'America/Bogota'))::date
        AND (j.scheduled_at AT TIME ZONE 'America/Bogota')::date
            < (date_trunc('week', (NOW() AT TIME ZONE 'America/Bogota')) + INTERVAL '7 days')::date
      GROUP BY tm.id, tm.name, tm.role
      ORDER BY CASE WHEN tm.role = 'CEO' THEN 0 ELSE 1 END, tm.name
    `);

    const byMember = weekLoadResult.rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      role: r.role,
      jobs: parseInt(r.jobs),
      minutes: parseInt(r.minutes),
    }));
    const scheduledMinutesWeek = byMember.reduce((s, m) => s + m.minutes, 0);

    const response = {
      scheduledThisWeek: { totalMinutes: scheduledMinutesWeek, byMember },
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
