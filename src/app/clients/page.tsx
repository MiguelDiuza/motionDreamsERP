'use client';

import React, { useState, useEffect } from 'react';
import ClientTable from '@/components/clients/ClientTable';
import Modal from '@/components/ui/Modal';
import GlassCard from '@/components/ui/GlassCard';
import NumericInput from '@/components/ui/NumericInput';
import { generateAccountStatementPDF } from '@/lib/pdfGenerator';
import { Plus, Search, Filter, UserPlus, Phone, Building } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function ClientsPage() {
    const [clients, setClients] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'add_charge' | 'add_payment' | 'add_client' | 'full_settlement' | null>(null);
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Form States
    const [inputValue, setInputValue] = useState('');
    const [newClient, setNewClient] = useState({ name: '', company_name: '', phone: '' });

    const fetchClients = async () => {
        try {
            setIsLoading(true);
            const res = await fetch('/api/clients');
            const data = await res.json();

            if (Array.isArray(data)) {
                setClients(data);
            } else {
                console.error('API did not return an array:', data);
                setClients([]);
                toast.error('Error de formato en los datos de clientes');
            }
        } catch (error) {
            console.error('Fetch error:', error);
            setClients([]);
            toast.error('Error al conectar con el servidor');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchClients();
    }, []);

    const handleAction = (action: string, client: any) => {
        setSelectedClient(client);
        if (action === 'add_charge') {
            setModalType('add_charge');
            setIsModalOpen(true);
        } else if (action === 'add_payment') {
            setModalType('add_payment');
            setIsModalOpen(true);
        } else if (action === 'full_settlement') {
            setModalType('full_settlement');
            setInputValue(client.total_debt.toString());
            setIsModalOpen(true);
        } else if (action === 'print') {
            toast.promise(
                (async () => {
                    // Fetch the client's jobs to include in the PDF
                    const jobsRes = await fetch(`/api/clients/${client.id}/jobs`);
                    const jobs = jobsRes.ok ? await jobsRes.json() : [];
                    await generateAccountStatementPDF(client, client.total_debt, Array.isArray(jobs) ? jobs : []);
                })(),
                {
                    loading: 'Generando PDF con detalle de productos...',
                    success: `Estado de cuenta de ${client.name} generado`,
                    error: 'Error al generar el PDF',
                }
            );
        } else if (action === 'delete') {
            if (confirm(`¿Estás seguro de eliminar a ${client.name}?`)) {
                toast.promise(
                    fetch(`/api/clients/${client.id}`, { method: 'DELETE' }),
                    {
                        loading: 'Eliminando...',
                        success: () => {
                            fetchClients();
                            return `Cliente ${client.name} eliminado`;
                        },
                        error: 'No se pudo eliminar el cliente'
                    }
                );
            }
        }
    };

    const handleSubmit = async () => {
        if (modalType === 'add_client') {
            if (!newClient.name) return toast.warning('El nombre es obligatorio');

            try {
                const res = await fetch('/api/clients', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newClient)
                });

                if (res.ok) {
                    toast.success(`Cliente ${newClient.name} registrado`);
                    setIsModalOpen(false);
                    setNewClient({ name: '', company_name: '', phone: '' });
                    fetchClients();
                }
            } catch (error) {
                toast.error('Error al registrar cliente');
            }
        }

        if (modalType === 'add_charge') {
            const amount = parseFloat(inputValue);
            if (isNaN(amount) || amount <= 0) return toast.warning('Valor inválido');

            try {
                const res = await fetch(`/api/clients/${selectedClient.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount, action: 'add_charge' })
                });

                if (res.ok) {
                    toast.success(`Cargo de $${amount.toLocaleString('es-CO')} añadido`);
                    setIsModalOpen(false);
                    setInputValue('');
                    fetchClients();
                }
            } catch (error) {
                toast.error('Error al actualizar saldo');
            }
        }

        if (modalType === 'add_payment' || modalType === 'full_settlement') {
            const amount = parseFloat(inputValue);
            if (isNaN(amount) || amount <= 0) return toast.warning('Valor inválido');

            try {
                console.log('[handleSubmit] Registering payment:', { client: selectedClient.name, amount, type: modalType });
                
                const res = await fetch('/api/payments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        client_id: selectedClient.id,
                        amount: amount,
                        payment_method: modalType === 'full_settlement' ? 'Liquidación Total' : 'Abono Cuenta',
                        notes: modalType === 'full_settlement' ? 'Liquidación completa de la deuda' : 'Abono parcial'
                    })
                });

                if (res.ok) {
                    const payment = await res.json();
                    console.log('[handleSubmit] Payment registered:', payment);
                    
                    toast.success(modalType === 'full_settlement' ? '✅ ¡Deuda liquidada con éxito!' : `✅ Abono de $${amount.toLocaleString('es-CO')} registrado`);
                    setIsModalOpen(false);
                    setInputValue('');
                    
                    // Refrescar después de 300ms para asegurar que la BD registró el cambio
                    setTimeout(() => {
                        console.log('[handleSubmit] Refreshing clients after payment');
                        fetchClients();
                    }, 300);
                } else {
                    const error = await res.json();
                    throw new Error(error.error || 'Error desconocido al registrar pago');
                }
            } catch (error: any) {
                console.error('[handleSubmit] Error registering payment:', error);
                toast.error(`Error: ${error.message}`);
            }
        }
    };

    const filteredClients = Array.isArray(clients) ? clients.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
    ) : [];

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-12 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 uppercase">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-white">
                        Clientes <span className="text-brand-red">&</span> Cuentas
                    </h1>
                    <p className="text-white/30 text-xs font-bold tracking-[0.2em] mt-3">
                        Gestión de Cartera y Facturación Real (PostgreSQL)
                    </p>
                </div>

                <button
                    onClick={() => { setModalType('add_client'); setIsModalOpen(true); }}
                    className="flex items-center gap-3 px-8 py-4 bg-brand-red hover:bg-red-600 text-white text-xs font-black rounded-full transition-all border border-white/10 uppercase tracking-widest group shadow-[0_10px_30px_rgba(242,15,15,0.2)]"
                >
                    <UserPlus size={18} /> Nuevo Cliente
                </button>
            </div>

            {/* Search & Stats Bar */}
            <div className="flex flex-col lg:flex-row gap-6 uppercase">
                <GlassCard className="flex-1 p-4 rounded-[2rem]">
                    <div className="flex items-center gap-4">
                        <Search size={18} className="text-white/20" />
                        <input
                            type="text"
                            placeholder="Buscar por cliente o empresa..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-transparent border-none outline-none text-white text-sm font-bold w-full uppercase placeholder:text-white/10"
                        />
                    </div>
                </GlassCard>

                <div className="flex gap-4">
                    <div className="glass p-4 px-8 rounded-[2rem] flex flex-col justify-center border-l-4 border-l-brand-red">
                        <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Deuda Total Cartera</p>
                        <p className="text-xl font-black text-brand-red mt-1">
                            ${clients.reduce((acc, c) => acc + parseFloat(c.total_debt || 0), 0).toLocaleString('es-CO')}
                        </p>
                    </div>
                    <button className="glass p-4 px-6 rounded-[2rem] text-white hover:bg-white/5 transition-all">
                        <Filter size={18} />
                    </button>
                </div>
            </div>

            {/* Main Table Container */}
            {isLoading ? (
                <div className="flex justify-center p-20">
                    <div className="w-12 h-12 border-4 border-brand-red border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <ClientTable
                    clients={filteredClients.map(c => ({
                        id: c.id,
                        name: c.name,
                        company: c.company_name,
                        total_debt: parseFloat(c.total_debt || 0),
                        last_work_date: c.updated_at
                    }))}
                    onAction={handleAction}
                />
            )}

            {/* Action Modals */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={
                    modalType === 'add_charge' ? `Agregar Cargo a ${selectedClient?.name}` :
                        modalType === 'add_payment' ? `Registrar Abono - ${selectedClient?.name}` :
                            modalType === 'full_settlement' ? `Liquidación Total - ${selectedClient?.name}` :
                                'Registrar Nuevo Cliente'
                }
            >
                <div className="space-y-6">
                    {modalType === 'add_client' ? (
                        <div className="space-y-4">
                            <FormField
                                icon={UserPlus}
                                label="Nombre Completo"
                                value={newClient.name}
                                onChange={(v: string) => setNewClient({ ...newClient, name: v })}
                                placeholder="Ej. Juan Pérez"
                            />
                            <FormField
                                icon={Building}
                                label="Empresa / Marca"
                                value={newClient.company_name}
                                onChange={(v: string) => setNewClient({ ...newClient, company_name: v })}
                                placeholder="Ej. Tech Studio"
                            />
                            <FormField
                                icon={Phone}
                                label="WhatsApp / Celular"
                                value={newClient.phone}
                                onChange={(v: string) => setNewClient({ ...newClient, phone: v })}
                                placeholder="312 000 0000"
                            />
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest pl-4">
                                {modalType === 'full_settlement' ? 'Total por Salder (COP)' : 'Valor en Pesos (COP)'}
                            </label>
                            <div className="relative">
                                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-brand-red font-black text-xl">$</span>
                                <NumericInput
                                    value={inputValue}
                                    onChange={setInputValue}
                                    className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] py-5 pl-12 pr-6 text-white font-black text-2xl outline-none focus:border-brand-red/50 transition-all uppercase placeholder:opacity-10 disabled:opacity-50"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 pt-4 uppercase">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="py-4 rounded-2xl bg-white/5 text-white/40 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="py-4 rounded-2xl bg-brand-red text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-600 shadow-xl shadow-brand-red/20 transition-all border border-white/10"
                        >
                            Confirmar Operación
                        </button>
                    </div>

                    <p className="text-center text-[9px] text-white/20 font-bold uppercase mt-4">
                        Esta acción se registrará permanentemente en PostgreSQL.
                    </p>
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
