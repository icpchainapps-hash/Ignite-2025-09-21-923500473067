import React from 'react';
import { LucideIcon } from 'lucide-react';

interface FormTextareaProps {
  label: string;
  icon?: LucideIcon;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  minHeight?: string;
  maxLength?: number;
}

export default function FormTextarea({
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  error,
  disabled = false,
  required = false,
  minHeight = '120px',
  maxLength,
}: FormTextareaProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-300">
        {Icon && <Icon className="w-4 h-4 inline mr-2" />}
        {label} {required && '*'}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`input-mobile resize-none ${error ? 'input-error' : ''}`}
        style={{ minHeight }}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
      />
      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
    </div>
  );
}
