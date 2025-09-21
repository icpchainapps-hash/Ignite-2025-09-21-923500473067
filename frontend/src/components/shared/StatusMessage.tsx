import React from 'react';
import { CheckCircle, AlertCircle, Loader2, Info } from 'lucide-react';

interface StatusMessageProps {
  type: 'success' | 'error' | 'loading' | 'info';
  title?: string;
  message: string;
  className?: string;
  onAction?: () => void;
  actionLabel?: string;
}

export default function StatusMessage({ 
  type, 
  title, 
  message, 
  className = '', 
  onAction, 
  actionLabel 
}: StatusMessageProps) {
  const getStatusConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle,
          bgColor: 'bg-emerald-500/10',
          borderColor: 'border-emerald-500/20',
          textColor: 'text-emerald-400',
          titleColor: 'text-emerald-400',
        };
      case 'error':
        return {
          icon: AlertCircle,
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/20',
          textColor: 'text-red-400',
          titleColor: 'text-red-400',
        };
      case 'loading':
        return {
          icon: Loader2,
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/20',
          textColor: 'text-blue-400',
          titleColor: 'text-blue-400',
        };
      case 'info':
        return {
          icon: Info,
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/20',
          textColor: 'text-blue-400',
          titleColor: 'text-blue-400',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={`p-3 ${config.bgColor} border ${config.borderColor} rounded-lg flex items-center space-x-2 ${className}`}>
      <Icon className={`w-5 h-5 ${config.textColor} shrink-0 ${type === 'loading' ? 'animate-spin' : ''}`} />
      <div className="flex-1">
        {title && <p className={`${config.titleColor} text-sm font-medium`}>{title}</p>}
        <p className={`${config.textColor} text-sm ${title ? 'mt-1' : ''}`}>{message}</p>
        {onAction && actionLabel && (
          <button
            onClick={onAction}
            className={`mt-2 text-xs font-medium hover:underline ${config.textColor}`}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
