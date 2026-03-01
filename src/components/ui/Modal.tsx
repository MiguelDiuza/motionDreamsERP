'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    // Use portal to render outside of any overflow container
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Block body scroll while open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop — renders on document.body, covers 100% of viewport */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={{ position: 'fixed', inset: 0, zIndex: 9000 }}
                        className="bg-black/80 backdrop-blur-sm"
                    />

                    {/* Modal Container */}
                    <div
                        style={{ position: 'fixed', inset: 0, zIndex: 9001 }}
                        className="flex items-center justify-center pointer-events-none p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="w-full max-w-lg bg-brand-dark border border-white/10 rounded-[2.5rem] p-8 pointer-events-auto relative overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-8 relative z-10">
                                <h3 className="text-xl font-black text-white uppercase tracking-tighter">
                                    {title}
                                </h3>
                                <button
                                    onClick={onClose}
                                    className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="relative z-10">
                                {children}
                            </div>

                            {/* Background Accent */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-red/10 blur-[60px] rounded-full -mr-16 -mt-16" />
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default Modal;
