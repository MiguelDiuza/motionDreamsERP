'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge tailwind classes
 */
function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface GlassCardProps {
    children: React.ReactNode;
    className?: string;
    animate?: boolean;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, className, animate = true }) => {
    const Card = (
        <div className={cn(
            "glass p-6 rounded-[2rem] transition-all duration-300",
            className
        )}>
            {children}
        </div>
    );

    if (animate) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
            >
                {Card}
            </motion.div>
        );
    }

    return Card;
};

export default GlassCard;
