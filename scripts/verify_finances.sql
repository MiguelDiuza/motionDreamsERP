-- ============================================
-- SCRIPT DE VERIFICACIÓN - FINANZAS
-- Ejecuta esto en tu consola de Neon para diagnosticar problemas
-- ============================================

-- 1. Verificar que la columna paid_date existe
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'expenses' 
AND column_name IN ('is_paid', 'paid_date', 'created_at')
ORDER BY ordinal_position;

-- 2. Ver todos los gastos (últimos 20)
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
LIMIT 20;

-- 3. Ver cuántos gastos pagados hay este mes
SELECT 
    COUNT(*) as pagados_este_mes,
    SUM(amount) as total_pagado
FROM expenses 
WHERE is_paid = TRUE
AND TO_CHAR(COALESCE(paid_date, created_at::date), 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM');

-- 4. Ver gastos pagados por categoría este mes (BUSINESS)
SELECT 
    COUNT(*) as cantidad,
    SUM(amount) as total
FROM expenses 
WHERE category = 'BUSINESS' 
AND is_paid = TRUE
AND TO_CHAR(COALESCE(paid_date, created_at::date), 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM');

-- 5. Ver gastos pagados por categoría este mes (PERSONAL)
SELECT 
    COUNT(*) as cantidad,
    SUM(amount) as total
FROM expenses 
WHERE category = 'PERSONAL' 
AND is_paid = TRUE
AND TO_CHAR(COALESCE(paid_date, created_at::date), 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM');

-- 6. Ver ingresos (payments) este mes
SELECT 
    COUNT(*) as cantidad,
    SUM(amount) as total
FROM payments 
WHERE DATE_TRUNC('month', payment_date) = DATE_TRUNC('month', CURRENT_DATE);

-- 7. Ver gastos pendientes (no pagados)
SELECT 
    COUNT(*) as cantidad,
    SUM(amount) as total
FROM expenses 
WHERE is_paid = FALSE;

-- 8. Test: Actualizar un gasto como pagado (cambia el ID)
-- DESCOMENTA Y EJECUTA PARA PROBAR:
-- UPDATE expenses SET is_paid = TRUE, paid_date = CURRENT_DATE WHERE id = 'TU_ID_AQUI' RETURNING *;

-- 9. Comparar fechas - DEBUG
SELECT 
    CURRENT_DATE as fecha_actual,
    TO_CHAR(CURRENT_DATE, 'YYYY-MM') as mes_actual,
    COUNT(*) as gastos_test
FROM expenses 
WHERE TO_CHAR(COALESCE(paid_date, created_at::date), 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
AND is_paid = TRUE;
