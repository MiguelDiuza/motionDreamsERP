'use client';

import React, { useState, useEffect } from 'react';
import GlassCard from '@/components/ui/GlassCard';
import Modal from '@/components/ui/Modal';
import { Calendar, Clock, Lock, CheckCircle2, User, Briefcase, AlertTriangle, Users } from 'lucide-react';
import { toast } from 'sonner';

const BOGOTA_TZ = 'America/Bogota';

// Build a TIMESTAMPTZ string for a Bogota local date/time (UTC-5, no DST).
function toBogotaISO(date: string, time: string): string {
    return `${date}T${time}:00-05:00`;
}

// Bogota local YYYY-MM-DD for an ISO timestamp.
function bogotaDateKey(iso: string): string {
    const d = new Date(iso);
    const local = new Date(d.getTime() - 5 * 3600000);
    return local.toISOString().split('T')[0];
}

function bogotaTimeLabel(iso: string): string {
    return new Date(iso).toLocaleTimeString('es-CO', {
        timeZone: BOGOTA_TZ, hour: '2-digit', minute: '2-digit', hour12: false,
    });
}

function bogotaDateLabel(iso: string): string {
    return new Date(iso).toLocaleDateString('es-CO', {
        timeZone: BOGOTA_TZ, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
}

export default function SchedulePage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');

    const [jobs, setJobs] = useState<any[]>([]);
    const [team, setTeam] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [filterMember, setFilterMember] = useState<string>('ALL');

    // Assignment modal state
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedJob, setSelectedJob] = useState<any>(null);
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleTime, setScheduleTime] = useState('');
    const [assignedTo, setAssignedTo] = useState('');
    const [saving, setSaving] = useState(false);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === 'aaronbebe') {
            setIsAuthenticated(true);
            fetchAll();
            toast.success('Acceso Autorizado');
        } else {
            toast.error('Contraseña incorrecta');
        }
    };

    const fetchAll = async () => {
        try {
            setIsLoading(true);
            const [jobsRes, teamRes] = await Promise.all([
                fetch('/api/jobs', { cache: 'no-store' }),
                fetch('/api/team', { cache: 'no-store' }),
            ]);
            const jobsData = await jobsRes.json();
            const teamData = await teamRes.json();
            if (Array.isArray(jobsData)) setJobs(jobsData);
            if (Array.isArray(teamData)) setTeam(teamData);
        } catch (error) {
            console.error(error);
            toast.error('Error al cargar datos');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAssignSchedule = async (clear = false) => {
        if (!selectedJob) return;
        setSaving(true);
        try {
            const payload: any = {
                assigned_to: assignedTo || null,
                scheduled_at: clear ? null : (scheduleDate ? toBogotaISO(scheduleDate, scheduleTime || '09:00') : null),
            };

            const res = await fetch(`/api/jobs/${selectedJob.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                toast.success(clear ? 'Asignación eliminada' : 'Horario guardado');
                setIsAssignModalOpen(false);
                fetchAll();
            } else if (res.status === 409) {
                const data = await res.json();
                const who = team.find(t => t.id === assignedTo)?.name || 'esta persona';
                const conflictTitles = (data.conflicts || []).map((c: any) => `"${c.title}"`).join(', ');
                toast.error(`Choque de horario para ${who}: ya tiene ${conflictTitles} en ese rango.`);
            } else {
                toast.error('Error al guardar el horario');
            }
        } catch (error) {
            toast.error('Error de conexión');
        } finally {
            setSaving(false);
        }
    };

    const openAssignModal = (job: any) => {
        setSelectedJob(job);
        if (job.scheduled_at) {
            setScheduleDate(bogotaDateKey(job.scheduled_at));
            setScheduleTime(bogotaTimeLabel(job.scheduled_at));
        } else {
            setScheduleDate(new Date().toLocaleDateString('en-CA', { timeZone: BOGOTA_TZ }));
            setScheduleTime('09:00');
        }
        setAssignedTo(job.assigned_to || '');
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

    const visibleJobs = filterMember === 'ALL'
        ? jobs
        : filterMember === 'NONE'
            ? jobs.filter(j => !j.assigned_to)
            : jobs.filter(j => j.assigned_to === filterMember);

    const scheduledJobs = visibleJobs.filter(j => j.scheduled_at);
    const unassignedJobs = visibleJobs.filter(j => !j.scheduled_at && j.status !== 'COMPLETED');

    const groupedByDate = scheduledJobs.reduce((acc, job) => {
        const key = bogotaDateKey(job.scheduled_at);
        if (!acc[key]) acc[key] = [];
        acc[key].push(job);
        return acc;
    }, {} as Record<string, any[]>);

    const sortedDateKeys = Object.keys(groupedByDate).sort();

    const roleColor = (role: string) => role === 'CEO' ? 'text-amber-400 bg-amber-400/10' : 'text-blue-400 bg-blue-400/10';

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-12 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 uppercase">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-white uppercase flex items-center gap-4">
                        <Calendar className="text-brand-red" size={36} /> Horario
                    </h1>
                    <p className="text-white/30 text-xs font-bold uppercase tracking-[0.2em] mt-3">
                        Asignación de turnos y carga de trabajo
                    </p>
                </div>

                {/* Filter by person */}
                <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => setFilterMember('ALL')} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${filterMember === 'ALL' ? 'bg-brand-red text-white border-white/10' : 'bg-white/5 text-white/40 border-white/10 hover:text-white'}`}>Todos</button>
                    {team.map(m => (
                        <button key={m.id} onClick={() => setFilterMember(m.id)} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${filterMember === m.id ? 'bg-brand-red text-white border-white/10' : 'bg-white/5 text-white/40 border-white/10 hover:text-white'}`}>{m.name}</button>
                    ))}
                    <button onClick={() => setFilterMember('NONE')} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${filterMember === 'NONE' ? 'bg-brand-red text-white border-white/10' : 'bg-white/5 text-white/40 border-white/10 hover:text-white'}`}>Sin asignar</button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Scheduled */}
                <div className="lg:col-span-2 space-y-8">
                    <h2 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-3">
                        <CheckCircle2 className="text-green-500" size={20} /> Asignados
                    </h2>

                    {sortedDateKeys.length === 0 ? (
                        <GlassCard className="p-10 text-center border border-white/5 border-dashed">
                            <Calendar className="mx-auto text-white/10 mb-4" size={48} />
                            <p className="text-white/30 text-xs font-black uppercase tracking-widest">El calendario está vacío</p>
                        </GlassCard>
                    ) : (
                        sortedDateKeys.map(dateKey => (
                            <div key={dateKey} className="space-y-4">
                                <h3 className="text-[10px] font-black text-brand-red uppercase tracking-[0.2em] sticky top-20 bg-[#0A0A0A]/80 backdrop-blur-md py-2 z-10 border-b border-white/5">
                                    {bogotaDateLabel(groupedByDate[dateKey][0].scheduled_at)}
                                </h3>
                                <div className="grid gap-4">
                                    {groupedByDate[dateKey]
                                        .sort((a: any, b: any) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
                                        .map((job: any) => (
                                            <div key={job.id} onClick={() => openAssignModal(job)} className="cursor-pointer group">
                                                <GlassCard className="p-5 border-l-4 border-l-brand-red hover:bg-white/5 transition-all">
                                                    <div className="flex justify-between items-start gap-4">
                                                        <div>
                                                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                                                                <span className="bg-brand-red/20 text-brand-red px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                                                                    <Clock size={12} /> {bogotaTimeLabel(job.scheduled_at)}
                                                                </span>
                                                                <span className="text-white/30 text-[10px] font-bold uppercase tracking-wider">
                                                                    ~ {job.estimated_minutes || 0} min est.
                                                                    {job.actual_minutes ? ` · ${job.actual_minutes} min real` : ''}
                                                                </span>
                                                                {job.assigned_to_name && (
                                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${roleColor(job.assigned_to_role)}`}>
                                                                        <User size={12} /> {job.assigned_to_name}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <h4 className="text-lg font-black text-white uppercase tracking-tight">{job.title}</h4>
                                                            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1 flex items-center gap-1.5">
                                                                <Briefcase size={12} /> {job.client_name}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </GlassCard>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Unassigned queue */}
                <div className="space-y-6">
                    <h2 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-3">
                        <Briefcase className="text-white/40" size={20} /> Por Agendar
                    </h2>

                    <GlassCard className="p-6 bg-white/[0.02]">
                        <div className="space-y-4">
                            {unassignedJobs.length === 0 ? (
                                <p className="text-white/20 text-[10px] font-black uppercase tracking-widest text-center py-10">Todo está agendado</p>
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
                                        {job.assigned_to_name && (
                                            <p className="text-[9px] font-black text-blue-400 uppercase mt-2 flex items-center gap-1"><User size={10} /> {job.assigned_to_name}</p>
                                        )}
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
                            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">
                                Estimado: {selectedJob.estimated_minutes || 0} min
                                {selectedJob.actual_minutes ? ` · Real: ${selectedJob.actual_minutes} min` : ''}
                            </p>
                        </div>

                        {/* Assignee */}
                        <div className="space-y-2 uppercase">
                            <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] pl-4 flex items-center gap-2"><Users size={12} /> Asignar a</label>
                            <select
                                value={assignedTo}
                                onChange={(e) => setAssignedTo(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white outline-none focus:border-brand-red/30 transition-all uppercase"
                            >
                                <option value="" className="bg-brand-dark">Sin asignar</option>
                                {team.map(m => (
                                    <option key={m.id} value={m.id} className="bg-brand-dark">{m.name} ({m.role === 'CEO' ? 'CEO' : 'Diseñador'})</option>
                                ))}
                            </select>
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

                        {!assignedTo && scheduleDate && (
                            <p className="text-[10px] font-bold text-amber-400/80 flex items-center gap-2 px-2">
                                <AlertTriangle size={14} /> Sin persona asignada no se valida choque de horario.
                            </p>
                        )}

                        <div className="flex gap-4 pt-4 uppercase">
                            <button
                                onClick={() => handleAssignSchedule(true)}
                                disabled={saving}
                                className="flex-1 py-4 rounded-2xl bg-white/5 text-white/40 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-red-400 transition-all border border-transparent hover:border-red-500/30 disabled:opacity-40"
                            >
                                Quitar del Horario
                            </button>
                            <button
                                onClick={() => handleAssignSchedule(false)}
                                disabled={saving}
                                className="flex-1 py-4 rounded-2xl bg-brand-red text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-600 shadow-xl shadow-brand-red/20 transition-all border border-white/10 disabled:opacity-40"
                            >
                                {saving ? 'Guardando…' : 'Guardar Horario'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
