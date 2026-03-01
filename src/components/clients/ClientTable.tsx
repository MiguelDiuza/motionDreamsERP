'use client';

import React, { useState, useRef } from 'react';
import {
    MoreVertical,
    PlusCircle,
    DollarSign,
    Printer,
    AlertCircle,
    CheckCircle2,
    Trash2,
    FileCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Client {
    id: string;
    name: string;
    company: string;
    total_debt: number;
    last_work_date: string;
}

interface ClientTableProps {
    clients: Client[];
    onAction: (action: string, client: Client) => void;
}

const ClientTable: React.FC<ClientTableProps> = ({ clients, onAction }) => {
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

    const sortedClients = [...clients].sort((a, b) => {
        if (a.total_debt === 0 && b.total_debt > 0) return 1;
        if (b.total_debt === 0 && a.total_debt > 0) return -1;
        return b.total_debt - a.total_debt;
    });

    const checkIsOverdue = (dateString: string) => {
        if (!dateString) return false;
        const lastDate = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 15;
    };

    const handleMenuOpen = (e: React.MouseEvent<HTMLButtonElement>, clientId: string) => {
        e.stopPropagation();
        if (openMenuId === clientId) {
            setOpenMenuId(null);
            return;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        // Place menu below button, aligned to its right edge
        setMenuPos({
            top: rect.bottom + 8,
            left: rect.right - 240, // 240 = menu width
        });
        setOpenMenuId(clientId);
    };

    return (
        <div className="w-full overflow-x-auto custom-scrollbar">
            <table className="w-full border-separate border-spacing-y-4">
                <thead>
                    <tr className="text-white/20 text-[10px] font-black uppercase tracking-[0.2em]">
                        <th className="px-8 py-2 text-left">Cliente / Empresa</th>
                        <th className="px-8 py-2 text-left">Estado de Cuenta</th>
                        <th className="px-8 py-2 text-right">Saldo Pendiente</th>
                        <th className="px-8 py-2 text-center">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedClients.map((client) => {
                        const isPaid = client.total_debt <= 0;
                        const isOverdue = !isPaid && checkIsOverdue(client.last_work_date);

                        return (
                            <motion.tr
                                key={client.id}
                                layout
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className={`
                                    glass group transition-all duration-500
                                    ${isPaid ? 'opacity-40 grayscale hover:opacity-100 hover:grayscale-0' : ''}
                                    ${isOverdue ? 'border-l-4 border-brand-red' : 'border-l-4 border-transparent'}
                                `}
                            >
                                <td className="px-8 py-6 rounded-l-[2rem]">
                                    <div className={`font-black uppercase tracking-tight text-white ${isPaid ? 'line-through' : ''}`}>
                                        {client.name}
                                    </div>
                                    <div className="text-[10px] text-white/30 font-bold uppercase mt-1">
                                        {client.company}
                                    </div>
                                </td>

                                <td className="px-8 py-6">
                                    {isPaid ? (
                                        <div className="flex items-center gap-2 text-green-500 text-[10px] font-black uppercase tracking-widest bg-green-500/10 px-4 py-2 rounded-xl w-fit">
                                            <CheckCircle2 size={12} /> Saldo al Día
                                        </div>
                                    ) : isOverdue ? (
                                        <div className="flex items-center gap-2 text-brand-red text-[10px] font-black uppercase tracking-widest bg-brand-red/10 px-4 py-2 rounded-xl w-fit">
                                            <AlertCircle size={12} className="animate-pulse" /> Morosidad (+15 Días)
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-white/40 text-[10px] font-black uppercase tracking-widest bg-white/5 px-4 py-2 rounded-xl w-fit">
                                            Cuenta Activa
                                        </div>
                                    )}
                                </td>

                                <td className={`px-8 py-6 text-right font-mono font-black text-xl ${isPaid ? 'text-white/30' : isOverdue ? 'text-brand-red' : 'text-white'}`}>
                                    ${parseFloat(client.total_debt.toString()).toLocaleString('es-CO')}
                                </td>

                                <td className="px-8 py-6 rounded-r-[2rem] text-center">
                                    <div className="flex items-center justify-center">
                                        <button
                                            onClick={(e) => handleMenuOpen(e, client.id)}
                                            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white transition-all active:scale-95"
                                        >
                                            <MoreVertical size={18} />
                                        </button>
                                    </div>
                                </td>
                            </motion.tr>
                        );
                    })}
                </tbody>
            </table>

            {/* Dropdown rendered as fixed — escapes all overflow/z-index issues in the table */}
            <AnimatePresence>
                {openMenuId && (() => {
                    const client = sortedClients.find(c => c.id === openMenuId);
                    if (!client) return null;
                    return (
                        <>
                            <div
                                className="fixed inset-0 z-[140]"
                                onClick={() => setOpenMenuId(null)}
                            />
                            <motion.div
                                key={openMenuId}
                                initial={{ opacity: 0, scale: 0.95, y: -6 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -6 }}
                                transition={{ duration: 0.15 }}
                                style={{ top: menuPos.top, left: Math.max(8, menuPos.left) }}
                                className="fixed z-[150] w-60 bg-[#0A0A0A] border border-white/10 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden p-2 backdrop-blur-xl"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="px-4 py-3 border-b border-white/5 mb-1 text-left">
                                    <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">Acciones de Cuenta</p>
                                    <p className="text-xs font-black text-white uppercase mt-0.5 truncate">{client.name}</p>
                                </div>
                                <MenuButton icon={PlusCircle} label="Añadir Cargo" color="text-white" onClick={() => { onAction('add_charge', client); setOpenMenuId(null); }} />
                                <MenuButton icon={DollarSign} label="Registrar Abono" color="text-brand-red" onClick={() => { onAction('add_payment', client); setOpenMenuId(null); }} />
                                <MenuButton icon={FileCheck} label="Liquidación Total" color="text-green-500" onClick={() => { onAction('full_settlement', client); setOpenMenuId(null); }} />
                                <div className="h-px bg-white/5 my-1" />
                                <MenuButton icon={Printer} label="Estado de Cuenta" color="text-white/60" onClick={() => { onAction('print', client); setOpenMenuId(null); }} />
                                <MenuButton icon={Trash2} label="Eliminar Cliente" color="text-red-500/50" onClick={() => { onAction('delete', client); setOpenMenuId(null); }} />
                            </motion.div>
                        </>
                    );
                })()}
            </AnimatePresence>
        </div>
    );
};

function MenuButton({ icon: Icon, label, onClick, className, color }: any) {
    return (
        <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all
                hover:bg-white/5 group text-left
                ${className || 'text-white/60 hover:text-white'}
            `}
        >
            <Icon size={14} className={color || 'text-white/30 group-hover:text-white'} />
            <span className={color || ''}>{label}</span>
        </button>
    );
}

export default ClientTable;
