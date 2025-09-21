import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, AlertTriangle, Lock, CreditCard, CheckCircle, Loader2, Crown, Trophy, Camera, MessageCircle, ClipboardList, FileText, TrendingUp, Shield, Users } from 'lucide-react';
import { useCancelClubProSubscription, useGetAllClubSubscriptions, useIsClubAdmin } from '../hooks/useSubscriptions';
import { useIsCurrentUserAdmin } from '../hooks/useUsers';
import { useGetUserClubs } from '../hooks/useClubs';
import { useInternetIdentity } from '../hooks/useInternetIdentity';

interface SubscriptionCancellationModalProps {
  clubId: string;
  clubName: string;
  onClose: () => void;
}

export default function SubscriptionCancellationModal({ 
  clubId, 
  clubName, 
  onClose 
}: SubscriptionCancellationModalProps) {
  const [cancellationSuccess, setCancellationSuccess] = useState(false);
  
  const { mutate: cancelClubSubscription, isPending, error } = useCancelClubProSubscription();
  const { data: allClubSubscriptions } = useGetAllClubSubscriptions();
  const { data: isAppAdmin } = useIsCurrentUserAdmin();
  const { data: userClubs } = useGetUserClubs();
  const { identity } = useInternetIdentity();

  const currentUserPrincipal = identity?.getPrincipal().toString();
  const club = userClubs?.find(c => c.id.toString() === clubId);
  const isUserClubAdmin = club && club.creator.toString() === currentUserPrincipal;
  const currentSubscription = allClubSubscriptions?.[clubId];

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

  const handleCancelSubscription = () => {
    cancelClubSubscription({
      clubId,
    }, {
      onSuccess: () => {
        setCancellationSuccess(true);
        
        // Show success message for 3 seconds then close
        setTimeout(() => {
          onClose();
        }, 3000);
      },
      onError: (error) => {
        console.error('Failed to cancel club subscription:', error);
      }
    });
  };

  const proFeaturesToLose = [
    { name: 'File & Photo Storage', icon: Camera, description: 'Upload and organize photos and files in the vault' },
    { name: 'Club-Level Messaging', icon: MessageCircle, description: 'Advanced chat features and club-wide communication' },
    { name: 'Duty Assignments & Swaps', icon: ClipboardList, description: 'Assign game day responsibilities and enable duty swaps' },
    { name: 'Club Announcements', icon: FileText, description: 'Create club-wide announcements with full features' },
    { name: 'Match Day Posts', icon: Camera, description: 'Generate professional social media posts for games' },
    { name: 'Advanced Features', icon: Shield, description: 'All Pro functionality for club members' },
  ];

  // Don't show cancellation for app admins
  if (isAppAdmin) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-800/50 bg-slate-900/95 backdrop-blur-sm sticky top-0 z-10">
          <button
            onClick={onClose}
            className="p-2 -ml-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-semibold text-slate-100">Subscription Management</h1>
            <p className="text-sm text-slate-400">App Admin Access</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="card p-8 text-center max-w-md">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Crown className="w-10 h-10 text-emerald-400" />
            </div>
            <h3 className="text-2xl font-semibold text-slate-100 mb-4">App Admin Access</h3>
            <p className="text-slate-400 leading-relaxed mb-6">
              As an app administrator, you have unrestricted access to all features regardless of club subscription status. 
              Subscription management is not applicable to your account.
            </p>
            
            <button
              onClick={onClose}
              className="btn-primary-mobile"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Don't show cancellation if user is not club admin
  if (!isUserClubAdmin) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-800/50 bg-slate-900/95 backdrop-blur-sm sticky top-0 z-10">
          <button
            onClick={onClose}
            className="p-2 -ml-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-semibold text-slate-100">Cancel Subscription</h1>
            <p className="text-sm text-slate-400">{clubName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="card p-8 text-center max-w-md">
            <div className="w-20 h-20 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Lock className="w-10 h-10 text-red-400" />
            </div>
            <h3 className="text-2xl font-semibold text-slate-100 mb-4">Club Admin Access Required</h3>
            <p className="text-slate-400 leading-relaxed mb-6">
              Only club administrators can cancel their club's Pro subscription. This action affects all club members.
            </p>
            
            <button
              onClick={onClose}
              className="btn-primary-mobile"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Don't show cancellation if no Pro subscription exists
  if (!currentSubscription || currentSubscription.plan !== 'pro') {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-800/50 bg-slate-900/95 backdrop-blur-sm sticky top-0 z-10">
          <button
            onClick={onClose}
            className="p-2 -ml-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-semibold text-slate-100">Cancel Subscription</h1>
            <p className="text-sm text-slate-400">{clubName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="card p-8 text-center max-w-md">
            <div className="w-20 h-20 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Lock className="w-10 h-10 text-blue-400" />
            </div>
            <h3 className="text-2xl font-semibold text-slate-100 mb-4">No Pro Subscription</h3>
            <p className="text-slate-400 leading-relaxed mb-6">
              {clubName} is currently on the Basic plan. There is no Pro subscription to cancel.
            </p>
            
            <button
              onClick={onClose}
              className="btn-primary-mobile"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-slate-800/50 bg-slate-900/95 backdrop-blur-sm sticky top-0 z-10">
        <button
          onClick={onClose}
          className="p-2 -ml-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
          disabled={isPending}
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-semibold text-slate-100">Cancel Club Pro Subscription</h1>
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
      {cancellationSuccess && (
        <div className="mx-4 mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <div className="flex items-start space-x-3">
            <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
            <div className="flex-1">
              <p className="text-emerald-400 font-medium text-sm mb-2">✅ Club Subscription Cancelled Successfully!</p>
              <p className="text-emerald-400 text-sm leading-relaxed">
                The Pro subscription for {clubName} has been cancelled and all club members have been reverted to the Basic plan. 
                All Pro features are now locked for all club members and the UI has been updated to reflect Basic club status.
              </p>
              <p className="text-emerald-300 text-xs mt-2">
                Closing automatically... You can upgrade the club again anytime to restore Pro features for all members.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <div className="flex-1">
            <p className="text-red-400 text-sm font-medium">
              {error instanceof Error ? error.message : 'Failed to cancel club subscription'}
            </p>
          </div>
        </div>
      )}

      {/* Processing Message */}
      {isPending && (
        <div className="mx-4 mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex items-start space-x-3">
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin shrink-0" />
            <div className="flex-1">
              <p className="text-blue-400 font-medium text-sm mb-2">Cancelling Club Subscription...</p>
              <p className="text-blue-400 text-sm leading-relaxed">
                Processing cancellation and reverting entire club to Basic plan. All Pro features will be locked immediately for all club members.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 pb-32">
          <div className="space-y-6">
            {/* Current Subscription Info */}
            <div className="card p-6 bg-red-500/10 border-red-500/20">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-100">Cancel Club Pro Subscription</h3>
                  <p className="text-slate-400">
                    You're about to cancel the Pro subscription for {clubName} and all its members
                  </p>
                </div>
              </div>
              
              <div className="card p-4 bg-red-500/5 border-red-500/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                      <Crown className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <p className="text-slate-200 font-medium">Current: Club Pro Plan</p>
                      <p className="text-slate-400 text-sm">
                        All club members have Pro access
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-red-400 font-bold text-lg">Active</p>
                    <p className="text-red-300 text-sm">Will be cancelled</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Club-Wide Impact Warning */}
            <div className="card p-6 bg-orange-500/10 border-orange-500/20">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-100 mb-2">Club-Wide Impact</h4>
                  <div className="text-slate-300 text-sm space-y-2">
                    <p className="text-orange-300">
                      <strong>Important:</strong> Cancelling this subscription will affect ALL members of {clubName}:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-slate-400 ml-4">
                      <li><strong>All Club Members:</strong> Will lose Pro feature access immediately</li>
                      <li><strong>Media Tab:</strong> Will be locked for all club members</li>
                      <li><strong>Club Chat:</strong> Advanced messaging features will be disabled</li>
                      <li><strong>Vault Access:</strong> File and photo storage will be locked</li>
                      <li><strong>Club Announcements:</strong> Will be restricted for all members</li>
                      <li><strong>Duty Swaps:</strong> Will be disabled for all club events</li>
                    </ul>
                    <p className="mt-3 text-orange-300">
                      This decision affects the entire club organization and all its members.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Features That Will Be Lost */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-100 flex items-center">
                <Lock className="w-5 h-5 text-red-400 mr-2" />
                Features All Club Members Will Lose
              </h3>
              
              <div className="card p-4 bg-orange-500/10 border-orange-500/20 mb-4">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="w-5 h-5 text-orange-400" />
                  <div>
                    <p className="text-orange-400 font-medium">Immediate Feature Lock for All Members</p>
                    <p className="text-orange-300 text-sm">
                      All Pro features will be locked immediately for every club member after cancellation. The entire club will revert to Basic plan limitations instantly.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {proFeaturesToLose.map((feature, index) => {
                  const Icon = feature.icon;
                  
                  return (
                    <div key={index} className="card p-4 bg-red-500/10 border-red-500/20">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                          <Icon className="w-5 h-5 text-red-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-red-400 font-medium">{feature.name}</p>
                          <p className="text-red-300 text-sm">{feature.description}</p>
                        </div>
                        <div className="text-red-400">
                          <Lock className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* What Happens After Cancellation */}
            <div className="card p-6 bg-blue-500/10 border-blue-500/20">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center shrink-0">
                  <CheckCircle className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-100 mb-2">What Happens After Cancellation</h4>
                  <div className="text-slate-300 text-sm space-y-2">
                    <ul className="list-disc list-inside space-y-1 text-slate-400 ml-4">
                      <li><strong>Immediate Reversion:</strong> Entire club changes to Basic status immediately</li>
                      <li><strong>Feature Lock:</strong> All Pro features become inaccessible for all club members instantly</li>
                      <li><strong>Data Preservation:</strong> All existing data remains safe and intact</li>
                      <li><strong>Basic Features:</strong> All club members keep Basic plan functionality</li>
                      <li><strong>Re-upgrade Option:</strong> You can upgrade the club back to Pro anytime</li>
                      <li><strong>No Data Loss:</strong> Photos, files, and messages are preserved</li>
                      <li><strong>UI Updates:</strong> Interface immediately reflects Basic plan limitations for all members</li>
                    </ul>
                    <p className="mt-3 text-blue-300">
                      You can always upgrade the club back to Pro to restore full functionality and access to preserved Pro data for all members.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Basic Plan Features Club Members Will Keep */}
            <div className="card p-6 bg-emerald-500/10 border-emerald-500/20">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center shrink-0">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-100 mb-2">Basic Plan Features All Members Will Keep</h4>
                  <div className="text-slate-300 text-sm space-y-2">
                    <ul className="list-disc list-inside space-y-1 text-slate-400 ml-4">
                      <li><strong>Unlimited Teams & Events:</strong> Create and manage as many as needed</li>
                      <li><strong>Basic Team Chat:</strong> One thread per team, text messages only</li>
                      <li><strong>Team Announcements:</strong> Create announcements for teams</li>
                      <li><strong>Player Availability & RSVPs:</strong> Track who's coming to events</li>
                      <li><strong>Season Calendar View:</strong> View all events in calendar format</li>
                      <li><strong>Duty Assignments:</strong> View assigned duties (no swapping)</li>
                      <li><strong>Blockchain Security:</strong> Data remains secure and decentralized</li>
                    </ul>
                    <p className="mt-3 text-emerald-300">
                      The Basic plan still provides comprehensive sports club management functionality for all members.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Final Warning */}
            <div className="card p-6 bg-orange-500/10 border-orange-500/20">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-100 mb-2">Important Information</h4>
                  <div className="text-slate-300 text-sm space-y-2">
                    <p>Before you proceed, please understand:</p>
                    <ul className="list-disc list-inside space-y-1 text-slate-400 ml-4">
                      <li><strong>Immediate Effect:</strong> Cancellation takes effect instantly for all club members</li>
                      <li><strong>Club-Wide Feature Loss:</strong> All Pro features will be locked for every club member</li>
                      <li><strong>UI Changes:</strong> Interface will show Basic plan limitations for all members</li>
                      <li><strong>No Refund:</strong> Current billing period is non-refundable</li>
                      <li><strong>Data Safety:</strong> All data remains safe but Pro features become inaccessible</li>
                      <li><strong>Re-upgrade Available:</strong> You can upgrade the club again anytime to restore access</li>
                    </ul>
                    <p className="mt-3 text-orange-300">
                      This action cannot be undone, but you can always upgrade the club again to restore Pro functionality for all members.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800/50 p-4 bg-slate-900/95 backdrop-blur-sm sticky bottom-0 z-10">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            className="btn-secondary-mobile"
            disabled={isPending}
          >
            Keep Club Pro
          </button>
          <button
            onClick={handleCancelSubscription}
            disabled={isPending}
            className={`bg-red-500 hover:bg-red-600 disabled:bg-red-400 text-white py-4 px-6 rounded-xl transition-colors font-semibold text-base min-h-[56px] flex items-center justify-center ${isPending ? 'btn-loading' : ''}`}
          >
            {isPending ? (
              'Cancelling Club Subscription...'
            ) : (
              <>
                <AlertTriangle className="w-5 h-5 mr-2" />
                Cancel Club Subscription
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
