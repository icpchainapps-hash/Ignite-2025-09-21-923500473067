import React, { useState, useEffect } from 'react';
import { X, Radio, Users, FileText, ArrowLeft, CheckCircle, AlertCircle, Search, Crown, Trophy, Shield, Settings, User, Baby, Check, Loader2 } from 'lucide-react';
import { useGetUserClubs } from '../hooks/useClubs';
import { useGetAllTeams } from '../hooks/useTeams';
import { useIsCurrentUserAdmin } from '../hooks/useUsers';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useCreateBroadcastMessageThread, useGetAllUsersForBroadcast, estimateRecipientCount, RoleType, type BroadcastMessageRequest } from '../hooks/useBroadcastMessaging';
import type { Club, Team } from '../backend';

interface BroadcastThreadCreateModalProps {
  onClose: () => void;
}

interface RecipientSelection {
  clubs: {
    all: boolean;
    selected: string[];
  };
  roles: {
    all: boolean;
    selected: RoleType[];
  };
}

export default function BroadcastThreadCreateModal({ onClose }: BroadcastThreadCreateModalProps) {
  const [messageContent, setMessageContent] = useState('');

  const [recipientSelection, setRecipientSelection] = useState<RecipientSelection>({
    clubs: {
      all: true,
      selected: [],
    },
    roles: {
      all: true,
      selected: [],
    },
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string>('');

  const { data: clubs, isLoading: clubsLoading } = useGetUserClubs();
  const { data: teams, isLoading: teamsLoading } = useGetAllTeams();
  const { data: isAppAdmin } = useIsCurrentUserAdmin();
  const { data: allUsers } = useGetAllUsersForBroadcast();
  const { mutate: createBroadcastThread, isPending: isCreating, error: createError } = useCreateBroadcastMessageThread();
  const { identity } = useInternetIdentity();

  // Prevent body scroll when modal is open
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

  const availableRoles = [
    { id: RoleType.basicUser, name: 'Basic User', icon: User, color: 'text-slate-400' },
    { id: RoleType.clubAdmin, name: 'Club Admin', icon: Crown, color: 'text-yellow-400' },
    { id: RoleType.teamAdmin, name: 'Team Admin', icon: Shield, color: 'text-blue-400' },
    { id: RoleType.coach, name: 'Coach', icon: Settings, color: 'text-green-400' },
    { id: RoleType.player, name: 'Player', icon: User, color: 'text-purple-400' },
    { id: RoleType.parent, name: 'Parent', icon: Baby, color: 'text-orange-400' },
  ];

  // Filter clubs based on search query
  const filteredClubs = (clubs || []).filter(club =>
    club.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate estimated recipients
  const estimatedRecipients = estimateRecipientCount(
    recipientSelection,
    allUsers || [],
    clubs?.map(club => ({ id: club.id, name: club.name })) || []
  );

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!messageContent.trim()) {
      newErrors.messageContent = 'Message content is required';
    }

    if (!recipientSelection.clubs.all && recipientSelection.clubs.selected.length === 0) {
      newErrors.clubs = 'Please select at least one club or choose "All Clubs"';
    }

    if (!recipientSelection.roles.all && recipientSelection.roles.selected.length === 0) {
      newErrors.roles = 'Please select at least one role or choose "All Roles"';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const request: BroadcastMessageRequest = {
      messageContent: messageContent.trim(),
      recipientSelection,
    };

    createBroadcastThread(request, {
      onSuccess: (result) => {
        setSuccessMessage(`Broadcast message thread created successfully! Message sent to ${result.recipients.length} recipients.`);
        
        // Reset form
        setMessageContent('');
        setRecipientSelection({
          clubs: { all: true, selected: [] },
          roles: { all: true, selected: [] },
        });
        
        // Close modal after showing success message
        setTimeout(() => {
          onClose();
        }, 3000);
      },
      onError: (error) => {
        console.error('Failed to create broadcast thread:', error);
        setErrors({ submit: error instanceof Error ? error.message : 'Failed to create broadcast thread' });
      }
    });
  };

  const handleInputChange = (value: string) => {
    setMessageContent(value);
    
    if (errors.messageContent) {
      setErrors(prev => ({ ...prev, messageContent: '' }));
    }
  };

  const toggleClubSelection = (clubId: string) => {
    setRecipientSelection(prev => ({
      ...prev,
      clubs: {
        ...prev.clubs,
        selected: prev.clubs.selected.includes(clubId)
          ? prev.clubs.selected.filter(id => id !== clubId)
          : [...prev.clubs.selected, clubId],
      },
    }));
  };

  const toggleRoleSelection = (roleId: RoleType) => {
    setRecipientSelection(prev => ({
      ...prev,
      roles: {
        ...prev.roles,
        selected: prev.roles.selected.includes(roleId)
          ? prev.roles.selected.filter(id => id !== roleId)
          : [...prev.roles.selected, roleId],
      },
    }));
  };

  const handleClubsAllToggle = (all: boolean) => {
    setRecipientSelection(prev => ({
      ...prev,
      clubs: {
        all,
        selected: all ? [] : prev.clubs.selected,
      },
    }));
  };

  const handleRolesAllToggle = (all: boolean) => {
    setRecipientSelection(prev => ({
      ...prev,
      roles: {
        all,
        selected: all ? [] : prev.roles.selected,
      },
    }));
  };

  const isLoading = clubsLoading || teamsLoading;

  // Check if user is app admin - if not, show access denied
  if (!isAppAdmin) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-800/50 bg-slate-900/95 backdrop-blur-sm sticky top-0 z-10">
          <button
            onClick={onClose}
            className="p-2 -ml-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold text-slate-100">Broadcast Message</h1>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="card p-8 text-center max-w-md">
            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Radio className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-100 mb-3">App Admin Access Required</h3>
            <p className="text-slate-400 leading-relaxed mb-6">
              Broadcast messaging is restricted to app administrators only. This feature allows sending messages to all users across all clubs with flexible recipient targeting.
            </p>
            
            <div className="card p-4 bg-red-500/10 border-red-500/20 mb-6">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4 text-red-400" />
                </div>
                <div className="text-left">
                  <p className="text-red-400 font-medium text-sm">App Admin Only Feature</p>
                  <div className="text-red-300 text-xs mt-1 space-y-1">
                    <p>• Create message threads targeting all users</p>
                    <p>• Select recipients by clubs, roles, or combinations</p>
                    <p>• Multi-select functionality for flexible targeting</p>
                    <p>• Automatic thread member addition for selected users</p>
                    <p>• Only app administrators can access this feature</p>
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
          disabled={isCreating}
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-semibold text-slate-100">Create Broadcast Message</h1>
          <div className="flex items-center justify-center space-x-2">
            <div className="flex items-center space-x-1 bg-purple-500/10 text-purple-400 px-2 py-1 rounded-full border border-purple-500/20">
              <Shield className="w-3 h-3" />
              <span className="text-xs font-medium">App Admin</span>
            </div>
            <p className="text-sm text-slate-400">All Users Targeting</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 -mr-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
          disabled={isCreating}
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mx-4 mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <div className="flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-emerald-400 font-medium text-sm mb-2">Broadcast Created Successfully!</p>
              <p className="text-emerald-400 text-sm leading-relaxed">
                {successMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Form submission error */}
      {errors.submit && (
        <div className="mx-4 mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-400 font-medium text-sm mb-2">Broadcast Creation Error</p>
              <p className="text-red-400 text-sm leading-relaxed">
                {errors.submit}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Backend function error */}
      {createError && (
        <div className="mx-4 mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-400 font-medium text-sm mb-2">Backend Implementation Required</p>
              <p className="text-red-400 text-sm leading-relaxed">
                {createError instanceof Error ? createError.message : 'Failed to create broadcast thread'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 pb-32">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* App Admin Permission Confirmation - Removed explanatory text */}
            <div className="card p-4 bg-purple-500/10 border-purple-500/20">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-purple-400 font-medium">App Admin Broadcast Access Confirmed</p>
                </div>
              </div>
            </div>

            {/* Message Content */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-300">
                <Radio className="w-4 h-4 inline mr-2" />
                Broadcast Message Content *
              </label>
              <textarea
                value={messageContent}
                onChange={(e) => handleInputChange(e.target.value)}
                className={`input-mobile min-h-[120px] resize-none ${errors.messageContent ? 'input-error' : ''}`}
                placeholder="Enter your broadcast message content"
                disabled={isCreating}
                autoFocus
              />
              {errors.messageContent && <p className="text-red-400 text-sm mt-2">{errors.messageContent}</p>}
            </div>

            {/* Club Selection */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Crown className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-semibold text-slate-100">Target Clubs</h3>
              </div>

              {/* All Clubs Toggle */}
              <div className="card p-4 bg-blue-500/10 border-blue-500/20">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={recipientSelection.clubs.all}
                    onChange={(e) => handleClubsAllToggle(e.target.checked)}
                    className="w-4 h-4 text-blue-500 bg-slate-800 border-slate-600 focus:ring-blue-500"
                    disabled={isCreating}
                  />
                  <div className="flex items-center space-x-2">
                    <Crown className="w-4 h-4 text-blue-400" />
                    <span className="text-blue-400 font-medium">All Clubs</span>
                  </div>
                  <span className="text-blue-300 text-sm">
                    Target all {clubs?.length || 0} clubs in the application
                  </span>
                </label>
              </div>

              {/* Specific Club Selection */}
              {!recipientSelection.clubs.all && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search clubs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="input-mobile pl-10"
                      disabled={isCreating}
                    />
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
                    ) : filteredClubs.length === 0 ? (
                      <div className="text-center py-6">
                        <Crown className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <p className="text-slate-400 text-sm">
                          {searchQuery ? 'No clubs found matching your search.' : 'No clubs available.'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredClubs.map((club) => (
                          <label
                            key={club.id.toString()}
                            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-800/50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={recipientSelection.clubs.selected.includes(club.id.toString())}
                              onChange={() => toggleClubSelection(club.id.toString())}
                              className="w-4 h-4 text-blue-500 bg-slate-800 border-slate-600 focus:ring-blue-500"
                              disabled={isCreating}
                            />
                            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                              <span className="text-white text-xs font-semibold">
                                {club.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1">
                              <p className="text-slate-200 text-sm font-medium">{club.name}</p>
                              <p className="text-slate-400 text-xs">{club.description}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  {errors.clubs && <p className="text-red-400 text-sm mt-2">{errors.clubs}</p>}

                  {recipientSelection.clubs.selected.length > 0 && (
                    <div className="card p-3 bg-blue-500/10 border-blue-500/20">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-blue-400" />
                        <span className="text-blue-400 text-sm font-medium">
                          {recipientSelection.clubs.selected.length} club{recipientSelection.clubs.selected.length !== 1 ? 's' : ''} selected
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Role Selection */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-semibold text-slate-100">Target Roles</h3>
              </div>

              {/* All Roles Toggle */}
              <div className="card p-4 bg-emerald-500/10 border-emerald-500/20">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={recipientSelection.roles.all}
                    onChange={(e) => handleRolesAllToggle(e.target.checked)}
                    className="w-4 h-4 text-emerald-500 bg-slate-800 border-slate-600 focus:ring-emerald-500"
                    disabled={isCreating}
                  />
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">All Roles</span>
                  </div>
                  <span className="text-emerald-300 text-sm">
                    Target users with any role in the selected clubs
                  </span>
                </label>
              </div>

              {/* Specific Role Selection */}
              {!recipientSelection.roles.all && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {availableRoles.map((role) => {
                      const Icon = role.icon;
                      const isSelected = recipientSelection.roles.selected.includes(role.id);
                      
                      return (
                        <label
                          key={role.id}
                          className={`card p-3 cursor-pointer transition-all duration-200 ${
                            isSelected
                              ? 'bg-emerald-500/10 border-emerald-500/30 ring-2 ring-emerald-500/20'
                              : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleRoleSelection(role.id)}
                              className="w-4 h-4 text-emerald-500 bg-slate-800 border-slate-600 focus:ring-emerald-500"
                              disabled={isCreating}
                            />
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              isSelected ? 'bg-emerald-500/20' : 'bg-slate-700'
                            }`}>
                              <Icon className={`w-4 h-4 ${
                                isSelected ? 'text-emerald-400' : 'text-slate-400'
                              }`} />
                            </div>
                            <div className="flex-1">
                              <p className={`font-medium text-sm ${
                                isSelected ? 'text-emerald-400' : 'text-slate-300'
                              }`}>{role.name}</p>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  {errors.roles && <p className="text-red-400 text-sm mt-2">{errors.roles}</p>}

                  {recipientSelection.roles.selected.length > 0 && (
                    <div className="card p-3 bg-emerald-500/10 border-emerald-500/20">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400 text-sm font-medium">
                          {recipientSelection.roles.selected.length} role{recipientSelection.roles.selected.length !== 1 ? 's' : ''} selected
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Recipient Estimate */}
            <div className="card p-4 bg-purple-500/10 border-purple-500/20">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="text-purple-400 font-medium">Estimated Recipients</p>
                  <p className="text-purple-300 text-sm mb-2">
                    Approximately {estimatedRecipients} user{estimatedRecipients !== 1 ? 's' : ''} would receive this broadcast message
                  </p>
                  
                  <div className="space-y-2 text-purple-300 text-sm">
                    <div className="flex items-center space-x-2">
                      <Crown className="w-4 h-4" />
                      <span>
                        Clubs: {recipientSelection.clubs.all ? 'All clubs' : `${recipientSelection.clubs.selected.length} selected`}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Shield className="w-4 h-4" />
                      <span>
                        Roles: {recipientSelection.roles.all ? 'All roles' : `${recipientSelection.roles.selected.length} selected`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview */}
            {messageContent && (
              <div className="card p-4 bg-emerald-500/10 border-emerald-500/20">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center shrink-0">
                    <Radio className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-slate-200">Broadcast Message Preview</h4>
                      <div className="flex items-center space-x-1 bg-purple-500/10 text-purple-400 px-2 py-1 rounded-full border border-purple-500/20">
                        <Radio className="w-3 h-3" />
                        <span className="text-xs">Broadcast</span>
                      </div>
                    </div>
                    <p className="text-slate-300 text-sm mb-2">{messageContent}</p>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs border bg-purple-500/10 text-purple-400 border-purple-500/20">
                        <Users className="w-3 h-3" />
                        <span>~{estimatedRecipients} recipients</span>
                      </div>
                      <span className="text-slate-400 text-xs">App Admin Broadcast</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Broadcast Features Info - Removed explanatory text */}
            <div className="card p-4 bg-blue-500/10 border-blue-500/20">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center shrink-0">
                  <CheckCircle className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-100 mb-2">Broadcast Thread Features</h4>
                </div>
              </div>
            </div>

            {/* Backend Implementation Requirements */}
            <div className="card p-4 bg-orange-500/10 border-orange-500/20">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-100 mb-2">Backend Implementation Status</h4>
                  <div className="text-slate-300 text-sm space-y-2">
                    <p>Current implementation status:</p>
                    <ul className="list-disc list-inside space-y-1 text-slate-400 ml-4">
                      <li><strong>✅ Hook Created:</strong> useCreateBroadcastMessageThread with proper TypeScript typing</li>
                      <li><strong>✅ Parameters:</strong> Accepts message content and recipient selection (clubs, roles)</li>
                      <li><strong>✅ Error Handling:</strong> Returns errors and success responses for UI integration</li>
                      <li><strong>✅ Type Safety:</strong> Uses BroadcastMessageRequest and RecipientCriteria types</li>
                      <li><strong>✅ Backend Integration:</strong> Ready to call createBroadcastMessageThread when available</li>
                      <li><strong>⚠️ Backend Function:</strong> createBroadcastMessageThread needs to be added to backend interface</li>
                      <li><strong>⚠️ Backend Function:</strong> getBroadcastMessageThreads needs to be added to backend interface</li>
                    </ul>
                    <p className="mt-3 text-orange-300">
                      The frontend hook is complete and will work immediately once the backend functions are implemented.
                    </p>
                  </div>
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
            disabled={isCreating}
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={
              isCreating || 
              !messageContent.trim() ||
              (!recipientSelection.clubs.all && recipientSelection.clubs.selected.length === 0) ||
              (!recipientSelection.roles.all && recipientSelection.roles.selected.length === 0)
            }
            className={`btn-primary-mobile ${isCreating ? 'btn-loading' : ''}`}
          >
            {isCreating ? (
              'Creating Broadcast...'
            ) : (
              <>
                <Radio className="w-5 h-5 mr-2" />
                Create Broadcast Thread
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
