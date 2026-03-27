'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
    Sparkles,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { generateMonthlyReportPDF } from '@/lib/pdfGenerator';

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
        expensesBusiness: 0,
        expensesPersonal: 0,
        totalExpensesPaid: 0,
        realProfit: 0
    });
    
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeTab, setActiveTab] = useState<'ALL' | 'BUSINESS' | 'PERSONAL' | 'RECURRING'>('ALL');
    
    // Month Filtering State
    const [selectedDate, setSelectedDate] = useState(new Date());

    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const [newExpense, setNewExpense] = useState({
        description: '',
        amount: '',
        category: 'BUSINESS',
        due_date: new Date().toISOString().split('T')[0],
        is_recurring: false
    });

    const currentMonth = selectedDate.getMonth();
    const currentYear = selectedDate.getFullYear();
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    const handlePrevMonth = () => setSelectedDate(new Date(currentYear, currentMonth - 1, 1));
    const handleNextMonth = () => setSelectedDate(new Date(currentYear, currentMonth + 1, 1));
    const handleCurrentMonth = () => setSelectedDate(new Date());

    const fetchFinances = async (skipLoading = false) => {
        try {
            if (!skipLoading) setIsLoading(true);

            // Obtener el inicio y fin del mes local para evitar problemas de Timezone (UTC vs COL)
            const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString();
            const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999).toISOString();

            const [expensesRes, statsRes] = await Promise.all([
                fetch(`/api/expenses?t=${Date.now()}`, { cache: 'no-store' }),
                fetch(`/api/stats/finances?start=${startOfMonth}&end=${endOfMonth}&t=${Date.now()}`, { cache: 'no-store' })
            ]);

            if (!expensesRes.ok || !statsRes.ok) throw new Error('Error al obtener datos');

            const expensesData = await expensesRes.json();
            const statsData = await statsRes.json();

            setExpenses(Array.isArray(expensesData) ? expensesData : []);
            if (statsData && !statsData.error) {
                setStats(statsData);
            }
        } catch (error: any) {
            console.error('[FinancesPage] Fetch error:', error);
            if (!skipLoading) toast.error(`Error al sincronizar: ${error.message}`);
        } finally {
            if (!skipLoading) setIsLoading(false);
        }
    };

    useEffect(() => {
        // Ejecutar inmediatamente al cambiar de mes
        fetchFinances();
        
        const setupPolling = () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = setInterval(() => {
                // Background polling con el mes actual correcto
                fetchFinances(true);
            }, 5000);
        };

        setupPolling();

        const handleVisibilityChange = () => {
            if (document.hidden) {
                if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            } else {
                fetchFinances(true);
                setupPolling();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    }, [currentMonth, currentYear]); // <--- Dependencias clave para no tener estado "viejo" en el polling

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
                setTimeout(() => fetchFinances(true), 300);
            }
        } catch (error) {
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
                fetchFinances(true);
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
            const res = await fetch(`/api/expenses/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_paid: !currentPaid })
            });

            if (res.ok) {
                toast.success(!currentPaid ? '✅ Gasto marcado como PAGADO' : '✅ Gasto marcado como PENDIENTE');
                setTimeout(() => fetchFinances(true), 300);
            }
        } catch (error: any) {
            toast.error(`Error: ${error.message}`);
        }
    };

    const handlePrintReport = async () => {
        try {
            toast.loading('Generando reporte mensual...');
            const expensesRes = await fetch('/api/expenses');
            const allExpenses = await expensesRes.json();
            const paymentsRes = await fetch('/api/payments');
            const allPayments = await paymentsRes.json();

            const reportMonth = currentMonth;
            const reportYear = currentYear;

            const monthExpenses = Array.isArray(allExpenses) ? allExpenses.filter((e: any) => {
                const dateToCheck = e.is_paid && e.paid_date ? new Date(e.paid_date) : new Date(e.due_date);
                return dateToCheck.getMonth() === reportMonth && dateToCheck.getFullYear() === reportYear && e.is_paid;
            }) : [];

            const monthIncome = Array.isArray(allPayments) ? allPayments.filter((p: any) => {
                const dateStr = p.payment_date || p.created_at;
                if (!dateStr) return false;
                const d = new Date(dateStr);
                return d.getMonth() === reportMonth && d.getFullYear() === reportYear;
            }) : [];

            await generateMonthlyReportPDF(months[reportMonth], monthIncome, monthExpenses);
            toast.dismiss();
            toast.success('Reporte generado con éxito');
        } catch (error) {
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
                    setTimeout(() => fetchFinances(true), 300);
                }
            } catch (error) {
                toast.error('Error al eliminar');
            }
        }
    };

    const filteredExpenses = useMemo(() => {
        if (!Array.isArray(expenses)) return [];
        return expenses.filter(e => {
            // Regla de Mes: Mostrar SIEMPRE los pendientes por pagar (para que no se olviden)
            // Mostrar los PAGADOS SOLO si pertenecen al mes seleccionado
            const isUnpaid = !e.is_paid;
            const dateStr = e.paid_date || e.due_date || e.created_at;
            const expenseDate = dateStr ? new Date(dateStr) : new Date();
            const isInSelectedMonth = expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
            
            // Para la pestaña Fijos (RECURRING), mostraremos todos independientemente del mes
            if (activeTab === 'RECURRING') return e.is_recurring === true;
            
            const matchesMonthRule = isUnpaid || isInSelectedMonth;
            if (!matchesMonthRule) return false;

            if (activeTab === 'ALL') return true;
            return e.category === activeTab;
        }).sort((a, b) => {
            if (a.is_paid !== b.is_paid) return a.is_paid ? 1 : -1;
            return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        });
    }, [expenses, activeTab, currentMonth, currentYear]);

    const recurringCount = expenses.filter(e => e.is_recurring).length;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-12 pb-20">
            {/* Cabecera / Selector Mes Transversal */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 uppercase">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-white uppercase">
                        Finanzas <span className="text-brand-red">&</span> Gastos
                    </h1>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 border border-white/10 bg-white/5 rounded-full px-4 py-2 mr-2">
                            <button onClick={handlePrevMonth} className="p-2 text-white/40 hover:text-white transition-colors" title="Mes Anterior">
                                <ChevronLeft size={16} />
                            </button>
                            <button onClick={handleCurrentMonth} className="text-brand-red font-black text-xs px-2 min-w-[120px] text-center uppercase tracking-widest hover:text-red-400">
                                {months[currentMonth]} {currentYear}
                            </button>
                            <button onClick={handleNextMonth} className="p-2 text-white/40 hover:text-white transition-colors" title="Mes Siguiente">
                                <ChevronRight size={16} />
                            </button>
                    </div>

                    <button onClick={handlePrintReport} className="flex items-center gap-2 px-6 py-4 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-black rounded-full transition-all border border-white/10 tracking-widest">
                        <FileText size={18} /> <span className="hidden sm:inline">Imprimir Reporte</span>
                    </button>
                    <button onClick={handleGenerateMonth} disabled={isGenerating || recurringCount === 0} className="flex items-center gap-2 px-6 py-4 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-black rounded-full transition-all border border-white/10 tracking-widest">
                        {isGenerating ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
                        <span className="hidden sm:inline">Generar Mes</span>
                    </button>
                    <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-3 px-8 py-4 bg-brand-red hover:bg-red-600 text-white text-xs font-black rounded-full transition-all border border-white/10 tracking-widest shadow-[0_10px_30px_rgba(242,15,15,0.2)]">
                        <Plus size={18} /> <span className="hidden sm:inline">Registrar Gasto</span><span className="sm:hidden">Gasto</span>
                    </button>
                </div>
            </div>

            {/* Financial Summary - Exclusivo del mes seleccionado */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 uppercase">
                <GlassCard className="p-8 border-l-4 border-l-green-500 bg-white/5">
                    <div>
                        <p className="text-[10px] font-black text-white/30 tracking-widest mb-1">Ingresos de {months[currentMonth]}</p>
                        <p className="text-4xl font-black text-white">${stats.incomeMonth.toLocaleString('es-CO')}</p>
                    </div>
                </GlassCard>

                <GlassCard className="p-8 border-l-4 border-l-brand-red bg-white/5">
                    <div>
                        <p className="text-[10px] font-black text-white/30 tracking-widest mb-1">Egresos de {months[currentMonth]}</p>
                        <p className="text-4xl font-black text-white">${stats.totalExpensesPaidMonth.toLocaleString('es-CO')}</p>
                    </div>
                </GlassCard>

                <GlassCard className="p-8 border-l-4 border-l-blue-500 bg-brand-red shadow-[0_20px_40px_rgba(242,15,15,0.2)]">
                    <div>
                        <p className="text-[10px] font-black text-white/50 tracking-widest mb-1">Ganancia Total</p>
                        <p className="text-4xl font-black text-white">${stats.realProfitMonth.toLocaleString('es-CO')}</p>
                    </div>
                </GlassCard>
            </div>

            {/* Expenses Management */}
            <div className="space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">Registro de Movimientos</h2>
                    </div>

                    <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/5 uppercase overflow-x-auto no-scrollbar items-center">
                        <TabButton active={activeTab === 'ALL'} onClick={() => setActiveTab('ALL')}>Todos</TabButton>
                        <TabButton active={activeTab === 'BUSINESS'} onClick={() => setActiveTab('BUSINESS')}>Empresa</TabButton>
                        <TabButton active={activeTab === 'PERSONAL'} onClick={() => setActiveTab('PERSONAL')}>Personal</TabButton>
                        <TabButton active={activeTab === 'RECURRING'} onClick={() => setActiveTab('RECURRING')}>Fijos ({recurringCount})</TabButton>
                    </div>
                </div>

                {isLoading && expenses.length === 0 ? (
                    <div className="flex justify-center p-20">
                        <div className="w-12 h-12 border-4 border-brand-red border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        <AnimatePresence mode="popLayout">
                            {filteredExpenses.map((expense) => (
                                <motion.div
                                    key={expense.id}
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
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
                                                    <Calendar size={10} /> {new Date(expense.due_date).toLocaleDateString('es-CO')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-8">
                                        <div className="text-right">
                                            <p className={`text-xl font-black ${expense.is_paid ? 'text-white/30' : 'text-white'}`}>
                                                ${parseFloat(expense.amount).toLocaleString('es-CO')}
                                            </p>
                                        </div>
                                        <button onClick={() => handleDelete(expense.id, expense.description)} className="p-4 rounded-2xl bg-white/5 text-white/10 hover:text-brand-red transition-all">
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {filteredExpenses.length === 0 && (
                            <div className="text-center py-20 text-white/20 font-black uppercase tracking-widest bg-white/5 rounded-[2.5rem] border border-dashed border-white/5">
                                {activeTab === 'RECURRING'
                                    ? 'No hay gastos fijos configurados.'
                                    : 'No hay gastos para mostrar en este mes.'}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal for New Expense */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registrar Nuevo Gasto">
                <div className="space-y-6">
                    <FormField icon={FileText} label="Descripción del Gasto" value={newExpense.description} onChange={(v: string) => setNewExpense({ ...newExpense, description: v })} placeholder="Ej. Internet" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField icon={DollarSign} label="Monto (COP)" type="number" value={newExpense.amount} onChange={(v: string) => setNewExpense({ ...newExpense, amount: v })} placeholder="0" />
                        <FormField icon={Calendar} label="Fecha Vencimiento" type="date" value={newExpense.due_date} onChange={(v: string) => setNewExpense({ ...newExpense, due_date: v })} placeholder="" />
                    </div>
                    <div className="space-y-2 uppercase">
                        <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] pl-4">Categoría</label>
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => setNewExpense({ ...newExpense, category: 'BUSINESS' })} className={`py-4 rounded-2xl border transition-all text-[10px] font-black uppercase tracking-widest ${newExpense.category === 'BUSINESS' ? 'bg-brand-red border-brand-red text-white' : 'bg-white/5 border-white/10 text-white/40'}`}>Empresa</button>
                            <button onClick={() => setNewExpense({ ...newExpense, category: 'PERSONAL' })} className={`py-4 rounded-2xl border transition-all text-[10px] font-black uppercase tracking-widest ${newExpense.category === 'PERSONAL' ? 'bg-brand-red border-brand-red text-white' : 'bg-white/5 border-white/10 text-white/40'}`}>Personal</button>
                        </div>
                    </div>
                    <button onClick={() => setNewExpense({ ...newExpense, is_recurring: !newExpense.is_recurring })} className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl border transition-all ${newExpense.is_recurring ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' : 'bg-white/5 border-white/10 text-white/30 hover:bg-white/10'}`}>
                        <div className="flex items-center gap-3">
                            <Repeat size={16} />
                            <div className="text-left">
                                <p className="text-[10px] font-black uppercase tracking-widest">Gasto Fijo Mensual</p>
                            </div>
                        </div>
                        <div className={`w-10 h-6 rounded-full transition-all flex items-center px-1 ${newExpense.is_recurring ? 'bg-purple-500 justify-end' : 'bg-white/10 justify-start'}`}><div className="w-4 h-4 bg-white rounded-full" /></div>
                    </button>
                    <div className="grid grid-cols-2 gap-4 pt-4 uppercase">
                        <button onClick={() => setIsModalOpen(false)} className="py-4 rounded-2xl bg-white/5 text-white/40 text-[10px] font-black uppercase tracking-widest">Cancelar</button>
                        <button onClick={handleCreateExpense} className="py-4 rounded-2xl bg-brand-red text-white text-[10px] font-black uppercase tracking-widest">Registrar Pago</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

function TabButton({ children, active, onClick }: { children: React.ReactNode, active: boolean, onClick: () => void }) {
    return (
        <button onClick={onClick} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${active ? 'bg-brand-red text-white' : 'text-white/30 hover:text-white'}`}>
            {children}
        </button>
    );
}

function FormField({ icon: Icon, label, value, onChange, placeholder, type = 'text' }: any) {
    return (
        <div className="space-y-2 uppercase">
            <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] pl-4">{label}</label>
            <div className="relative group">
                <Icon size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-white/10" />
                {type === 'number' ? (
                    <NumericInput value={value} onChange={onChange} placeholder={placeholder} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm font-bold text-white outline-none focus:border-brand-red/30 transition-all uppercase" />
                ) : (
                    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm font-bold text-white outline-none focus:border-brand-red/30 transition-all uppercase" placeholder={placeholder} />
                )}
            </div>
        </div>
    );
}
