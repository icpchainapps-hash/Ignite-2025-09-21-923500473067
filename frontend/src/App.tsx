import React from 'react';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetCallerUserProfile, useGetUserStatus } from './hooks/useQueries';
import LoginScreen from './components/LoginScreen';
import MainApp from './components/MainApp';
import ProfileSetupModal from './components/ProfileSetupModal';
import LoadingSpinner from './components/LoadingSpinner';

export default function App() {
  const { identity, isInitializing } = useInternetIdentity();
  const { data: userProfile, isLoading: profileLoading, isFetched: profileFetched } = useGetCallerUserProfile();
  const { data: userStatus, isLoading: statusLoading, isFetched: statusFetched } = useGetUserStatus();

  const isAuthenticated = !!identity;

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Wait for both profile and status to load
  if (profileLoading || statusLoading || !profileFetched || !statusFetched) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Always show profile setup for first-time users - this is mandatory and cannot be bypassed
  // Profile setup is required if:
  // 1. No profile exists at all (userProfile === null), OR
  // 2. Profile exists but is not marked as complete (isProfileComplete === false)
  const needsProfileSetup = userProfile === null || (userProfile && !userProfile.isProfileComplete);

  if (needsProfileSetup) {
    return <ProfileSetupModal />;
  }

  // Only allow access to main app after profile is complete
  return <MainApp userProfile={userProfile ?? null} />;
}
