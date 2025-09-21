import React, { useEffect } from 'react';
import { X, ArrowLeft, LucideIcon } from 'lucide-react';

interface BaseModalProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  onBack?: () => void;
  rightIcon?: LucideIcon;
  onRightIconClick?: () => void;
  rightIconTitle?: string;
  disabled?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
  showCloseButton?: boolean;
}

export default function BaseModal({
  title,
  subtitle,
  onClose,
  onBack,
  rightIcon: RightIcon,
  onRightIconClick,
  rightIconTitle,
  disabled = false,
  children,
  footer,
  showCloseButton = true,
}: BaseModalProps) {
  useEffect(() => {
    document.body.classList.add('modal-open');
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    document.body.style.top = '0';
    document.body.style.left = '0';
    
    return () => {
      document.body.classList.remove('modal-open');
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.body.style.top = '';
      document.body.style.left = '';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-slate-800/50 bg-slate-900/95 backdrop-blur-sm sticky top-0 z-10">
        <button
          onClick={onBack || onClose}
          className="p-2 -ml-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
          disabled={disabled}
        >
          {onBack ? <ArrowLeft className="w-6 h-6" /> : <ArrowLeft className="w-6 h-6" />}
        </button>
        <div className="text-center">
          <h1 className="text-lg font-semibold text-slate-100">{title}</h1>
          {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
        </div>
        <div className="flex items-center space-x-2">
          {RightIcon && onRightIconClick && (
            <button
              onClick={onRightIconClick}
              className="p-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
              title={rightIconTitle}
              disabled={disabled}
            >
              <RightIcon className="w-5 h-5" />
            </button>
          )}
          {showCloseButton && (
            <button
              onClick={onClose}
              className="p-2 -mr-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
              disabled={disabled}
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 pb-32">
          {children}
        </div>
      </div>

      {footer && (
        <div className="border-t border-slate-800/50 p-4 bg-slate-900/95 backdrop-blur-sm sticky bottom-0 z-10">
          {footer}
        </div>
      )}
    </div>
  );
}
