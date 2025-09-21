import React, { useState, useEffect } from 'react';
import { X, Trophy, FileText, Users, ArrowLeft, MapPin, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useCreateTeam } from '../hooks/useQueries';
import { useGetUserClubs } from '../hooks/useQueries';

interface TeamCreateModalProps {
  clubId: string;
  onClose: () => void;
  onTeamCreated?: () => void;
}

export default function TeamCreateModal({ clubId, onClose, onTeamCreated }: TeamCreateModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string>('');
  const { mutate: createTeam, isPending, error } = useCreateTeam();
  const { data: clubs } = useGetUserClubs();

  const club = clubs?.find(c => c.id.toString() === clubId);
  const clubName = club?.name || 'Unknown Club';

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

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Team name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const teamData = {
      clubId,
      name: formData.name.trim(),
      description: formData.description.trim(),
    };

    createTeam(teamData, {
      onSuccess: (newTeam) => {
        console.log('Team created successfully:', newTeam);
        setSuccessMessage(`✅ Team "${newTeam.name}" created successfully! You have been automatically assigned as Team Admin.`);
        
        // Notify parent component that team was created
        if (onTeamCreated) {
          onTeamCreated();
        }
        
        // Show success message for 2 seconds, then close
        setTimeout(() => {
          onClose();
        }, 2000);
      },
      onError: (error) => {
        console.error('Team creation failed:', error);
      }
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const getDisplayError = (error: unknown): string => {
    if (error instanceof Error) {
      return error.message;
    }
    
    return 'Technical error during team creation. Please try again.';
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col" style={{
      position: 'fixed',
      top: '0',
      right: '0',
      bottom: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      margin: '0',
      padding: '0',
      border: 'none',
      borderRadius: '0',
      zIndex: 9999
    }}>
      <div className="flex items-center justify-between p-4 border-b border-slate-800/50 bg-slate-900/95 backdrop-blur-sm sticky top-0 z-10" style={{
        position: 'sticky',
        top: '0',
        margin: '0',
        paddingTop: 'max(env(safe-area-inset-top), 1rem)',
        paddingBottom: '1rem',
        paddingLeft: 'max(env(safe-area-inset-left), 1rem)',
        paddingRight: 'max(env(safe-area-inset-right), 1rem)'
      }}>
        <button
          onClick={onClose}
          className="p-2 -ml-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
          disabled={isPending}
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-semibold text-slate-100">Create Team</h1>
          <p className="text-sm text-slate-400">{clubName}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 -mr-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
          disabled={isPending}
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mx-4 mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center space-x-3">
          <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-emerald-400 font-medium text-sm">{successMessage}</p>
            <p className="text-emerald-300 text-xs mt-1">
              Closing automatically... Your new team will appear in the club's Teams tab immediately.
            </p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-red-400 text-sm font-medium">
              {getDisplayError(error)}
            </p>
            <p className="text-red-300 text-xs mt-1">
              Please check your information and try again.
            </p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isPending && (
        <div className="mx-4 mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center space-x-3">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin flex-shrink-0" />
          <div className="flex-1">
            <p className="text-blue-400 font-medium text-sm">Creating your team...</p>
            <p className="text-blue-300 text-xs mt-1">
              Setting up team structure and automatically assigning you as Team Admin.
            </p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 pb-32">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-300">
                <Trophy className="w-4 h-4 inline mr-2" />
                Team Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`input-mobile ${errors.name ? 'input-error' : ''}`}
                placeholder="Enter team name"
                disabled={isPending}
                autoFocus
              />
              {errors.name && <p className="text-red-400 text-sm mt-2">{errors.name}</p>}
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-300">
                <FileText className="w-4 h-4 inline mr-2" />
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className={`input-mobile min-h-[120px] resize-none ${errors.description ? 'input-error' : ''}`}
                placeholder="Describe your team"
                disabled={isPending}
              />
              {errors.description && <p className="text-red-400 text-sm mt-2">{errors.description}</p>}
            </div>

            {formData.name && formData.description && (
              <div className="card p-4 bg-emerald-500/10 border-emerald-500/20">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-slate-200 font-medium">{formData.name}</p>
                    <p className="text-slate-400 text-sm">Part of {clubName}</p>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

      <div className="border-t border-slate-800/50 p-4 bg-slate-900/95 backdrop-blur-sm sticky bottom-0 z-10" style={{
        position: 'sticky',
        bottom: '0',
        margin: '0',
        paddingTop: '1rem',
        paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)',
        paddingLeft: 'max(env(safe-area-inset-left), 1rem)',
        paddingRight: 'max(env(safe-area-inset-right), 1rem)'
      }}>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary-mobile"
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isPending || !formData.name.trim() || !formData.description.trim()}
            className={`btn-primary-mobile ${isPending ? 'btn-loading' : ''}`}
          >
            {isPending ? 'Creating Team...' : 'Create Team'}
          </button>
        </div>
      </div>
    </div>
  );
}
