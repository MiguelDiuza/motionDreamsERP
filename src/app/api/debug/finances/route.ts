import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        // Test 1: Simple connection test
        const connTest = await query('SELECT NOW() as time');
        
        // Test 2: Get all expenses
        const allExpenses = await query('SELECT id, description, amount, category, is_paid, paid_date, created_at FROM expenses LIMIT 5');
        
        // Test 3: Get paid expenses this month
        const paidThisMonth = await query(`
            SELECT 
                id, 
                description, 
                amount, 
                category, 
                is_paid, 
                paid_date, 
                created_at,
                TO_CHAR(COALESCE(paid_date, created_at::date), 'YYYY-MM') as month_check,
                TO_CHAR(CURRENT_DATE, 'YYYY-MM') as current_month
            FROM expenses 
            WHERE is_paid = TRUE
            AND TO_CHAR(COALESCE(paid_date, created_at::date), 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
            LIMIT 10
        `);
        
        // Test 4: Get stats the same way the finances endpoint does
        const bizResult = await query(`
            SELECT COALESCE(SUM(amount), 0) as total 
            FROM expenses 
            WHERE category = 'BUSINESS' AND is_paid = TRUE
            AND TO_CHAR(COALESCE(paid_date, created_at::date), 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
        `);
        
        const personalResult = await query(`
            SELECT COALESCE(SUM(amount), 0) as total 
            FROM expenses 
            WHERE category = 'PERSONAL' AND is_paid = TRUE
            AND TO_CHAR(COALESCE(paid_date, created_at::date), 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
        `);
        
        // Test 5: Get all paid expenses (regardless of month)
        const allPaid = await query(`
            SELECT COALESCE(SUM(amount), 0) as total 
            FROM expenses 
            WHERE is_paid = TRUE
        `);
        
        // Test 6: Get payments (income)
        const incomeResult = await query(`
            SELECT COALESCE(SUM(amount), 0) as total 
            FROM payments 
            WHERE DATE_TRUNC('month', payment_date) = DATE_TRUNC('month', CURRENT_DATE)
        `);

        return NextResponse.json({
            status: 'ok',
            timestamp: connTest.rows[0],
            allExpensesCount: allExpenses.rowCount,
            allExpensesData: allExpenses.rows,
            paidThisMonthCount: paidThisMonth.rowCount,
            paidThisMonthData: paidThisMonth.rows,
            stats: {
                businessPaidThisMonth: parseFloat(bizResult.rows[0].total),
                personalPaidThisMonth: parseFloat(personalResult.rows[0].total),
                allPaidTotal: parseFloat(allPaid.rows[0].total),
                incomeThisMonth: parseFloat(incomeResult.rows[0].total)
            },
            currentDate: new Date().toISOString(),
            currentMonth: new Date().toLocaleString('es-CO', { month: '2-digit', year: 'numeric' })
        });
    } catch (error: any) {
        console.error('Debug error:', error);
        return NextResponse.json({ 
            status: 'error',
            message: error.message,
            code: error.code,
            detail: error.detail
        }, { status: 500 });
    }
}
