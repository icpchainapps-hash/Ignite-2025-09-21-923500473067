import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingCardProps {
  title?: string;
  message?: string;
  count?: number;
}

export default function LoadingCard({ title, message, count = 3 }: LoadingCardProps) {
  return (
    <div className="space-y-4">
      {title && (
        <div className="text-center py-4">
          <div className="inline-flex items-center space-x-3 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium">{title}</span>
          </div>
          {message && <p className="text-slate-500 text-xs mt-1">{message}</p>}
        </div>
      )}
      
      {[...Array(count)].map((_, i) => (
        <div key={i} className="card p-4 animate-pulse">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-slate-700 rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-slate-700 rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-slate-700 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
