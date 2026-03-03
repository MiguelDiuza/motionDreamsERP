'use client';

import React, { useState, useEffect } from 'react';
import GlassCard from '@/components/ui/GlassCard';
import Modal from '@/components/ui/Modal';
import NumericInput from '@/components/ui/NumericInput';
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Briefcase,
    Users,
    ArrowUpRight,
    Plus,
    Clock,
    Sparkles,
    Zap,
    User,
    Calendar,
    Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function Dashboard() {
    const [stats, setStats] = useState({
        incomeMonth: 0,
        incomeTotal: 0,
        expensesMonth: 0,
        expensesTotal: 0,
        clientDebt: 0,
        activeJobsCount: 0,
        activeJobsValue: 0
    });
    const [clients, setClients] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [newJob, setNewJob] = useState({
        client_id: '',
        title: '',
        price: '',
        due_date: new Date().toISOString().split('T')[0]
    });

    const fetchDashboardData = async () => {
        try {
            setIsLoading(true);
            const [statsRes, clientsRes] = await Promise.all([
                fetch('/api/stats/dashboard'),
                fetch('/api/clients')
            ]);

            const statsData = await statsRes.json();
            const clientsData = await clientsRes.json();

            if (statsData && !statsData.error) {
                setStats(statsData);
            }

            if (Array.isArray(clientsData)) {
                setClients(clientsData);
            } else {
                console.error('API did not return an array for clients at dashboard:', clientsData);
                setClients([]);
            }
        } catch (error) {
            console.error('Fetch error dashboard:', error);
            toast.error('Error al sincronizar datos');
        } finally {
            setIsLoading(false);
        }
    };

    const formatCompactNumber = (num: number) => {
        if (num >= 1000000) {
            return (num / 1000000).toLocaleString('es-CO', { maximumFractionDigits: 1 }) + 'M';
        }
        if (num >= 10000) {
            return (num / 1000).toLocaleString('es-CO', { maximumFractionDigits: 0 }) + 'K';
        }
        return num.toLocaleString('es-CO');
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const handleClearDatabase = async () => {
        const confirmed1 = confirm('⚠️ ¿Estás seguro? Esto eliminará TODOS los clientes, trabajos, pagos y gastos.');
        if (!confirmed1) return;
        const confirmed2 = confirm('🔴 ÚLTIMA CONFIRMACIÓN: Se borrarán TODOS los datos permanentemente. ¿Continuar?');
        if (!confirmed2) return;

        try {
            const res = await fetch('/api/admin/clear-db', { method: 'DELETE' });
            if (res.ok) {
                toast.success('Base de datos limpiada exitosamente');
                fetchDashboardData();
            } else {
                toast.error('Error al limpiar la base de datos');
            }
        } catch (error) {
            toast.error('Error de conexión');
        }
    };

    const handleCreateJob = async () => {
        if (!newJob.client_id || !newJob.title || !newJob.price) {
            return toast.warning('Por favor completa los campos principales');
        }

        try {
            const res = await fetch('/api/jobs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newJob,
                    price: parseFloat(newJob.price)
                })
            });

            if (res.ok) {
                toast.success('Trabajo iniciado y registrado');
                setIsModalOpen(false);
                setNewJob({ client_id: '', title: '', price: '', due_date: new Date().toISOString().split('T')[0] });
                fetchDashboardData();
            }
        } catch (error) {
            toast.error('Error al crear el proyecto');
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-12 pb-20">
            {/* Top Bar / Welcome */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 uppercase">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-white">
                        PANEL DE <span className="text-brand-red">CONTROL</span>
                    </h1>
                    <p className="text-white/30 text-[10px] font-black tracking-[0.3em] mt-3">
                        Motion Dreams ERP <span className="text-brand-red">v2.1</span> • PostgreSQL Realtime
                    </p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handleClearDatabase}
                        className="flex items-center gap-2 px-6 py-4 bg-white/5 hover:bg-red-500/10 hover:border-red-500/30 text-white/30 hover:text-red-400 text-xs font-black rounded-full transition-all border border-white/10 tracking-widest"
                        title="Limpiar Base de Datos"
                    >
                        <Trash2 size={16} />
                        <span className="hidden md:inline">Limpiar BD</span>
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-3 px-8 py-4 bg-brand-red hover:bg-red-600 text-white text-xs font-black rounded-full transition-all border border-white/10 tracking-widest shadow-[0_10px_30px_rgba(242,15,15,0.3)]"
                    >
                        <Plus size={18} /> Nuevo Trabajo
                    </button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    icon={TrendingUp}
                    label="Ingresos (Mes)"
                    value={`$${formatCompactNumber(stats.incomeMonth)}`}
                    subValue={`Total: $${formatCompactNumber(stats.incomeTotal)}`}
                    color="text-green-500"
                    bg="bg-green-500/10"
                />
                <StatCard
                    icon={TrendingDown}
                    label="Egresos Pagos"
                    value={`$${formatCompactNumber(stats.expensesMonth)}`}
                    subValue={`Total: $${formatCompactNumber(stats.expensesTotal)}`}
                    color="text-brand-red"
                    bg="bg-brand-red/10"
                />
                <StatCard
                    icon={DollarSign}
                    label="Cartera Pendiente"
                    value={`$${formatCompactNumber(stats.clientDebt)}`}
                    color="text-white"
                    bg="bg-white/5"
                />
                <StatCard
                    icon={Zap}
                    label="Utilidad (Mes)"
                    value={`$${formatCompactNumber(stats.incomeMonth - stats.expensesMonth)}`}
                    subValue={`Util. Total: $${formatCompactNumber(stats.incomeTotal - stats.expensesTotal)}`}
                    color="text-blue-500"
                    bg="bg-blue-500/10"
                    isMain
                />
            </div>

            {/* Main Operational Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Active Jobs Summary */}
                <GlassCard className="lg:col-span-2 p-10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand-red/10 blur-[100px] -mr-32 -mt-32 rounded-full group-hover:bg-brand-red/20 transition-all duration-700" />

                    <div className="flex items-center justify-between mb-10 relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-brand-red flex items-center justify-center text-white shadow-lg shadow-brand-red/20">
                                <Briefcase size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tight">Producción Activa</h3>
                                <p className="text-white/20 text-[9px] font-bold uppercase tracking-widest mt-0.5">Pendientes por Entregar</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-2xl font-black text-white">{stats.activeJobsCount}</span>
                            <span className="text-[10px] font-black text-white/20 uppercase block">Proyectos</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 relative z-10">
                        <div className="glass p-6 rounded-3xl border border-white/5 flex flex-col justify-center">
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">Valor Estimado en Cola</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl font-bold text-white/40">$</span>
                                <p className="text-2xl md:text-3xl font-black text-white" title={stats.activeJobsValue.toLocaleString('es-CO')}>
                                    {formatCompactNumber(stats.activeJobsValue)}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 mt-4 text-[9px] font-black text-green-500 uppercase overflow-hidden whitespace-nowrap">
                                <ArrowUpRight size={14} className="flex-shrink-0" /> <span className="truncate">Listo para facturar</span>
                            </div>
                        </div>

                        <div className="glass p-6 rounded-3xl border border-white/5 flex flex-col justify-center">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Estado del Mes</span>
                                <span className="text-[10px] font-black text-blue-500 uppercase bg-blue-500/10 px-3 py-1 rounded-full">Operativo</span>
                            </div>
                            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                                <motion.div
                                    className="bg-brand-red h-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: '65%' }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                />
                            </div>
                            <p className="text-[9px] font-black text-white/20 uppercase mt-4">65% de la capacidad alcanzada</p>
                        </div>
                    </div>
                </GlassCard>

                {/* Right: Quick Clients Summary */}
                <GlassCard className="p-10 border-none bg-gradient-to-br from-white/[0.03] to-transparent">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/40">
                            <Users size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tight">Cartera</h3>
                            <p className="text-white/20 text-[9px] font-bold uppercase tracking-widest mt-0.5">Principales Pendientes</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {Array.isArray(clients) && clients.slice(0, 4).map((client, i) => (
                            <div key={i} className="flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-all group cursor-pointer border border-transparent hover:border-white/5">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-[1rem] bg-brand-red/10 flex items-center justify-center text-brand-red text-xs font-black">
                                        {(client.name || '?').charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-white uppercase tracking-tight group-hover:text-brand-red transition-colors">{client.name}</p>
                                        <p className="text-[9px] font-black text-white/20 uppercase mt-0.5">{client.company_name || 'Particular'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black text-white">${parseFloat(client.total_debt || 0).toLocaleString('es-CO')}</p>
                                    <p className="text-[8px] font-black text-white/20 uppercase mt-0.5">Saldo</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button className="w-full mt-10 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-[10px] font-black text-white uppercase tracking-widest transition-all">Ver Todos los Clientes</button>
                </GlassCard>
            </div>

            {/* Modal "Nuevo Trabajo" duplicated for dashboard quick access */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Iniciar Nuevo Trabajo">
                <div className="space-y-6">
                    <div className="space-y-2 uppercase">
                        <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] pl-4">Cliente</label>
                        <select
                            value={newJob.client_id}
                            onChange={(e) => setNewJob({ ...newJob, client_id: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white outline-none focus:border-brand-red/30 transition-all uppercase"
                        >
                            <option value="">Seleccionar Cliente...</option>
                            {clients.map(c => (
                                <option key={c.id} value={c.id} className="bg-brand-dark">{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <FormField
                        icon={Briefcase}
                        label="¿Qué proyecto vas a iniciar?"
                        value={newJob.title}
                        onChange={(v: string) => setNewJob({ ...newJob, title: v })}
                        placeholder="Ej. Pack de 10 Reels"
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            icon={DollarSign}
                            label="Presupuesto (COP)"
                            type="number"
                            value={newJob.price}
                            onChange={(v: string) => setNewJob({ ...newJob, price: v })}
                            placeholder="0"
                        />
                        <FormField
                            icon={Calendar}
                            label="Fecha de Entrega"
                            type="date"
                            value={newJob.due_date}
                            onChange={(v: string) => setNewJob({ ...newJob, due_date: v })}
                            placeholder=""
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 uppercase">
                        <button onClick={() => setIsModalOpen(false)} className="py-4 rounded-2xl bg-white/5 text-white/40 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Cancelar</button>
                        <button onClick={handleCreateJob} className="py-4 rounded-2xl bg-brand-red text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-600 shadow-xl shadow-brand-red/20 transition-all border border-white/10">Registrar Proyecto</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

function StatCard({ icon: Icon, label, value, subValue, color, bg, isMain }: any) {
    return (
        <GlassCard className={`p-8 border-none ${isMain ? 'bg-gradient-to-tr from-brand-red/20 to-transparent ring-1 ring-white/10 shadow-[0_20px_40px_rgba(242,15,15,0.1)]' : 'bg-white/5 hover:bg-white/[0.07]'} transition-all group`}>
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-2xl ${bg} ${color} transition-transform group-hover:scale-110`}>
                    <Icon size={20} />
                </div>
                <Clock size={14} className="text-white/10" />
            </div>
            <div>
                <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">{label}</p>
                <p className={`text-2xl font-black ${isMain ? 'text-white' : 'text-white'} tracking-tight`}>{value}</p>
                {subValue && (
                    <p className="text-[9px] font-black text-white/20 uppercase mt-2 tracking-wider">{subValue}</p>
                )}
            </div>
        </GlassCard>
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
