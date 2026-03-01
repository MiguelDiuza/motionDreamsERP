'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface PriorityIconProps {
    priority: number; // 1-5
}

const PriorityIcon: React.FC<PriorityIconProps> = ({ priority }) => {
    if (priority >= 4) {
        // Fire Effect (Urgent)
        return (
            <motion.div
                className="relative w-8 h-8 flex items-center justify-center"
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
            >
                <span className="text-2xl filter drop-shadow-[0_0_8px_rgba(242,15,15,0.8)]">🔥</span>
                <motion.div
                    className="absolute inset-0 bg-brand-red/20 blur-xl rounded-full"
                    animate={{ opacity: [0.2, 0.5, 0.2] }}
                    transition={{ duration: 2, repeat: Infinity }}
                />
            </motion.div>
        );
    }

    if (priority <= 1) {
        // Ice Effect (Low Priority)
        return (
            <motion.div
                className="relative w-8 h-8 flex items-center justify-center"
            >
                <span className="text-2xl filter drop-shadow-[0_0_8px_rgba(100,200,255,0.5)]">❄️</span>
                <motion.div
                    className="absolute inset-0 bg-blue-500/10 blur-xl rounded-full"
                    animate={{ opacity: [0.1, 0.3, 0.1] }}
                    transition={{ duration: 3, repeat: Infinity }}
                />
            </motion.div>
        );
    }

    return (
        <div className="w-8 h-8 flex items-center justify-center text-white/20 font-black text-xs border border-white/10 rounded-full">
            {priority}
        </div>
    );
};

export default PriorityIcon;
