import React, { useState, useEffect } from 'react';
import { X, Search, Users, MapPin, ArrowLeft, CheckCircle, AlertCircle, UserPlus, Send, Loader2, RefreshCw, Shield, Trophy, Crown, Settings, User, Baby } from 'lucide-react';
import { useIsCurrentUserAdmin, useSubmitJoinRequest } from '../hooks/useQueries';
import { useActor } from '../hooks/useActor';
import type { TeamRole } from '../backend';

interface JoinTeamModalProps {
  onClose: () => void;
}

export default function JoinTeamModal({ onClose }: JoinTeamModalProps) {
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<TeamRole>(TeamRole.player);
  const [joinReason, setJoinReason] = useState('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [availableClubs, setAvailableClubs] = useState<Club[]>([]);
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const [loadingClubs, setLoadingClubs] = useState(true);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [clubSearchQuery, setClubSearchQuery] = useState('');
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  const { data: isAdmin } = useIsCurrentUserAdmin();
  const { mutate: submitJoinRequest, isPending: isSubmitting } = useSubmitJoinRequest();
  const { actor } = useActor();

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

  useEffect(() => {
    const loadAvailableClubs = async () => {
      if (!actor) return;
      
      try {
        setLoadingClubs(true);
        setErrorMessage('');
        console.log('Loading available clubs for join request...');
        
        const allClubs = await actor.getAllClubs();
        console.log('Clubs loaded successfully:', allClubs.length);
        
        setAvailableClubs(allClubs || []);
      } catch (error) {
        console.error('Failed to load available clubs:', error);
        setErrorMessage('Failed to load available clubs. Please try refreshing.');
      } finally {
        setLoadingClubs(false);
      }
    };

    loadAvailableClubs();
  }, [actor]);

  useEffect(() => {
    const loadTeamsForClub = async () => {
      if (!actor || !selectedClubId) {
        setAvailableTeams([]);
        return;
      }
      
      try {
        setLoadingTeams(true);
        setErrorMessage('');
        console.log('Loading teams for club:', selectedClubId);
        
        const clubTeams = await actor.getTeamsByClubId(BigInt(selectedClubId));
        console.log('Teams loaded successfully for club:', selectedClubId, 'count:', clubTeams.length);
        
        setAvailableTeams(clubTeams || []);
      } catch (error) {
        console.error('Failed to load teams for club:', selectedClubId, error);
        setErrorMessage('Failed to load teams for the selected club. Please try refreshing.');
        setAvailableTeams([]);
      } finally {
        setLoadingTeams(false);
      }
    };

    loadTeamsForClub();
  }, [actor, selectedClubId]);

  const filteredClubs = availableClubs.filter(club => 
    club.name.toLowerCase().includes(clubSearchQuery.toLowerCase()) ||
    club.description.toLowerCase().includes(clubSearchQuery.toLowerCase())
  );

  const filteredTeams = availableTeams.filter(team => 
    team.name.toLowerCase().includes(teamSearchQuery.toLowerCase()) ||
    team.description.toLowerCase().includes(teamSearchQuery.toLowerCase())
  );

  const selectedClub = availableClubs.find(club => club.id.toString() === selectedClubId);
  const selectedTeam = availableTeams.find(team => team.id.toString() === selectedTeamId);

  const roleOptions = [
    {
      value: TeamRole.player,
      name: 'Player',
      description: 'Active team member participating in games and training',
      icon: User,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
    },
    {
      value: TeamRole.parent,
      name: 'Parent',
      description: 'Guardian of a player with access to child-related information',
      icon: Baby,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20',
    },
    {
      value: TeamRole.coach,
      name: 'Coach',
      description: 'Manage lineups, training sessions, and player development',
      icon: Settings,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20',
    },
    {
      value: TeamRole.teamAdmin,
      name: 'Team Admin',
      description: 'Manage team roster, events, and team-specific settings',
      icon: Shield,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
    },
  ];

  const selectedRoleOption = roleOptions.find(option => option.value === selectedRole) || roleOptions[0];

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!selectedClubId) {
      errors.club = 'Please select a club';
    }
    
    if (!selectedTeamId) {
      errors.team = 'Please select a team';
    }
    
    if (!selectedRole) {
      errors.role = 'Please select a specific role';
    }
    
    if (!joinReason.trim()) {
      errors.reason = 'Please provide a reason for joining';
    } else if (joinReason.trim().length < 10) {
      errors.reason = 'Please provide a more detailed reason (at least 10 characters)';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitJoinRequest = async () => {
    console.log('Starting single role join request submission with full validation...');
    
    // Clear previous errors
    setErrorMessage('');
    setValidationErrors({});
    
    // Validate form
    if (!validateForm()) {
      console.log('Form validation failed:', validationErrors);
      return;
    }
    
    if (!selectedClub || !selectedTeam) {
      setErrorMessage('Please ensure both club and team are properly selected');
      return;
    }
    
    console.log('Form validation passed, submitting single role join request:', {
      clubId: selectedClubId,
      clubName: selectedClub.name,
      teamId: selectedTeamId,
      teamName: selectedTeam.name,
      requestedRole: selectedRole,
      roleName: selectedRoleOption.name,
      reasonLength: joinReason.trim().length,
    });

    try {
      const result = await submitJoinRequest({
        clubId: selectedClubId,
        teamId: selectedTeamId,
        requestedRole: selectedRole,
      });
      
      console.log('Single role join request submitted successfully:', result);
      
      setSuccessMessage(`✅ Join request submitted successfully! You've requested the ${selectedRoleOption.name} role for ${selectedTeam.name} in ${selectedClub.name}. Team admins will be notified immediately and can approve your request for this specific role. You will receive a notification when they respond.`);
      
      // Clear form
      setSelectedClubId('');
      setSelectedTeamId('');
      setSelectedRole(TeamRole.player);
      setJoinReason('');
      setValidationErrors({});
      
      // Close modal after showing success message
      setTimeout(() => {
        onClose();
      }, 4000);
    } catch (error) {
      console.error('Single role join request submission failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to submit join request';
      setErrorMessage(errorMsg);
    }
  };

  const handleClubSelection = (clubId: string) => {
    console.log('Club selected:', clubId);
    setSelectedClubId(clubId);
    setSelectedTeamId('');
    setTeamSearchQuery('');
    setValidationErrors(prev => ({ ...prev, club: '', team: '' }));
  };

  const handleTeamSelection = (teamId: string) => {
    console.log('Team selected:', teamId);
    setSelectedTeamId(teamId);
    setValidationErrors(prev => ({ ...prev, team: '' }));
  };

  const handleRoleSelection = (role: TeamRole) => {
    console.log('Specific role selected:', role);
    setSelectedRole(role);
    setValidationErrors(prev => ({ ...prev, role: '' }));
  };

  const handleReasonChange = (reason: string) => {
    setJoinReason(reason);
    setValidationErrors(prev => ({ ...prev, reason: '' }));
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-slate-800/50 bg-slate-900/95 backdrop-blur-sm sticky top-0 z-10">
        <button
          onClick={onClose}
          className="p-2 -ml-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold text-slate-100">
          {isAdmin ? 'Join a Team' : 'Request Specific Team Role'}
        </h1>
        <button
          onClick={onClose}
          className="p-2 -mr-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {successMessage && (
        <div className="mx-4 mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-emerald-400 text-sm font-medium">{successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-red-400 text-sm font-medium">{errorMessage}</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 pb-32">
          {!isAdmin && (
            <div className="card p-6 bg-blue-500/10 border-blue-500/20 mb-6">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center shrink-0">
                  <UserPlus className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-100 mb-2">Single Role Join Request Process</h3>
                  
                  <div className="card p-3 bg-emerald-500/10 border-emerald-500/20">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400 font-medium text-sm">SPECIFIC ROLE REQUEST SYSTEM</span>
                    </div>
                    <p className="text-emerald-300 text-xs">
                      When you submit a join request, you request access to ONE specific role only. Admins will see your exact role request and can approve you for that specific role.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4 mb-6">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                1
              </div>
              <h3 className="text-lg font-semibold text-slate-100">Select Club</h3>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search clubs by name or description..."
                value={clubSearchQuery}
                onChange={(e) => setClubSearchQuery(e.target.value)}
                className={`input-mobile pl-10 ${validationErrors.club ? 'input-error' : ''}`}
                disabled={loadingClubs}
              />
            </div>
            {validationErrors.club && <p className="text-red-400 text-sm mt-2">{validationErrors.club}</p>}

            {loadingClubs ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="card p-4 animate-pulse">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-slate-700 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-slate-700 rounded w-1/3 mb-2"></div>
                        <div className="h-3 bg-slate-700 rounded w-full mb-2"></div>
                        <div className="h-3 bg-slate-700 rounded w-1/2"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredClubs.length === 0 ? (
              <div className="card p-8 text-center">
                <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Users className="w-8 h-8 text-slate-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-100 mb-3">No Clubs Found</h3>
                <p className="text-slate-400 leading-relaxed">
                  {clubSearchQuery
                    ? 'Try adjusting your search criteria to find more clubs.'
                    : 'No clubs are available to browse at the moment.'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredClubs.map((club) => (
                  <label
                    key={club.id.toString()}
                    className={`card p-4 cursor-pointer transition-all duration-200 ${
                      selectedClubId === club.id.toString()
                        ? 'bg-emerald-500/10 border-emerald-500/30 ring-2 ring-emerald-500/20'
                        : 'hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <input
                        type="radio"
                        name="club"
                        value={club.id.toString()}
                        checked={selectedClubId === club.id.toString()}
                        onChange={(e) => handleClubSelection(e.target.value)}
                        className="mt-1 w-4 h-4 text-emerald-500 bg-slate-800 border-slate-600 focus:ring-emerald-500"
                        disabled={isSubmitting}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-slate-100">{club.name}</h4>
                        </div>
                        <p className="text-slate-300 text-sm mb-2">{club.description}</p>
                        <div className="flex items-center text-slate-400 text-sm space-x-4">
                          {club.location && (
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 mr-1" />
                              <span>{club.location}</span>
                            </div>
                          )}
                          <div className="flex items-center">
                            <Users className="w-4 h-4 mr-1" />
                            <span>1+ members</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {selectedClubId && (
            <div className="space-y-4 mb-6">
              <div className="flex items-center space-x-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                  selectedTeamId ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-slate-300'
                }`}>
                  2
                </div>
                <h3 className="text-lg font-semibold text-slate-100">Select Team</h3>
                <span className="text-slate-400 text-sm">in {selectedClub?.name}</span>
              </div>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search teams by name or description..."
                  value={teamSearchQuery}
                  onChange={(e) => setTeamSearchQuery(e.target.value)}
                  className={`input-mobile pl-10 ${validationErrors.team ? 'input-error' : ''}`}
                  disabled={loadingTeams}
                />
              </div>
              {validationErrors.team && <p className="text-red-400 text-sm mt-2">{validationErrors.team}</p>}

              {loadingTeams ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="card p-4 animate-pulse">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-slate-700 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-slate-700 rounded w-1/3 mb-2"></div>
                          <div className="h-3 bg-slate-700 rounded w-full mb-2"></div>
                          <div className="h-3 bg-slate-700 rounded w-1/2"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredTeams.length === 0 ? (
                <div className="card p-8 text-center">
                  <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Trophy className="w-8 h-8 text-slate-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-100 mb-3">No Teams Found</h3>
                  <p className="text-slate-400 leading-relaxed">
                    {teamSearchQuery
                      ? 'Try adjusting your search criteria to find more teams.'
                      : `No teams are available in ${selectedClub?.name}.`
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTeams.map((team) => (
                    <label
                      key={team.id.toString()}
                      className={`card p-4 cursor-pointer transition-all duration-200 ${
                        selectedTeamId === team.id.toString()
                          ? 'bg-emerald-500/10 border-emerald-500/30 ring-2 ring-emerald-500/20'
                          : 'hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-start space-x-4">
                        <input
                          type="radio"
                          name="team"
                          value={team.id.toString()}
                          checked={selectedTeamId === team.id.toString()}
                          onChange={(e) => handleTeamSelection(e.target.value)}
                          className="mt-1 w-4 h-4 text-emerald-500 bg-slate-800 border-slate-600 focus:ring-emerald-500"
                          disabled={isSubmitting}
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-slate-100">{team.name}</h4>
                          </div>
                          <p className="text-slate-300 text-sm mb-2">{team.description}</p>
                          <div className="flex items-center text-slate-400 text-sm space-x-4">
                            <div className="flex items-center">
                              <Trophy className="w-4 h-4 mr-1" />
                              <span>Team in {selectedClub?.name}</span>
                            </div>
                            <div className="flex items-center">
                              <Users className="w-4 h-4 mr-1" />
                              <span>1+ members</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {!isAdmin && selectedTeamId && (
            <div className="space-y-4 mb-6">
              <div className="flex items-center space-x-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                  selectedRole ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-slate-300'
                }`}>
                  3
                </div>
                <h3 className="text-lg font-semibold text-slate-100">Select Your Specific Role</h3>
              </div>
              
              <div className="card p-4 bg-blue-500/10 border-blue-500/20">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-blue-400 font-medium">Single Role Request System</p>
                    <p className="text-blue-300 text-sm">
                      Select exactly ONE role you want to request. Your join request will be for this specific role only, and admins will see your precise role request.
                    </p>
                  </div>
                </div>
              </div>
              
              {validationErrors.role && <p className="text-red-400 text-sm mb-2">{validationErrors.role}</p>}
              
              <div className="space-y-3">
                {roleOptions.map((roleOption) => {
                  const Icon = roleOption.icon;
                  const isSelected = selectedRole === roleOption.value;
                  
                  return (
                    <label
                      key={roleOption.value}
                      className={`card p-4 cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? `${roleOption.bgColor} ${roleOption.borderColor} ring-2 ring-emerald-500/50`
                          : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-start space-x-4">
                        <input
                          type="radio"
                          name="role"
                          value={roleOption.value}
                          checked={isSelected}
                          onChange={(e) => handleRoleSelection(e.target.value as TeamRole)}
                          className="mt-1 w-4 h-4 text-emerald-500 bg-slate-800 border-slate-600 focus:ring-emerald-500"
                          disabled={isSubmitting}
                        />
                        <div className="flex items-center space-x-3 flex-1">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            isSelected ? roleOption.bgColor : 'bg-slate-700'
                          }`}>
                            <Icon className={`w-5 h-5 ${
                              isSelected ? roleOption.color : 'text-slate-400'
                            }`} />
                          </div>
                          <div className="flex-1">
                            <p className={`font-medium ${
                              isSelected ? roleOption.color : 'text-slate-300'
                            }`}>{roleOption.name}</p>
                            <p className={`text-sm ${
                              isSelected ? roleOption.color.replace('500', '300') : 'text-slate-400'
                            }`}>{roleOption.description}</p>
                          </div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {!isAdmin && selectedTeamId && selectedRole && (
            <div className="space-y-4 mb-6">
              <div className="flex items-center space-x-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                  joinReason.trim() ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-slate-300'
                }`}>
                  4
                </div>
                <h3 className="text-lg font-semibold text-slate-100">Reason for Requesting This Role</h3>
              </div>
              
              <textarea
                value={joinReason}
                onChange={(e) => handleReasonChange(e.target.value)}
                className={`input-mobile min-h-[120px] resize-none ${validationErrors.reason ? 'input-error' : ''}`}
                placeholder={`Tell the team admins why you want to join ${selectedTeam?.name} as a ${selectedRoleOption.name.toLowerCase()} and how you plan to contribute in this specific role...`}
                disabled={isSubmitting}
              />
              {validationErrors.reason && <p className="text-red-400 text-sm mt-2">{validationErrors.reason}</p>}
              
              <div className="text-right">
                <p className="text-slate-400 text-xs">
                  {joinReason.length}/500 characters {joinReason.length < 10 && '(minimum 10 required)'}
                </p>
              </div>
            </div>
          )}

          {!isAdmin && selectedClub && selectedTeam && selectedRole && joinReason.trim() && (
            <div className="card p-4 bg-emerald-500/10 border-emerald-500/20">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center shrink-0">
                  <Send className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="text-emerald-400 font-medium">Single Role Join Request Preview</p>
                  <p className="text-emerald-300 text-sm mb-2">
                    Requesting to join {selectedTeam.name} in {selectedClub.name} as a {selectedRoleOption.name}
                  </p>
                  
                  <div className={`card p-3 mb-3 ${selectedRoleOption.bgColor} ${selectedRoleOption.borderColor}`}>
                    <div className="flex items-center space-x-2">
                      <selectedRoleOption.icon className={`w-4 h-4 ${selectedRoleOption.color}`} />
                      <span className={`text-sm font-medium ${selectedRoleOption.color}`}>
                        Specific Role Request: {selectedRoleOption.name}
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-emerald-500/5 rounded-lg p-3 border border-emerald-500/10 mb-3">
                    <p className="text-emerald-300/80 text-xs leading-relaxed">
                      "{joinReason}"
                    </p>
                  </div>

                  <div className="card p-3 bg-blue-500/10 border-blue-500/20">
                    <div className="flex items-center space-x-2">
                      <Shield className="w-4 h-4 text-blue-400" />
                      <span className="text-blue-400 font-medium text-sm">SINGLE ROLE ADMIN NOTIFICATION</span>
                    </div>
                    <p className="text-blue-300 text-xs">
                      All team admins for {selectedTeam.name} will receive an immediate notification with your specific {selectedRoleOption.name} role request and can approve you for exactly this role
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Single Role Request System Information */}
          <div className="card p-6 bg-blue-500/10 border-blue-500/20">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h4 className="font-medium text-slate-100 mb-2">Enhanced Single Role Join Request System</h4>
                <div className="text-slate-300 text-sm space-y-2">
                  <p>This join request system ensures precise role assignment:</p>
                  <ul className="list-disc list-inside space-y-1 text-slate-400 ml-4">
                    <li><strong>Single Role Request:</strong> You request access to exactly ONE specific role per request</li>
                    <li><strong>No Multiple Roles:</strong> Each request is for one role only - no bulk role requests</li>
                    <li><strong>Specific Notifications:</strong> Admins see your exact role request in notifications</li>
                    <li><strong>Precise Assignment:</strong> When approved, you get exactly the role you requested</li>
                    <li><strong>Clear Communication:</strong> Admins know exactly what role you want</li>
                    <li><strong>No Role Confusion:</strong> Prevents multiple role assignments or unclear requests</li>
                    <li><strong>One Request Per Team:</strong> Only one pending request allowed per team at a time</li>
                    <li><strong>Role-Specific Approval:</strong> Approval applies only to the requested role</li>
                  </ul>
                  <p className="mt-3 text-blue-300">
                    All steps include detailed logging and error handling to ensure reliable single role request operation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800/50 p-4 bg-slate-900/95 backdrop-blur-sm sticky bottom-0 z-10">
        {!isAdmin && selectedTeamId ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onClose}
              className="btn-secondary-mobile"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitJoinRequest}
              disabled={isSubmitting || !selectedTeamId || !selectedRole || !joinReason.trim() || joinReason.trim().length < 10}
              className={`btn-primary-mobile ${isSubmitting ? 'btn-loading' : ''}`}
            >
              {isSubmitting ? 'Submitting...' : `Request ${selectedRoleOption.name} Role`}
            </button>
          </div>
        ) : (
          <button
            onClick={onClose}
            className="w-full btn-primary-mobile"
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
}
