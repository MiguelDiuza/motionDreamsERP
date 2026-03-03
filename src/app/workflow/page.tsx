'use client';

import React, { useState, useEffect } from 'react';
import GlassCard from '@/components/ui/GlassCard';
import Modal from '@/components/ui/Modal';
import PriorityIcon from '@/components/ui/PriorityIcon';
import {
    Search,
    Filter,
    Circle,
    Plus,
    Clock,
    User,
    Calendar,
    Sparkles,
    Trash2,
    DollarSign,
    Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function WorkflowPage() {
    const [jobs, setJobs] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [newJob, setNewJob] = useState({
        client_id: '',
        title: '',
        price: '',
        due_date: new Date().toISOString().split('T')[0]
    });

    const fetchJobs = async () => {
        try {
            setIsLoading(true);
            const res = await fetch('/api/jobs', { cache: 'no-store' });
            const data = await res.json();

            if (Array.isArray(data)) {
                setJobs(data);
            } else {
                console.error('API did not return an array for jobs:', data);
                setJobs([]);
            }
        } catch (error) {
            console.error('Fetch error jobs:', error);
            setJobs([]);
            toast.error('Error al cargar trabajos');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchClients = async () => {
        try {
            const res = await fetch('/api/clients', { cache: 'no-store' });
            const data = await res.json();

            if (Array.isArray(data)) {
                setClients(data);
            } else {
                console.error('API did not return an array for clients:', data);
                setClients([]);
            }
        } catch (error) {
            console.error('Error fetching clients:', error);
            setClients([]);
        }
    };

    useEffect(() => {
        fetchJobs();
        fetchClients();
    }, []);

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
                toast.success('Proyecto registrado con éxito');
                setIsModalOpen(false);
                setNewJob({ client_id: '', title: '', price: '', due_date: new Date().toISOString().split('T')[0] });
                fetchJobs();
            }
        } catch (error) {
            toast.error('Error al crear el proyecto');
        }
    };

    const toggleStatus = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'PENDING' ? 'COMPLETED' : 'PENDING';

        try {
            const res = await fetch(`/api/jobs/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.ok) {
                if (newStatus === 'COMPLETED') {
                    toast.success('¡Proyecto Completado! El valor se ha sumado a la deuda del cliente.', {
                        duration: 4000
                    });
                } else {
                    toast.info('Proyecto marcado como pendiente.');
                }
                fetchJobs();
            }
        } catch (error) {
            toast.error('Error al actualizar estado');
        }
    };

    const handleDeleteJob = async (id: string, title: string) => {
        if (confirm(`¿Eliminar el proyecto "${title}"?`)) {
            try {
                const res = await fetch(`/api/jobs/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    toast.success('Proyecto eliminado');
                    fetchJobs();
                }
            } catch (error) {
                toast.error('Error al eliminar');
            }
        }
    };

    const calculatePriority = (dueDate: string): number => {
        const target = new Date(dueDate);
        const now = new Date();
        const diffTime = target.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) return 5; // Today or Overdue
        if (diffDays <= 2) return 4; // High
        if (diffDays <= 5) return 3; // Medium
        if (diffDays <= 10) return 2; // Low
        return 1; // More time
    };

    const filteredJobs = Array.isArray(jobs) ? jobs.filter(j =>
        (j.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (j.client_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    ) : [];

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-12 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 uppercase">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-white uppercase">
                        Flujo de <span className="text-brand-red">Trabajo</span>
                    </h1>
                    <p className="text-white/30 text-xs font-bold uppercase tracking-[0.2em] mt-3">
                        Producción en tiempo real & prioridad (PostgreSQL)
                    </p>
                </div>

                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-3 px-8 py-4 bg-brand-red hover:bg-red-600 text-white text-xs font-black rounded-full transition-all border border-white/10 tracking-widest group shadow-[0_10px_30px_rgba(242,15,15,0.2)]"
                >
                    <Plus size={18} /> Nuevo Encargo
                </button>
            </div>

            {/* Filters bar */}
            <div className="flex flex-col lg:flex-row gap-6">
                <GlassCard className="flex-1 p-4 rounded-[2rem]">
                    <div className="flex items-center gap-4">
                        <Search size={18} className="text-white/20" />
                        <input
                            type="text"
                            placeholder="Buscar encargos o clientes..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-transparent border-none outline-none text-white text-sm font-bold w-full uppercase placeholder:text-white/10"
                        />
                    </div>
                </GlassCard>
            </div>

            {/* Jobs List */}
            {isLoading ? (
                <div className="flex justify-center p-20">
                    <div className="w-12 h-12 border-4 border-brand-red border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    <AnimatePresence>
                        {filteredJobs.map((job) => (
                            <motion.div
                                key={job.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className={`group relative p-6 rounded-[2.5rem] border border-white/5 flex flex-col md:flex-row items-center gap-6 transition-all hover:bg-white/[0.02] ${job.status === 'COMPLETED' ? 'opacity-40 grayscale pointer-events-none lg:pointer-events-auto' : 'bg-white/5'}`}
                            >
                                {/* Status Toggle */}
                                <button
                                    onClick={() => toggleStatus(job.id, job.status)}
                                    className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${job.status === 'COMPLETED' ? 'bg-green-500 border-green-500 text-black' : 'border-white/20 text-white/0 hover:border-brand-red group-hover:text-brand-red/50'}`}
                                >
                                    <Sparkles size={20} />
                                </button>

                                {/* Priority Icon */}
                                <div className="flex-shrink-0">
                                    <PriorityIcon priority={calculatePriority(job.due_date)} />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0 text-center md:text-left">
                                    <h3 className={`text-xl font-black uppercase tracking-tight text-white mb-1 ${job.status === 'COMPLETED' ? 'line-through opacity-50' : ''}`}>
                                        {job.title}
                                    </h3>
                                    <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                                        <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full">
                                            <User size={12} className="text-brand-red" /> {job.client_name}
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full">
                                            <Calendar size={12} /> Entrega: {new Date(job.due_date).toLocaleDateString()}
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full text-white">
                                            <DollarSign size={12} className="text-green-500" /> ${parseFloat(job.price).toLocaleString('es-CO')}
                                        </div>
                                    </div>
                                </div>

                                {/* Delete Action */}
                                <button
                                    onClick={() => handleDeleteJob(job.id, job.title)}
                                    className="p-4 rounded-2xl bg-white/5 text-white/20 hover:text-brand-red transition-all"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {filteredJobs.length === 0 && (
                        <div className="text-center py-20 text-white/20 font-black uppercase tracking-widest">
                            No hay trabajos que coincidan con la búsqueda
                        </div>
                    )}
                </div>
            )}

            {/* New Job Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nuevo Encargo de Producción">
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
                        label="Título del Trabajo"
                        value={newJob.title}
                        onChange={(v: string) => setNewJob({ ...newJob, title: v })}
                        placeholder="Ej. Pack de 10 Reels"
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            icon={DollarSign}
                            label="Precio del Proyecto (COP)"
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

function FormField({ icon: Icon, label, value, onChange, placeholder, type = 'text' }: any) {
    return (
        <div className="space-y-2 uppercase">
            <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] pl-4">{label}</label>
            <div className="relative group">
                <Icon size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-white/10 group-focus-within:text-brand-red transition-colors" />
                <input
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm font-bold text-white outline-none focus:border-brand-red/30 transition-all uppercase placeholder:opacity-5"
                    placeholder={placeholder}
                />
            </div>
        </div>
    );
}
