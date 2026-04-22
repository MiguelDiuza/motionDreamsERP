'use client';

import React, { useState, useEffect } from 'react';
import GlassCard from '@/components/ui/GlassCard';
import Modal from '@/components/ui/Modal';
import { Calendar, Clock, Lock, CheckCircle2, User, Search, Briefcase } from 'lucide-react';
import { toast } from 'sonner';

export default function SchedulePage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    
    const [jobs, setJobs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // Assignment modal state
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedJob, setSelectedJob] = useState<any>(null);
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleTime, setScheduleTime] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === 'aaronbebe') {
            setIsAuthenticated(true);
            fetchJobs();
            toast.success('Acceso Autorizado');
        } else {
            toast.error('Contraseña incorrecta');
        }
    };

    const fetchJobs = async () => {
        try {
            setIsLoading(true);
            const res = await fetch('/api/jobs', { cache: 'no-store' });
            const data = await res.json();
            if (Array.isArray(data)) {
                setJobs(data);
            }
        } catch (error) {
            console.error(error);
            toast.error('Error al cargar trabajos');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAssignSchedule = async () => {
        if (!selectedJob) return;
        
        try {
            const res = await fetch(`/api/jobs/${selectedJob.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scheduled_date: scheduleDate || null,
                    scheduled_time: scheduleTime || null
                })
            });

            if (res.ok) {
                toast.success('Horario asignado');
                setIsAssignModalOpen(false);
                fetchJobs();
            } else {
                toast.error('Error al guardar el horario');
            }
        } catch (error) {
            toast.error('Error de conexión');
        }
    };

    const openAssignModal = (job: any) => {
        setSelectedJob(job);
        // Default to today if none assigned
        setScheduleDate(job.scheduled_date ? new Date(job.scheduled_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
        setScheduleTime(job.scheduled_time || '09:00');
        setIsAssignModalOpen(true);
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center p-4">
                <GlassCard className="w-full max-w-md p-8 md:p-12 relative overflow-hidden flex flex-col items-center">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-red/10 blur-[50px] -mr-16 -mt-16 rounded-full" />
                    
                    <div className="w-16 h-16 rounded-full bg-brand-red/10 flex items-center justify-center text-brand-red mb-8">
                        <Lock size={32} />
                    </div>
                    
                    <h1 className="text-2xl font-black text-white uppercase tracking-tight mb-2 text-center">Panel de Horario</h1>
                    <p className="text-white/30 text-xs font-bold uppercase tracking-widest text-center mb-8">Acceso Restringido</p>
                    
                    <form onSubmit={handleLogin} className="w-full space-y-6">
                        <div className="space-y-2 uppercase">
                            <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] pl-4">Contraseña Maestra</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-center text-white outline-none focus:border-brand-red/30 transition-all tracking-widest"
                                placeholder="•••••••••"
                            />
                        </div>
                        <button type="submit" className="w-full py-4 rounded-2xl bg-brand-red text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-600 shadow-xl shadow-brand-red/20 transition-all border border-white/10">
                            Desbloquear Panel
                        </button>
                    </form>
                </GlassCard>
            </div>
        );
    }

    const scheduledJobs = jobs.filter(j => j.scheduled_date);
    const unassignedJobs = jobs.filter(j => !j.scheduled_date && j.status !== 'COMPLETED');

    // Group scheduled jobs by date
    const groupedByDate = scheduledJobs.reduce((acc, job) => {
        const dateStr = new Date(job.scheduled_date).toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        if (!acc[dateStr]) acc[dateStr] = [];
        acc[dateStr].push(job);
        return acc;
    }, {} as Record<string, any[]>);

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-12 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 uppercase">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-white uppercase flex items-center gap-4">
                        <Calendar className="text-brand-red" size={36} /> Horario
                    </h1>
                    <p className="text-white/30 text-xs font-bold uppercase tracking-[0.2em] mt-3">
                        Asignación de turnos y carga de trabajo
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Scheduled */}
                <div className="lg:col-span-2 space-y-8">
                    <h2 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-3">
                        <CheckCircle2 className="text-green-500" size={20} /> Asignados
                    </h2>
                    
                    {Object.keys(groupedByDate).length === 0 ? (
                        <GlassCard className="p-10 text-center border border-white/5 border-dashed">
                            <Calendar className="mx-auto text-white/10 mb-4" size={48} />
                            <p className="text-white/30 text-xs font-black uppercase tracking-widest">El calendario está vacío</p>
                        </GlassCard>
                    ) : (
                        Object.keys(groupedByDate).map(dateStr => (
                            <div key={dateStr} className="space-y-4">
                                <h3 className="text-[10px] font-black text-brand-red uppercase tracking-[0.2em] sticky top-20 bg-[#0A0A0A]/80 backdrop-blur-md py-2 z-10 border-b border-white/5">
                                    {dateStr}
                                </h3>
                                <div className="grid gap-4">
                                    {groupedByDate[dateStr]
                                        .sort((a, b) => (a.scheduled_time || '').localeCompare(b.scheduled_time || ''))
                                        .map(job => (
                                        <GlassCard key={job.id} className="p-5 border-l-4 border-l-brand-red hover:bg-white/5 transition-all cursor-pointer" onClick={() => openAssignModal(job)}>
                                            <div className="flex justify-between items-start gap-4">
                                                <div>
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span className="bg-brand-red/20 text-brand-red px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                                                            <Clock size={12} /> {job.scheduled_time || 'Todo el día'}
                                                        </span>
                                                        <span className="text-white/30 text-[10px] font-bold uppercase tracking-wider">
                                                            ~ {job.estimated_minutes || 0} min est.
                                                        </span>
                                                    </div>
                                                    <h4 className="text-lg font-black text-white uppercase tracking-tight">{job.title}</h4>
                                                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1 flex items-center gap-1.5">
                                                        <User size={12} /> {job.client_name}
                                                    </p>
                                                </div>
                                            </div>
                                        </GlassCard>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Right Column: Unassigned queue */}
                <div className="space-y-6">
                    <h2 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-3">
                        <Briefcase className="text-white/40" size={20} /> Por Asignar
                    </h2>

                    <GlassCard className="p-6 bg-white/[0.02]">
                        <div className="space-y-4">
                            {unassignedJobs.length === 0 ? (
                                <p className="text-white/20 text-[10px] font-black uppercase tracking-widest text-center py-10">Todo está asignado</p>
                            ) : (
                                unassignedJobs.map(job => (
                                    <div 
                                        key={job.id} 
                                        onClick={() => openAssignModal(job)}
                                        className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-brand-red/50 hover:bg-white/10 transition-all cursor-pointer group"
                                    >
                                        <h4 className="text-sm font-black text-white uppercase tracking-tight group-hover:text-brand-red transition-colors">{job.title}</h4>
                                        <div className="flex justify-between items-center mt-3 text-[9px] font-black uppercase tracking-widest text-white/30">
                                            <span>{job.client_name}</span>
                                            <span className="bg-white/10 px-2 py-1 rounded-md">{job.estimated_minutes || 0} min</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </GlassCard>
                </div>
            </div>

            {/* Assignment Modal */}
            <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title="Asignar en Horario">
                {selectedJob && (
                    <div className="space-y-6">
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                            <h4 className="text-white font-black uppercase text-sm">{selectedJob.title}</h4>
                            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">Tiempo Estimado: {selectedJob.estimated_minutes || 0} min</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2 uppercase">
                                <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] pl-4">Fecha</label>
                                <div className="relative group">
                                    <Calendar size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-white/10 group-focus-within:text-brand-red transition-colors" />
                                    <input
                                        type="date"
                                        value={scheduleDate}
                                        onChange={(e) => setScheduleDate(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm font-bold text-white outline-none focus:border-brand-red/30 transition-all uppercase"
                                    />
                                </div>
                            </div>
                            
                            <div className="space-y-2 uppercase">
                                <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] pl-4">Hora de Inicio</label>
                                <div className="relative group">
                                    <Clock size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-white/10 group-focus-within:text-brand-red transition-colors" />
                                    <input
                                        type="time"
                                        value={scheduleTime}
                                        onChange={(e) => setScheduleTime(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm font-bold text-white outline-none focus:border-brand-red/30 transition-all uppercase"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 pt-4 uppercase">
                            <button 
                                onClick={() => {
                                    setScheduleDate('');
                                    setScheduleTime('');
                                    setTimeout(() => handleAssignSchedule(), 10);
                                }} 
                                className="flex-1 py-4 rounded-2xl bg-white/5 text-white/40 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-red-400 transition-all border border-transparent hover:border-red-500/30"
                            >
                                Quitar Asignación
                            </button>
                            <button onClick={handleAssignSchedule} className="flex-1 py-4 rounded-2xl bg-brand-red text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-600 shadow-xl shadow-brand-red/20 transition-all border border-white/10">
                                Guardar Horario
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
