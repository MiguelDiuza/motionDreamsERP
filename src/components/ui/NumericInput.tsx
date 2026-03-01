'use client';

import React, { useState, useEffect, useRef } from 'react';

interface NumericInputProps {
    value: string;                      // raw numeric string, e.g. "2000000"
    onChange: (raw: string) => void;    // returns raw numeric string without formatting
    placeholder?: string;
    className?: string;
    id?: string;
}

/**
 * Input that displays numbers formatted with es-CO locale (dots as thousands separator)
 * while keeping the raw numeric string for form state / API calls.
 *
 * Example: user types 2000000 → displays "2.000.000" → onChange receives "2000000"
 */
const NumericInput: React.FC<NumericInputProps> = ({
    value,
    onChange,
    placeholder = '0',
    className = '',
    id,
}) => {
    // Format a raw numeric string for display
    const format = (raw: string): string => {
        if (!raw) return '';
        const num = parseFloat(raw.replace(/[^0-9]/g, ''));
        if (isNaN(num)) return '';
        return num.toLocaleString('es-CO');
    };

    const [display, setDisplay] = useState(() => format(value));

    // Sync display when controlled value changes externally (e.g. reset form)
    useEffect(() => {
        setDisplay(format(value));
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Strip everything except digits
        const raw = e.target.value.replace(/[^0-9]/g, '');
        setDisplay(format(raw));
        onChange(raw);
    };

    return (
        <input
            id={id}
            type="text"
            inputMode="numeric"
            value={display}
            onChange={handleChange}
            placeholder={placeholder}
            className={className}
        />
    );
};

export default NumericInput;
