#!/usr/bin/env node

/**
 * Script de diagnóstico - Conecta a Neon y verifica el estado de finanzas
 */

const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://neondb_owner:npg_cOqQatGeA4C3@ep-empty-wave-aiwbbp7a-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const pool = new Pool({
    connectionString: DATABASE_URL,
});

async function runDiagnostics() {
    console.log('\n=== DIAGNÓSTICO DE FINANZAS - NEON ===\n');
    
    try {
        // Test conexión
        console.log('✓ Conectando a Neon...');
        const connTest = await pool.query('SELECT NOW() as time');
        console.log('✓ Conexión exitosa:', connTest.rows[0]);
        
        // 1. Verificar columnas
        console.log('\n1️⃣  VERIFICANDO ESTRUCTURA DE TABLA EXPENSES');
        const columns = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'expenses' 
            AND column_name IN ('id', 'is_paid', 'paid_date', 'created_at', 'amount', 'category')
            ORDER BY ordinal_position
        `);
        console.table(columns.rows);
        
        // 2. Ver gastos recientes
        console.log('\n2️⃣  ÚLTIMOS 10 GASTOS EN BD');
        const expenses = await pool.query(`
            SELECT 
                id, 
                description, 
                amount, 
                category, 
                is_paid, 
                paid_date, 
                created_at
            FROM expenses 
            ORDER BY created_at DESC 
            LIMIT 10
        `);
        console.table(expenses.rows);
        
        // 3. Gastos pagados este mes
        console.log('\n3️⃣  GASTOS PAGADOS ESTE MES (TOTAL)');
        const paidThisMonth = await pool.query(`
            SELECT 
                COUNT(*) as cantidad,
                COALESCE(SUM(amount), 0) as total,
                array_agg(category) as categorias
            FROM expenses 
            WHERE is_paid = TRUE
            AND TO_CHAR(COALESCE(paid_date, created_at::date), 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
        `);
        console.table(paidThisMonth.rows);
        
        // 4. Desglose por categoría
        console.log('\n4️⃣  GASTOS PAGADOS POR CATEGORÍA ESTE MES');
        const byCategory = await pool.query(`
            SELECT 
                category,
                COUNT(*) as cantidad,
                COALESCE(SUM(amount), 0) as total
            FROM expenses 
            WHERE is_paid = TRUE
            AND TO_CHAR(COALESCE(paid_date, created_at::date), 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
            GROUP BY category
        `);
        console.table(byCategory.rows);
        
        // 5. Ingresos (Payments)
        console.log('\n5️⃣  INGRESOS (PAYMENTS) ESTE MES');
        const incomeThisMonth = await pool.query(`
            SELECT 
                COUNT(*) as cantidad,
                COALESCE(SUM(amount), 0) as total
            FROM payments 
            WHERE DATE_TRUNC('month', payment_date) = DATE_TRUNC('month', CURRENT_DATE)
        `);
        console.table(incomeThisMonth.rows);
        
        // 6. Gastos pendientes
        console.log('\n6️⃣  GASTOS PENDIENTES (NO PAGADOS)');
        const pending = await pool.query(`
            SELECT 
                COUNT(*) as cantidad,
                COALESCE(SUM(amount), 0) as total
            FROM expenses 
            WHERE is_paid = FALSE
        `);
        console.table(pending.rows);
        
        // 7. Simular cálculo de finanzas (igual a la API)
        console.log('\n7️⃣  CÁLCULO FINAL DE FINANZAS (como la API)');
        const incomeRes = await pool.query(`
            SELECT COALESCE(SUM(amount), 0) as total 
            FROM payments 
            WHERE DATE_TRUNC('month', payment_date) = DATE_TRUNC('month', CURRENT_DATE)
        `);
        
        const bizRes = await pool.query(`
            SELECT COALESCE(SUM(amount), 0) as total 
            FROM expenses 
            WHERE category = 'BUSINESS' AND is_paid = TRUE
            AND TO_CHAR(COALESCE(paid_date, created_at::date), 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
        `);
        
        const personalRes = await pool.query(`
            SELECT COALESCE(SUM(amount), 0) as total 
            FROM expenses 
            WHERE category = 'PERSONAL' AND is_paid = TRUE
            AND TO_CHAR(COALESCE(paid_date, created_at::date), 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
        `);
        
        const pendingRes = await pool.query(`
            SELECT COALESCE(SUM(amount), 0) as total 
            FROM expenses 
            WHERE is_paid = FALSE
        `);
        
        const income = parseFloat(incomeRes.rows[0].total);
        const biz = parseFloat(bizRes.rows[0].total);
        const personal = parseFloat(personalRes.rows[0].total);
        const pending_amount = parseFloat(pendingRes.rows[0].total);
        
        const result = {
            'Ingresos (Payments)': `$${income.toLocaleString()}`,
            'Egresos BUSINESS': `$${biz.toLocaleString()}`,
            'Egresos PERSONAL': `$${personal.toLocaleString()}`,
            'Total Egresos': `$${(biz + personal).toLocaleString()}`,
            'Gastos Pendientes': `$${pending_amount.toLocaleString()}`,
            'Utilidad Real': `$${(income - (biz + personal)).toLocaleString()}`
        };
        console.table(result);
        
        console.log('\n✅ DIAGNÓSTICO COMPLETADO\n');
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error('Code:', error.code);
        console.error('Detail:', error.detail);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runDiagnostics();
