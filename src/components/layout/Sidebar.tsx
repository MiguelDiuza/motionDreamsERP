'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Users,
    Briefcase,
    Wallet,
    ChevronLeft,
    ChevronRight,
    LayoutDashboard,
    Menu,
    X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Sidebar = () => {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const menuItems = [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
        { name: 'Clientes & Cuentas', icon: Users, path: '/clients' },
        { name: 'Flujo de Trabajo', icon: Briefcase, path: '/workflow' },
        { name: 'Finanzas & Gastos', icon: Wallet, path: '/finances' },
    ];

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [pathname]);

    return (
        <>
            {/* Mobile Hamburger Button */}
            <div className="lg:hidden fixed top-6 right-6 z-[100]">
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-3 bg-brand-red text-white rounded-2xl shadow-xl shadow-brand-red/20 border border-white/10"
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="fixed inset-0 bg-black/90 backdrop-blur-md z-[80] lg:hidden"
                        />
                        <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed top-0 left-0 bottom-0 w-80 bg-brand-dark border-r border-white/5 z-[90] lg:hidden flex flex-col p-8"
                        >
                            <div className="mb-12">
                                <img src="/img/logo-white.svg" alt="Motion Dreams" className="h-10 w-auto" />
                            </div>

                            <nav className="flex-1 space-y-4">
                                {menuItems.map((item) => (
                                    <Link key={item.path} href={item.path}>
                                        <div className={`
                      flex items-center gap-4 p-5 rounded-2xl transition-all
                      ${pathname === item.path ? 'bg-brand-red text-white' : 'text-white/40 hover:text-white'}
                    `}>
                                            <item.icon size={24} />
                                            <span className="font-bold uppercase tracking-widest text-sm">{item.name}</span>
                                        </div>
                                    </Link>
                                ))}
                            </nav>

                            <div className="mt-auto pt-8 border-t border-white/5">
                                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                                    <div className="w-10 h-10 rounded-full bg-brand-red flex items-center justify-center font-bold text-white">MA</div>
                                    <div>
                                        <p className="text-xs font-bold uppercase text-white">Miguel Diuza</p>
                                        <p className="text-[10px] text-brand-red font-bold uppercase">Admin Studio</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Desktop Sidebar */}
            <motion.div
                initial={false}
                animate={{ width: isCollapsed ? 100 : 300 }}
                className="hidden lg:flex h-screen sticky top-0 bg-brand-dark border-r border-white/5 flex-col z-[100]"
            >
                {/* Brand Logo Section */}
                <div className="p-8 mb-6 flex items-center justify-between h-24">
                    <AnimatePresence mode="wait">
                        {!isCollapsed ? (
                            <motion.div
                                key="full-logo"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="flex items-center gap-3"
                            >
                                <img src="/img/logo-white.svg" alt="Motion Dreams" className="h-10 w-auto" />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="fav-logo"
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                className="mx-auto"
                            >
                                <img src="/img/favicon.svg" alt="MD" className="w-10 h-10" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Improved Toggle Button - Truly Absolute Positioned outside container */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute top-12 right-0 translate-x-1/2 w-8 h-8 bg-brand-red rounded-full flex items-center justify-center text-white shadow-xl shadow-brand-red/30 border-2 border-black z-[110] transition-transform active:scale-90 hover:scale-110"
                >
                    {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>

                {/* Navigation Links */}
                <nav className="flex-1 px-4 space-y-3">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.path;
                        return (
                            <Link key={item.path} href={item.path}>
                                <div className={`
                  group flex items-center gap-4 p-4 rounded-2xl transition-all relative
                  ${isActive
                                        ? 'bg-brand-red text-white shadow-lg shadow-brand-red/20'
                                        : 'text-white/40 hover:bg-white/5 hover:text-white'}
                `}>
                                    <item.icon size={22} className={isActive ? 'text-white' : 'group-hover:text-brand-red transition-colors'} />
                                    <AnimatePresence>
                                        {!isCollapsed && (
                                            <motion.span
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -10 }}
                                                className="font-bold text-xs uppercase tracking-widest whitespace-nowrap"
                                            >
                                                {item.name}
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </Link>
                        );
                    })}
                </nav>

                {/* User Session Footer */}
                <div className="p-6 border-t border-white/5 mt-auto">
                    <div className={`
            flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 transition-all
            ${isCollapsed ? 'justify-center p-2' : ''}
          `}>
                        <div className="w-10 h-10 flex-shrink-0 rounded-full bg-brand-red flex items-center justify-center font-bold text-sm text-white shadow-lg shadow-brand-red/20">
                            MA
                        </div>
                        {!isCollapsed && (
                            <div className="flex-1 overflow-hidden">
                                <p className="text-xs font-bold uppercase text-white truncate">Miguel Diuza</p>
                                <p className="text-[10px] text-brand-red font-bold uppercase tracking-tighter truncate">Admin Studio</p>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </>
    );
};

export default Sidebar;
