import React, { useState } from 'react';
import { useSaveCallerUserProfile } from '../hooks/useQueries';
import { User, Sparkles, CheckCircle, AlertCircle } from 'lucide-react';

export default function ProfileSetupModal() {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { mutate: saveProfile, isPending, error } = useSaveCallerUserProfile();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && !isSubmitting) {
      setIsSubmitting(true);
      saveProfile({ 
        name: name.trim(),
        profilePicture: undefined,
        isProfileComplete: true
      }, {
        onSuccess: () => {
          // Profile saved successfully - the app will automatically update
          setIsSubmitting(false);
        },
        onError: (error) => {
          console.error('Profile setup failed:', error);
          setIsSubmitting(false);
        }
      });
    }
  };

  return (
    <div className="fixed inset-0 gradient-bg flex items-center justify-center px-6 z-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-4 rounded-2xl w-20 h-20 mx-auto mb-6 flex items-center justify-center shadow-2xl">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gradient mb-3">Welcome to Ignite!</h2>
          <p className="text-slate-400 leading-relaxed">
            Complete your profile setup to get started. This is required for all new users.
          </p>
        </div>

        {/* Mandatory Profile Setup Notice */}
        <div className="card p-4 mb-6 bg-blue-500/10 border-blue-500/20">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-blue-400 font-medium">Profile Setup Required</p>
              <p className="text-blue-400/80 text-sm">
                You must complete your profile before accessing the application. This ensures proper identification within clubs and teams.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-3">
              Display Name *
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="input text-lg py-4"
              required
              disabled={isPending || isSubmitting}
              autoFocus
            />
            <p className="text-slate-500 text-sm mt-2">
              This name will be visible to other users in clubs and teams.
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="card p-4 bg-red-500/10 border-red-500/20">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-red-400 font-medium">Setup Error</p>
                  <p className="text-red-400/80 text-sm">
                    {error instanceof Error ? error.message : 'Failed to complete profile setup. Please try again.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={!name.trim() || isPending || isSubmitting}
            className={`w-full btn-primary py-4 text-lg font-semibold shadow-xl ${
              (isPending || isSubmitting) ? 'btn-loading' : ''
            }`}
          >
            {(isPending || isSubmitting) ? 'Completing setup...' : 'Complete Setup'}
          </button>
        </form>

        {/* Profile Completion Requirement Notice */}
        <div className="mt-6 card p-4 bg-orange-500/10 border-orange-500/20">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <p className="text-orange-400 font-medium text-sm">Mandatory Profile Completion</p>
              <p className="text-orange-300 text-xs mt-1">
                Profile setup is required for all users on their first login and cannot be skipped. 
                This ensures proper user identification and access control within the application.
              </p>
            </div>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-slate-500 text-sm">
            Your account registration is handled automatically. 
            After completing your profile, you'll have immediate access to create clubs, join teams, and use all features.
          </p>
        </div>
      </div>
    </div>
  );
}
