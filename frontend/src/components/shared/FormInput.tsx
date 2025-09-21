import React from 'react';
import { LucideIcon } from 'lucide-react';

interface FormInputProps {
  label: string;
  icon?: LucideIcon;
  type?: 'text' | 'email' | 'password' | 'date' | 'time' | 'number' | 'url';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  maxLength?: number;
  min?: string;
  max?: string;
}

export default function FormInput({
  label,
  icon: Icon,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  disabled = false,
  required = false,
  autoFocus = false,
  maxLength,
  min,
  max,
}: FormInputProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-300">
        {Icon && <Icon className="w-4 h-4 inline mr-2" />}
        {label} {required && '*'}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`input-mobile ${error ? 'input-error' : ''}`}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        maxLength={maxLength}
        min={min}
        max={max}
      />
      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
    </div>
  );
}
