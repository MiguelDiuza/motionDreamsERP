'use client';

import React, { useState, useEffect, useRef } from 'react';
import GlassCard from '@/components/ui/GlassCard';
import Modal from '@/components/ui/Modal';
import NumericInput from '@/components/ui/NumericInput';
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Plus,
    X,
    CheckCircle2,
    AlertCircle,
    FileText,
    Calendar,
    Briefcase,
    User,
    Trash2,
    Clock,
    Repeat,
    RefreshCw,
    Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { generateAccountStatementPDF, generateMonthlyReportPDF } from '@/lib/pdfGenerator';

export default function FinancesPage() {
    const [expenses, setExpenses] = useState<any[]>([]);
    const [stats, setStats] = useState({
        incomeMonth: 0,
        incomeTotal: 0,
        expensesBusinessMonth: 0,
        expensesPersonalMonth: 0,
        totalExpensesPaidMonth: 0,
        realProfitMonth: 0,
        totalExpensesPaidTotal: 0,
        realProfitTotal: 0,
        pendingToPay: 0,
        // Legacy/Backward compatibility fields
        expensesBusiness: 0,
        expensesPersonal: 0,
        totalExpensesPaid: 0,
        realProfit: 0
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeTab, setActiveTab] = useState<'ALL' | 'BUSINESS' | 'PERSONAL' | 'RECURRING'>('ALL');
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastUpdateRef = useRef<number>(0);

    const [newExpense, setNewExpense] = useState({
        description: '',
        amount: '',
        category: 'BUSINESS',
        due_date: new Date().toISOString().split('T')[0],
        is_recurring: false
    });

    const fetchFinances = async (skipLoading: boolean = false) => {
        try {
            if (!skipLoading) {
                setIsLoading(true);
            }

            console.log('[FinancesPage] Fetching data...');

            const [expensesRes, statsRes] = await Promise.all([
                fetch(`/api/expenses?t=${Date.now()}`, { cache: 'no-store' }),
                fetch(`/api/stats/finances?t=${Date.now()}`, { cache: 'no-store' })
            ]);

            if (!expensesRes.ok || !statsRes.ok) {
                throw new Error(`API error: expenses=${expensesRes.status}, stats=${statsRes.status}`);
            }

            const expensesData = await expensesRes.json();
            const statsData = await statsRes.json();

            console.log('[FinancesPage] Data received:', { expenses: expensesData?.length, stats: statsData });

            if (Array.isArray(expensesData)) {
                setExpenses(expensesData);
            } else {
                console.error('API did not return an array for expenses:', expensesData);
                setExpenses([]);
            }

            if (statsData && !statsData.error) {
                setStats(statsData);
                lastUpdateRef.current = Date.now();
            } else if (statsData?.error) {
                console.error('Stats API error:', statsData.error);
            }
        } catch (error: any) {
            console.error('[FinancesPage] Fetch error:', error);
            toast.error(`Error al sincronizar finanzas: ${error.message}`);
        } finally {
            if (!skipLoading) {
                setIsLoading(false);
            }
        }
    };

    // Initial load and auto-refresh setup
    useEffect(() => {
        fetchFinances();

        // Auto-refresh every 3 seconds while page is visible
        const setupPolling = () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

            pollIntervalRef.current = setInterval(() => {
                console.log('[FinancesPage] Auto-refresh triggered');
                fetchFinances(true); // Refresh sin mostrar loading
            }, 3000);
        };

        setupPolling();

        // Handle visibility changes - detener polling si pestaña está oculta
        const handleVisibilityChange = () => {
            if (document.hidden) {
                if (pollIntervalRef.current) {
                    clearInterval(pollIntervalRef.current);
                    console.log('[FinancesPage] Paused polling - tab hidden');
                }
            } else {
                console.log('[FinancesPage] Resumed polling - tab visible');
                setupPolling();
                fetchFinances(); // Refrescar inmediatamente cuando vuelve a estar visible
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    }, []);

    const handleCreateExpense = async () => {
        if (!newExpense.description || !newExpense.amount) return toast.warning('Completa los campos obligatorios');

        try {
            const res = await fetch('/api/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    description: newExpense.description,
                    amount: parseFloat(newExpense.amount),
                    category: newExpense.category,
                    due_date: newExpense.due_date,
                    is_recurring: newExpense.is_recurring
                })
            });

            if (res.ok) {
                toast.success(newExpense.is_recurring ? '✅ Gasto fijo mensual creado' : '✅ Gasto registrado con éxito');
                setIsModalOpen(false);
                setNewExpense({ description: '', amount: '', category: 'BUSINESS', due_date: new Date().toISOString().split('T')[0], is_recurring: false });

                // Refrescar después de 300ms
                setTimeout(() => {
                    fetchFinances(false);
                }, 300);
            }
        } catch (error) {
            console.error('Error creating expense:', error);
            toast.error('Error al registrar gasto');
        }
    };

    const handleGenerateMonth = async () => {
        setIsGenerating(true);
        try {
            const res = await fetch('/api/expenses', { method: 'PUT' });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message);
                fetchFinances();
            } else {
                toast.error('Error al generar gastos del mes');
            }
        } catch (error) {
            toast.error('Error al generar gastos del mes');
        } finally {
            setIsGenerating(false);
        }
    };

    const togglePaid = async (id: string, currentPaid: boolean) => {
        try {
            console.log(`[togglePaid] Toggling expense ${id} from ${currentPaid} to ${!currentPaid}`);

            const res = await fetch(`/api/expenses/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_paid: !currentPaid })
            });

            if (res.ok) {
                const updatedExpense = await res.json();
                console.log('[togglePaid] Success:', updatedExpense);

                toast.success(!currentPaid ? '✅ Gasto marcado como PAGADO' : '✅ Gasto marcado como PENDIENTE');

                // Refrescar después de 300ms para asegurar que la BD registró el cambio
                setTimeout(() => {
                    console.log('[togglePaid] Refreshing data after update');
                    fetchFinances(false);
                }, 300);
            } else {
                const error = await res.json();
                throw new Error(error.error || 'Error desconocido');
            }
        } catch (error: any) {
            console.error('[togglePaid] Error:', error);
            toast.error(`Error: ${error.message}`);
        }
    };

    const handlePrintReport = async () => {
        try {
            toast.loading('Generando reporte mensual...');

            // Fetch Expenses
            const expensesRes = await fetch('/api/expenses');
            const allExpenses = await expensesRes.json();

            // Fetch Payments (Income)
            const paymentsRes = await fetch('/api/payments');
            const allPayments = await paymentsRes.json();

            // Filter for current month
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            const monthExpenses = Array.isArray(allExpenses) ? allExpenses.filter((e: any) => {
                // Use paid_date for paid expenses, due_date for unpaid
                const dateToCheck = e.is_paid && e.paid_date ? new Date(e.paid_date) : new Date(e.due_date);
                return dateToCheck.getMonth() === currentMonth && dateToCheck.getFullYear() === currentYear && e.is_paid;
            }) : [];

            const monthIncome = Array.isArray(allPayments) ? allPayments.filter((p: any) => {
                const date = new Date(p.payment_date);
                return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
            }) : [];

            const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            const monthName = months[currentMonth];

            await generateMonthlyReportPDF(monthName, monthIncome, monthExpenses);
            toast.dismiss();
            toast.success('Reporte mensual generado con éxito');
        } catch (error) {
            console.error('Error generating report:', error);
            toast.dismiss();
            toast.error('Error al generar el reporte');
        }
    };


    const handleDelete = async (id: string, desc: string) => {
        if (confirm(`¿Eliminar gasto "${desc}"?`)) {
            try {
                const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    toast.success('✅ Gasto eliminado');
                    // Refrescar después de 300ms
                    setTimeout(() => {
                        fetchFinances(false);
                    }, 300);
                }
            } catch (error) {
                console.error('Error deleting expense:', error);
                toast.error('Error al eliminar');
            }
        }
    };

    const filteredExpenses = Array.isArray(expenses) ? expenses
        .filter(e => {
            if (activeTab === 'RECURRING') return e.is_recurring === true;
            if (activeTab === 'ALL') return true;
            return e.category === activeTab;
        })
        .sort((a, b) => {
            // Pendientes (is_paid = false) primero, luego pagados (is_paid = true)
            if (a.is_paid !== b.is_paid) {
                return a.is_paid ? 1 : -1;
            }
            // Si ambos tienen el mismo estado de pago, ordenar por fecha
            return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        })
        : [];

    const recurringCount = expenses.filter(e => e.is_recurring).length;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-12 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 uppercase">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-white uppercase">
                        Finanzas <span className="text-brand-red">&</span> Gastos
                    </h1>
                    <p className="text-white/30 text-xs font-bold uppercase tracking-[0.2em] mt-3">
                        Monitor de Rentabilidad Real (PostgreSQL)
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Print Monthly Report */}
                    <button
                        onClick={handlePrintReport}
                        className="flex items-center gap-2 px-6 py-4 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-black rounded-full transition-all border border-white/10 tracking-widest"
                    >
                        <FileText size={18} />
                        <span className="hidden sm:inline">Imprimir Reporte</span>
                    </button>

                    {/* Generate Month Button */}
                    <button
                        onClick={handleGenerateMonth}
                        disabled={isGenerating || recurringCount === 0}
                        className="flex items-center gap-2 px-6 py-4 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-black rounded-full transition-all border border-white/10 tracking-widest"
                        title={recurringCount === 0 ? 'No hay gastos fijos configurados' : `Generar ${recurringCount} gasto(s) fijo(s) para este mes`}
                    >
                        {isGenerating ? (
                            <RefreshCw size={16} className="animate-spin" />
                        ) : (
                            <Sparkles size={16} />
                        )}
                        <span className="hidden sm:inline">Generar Mes</span>
                    </button>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-3 px-8 py-4 bg-brand-red hover:bg-red-600 text-white text-xs font-black rounded-full transition-all border border-white/10 tracking-widest group shadow-[0_10px_30px_rgba(242,15,15,0.2)]"
                    >
                        <Plus size={18} /> <span className="hidden sm:inline">Registrar Gasto</span><span className="sm:hidden">Gasto</span>
                    </button>
                </div>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 uppercase">
                <GlassCard className="p-8 border-l-4 border-l-green-500 bg-white/5">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-black text-white/30 tracking-widest mb-1">Ingresos (Mes Actual)</p>
                            <p className="text-3xl font-black text-white">${stats.incomeMonth.toLocaleString('es-CO')}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[8px] font-black text-white/20 tracking-widest mb-1">Total Acumulado</p>
                            <p className="text-sm font-black text-green-500">${stats.incomeTotal.toLocaleString('es-CO')}</p>
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-[9px] font-black text-green-500">
                        <TrendingUp size={14} /> Dinero real en caja este mes
                    </div>
                </GlassCard>

                <GlassCard className="p-8 border-l-4 border-l-brand-red bg-white/5">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-black text-white/30 tracking-widest mb-1">Egresos (Mes Actual)</p>
                            <p className="text-3xl font-black text-white">${stats.totalExpensesPaidMonth.toLocaleString('es-CO')}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[8px] font-black text-white/20 tracking-widest mb-1">Total Acumulado</p>
                            <p className="text-sm font-black text-brand-red">${stats.totalExpensesPaidTotal.toLocaleString('es-CO')}</p>
                        </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[9px] font-black text-brand-red">
                            <TrendingDown size={14} /> Gastos pagados
                        </div>
                        <div className="flex gap-4">
                            <div className="text-[8px] font-black text-white/40">BIZ: ${stats.expensesBusinessMonth.toLocaleString('es-CO')}</div>
                            <div className="text-[8px] font-black text-white/40">PERS: ${stats.expensesPersonalMonth.toLocaleString('es-CO')}</div>
                        </div>
                    </div>
                </GlassCard>

                <GlassCard className="p-8 border-l-4 border-l-blue-500 bg-brand-red ring-1 ring-white/10 shadow-[0_20px_40px_rgba(242,15,15,0.2)]">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-black text-white/50 tracking-widest mb-1">Utilidad (Mes Actual)</p>
                            <p className="text-3xl font-black text-white">${stats.realProfitMonth.toLocaleString('es-CO')}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[8px] font-black text-white/40 tracking-widest mb-1">Utilidad Total</p>
                            <p className="text-sm font-black text-white">${stats.realProfitTotal.toLocaleString('es-CO')}</p>
                        </div>
                    </div>
                    <p className="text-[9px] font-black text-white/30 uppercase mt-4">Ingresos - Gastos Efectivos</p>
                </GlassCard>
            </div>

            {/* Expenses Management */}
            <div className="space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <h2 className="text-xl font-black text-white uppercase tracking-tight">Registro de Movimientos</h2>
                    <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/5 uppercase overflow-x-auto no-scrollbar max-w-full">
                        <TabButton active={activeTab === 'ALL'} onClick={() => setActiveTab('ALL')}>Todos</TabButton>
                        <TabButton active={activeTab === 'BUSINESS'} onClick={() => setActiveTab('BUSINESS')}>Empresa</TabButton>
                        <TabButton active={activeTab === 'PERSONAL'} onClick={() => setActiveTab('PERSONAL')}>Personal</TabButton>
                        <TabButton active={activeTab === 'RECURRING'} onClick={() => setActiveTab('RECURRING')}>
                            <span className="flex items-center gap-1.5 whitespace-nowrap">
                                <Repeat size={10} />
                                Fijos
                                {recurringCount > 0 && (
                                    <span className="bg-brand-red/80 text-white rounded-full px-1.5 py-0.5 text-[8px] leading-none">{recurringCount}</span>
                                )}
                            </span>
                        </TabButton>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center p-20">
                        <div className="w-12 h-12 border-4 border-brand-red border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredExpenses.map((expense) => (
                            <motion.div
                                key={expense.id}
                                layout
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className={`glass p-6 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 group transition-all ${expense.is_paid ? 'opacity-40 grayscale pointer-events-none lg:pointer-events-auto' : ''}`}
                            >
                                <div className="flex items-center gap-6 flex-1">
                                    <button
                                        onClick={() => togglePaid(expense.id, expense.is_paid)}
                                        className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${expense.is_paid ? 'bg-green-500 border-green-500 text-black' : 'border-white/10 text-white/0 hover:border-green-500 hover:text-green-500'}`}
                                    >
                                        <CheckCircle2 size={24} />
                                    </button>

                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h4 className={`text-lg font-black text-white uppercase tracking-tight ${expense.is_paid ? 'line-through' : ''}`}>
                                                {expense.description}
                                            </h4>
                                            {expense.is_recurring && (
                                                <span className="flex items-center gap-1 text-[8px] font-black text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full uppercase tracking-widest">
                                                    <Repeat size={8} /> Fijo
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4 mt-1">
                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${expense.category === 'BUSINESS' ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'}`}>
                                                {expense.category === 'BUSINESS' ? 'Empresa' : 'Personal'}
                                            </span>
                                            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest flex items-center gap-1">
                                                <Calendar size={10} /> {new Date(expense.due_date).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-8">
                                    <div className="text-right">
                                        <p className={`text-xl font-black ${expense.is_paid ? 'text-white/30' : 'text-white'}`}>
                                            ${parseFloat(expense.amount).toLocaleString('es-CO')}
                                        </p>
                                        <p className="text-[9px] font-black text-white/20 uppercase">Monto COP</p>
                                    </div>

                                    <button
                                        onClick={() => handleDelete(expense.id, expense.description)}
                                        className="p-4 rounded-2xl bg-white/5 text-white/10 hover:text-brand-red transition-all"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </motion.div>
                        ))}

                        {filteredExpenses.length === 0 && (
                            <div className="text-center py-20 text-white/20 font-black uppercase tracking-widest bg-white/5 rounded-[2.5rem] border border-dashed border-white/5">
                                {activeTab === 'RECURRING'
                                    ? 'No hay gastos fijos configurados. Crea uno con el toggle "Gasto Fijo Mensual"'
                                    : 'No hay gastos registrados en esta categoría'}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal for New Expense */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registrar Nuevo Gasto">
                <div className="space-y-6">
                    <FormField
                        icon={FileText}
                        label="Descripción del Gasto"
                        value={newExpense.description}
                        onChange={(v: string) => setNewExpense({ ...newExpense, description: v })}
                        placeholder="Ej. Internet Fibra Óptica"
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            icon={DollarSign}
                            label="Monto (COP)"
                            type="number"
                            value={newExpense.amount}
                            onChange={(v: string) => setNewExpense({ ...newExpense, amount: v })}
                            placeholder="0"
                        />
                        <FormField
                            icon={Calendar}
                            label="Fecha de Vencimiento"
                            type="date"
                            value={newExpense.due_date}
                            onChange={(v: string) => setNewExpense({ ...newExpense, due_date: v })}
                            placeholder=""
                        />
                    </div>

                    <div className="space-y-2 uppercase">
                        <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] pl-4">Categoría</label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setNewExpense({ ...newExpense, category: 'BUSINESS' })}
                                className={`py-4 rounded-2xl border transition-all text-[10px] font-black uppercase tracking-widest ${newExpense.category === 'BUSINESS' ? 'bg-brand-red border-brand-red text-white shadow-lg shadow-brand-red/20' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
                            >
                                Empresa
                            </button>
                            <button
                                onClick={() => setNewExpense({ ...newExpense, category: 'PERSONAL' })}
                                className={`py-4 rounded-2xl border transition-all text-[10px] font-black uppercase tracking-widest ${newExpense.category === 'PERSONAL' ? 'bg-brand-red border-brand-red text-white shadow-lg shadow-brand-red/20' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
                            >
                                Personal
                            </button>
                        </div>
                    </div>

                    {/* Recurring Toggle */}
                    <button
                        onClick={() => setNewExpense({ ...newExpense, is_recurring: !newExpense.is_recurring })}
                        className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl border transition-all ${newExpense.is_recurring
                            ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                            : 'bg-white/5 border-white/10 text-white/30 hover:bg-white/10'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <Repeat size={16} />
                            <div className="text-left">
                                <p className="text-[10px] font-black uppercase tracking-widest">Gasto Fijo Mensual</p>
                                <p className="text-[8px] font-bold uppercase tracking-widest opacity-60 mt-0.5">Se usa como plantilla para generar gastos cada mes</p>
                            </div>
                        </div>
                        <div className={`w-10 h-6 rounded-full transition-all flex items-center px-1 ${newExpense.is_recurring ? 'bg-purple-500 justify-end' : 'bg-white/10 justify-start'}`}>
                            <div className="w-4 h-4 bg-white rounded-full shadow" />
                        </div>
                    </button>

                    <div className="grid grid-cols-2 gap-4 pt-4 uppercase">
                        <button onClick={() => setIsModalOpen(false)} className="py-4 rounded-2xl bg-white/5 text-white/40 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Cancelar</button>
                        <button onClick={handleCreateExpense} className="py-4 rounded-2xl bg-brand-red text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-600 shadow-xl shadow-brand-red/20 transition-all border border-white/10">Registrar Pago</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

function TabButton({ children, active, onClick }: { children: React.ReactNode, active: boolean, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${active ? 'bg-brand-red text-white shadow-lg shadow-brand-red/20' : 'text-white/30 hover:text-white'}`}
        >
            {children}
        </button>
    );
}

function FormField({ icon: Icon, label, value, onChange, placeholder, type = 'text' }: any) {
    return (
        <div className="space-y-2 uppercase">
            <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] pl-4">{label}</label>
            <div className="relative group">
                <Icon size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-white/10 group-focus-within:text-brand-red transition-colors" />
                {type === 'number' ? (
                    <NumericInput
                        value={value}
                        onChange={onChange}
                        placeholder={placeholder}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm font-bold text-white outline-none focus:border-brand-red/30 transition-all uppercase placeholder:opacity-5"
                    />
                ) : (
                    <input
                        type={type}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm font-bold text-white outline-none focus:border-brand-red/30 transition-all uppercase placeholder:opacity-5"
                        placeholder={placeholder}
                    />
                )}
            </div>
        </div>
    );
}
