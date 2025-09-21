import React, { useState } from 'react';
import { X, User, LogOut, Edit3, Check, AlertCircle, ArrowLeft, Shield, Settings, Baby, Crown, Lock, Camera, Upload, Trash2, CheckCircle, RefreshCw, Star, Zap, TrendingUp, Award, Trophy, Target, Gift, Sparkles, Calendar, CreditCard, Unlock, XCircle, Info } from 'lucide-react';
import { UserProfile } from '../backend';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useSaveCallerUserProfile, useGetCurrentUserRoles, useGetUserPoints, useRefreshUserPoints, useGetUserRewards, useRefreshUserRewards } from '../hooks/useUsers';
import { useUserRoles } from '../hooks/useRoles';
import { useGetCallerChildren } from '../hooks/useChildren';
import { useIsCurrentUserAdmin } from '../hooks/useUsers';
import { useHasProAccess, useIsClubAdmin } from '../hooks/useSubscriptions';
import { useQueryClient } from '@tanstack/react-query';
import { useFileUpload } from '../blob-storage/FileStorage';
import RoleManagementModal from './RoleManagementModal';
import ChildManagementModal from './ChildManagementModal';
import AdminPage from './pages/AdminPage';
import SubscriptionUpgradeModal from './SubscriptionUpgradeModal';
import SubscriptionCancellationModal from './SubscriptionCancellationModal';
import PointsRewardsInfoModal from './PointsRewardsInfoModal';

interface ProfileModalProps {
  userProfile: UserProfile | null;
  onClose: () => void;
  highlightRewardId?: string | null;
}

export default function ProfileModal({ userProfile, onClose, highlightRewardId }: ProfileModalProps) {
  const [name, setName] = useState(userProfile?.name || '');
  const [isEditing, setIsEditing] = useState(false);
  const [showRoleManagement, setShowRoleManagement] = useState(false);
  const [showChildManagement, setShowChildManagement] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [showPointsRewardsInfo, setShowPointsRewardsInfo] = useState(false);
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  
  const { clear, identity } = useInternetIdentity();
  const { mutate: saveProfile, isPending } = useSaveCallerUserProfile();
  const { data: isAdmin } = useIsCurrentUserAdmin();
  const { data: hasProAccess } = useHasProAccess();
  const { data: isClubAdmin } = useIsClubAdmin();
  const { data: currentUserRoles, refetch: refetchUserRoles, isRefetching: rolesRefetching } = useGetCurrentUserRoles();
  const { data: userPoints, isLoading: pointsLoading, refetch: refetchPoints } = useGetUserPoints();
  const { data: userRewards, isLoading: rewardsLoading, refetch: refetchRewards } = useGetUserRewards();
  const refreshUserPoints = useRefreshUserPoints();
  const refreshUserRewards = useRefreshUserRewards();
  const queryClient = useQueryClient();
  const { userRoles } = useUserRoles();
  const { data: children } = useGetCallerChildren();
  const { uploadFile } = useFileUpload();

  const canAccessProFeatures = isAdmin || hasProAccess;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      let profilePictureUrl = userProfile?.profilePicture;
      
      if (profilePictureFile) {
        setIsUploadingPicture(true);
        try {
          const timestamp = Date.now();
          const fileName = `profile-${identity?.getPrincipal().toString()}-${timestamp}.${profilePictureFile.name.split('.').pop()}`;
          const path = `profiles/${fileName}`;
          
          const result = await uploadFile(path, profilePictureFile);
          profilePictureUrl = result.url;
          setUploadSuccess(true);
          setTimeout(() => setUploadSuccess(false), 3000);
        } catch (error) {
          console.error('Failed to upload profile picture:', error);
          setIsUploadingPicture(false);
          return;
        }
        setIsUploadingPicture(false);
      }
      
      saveProfile({ 
        name: name.trim(),
        profilePicture: profilePictureUrl,
        isProfileComplete: true
      }, {
        onSuccess: () => {
          setIsEditing(false);
          setProfilePictureFile(null);
          setProfilePicturePreview(null);
        }
      });
    }
  };

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
    onClose();
  };

  const handleProfilePictureSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setProfilePictureFile(file);
      const previewUrl = URL.createObjectURL(file);
      setProfilePicturePreview(previewUrl);
    }
  };

  const removeProfilePicture = () => {
    setProfilePictureFile(null);
    setProfilePicturePreview(null);
  };

  const handleRefreshRoles = () => {
    refetchUserRoles();
  };

  const handleRefreshPoints = () => {
    refreshUserPoints();
  };

  const handleRefreshRewards = () => {
    refreshUserRewards();
  };

  const handleUpgradeClick = () => {
    setShowUpgradeModal(true);
  };

  const handleCancelSubscriptionClick = () => {
    setShowCancellationModal(true);
  };

  const hasParentRole = userRoles.some(role => role.role === 'parent');
  const automaticRoles = userRoles.filter(role => role.isAutomatic);
  const appAdminRole = userRoles.find(role => role.role === 'app_admin');

  const pointsForNextReward = canAccessProFeatures && userPoints ? (20 - (userPoints % 20)) % 20 : 20;
  const canEarnReward = canAccessProFeatures && pointsForNextReward > 0;

  if (showRoleManagement) {
    return <RoleManagementModal onClose={() => setShowRoleManagement(false)} />;
  }

  if (showChildManagement) {
    return <ChildManagementModal onClose={() => setShowChildManagement(false)} />;
  }

  if (showPointsRewardsInfo) {
    return <PointsRewardsInfoModal onClose={() => setShowPointsRewardsInfo(false)} />;
  }

  if (showAdminDashboard) {
    return (
      <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-800/50 bg-slate-900/95 backdrop-blur-sm sticky top-0 z-10">
          <button
            onClick={() => setShowAdminDashboard(false)}
            className="p-2 -ml-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold text-slate-100">Admin Dashboard</h1>
          <button
            onClick={() => setShowAdminDashboard(false)}
            className="p-2 -mr-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <AdminPage />
        </div>
      </div>
    );
  }

  const currentProfilePicture = profilePicturePreview || userProfile?.profilePicture;

  return (
    <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-slate-800/50 bg-slate-900/95 backdrop-blur-sm sticky top-0 z-10">
        <button
          onClick={onClose}
          className="p-2 -ml-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold text-slate-100">Profile</h1>
        <div className="flex items-center space-x-2">
          {isAdmin && (
            <button
              onClick={() => setShowAdminDashboard(true)}
              className="p-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring"
              title="Admin Dashboard"
            >
              <Shield className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 pb-32">
          <div className="text-center mb-8">
            <div className="relative mx-auto mb-6">
              {currentProfilePicture ? (
                <img
                  src={currentProfilePicture}
                  alt="Profile"
                  className="w-20 h-20 rounded-full object-cover shadow-lg mx-auto"
                />
              ) : (
                <div className="avatar-xl bg-gradient-to-br from-emerald-400 to-emerald-600 mx-auto shadow-lg">
                  {userProfile?.name ? (
                    <span className="text-white text-2xl font-bold">
                      {userProfile.name.charAt(0).toUpperCase()}
                    </span>
                  ) : (
                    <User className="w-8 h-8 text-white" />
                  )}
                </div>
              )}
              
              {appAdminRole && (
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                  <Crown className="w-3 h-3 text-white" />
                </div>
              )}
              
              {isEditing && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-center space-x-3">
                    <label className="btn-secondary text-sm cursor-pointer">
                      <Camera className="w-4 h-4 mr-2" />
                      {currentProfilePicture ? 'Change Photo' : 'Add Photo'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePictureSelect}
                        className="hidden"
                        disabled={isPending || isUploadingPicture}
                      />
                    </label>
                    {profilePictureFile && (
                      <button
                        type="button"
                        onClick={removeProfilePicture}
                        className="btn-secondary text-sm text-red-400 hover:text-red-300"
                        disabled={isPending || isUploadingPicture}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove
                      </button>
                    )}
                  </div>
                  
                  {profilePictureFile && (
                    <div className="card p-3 bg-emerald-500/10 border-emerald-500/20">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400 text-sm font-medium">
                          New photo selected: {profilePictureFile.name}
                        </span>
                      </div>
                      <p className="text-emerald-300 text-xs mt-1">
                        Photo will be uploaded when you save your profile
                      </p>
                    </div>
                  )}
                  
                  {uploadSuccess && (
                    <div className="card p-3 bg-green-500/10 border-green-500/20">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-green-400 text-sm font-medium">
                          Profile picture uploaded successfully!
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {isEditing ? (
              <form onSubmit={handleSave} className="space-y-6">
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-300">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-mobile text-center font-semibold"
                    placeholder="Enter your name"
                    required
                    disabled={isPending || isUploadingPicture}
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="submit"
                    disabled={!name.trim() || isPending || isUploadingPicture}
                    className={`btn-primary-mobile ${(isPending || isUploadingPicture) ? 'btn-loading' : ''}`}
                  >
                    <Check className="w-5 h-5 mr-2" />
                    {isUploadingPicture ? 'Uploading...' : isPending ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setName(userProfile?.name || '');
                      removeProfilePicture();
                    }}
                    className="btn-secondary-mobile"
                    disabled={isPending || isUploadingPicture}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex items-center justify-center space-x-2 mb-6">
                  <h3 className="text-2xl font-bold text-slate-100">
                    {userProfile?.name || 'No name set'}
                  </h3>
                  {appAdminRole && (
                    <div className="flex items-center space-x-1 bg-red-500/10 text-red-400 px-2 py-1 rounded-full border border-red-500/20">
                      <Crown className="w-3 h-3" />
                      <span className="text-xs font-medium">App Admin</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  className="btn-secondary-mobile inline-flex items-center"
                >
                  <Edit3 className="w-5 h-5 mr-2" />
                  Edit Profile
                </button>
              </>
            )}
          </div>

          <div className="space-y-4">
            {canAccessProFeatures ? (
              <div className="card p-6 bg-gradient-to-br from-yellow-500/10 via-orange-500/5 to-slate-900/50 border-yellow-500/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                      <Trophy className="w-6 h-6 text-yellow-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-200 text-lg">Ignite Points</h4>
                      <p className="text-slate-400">Earned from duty completion</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-2">
                      {pointsLoading ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-yellow-400 border-t-transparent"></div>
                      ) : (
                        <Zap className="w-5 h-5 text-yellow-400" />
                      )}
                      <span className="text-3xl font-bold text-yellow-400">
                        {pointsLoading ? '...' : userPoints?.toLocaleString() || '0'}
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm">Total Points</p>
                  </div>
                </div>
                
                {canEarnReward && (
                  <div className="card p-4 bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-slate-900/50 border-purple-500/20 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                          <Gift className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                          <p className="text-purple-400 font-medium">Reward Progress</p>
                          <p className="text-purple-300 text-sm">Free sausage sizzle reward</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-purple-400 font-bold text-lg">{pointsForNextReward}</p>
                        <p className="text-purple-300 text-xs">points needed</p>
                      </div>
                    </div>
                    
                    <div className="w-full bg-slate-700 rounded-full h-2 mb-3">
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${((userPoints || 0) % 20) * 5}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-purple-300">{(userPoints || 0) % 20}/20 points</span>
                      <span className="text-purple-400 font-medium">🎁 Reward at 20 points</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <button
                    onClick={handleRefreshPoints}
                    className="text-yellow-400 hover:text-yellow-300 text-sm flex items-center space-x-1"
                    disabled={pointsLoading}
                    title="Refresh points balance"
                  >
                    <RefreshCw className={`w-4 h-4 ${pointsLoading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                <div className="flex justify-center mt-4">
                  <button
                    onClick={() => setShowPointsRewardsInfo(true)}
                    className="btn-secondary text-sm"
                  >
                    <Info className="w-4 h-4 mr-2" />
                    More Info
                  </button>
                </div>
              </div>
            ) : (
              <div className="card p-6 bg-gradient-to-br from-red-500/10 via-orange-500/5 to-slate-900/50 border-red-500/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                      <Lock className="w-6 h-6 text-red-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-200 text-lg">Ignite Points</h4>
                      <p className="text-slate-400">Pro feature required</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-2">
                      <Lock className="w-5 h-5 text-red-400" />
                      <span className="text-3xl font-bold text-red-400">---</span>
                    </div>
                    <p className="text-red-400 text-sm">Locked</p>
                  </div>
                </div>
                
                <div className="card p-4 bg-red-500/10 border-red-500/20 mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                      <Crown className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <p className="text-red-400 font-medium">Pro Feature Required</p>
                      <p className="text-red-300 text-sm">
                        Ignite Points and Rewards are available on the Pro plan only. Upgrade to unlock these features.
                      </p>
                    </div>
                  </div>
                </div>

                {isClubAdmin && (
                  <div className="flex justify-center">
                    <button
                      onClick={handleUpgradeClick}
                      className="btn-primary text-sm"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Upgrade to Pro
                    </button>
                  </div>
                )}
              </div>
            )}

            {canAccessProFeatures ? (
              <div className={`card p-6 bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-slate-900/50 border-purple-500/20 ${
                highlightRewardId ? 'ring-4 ring-purple-500/50 ring-offset-4 ring-offset-slate-950' : ''
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <Gift className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-200 text-lg">Rewards Collection</h4>
                      <p className="text-slate-400">Your sausage sizzle rewards</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-2">
                      {rewardsLoading ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-400 border-t-transparent"></div>
                      ) : (
                        <Award className="w-5 h-5 text-purple-400" />
                      )}
                      <span className="text-3xl font-bold text-purple-400">
                        {rewardsLoading ? '...' : userRewards?.length || '0'}
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm">Rewards Owned</p>
                  </div>
                </div>

                {highlightRewardId && (
                  <div className="mb-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-purple-400" />
                      <span className="text-purple-400 text-sm font-medium">
                        Navigated from reward notification
                      </span>
                    </div>
                    <p className="text-purple-300 text-xs mt-1">
                      You clicked on a reward minting notification to view your collection
                    </p>
                  </div>
                )}

                {rewardsLoading ? (
                  <div className="space-y-3">
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="card p-4 animate-pulse">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-slate-700 rounded-lg"></div>
                          <div className="flex-1">
                            <div className="h-4 bg-slate-700 rounded w-1/3 mb-2"></div>
                            <div className="h-3 bg-slate-700 rounded w-1/2"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !userRewards || userRewards.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Gift className="w-8 h-8 text-slate-600" />
                    </div>
                    <h5 className="text-lg font-semibold text-slate-100 mb-2">No Rewards Yet</h5>
                    <p className="text-slate-400 text-sm mb-4">
                      Complete duties to earn points and unlock rewards!
                    </p>
                    
                    {canEarnReward && (
                      <div className="card p-3 bg-purple-500/10 border-purple-500/20">
                        <div className="flex items-center space-x-2">
                          <Target className="w-4 h-4 text-purple-400" />
                          <span className="text-purple-400 text-sm font-medium">
                            {pointsForNextReward} more points needed for your first reward!
                          </span>
                        </div>
                        <p className="text-purple-300 text-xs mt-1">
                          Complete {Math.ceil(pointsForNextReward / 10)} more dut{Math.ceil(pointsForNextReward / 10) === 1 ? 'y' : 'ies'} to earn your first sausage sizzle reward
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userRewards.map((reward, index) => (
                      <div 
                        key={reward.id} 
                        className={`card p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30 ${
                          highlightRewardId === reward.id ? 'ring-2 ring-purple-400/50' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                            <Gift className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h5 className="text-purple-400 font-medium">{reward.metadata.name}</h5>
                              <div className="flex items-center space-x-1 bg-purple-500/10 text-purple-400 px-2 py-1 rounded-full border border-purple-500/20">
                                <Sparkles className="w-3 h-3" />
                                <span className="text-xs font-medium">Reward #{index + 1}</span>
                              </div>
                              {highlightRewardId === reward.id && (
                                <div className="flex items-center space-x-1 bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-full border border-emerald-500/20">
                                  <CheckCircle className="w-3 h-3" />
                                  <span className="text-xs font-medium">From Notification</span>
                                </div>
                              )}
                            </div>
                            <p className="text-purple-300 text-sm mb-2">{reward.metadata.description}</p>
                            <div className="flex items-center space-x-4 text-slate-400 text-xs">
                              <div className="flex items-center space-x-1">
                                <Calendar className="w-3 h-3" />
                                <span>Minted {new Date(reward.mintedAt).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Award className="w-3 h-3" />
                                <span>ID: {reward.id}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="bg-emerald-500/10 text-emerald-400 px-3 py-2 rounded-lg border border-emerald-500/20">
                              <div className="flex items-center space-x-1">
                                <CheckCircle className="w-4 h-4" />
                                <span className="text-sm font-medium">Valid</span>
                              </div>
                              <p className="text-emerald-300 text-xs">Free Sizzle</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between mt-4">
                  <button
                    onClick={handleRefreshRewards}
                    className="text-purple-400 hover:text-purple-300 text-sm flex items-center space-x-1"
                    disabled={rewardsLoading}
                    title="Refresh rewards collection"
                  >
                    <RefreshCw className={`w-4 h-4 ${rewardsLoading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                <div className="flex justify-center mt-4">
                  <button
                    onClick={() => setShowPointsRewardsInfo(true)}
                    className="btn-secondary text-sm"
                  >
                    <Info className="w-4 h-4 mr-2" />
                    More Info
                  </button>
                </div>
              </div>
            ) : (
              <div className="card p-6 bg-gradient-to-br from-red-500/10 via-orange-500/5 to-slate-900/50 border-red-500/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                      <Lock className="w-6 h-6 text-red-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-200 text-lg">Rewards Collection</h4>
                      <p className="text-slate-400">Pro feature required</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-2">
                      <Lock className="w-5 h-5 text-red-400" />
                      <span className="text-3xl font-bold text-red-400">---</span>
                    </div>
                    <p className="text-red-400 text-sm">Locked</p>
                  </div>
                </div>

                <div className="card p-4 bg-red-500/10 border-red-500/20 mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                      <Crown className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <p className="text-red-400 font-medium">Pro Feature Required</p>
                      <p className="text-red-300 text-sm">
                        Ignite Points and Rewards are available on the Pro plan only. Upgrade to unlock these features.
                      </p>
                    </div>
                  </div>
                </div>

                {isClubAdmin && (
                  <div className="flex justify-center">
                    <button
                      onClick={handleUpgradeClick}
                      className="btn-primary text-sm"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Upgrade to Pro
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-200 text-lg">Account Status</h4>
                    <p className="text-slate-400">Internet Identity Connected</p>
                  </div>
                </div>
                <div className="badge-emerald text-base px-4 py-2">
                  Active
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowRoleManagement(true)}
              className="card p-6 text-left hover:bg-slate-800/50 transition-all duration-200 group w-full"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                    <Shield className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-200 text-lg group-hover:text-emerald-400 transition-colors">
                      Manage Roles
                    </h4>
                    <div className="flex items-center space-x-4 text-slate-400 text-sm">
                      <span>{userRoles.length} total roles</span>
                      {automaticRoles.length > 0 && (
                        <div className="flex items-center space-x-1">
                          <Lock className="w-3 h-3" />
                          <span>{automaticRoles.length} automatic</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-slate-400 group-hover:text-emerald-400 transition-colors">
                  <Settings className="w-5 h-5" />
                </div>
              </div>
            </button>

            {hasParentRole && (
              <button
                onClick={() => setShowChildManagement(true)}
                className="card p-6 text-left hover:bg-slate-800/50 transition-all duration-200 group w-full"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                      <Baby className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-200 text-lg group-hover:text-purple-400 transition-colors">
                        Manage Children
                      </h4>
                      <p className="text-slate-400">
                        Add and manage your children's profiles and team assignments
                        {children && children.length > 0 && (
                          <span className="ml-2 text-purple-400">({children.length} child{children.length !== 1 ? 'ren' : ''})</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-slate-400 group-hover:text-purple-400 transition-colors">
                    <Settings className="w-5 h-5" />
                  </div>
                </div>
              </button>
            )}

            <div className="card p-6 bg-emerald-500/10 border-emerald-500/20">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-slate-100">Your Current Role Assignments</h4>
                    <button
                      onClick={handleRefreshRoles}
                      className="p-1 text-emerald-400 hover:text-emerald-300 rounded transition-colors"
                      disabled={rolesRefetching}
                      title="Refresh role data"
                    >
                      <RefreshCw className={`w-4 h-4 ${rolesRefetching ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                  
                  {rolesRefetching && (
                    <div className="mb-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
                        <span className="text-blue-400 text-sm font-medium">Refreshing role data...</span>
                      </div>
                      <p className="text-blue-300 text-xs mt-1">
                        Loading the most current role assignments from backend
                      </p>
                    </div>
                  )}
                  
                  <div className="text-slate-300 text-sm space-y-2">
                    {currentUserRoles && currentUserRoles.length > 0 ? (
                      <>
                        <p>You have {currentUserRoles.length} role assignment{currentUserRoles.length !== 1 ? 's' : ''} from backend memberships:</p>
                        <div className="space-y-3 mt-3">
                          {currentUserRoles.map((roleData, index) => (
                            <div key={index} className="card p-3 bg-slate-800/30">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                    roleData.type === 'club' ? 'bg-blue-500' : 'bg-purple-500'
                                  }`}>
                                    <span className="text-white text-xs font-semibold">
                                      {roleData.organizationName.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <span className="text-slate-200 font-medium">{roleData.organizationName}</span>
                                </div>
                                <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs border ${
                                  roleData.type === 'club' 
                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                    : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                }`}>
                                  {roleData.type === 'club' ? (
                                    <Crown className="w-3 h-3" />
                                  ) : (
                                    <Shield className="w-3 h-3" />
                                  )}
                                  <span>{roleData.type === 'club' ? 'Club' : 'Team'}</span>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {roleData.roles.map((role, roleIndex) => (
                                  <span
                                    key={roleIndex}
                                    className="text-xs px-2 py-1 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  >
                                    {role}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <p>No role assignments found from backend memberships.</p>
                        <div className="card p-3 bg-blue-500/10 border-blue-500/20 mt-3">
                          <div className="flex items-center space-x-2">
                            <AlertCircle className="w-4 h-4 text-blue-400" />
                            <span className="text-blue-400 font-medium text-sm">How to Get Roles</span>
                          </div>
                          <p className="text-blue-300 text-xs mt-1">
                            Submit join requests to teams to get assigned roles, or create clubs/teams to automatically become an admin
                          </p>
                        </div>
                      </>
                    )}
                    
                    {automaticRoles.length > 0 && (
                      <div className="mt-4">
                        <p className="text-slate-300 text-sm mb-2">Plus {automaticRoles.length} automatic role{automaticRoles.length !== 1 ? 's' : ''} from club/team creation:</p>
                        <div className="flex flex-wrap gap-2">
                          {automaticRoles.slice(0, 6).map((role) => (
                            <div
                              key={role.id}
                              className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            >
                              <Lock className="w-2 h-2" />
                              <span>{role.role.replace('_', ' ')}</span>
                            </div>
                          ))}
                          {automaticRoles.length > 6 && (
                            <div className="px-2 py-1 rounded-full text-xs bg-slate-600/50 text-slate-300">
                              +{automaticRoles.length - 6} more
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {isClubAdmin && (
              <div className="card p-6 bg-blue-500/10 border-blue-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      {isAdmin ? (
                        <Crown className="w-6 h-6 text-red-400" />
                      ) : canAccessProFeatures ? (
                        <Unlock className="w-6 h-6 text-blue-400" />
                      ) : (
                        <Lock className="w-6 h-6 text-blue-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-200 text-lg">
                        Current Plan: {isAdmin ? 'App Admin' : canAccessProFeatures ? 'Pro' : 'Basic'}
                      </h4>
                      <p className="text-slate-400">
                        {isAdmin ? 'Unrestricted access to all features' : 
                         canAccessProFeatures ? 'All Pro features unlocked' : 
                         'Basic features available'}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-center mt-4 space-x-3">
                  {!isAdmin && !canAccessProFeatures && (
                    <button
                      onClick={handleUpgradeClick}
                      className="btn-primary text-sm"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Upgrade to Pro
                    </button>
                  )}
                  
                  {!isAdmin && canAccessProFeatures && (
                    <button
                      onClick={handleCancelSubscriptionClick}
                      className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg transition-colors font-medium text-sm flex items-center"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Cancel Pro Subscription
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800/50 p-4 bg-slate-900/95 backdrop-blur-sm">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center space-x-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border-2 border-red-500/20 hover:border-red-500/30 py-4 px-4 rounded-xl transition-all duration-200 font-semibold text-lg"
        >
          <LogOut className="w-6 h-6" />
          <span>Sign Out</span>
        </button>
      </div>

      {showUpgradeModal && (
        <SubscriptionUpgradeModal
          organizationType="club"
          organizationId="1"
          organizationName="Pro Features"
          onClose={() => setShowUpgradeModal(false)}
        />
      )}

      {showCancellationModal && (
        <SubscriptionCancellationModal
          clubId="1"
          clubName="Pro Features"
          onClose={() => setShowCancellationModal(false)}
        />
      )}
    </div>
  );
}
