import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}: EmptyStateProps) {
  return (
    <div className="card p-8 text-center">
      <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <Icon className="w-8 h-8 text-slate-600" />
      </div>
      <h3 className="text-xl font-semibold text-slate-100 mb-3">{title}</h3>
      <p className="text-slate-400 leading-relaxed mb-6">{description}</p>
      {(actionLabel || secondaryActionLabel) && (
        <div className="space-y-3">
          {actionLabel && onAction && (
            <button onClick={onAction} className="btn-primary-mobile">
              {actionLabel}
            </button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <button onClick={onSecondaryAction} className="btn-secondary-mobile">
              {secondaryActionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
