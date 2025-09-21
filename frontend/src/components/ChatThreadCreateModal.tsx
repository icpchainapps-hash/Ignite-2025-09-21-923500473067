import React, { useState, useEffect } from 'react';
import { X, MessageCircle, Users, FileText, ArrowLeft, CheckCircle, AlertCircle, Search, Crown, Trophy, Shield, Lock, CreditCard } from 'lucide-react';
import { useGetUserClubs } from '../hooks/useClubs';
import { useGetAllTeams } from '../hooks/useTeams';
import { useCreateChatThread } from '../hooks/useMessages';
import { useUserRoles } from '../hooks/useRoles';
import { useIsCurrentUserAdmin } from '../hooks/useUsers';
import { useCanAccessFeature } from '../hooks/useSubscriptions';

interface ChatThreadCreateModalProps {
  onClose: () => void;
}

export default function ChatThreadCreateModal({ onClose }: ChatThreadCreateModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    organizationType: 'team' as 'club' | 'team',
    clubId: '',
    teamId: '',
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: clubs, isLoading: clubsLoading } = useGetUserClubs();
  const { data: teams, isLoading: teamsLoading } = useGetAllTeams();
  const { mutate: createChatThread, isPending, error } = useCreateChatThread();
  const { data: isAppAdmin } = useIsCurrentUserAdmin();
  const { data: advancedChatAccess } = useCanAccessFeature('advanced_chat', 'club', '1');
  const hasAdvancedChatAccess = advancedChatAccess?.hasAccess || false;
  const { 
    getAccessibleClubsForChatThreads, 
    getAccessibleTeamsForChatThreads,
    getAccessibleClubsForTeamAdmins,
    getAccessibleTeamsForTeamAdminsByClub,
    hasChatThreadPermissions,
    getChatThreadPermissionDetails
  } = useUserRoles();

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

  const authorizedClubs = getAccessibleClubsForChatThreads();
  const authorizedTeams = getAccessibleTeamsForChatThreads();
  const permissionDetails = getChatThreadPermissionDetails();

  // For team admins creating team-level threads, get clubs that contain their teams
  const clubsForTeamAdmins = getAccessibleClubsForTeamAdmins();
  const teamsForSelectedClub = formData.clubId ? getAccessibleTeamsForTeamAdminsByClub(formData.clubId) : [];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Thread name is required';
    }

    if (formData.organizationType === 'club' && !formData.clubId) {
      newErrors.clubId = 'Please select a club';
    }

    if (formData.organizationType === 'team') {
      if (!formData.clubId) {
        newErrors.clubId = 'Please select a club first';
      }
      if (!formData.teamId) {
        newErrors.teamId = 'Please select a team';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const threadData = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      clubId: formData.organizationType === 'club' ? formData.clubId : formData.clubId,
      teamId: formData.organizationType === 'team' ? formData.teamId : undefined,
    };

    createChatThread(threadData, {
      onSuccess: () => {
        onClose();
      },
      onError: (error) => {
        console.error('Failed to create chat thread:', error);
      }
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => {
      if (field === 'organizationType') {
        return { 
          ...prev, 
          [field]: value as 'club' | 'team',
          clubId: '',
          teamId: ''
        };
      } else if (field === 'clubId') {
        return { 
          ...prev, 
          [field]: value,
          teamId: '' // Reset team selection when club changes
        };
      } else {
        return { ...prev, [field]: value };
      }
    });
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const getSelectedClubName = () => {
    const selectedClub = (formData.organizationType === 'club' ? authorizedClubs : clubsForTeamAdmins)
      .find(club => club.id.toString() === formData.clubId);
    return selectedClub?.name || '';
  };

  const getSelectedTeamName = () => {
    const selectedTeam = teamsForSelectedClub.find(team => team.id.toString() === formData.teamId);
    return selectedTeam?.name || '';
  };

  const getEnhancedErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
      const message = error.message;
      
      if (message.includes('Authorization failed')) {
        return message;
      }
      
      if (message.includes('Unauthorized')) {
        const details = getChatThreadPermissionDetails();
        if (details.hasPermissions) {
          return `You can only create chat threads for organizations you manage. You have admin access to: ${details.clubNames.concat(details.teamNames).join(', ')}`;
        } else {
          return 'You need to be a club admin or team admin to create chat threads. Create a club or team first to gain admin permissions.';
        }
      }
      
      return message;
    }
    
    return 'Failed to create chat thread';
  };

  const isLoading = clubsLoading || teamsLoading;

  if (!hasChatThreadPermissions()) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-800/50 bg-slate-900/95 backdrop-blur-sm sticky top-0 z-10">
          <button
            onClick={onClose}
            className="p-2 -ml-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold text-slate-100">Create Chat Thread</h1>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="card p-8 text-center max-w-md">
            <div className="w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <MessageCircle className="w-8 h-8 text-orange-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-100 mb-3">No Admin Permissions</h3>
            <p className="text-slate-400 leading-relaxed mb-6">
              You need to be a club admin or team admin to create chat threads. Only admins can create chat threads for their organizations.
            </p>
            
            <div className="card p-4 bg-blue-500/10 border-blue-500/20 mb-6">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-left">
                  <p className="text-blue-400 font-medium text-sm">Admin Requirements</p>
                  <div className="text-blue-300 text-xs mt-1 space-y-1">
                    <p>• <Crown className="w-3 h-3 inline mr-1" />Club Admin: Create club chat threads (Pro required)</p>
                    <p>• <Shield className="w-3 h-3 inline mr-1" />Team Admin: Create team chat threads (Full access)</p>
                    <p>• Create a club or team to automatically gain admin permissions</p>
                  </div>
                </div>
              </div>
            </div>
            
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
        <h1 className="text-lg font-semibold text-slate-100">New Chat Thread</h1>
        <button
          onClick={onClose}
          className="p-2 -mr-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
          disabled={isPending}
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {error && (
        <div className="mx-4 mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-400 font-medium text-sm mb-2">Authorization Error</p>
              <p className="text-red-400 text-sm leading-relaxed">
                {getEnhancedErrorMessage(error)}
              </p>
              
              {error instanceof Error && error.message.includes('Authorization failed') && (
                <div className="mt-3 p-3 bg-red-500/5 rounded-lg border border-red-500/10">
                  <p className="text-red-300 text-xs font-medium mb-2">Available Admin Access:</p>
                  <div className="space-y-1">
                    {permissionDetails.clubNames.length > 0 && (
                      <p className="text-red-300 text-xs">
                        <Crown className="w-3 h-3 inline mr-1" />
                        Club Admin: {permissionDetails.clubNames.join(', ')}
                      </p>
                    )}
                    {permissionDetails.teamNames.length > 0 && (
                      <p className="text-red-300 text-xs">
                        <Shield className="w-3 h-3 inline mr-1" />
                        Team Admin: {permissionDetails.teamNames.join(', ')} (Full Access)
                      </p>
                    )}
                    {permissionDetails.clubNames.length === 0 && permissionDetails.teamNames.length === 0 && (
                      <p className="text-red-300 text-xs">
                        No admin permissions found. Create a club or team to gain admin access.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 pb-32">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-300">
                <MessageCircle className="w-4 h-4 inline mr-2" />
                Thread Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`input-mobile ${errors.name ? 'input-error' : ''}`}
                placeholder="Enter thread name"
                disabled={isPending}
                autoFocus
              />
              {errors.name && <p className="text-red-400 text-sm mt-2">{errors.name}</p>}
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-300">
                <FileText className="w-4 h-4 inline mr-2" />
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="input-mobile min-h-[120px] resize-none"
                placeholder="Describe the purpose of this chat thread (optional)"
                disabled={isPending}
              />
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-300">
                <Users className="w-4 h-4 inline mr-2" />
                Thread Level *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleInputChange('organizationType', 'team')}
                  className={`btn-mobile ${
                    formData.organizationType === 'team'
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                  }`}
                  disabled={isPending || (authorizedTeams.length === 0 && clubsForTeamAdmins.length === 0)}
                >
                  <Trophy className="w-4 h-4 mr-2" />
                  Team Level {(authorizedTeams.length === 0 && clubsForTeamAdmins.length === 0) && '(None)'}
                </button>
                
                {isAppAdmin || hasAdvancedChatAccess ? (
                  <button
                    type="button"
                    onClick={() => handleInputChange('organizationType', 'club')}
                    className={`btn-mobile ${
                      formData.organizationType === 'club'
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                    }`}
                    disabled={isPending || authorizedClubs.length === 0}
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Club Level {authorizedClubs.length === 0 && '(None)'}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={true}
                    className="btn-mobile bg-red-500/20 text-red-400 border-red-500/30 cursor-not-allowed relative"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Club Level
                    <Lock className="w-3 h-3 absolute top-1 right-1" />
                  </button>
                )}
              </div>
              <p className="text-slate-400 text-sm">
                {formData.organizationType === 'club' 
                  ? `Create a club-wide thread (${authorizedClubs.length} clubs available) - Pro feature`
                  : `Create a team-specific thread (${Math.max(authorizedTeams.length, clubsForTeamAdmins.length)} teams available) - Full access for team admins`
                }
              </p>
              
              {!isAppAdmin && !hasAdvancedChatAccess && (
                <div className="card p-4 bg-red-500/10 border-red-500/20">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                      <Lock className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <p className="text-red-400 font-medium">Club Messaging - Pro Feature</p>
                      <p className="text-red-300 text-sm">
                        Club-level messaging requires Pro subscription. Team messaging is available to all team admins.
                        {isAppAdmin && ' App admins have unrestricted access to all messaging features.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Club Selection - Updated for team admins */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                  formData.clubId ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-slate-300'
                }`}>
                  1
                </div>
                <label className="block text-sm font-medium text-slate-300">
                  <Crown className="w-4 h-4 inline mr-2" />
                  Select Club *
                </label>
              </div>
              
              <div className="card p-4 max-h-48 overflow-y-auto">
                {isLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-3 p-2 animate-pulse">
                        <div className="w-4 h-4 bg-slate-700 rounded"></div>
                        <div className="w-6 h-6 bg-slate-700 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-slate-700 rounded w-1/3"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (() => {
                  const availableClubs = formData.organizationType === 'club' ? authorizedClubs : clubsForTeamAdmins;
                  
                  return availableClubs.length === 0 ? (
                    <div className="text-center py-6">
                      <Crown className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-slate-400 text-sm">
                        No clubs available for {formData.organizationType} thread creation.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {availableClubs.map((club) => (
                        <label
                          key={club.id.toString()}
                          className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-800/50 cursor-pointer"
                        >
                          <input
                            type="radio"
                            name="club"
                            value={club.id.toString()}
                            checked={formData.clubId === club.id.toString()}
                            onChange={(e) => handleInputChange('clubId', e.target.value)}
                            className="w-4 h-4 text-emerald-500 bg-slate-800 border-slate-600 focus:ring-emerald-500 focus:ring-2"
                            disabled={isPending}
                          />
                          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                            <span className="text-white text-xs font-semibold">
                              {club.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className="text-slate-200 text-sm font-medium">{club.name}</p>
                            <p className="text-slate-400 text-xs">Club</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  );
                })()}
              </div>
              {errors.clubId && <p className="text-red-400 text-sm mt-2">{errors.clubId}</p>}
              
              <div className="card p-3 bg-blue-500/10 border-blue-500/20">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-blue-400" />
                  <span className="text-blue-400 text-sm font-medium">Step 1: Club Selection</span>
                </div>
                <p className="text-blue-300 text-xs mt-1">
                  {formData.organizationType === 'club' 
                    ? 'Select the club you want to create a thread for.'
                    : 'Select the club that contains the team you want to create a thread for.'
                  }
                </p>
              </div>
            </div>

            {/* Team Selection - Only show for team-level threads */}
            {formData.organizationType === 'team' && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                    formData.teamId ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-slate-300'
                  }`}>
                    2
                  </div>
                  <label className="block text-sm font-medium text-slate-300">
                    <Trophy className="w-4 h-4 inline mr-2" />
                    Select Team *
                  </label>
                  {formData.clubId && (
                    <span className="text-slate-400 text-sm">in {getSelectedClubName()}</span>
                  )}
                </div>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search teams..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-mobile pl-10"
                    disabled={isPending || !formData.clubId}
                  />
                </div>

                <div className="card p-4 max-h-48 overflow-y-auto">
                  {!formData.clubId ? (
                    <div className="text-center py-6">
                      <Trophy className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-slate-400 text-sm">
                        Please select a club first to see available teams.
                      </p>
                    </div>
                  ) : (() => {
                    const filteredTeams = teamsForSelectedClub.filter(team =>
                      team.name.toLowerCase().includes(searchQuery.toLowerCase())
                    );
                    
                    return filteredTeams.length === 0 ? (
                      <div className="text-center py-6">
                        <Trophy className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <p className="text-slate-400 text-sm">
                          {searchQuery 
                            ? 'No teams found matching your search.'
                            : `No teams available in ${getSelectedClubName()}.`
                          }
                        </p>
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="text-emerald-400 hover:text-emerald-300 text-sm mt-2"
                          >
                            Clear search
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredTeams.map((team) => (
                          <label
                            key={team.id.toString()}
                            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-800/50 cursor-pointer"
                          >
                            <input
                              type="radio"
                              name="team"
                              value={team.id.toString()}
                              checked={formData.teamId === team.id.toString()}
                              onChange={(e) => handleInputChange('teamId', e.target.value)}
                              className="w-4 h-4 text-emerald-500 bg-slate-800 border-slate-600 focus:ring-emerald-500 focus:ring-2"
                              disabled={isPending}
                            />
                            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                              <span className="text-white text-xs font-semibold">
                                {team.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1">
                              <p className="text-slate-200 text-sm font-medium">{team.name}</p>
                              <p className="text-slate-400 text-xs">Team in {getSelectedClubName()}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    );
                  })()}
                </div>
                {errors.teamId && <p className="text-red-400 text-sm mt-2">{errors.teamId}</p>}
                
                <div className="card p-3 bg-emerald-500/10 border-emerald-500/20">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 text-sm font-medium">Step 2: Team Selection</span>
                  </div>
                  <p className="text-emerald-300 text-xs mt-1">
                    Select the team you want to create a thread for.
                  </p>
                </div>
              </div>
            )}

            {/* Preview */}
            {formData.name && formData.clubId && (formData.organizationType === 'club' || formData.teamId) && (
              <div className="card p-4 bg-emerald-500/10 border-emerald-500/20">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center shrink-0">
                    <MessageCircle className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-slate-200">{formData.name}</h4>
                    </div>
                    <p className="text-slate-300 text-sm mb-2">{formData.description || 'No description provided'}</p>
                    <div className="flex items-center space-x-2">
                      <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs border ${
                        formData.organizationType === 'club' 
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                      }`}>
                        {formData.organizationType === 'club' ? (
                          <Crown className="w-3 h-3" />
                        ) : (
                          <Trophy className="w-3 h-3" />
                        )}
                        <span>{formData.organizationType === 'club' ? 'Club' : 'Team'}</span>
                      </div>
                      <span className="text-slate-400 text-xs">
                        {formData.organizationType === 'club' ? getSelectedClubName() : getSelectedTeamName()}
                      </span>
                      {formData.organizationType === 'team' && formData.clubId && (
                        <span className="text-blue-400 text-xs">• Club: {getSelectedClubName()}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {formData.organizationType === 'team' && formData.clubId && formData.teamId && (
              <div className="card p-4 bg-blue-500/10 border-blue-500/20">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-slate-200 font-medium">Club-Team Association</p>
                    <p className="text-slate-400 text-sm">
                      This thread will be linked to both {getSelectedClubName()} (club) and {getSelectedTeamName()} (team).
                      All team members will have access to participate.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="card p-4 bg-blue-500/10 border-blue-500/20">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-slate-200 font-medium">Chat Thread Visibility</p>
                  <p className="text-slate-400 text-sm">
                    All members of the selected {formData.organizationType} will be able to participate in this chat thread.
                    {formData.organizationType === 'team' && formData.clubId && 
                      ' The thread will be associated with both the club and team for proper organization.'
                    }
                  </p>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="border-t border-slate-800/50 p-4 bg-slate-900/95 backdrop-blur-sm sticky bottom-0 z-10">
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
            disabled={
              isPending || 
              !formData.name.trim() || 
              (formData.organizationType === 'club' && (!isAppAdmin && !hasAdvancedChatAccess)) ||
              (formData.organizationType === 'club' && !formData.clubId) ||
              (formData.organizationType === 'team' && (!formData.clubId || !formData.teamId))
            }
            className={`btn-primary-mobile ${isPending ? 'btn-loading' : ''}`}
          >
            {isPending ? 'Creating...' : 'Create Thread'}
          </button>
        </div>
      </div>
    </div>
  );
}
