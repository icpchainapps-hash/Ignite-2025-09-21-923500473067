import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, Search, UserPlus, Users, Shield, Crown, Settings, User, Baby, Trash2, CheckCircle, AlertCircle, Loader2, RefreshCw, UserCog, XCircle } from 'lucide-react';
import { useSearchUsers, useAddUserToTeam, useRemoveUserFromTeam, useRemoveTeamRole, useAssignClubAdmin, useRemoveClubAdmin } from '../hooks/useUserManagement';
import { useGetTeamMembersByTeamId } from '../hooks/useTeams';
import { useGetClubMembers } from '../hooks/useClubs';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import type { TeamRole, ClubRole } from '../backend';
import { Principal } from '@dfinity/principal';

interface UserManagementModalProps {
  type: 'team' | 'club';
  organizationId: string;
  organizationName: string;
  onClose: () => void;
}

interface UserSearchResult {
  principal: Principal;
  displayName: string;
}

export default function UserManagementModal({ type, organizationId, organizationName, onClose }: UserManagementModalProps) {
  const [activeTab, setActiveTab] = useState<'add' | 'manage'>('add');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<TeamRole[]>([]);
  const [showConfirmRemove, setShowConfirmRemove] = useState<{ user: any; type: 'team' | 'club_admin' } | null>(null);
  const [showRoleRemoveConfirm, setShowRoleRemoveConfirm] = useState<{ user: any; role: TeamRole; roleDisplayName: string } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const { mutate: searchUsers, data: searchResults, isPending: searching } = useSearchUsers();
  const { mutate: addUserToTeam, isPending: addingUser } = useAddUserToTeam();
  const { mutate: removeUserFromTeam, isPending: removingUser } = useRemoveUserFromTeam();
  const { mutate: removeTeamRole, isPending: removingRole } = useRemoveTeamRole();
  const { mutate: assignClubAdmin, isPending: assigningAdmin } = useAssignClubAdmin();
  const { mutate: removeClubAdmin, isPending: removingAdmin } = useRemoveClubAdmin();
  
  // Get current members
  const { data: teamMembers, refetch: refetchTeamMembers, isRefetching: teamMembersRefetching } = useGetTeamMembersByTeamId(
    type === 'team' ? organizationId : undefined
  );
  const { mutate: getClubMembers, data: clubMemberships, isPending: clubMembersLoading } = useGetClubMembers();
  
  const { identity } = useInternetIdentity();
  const currentUserPrincipal = identity?.getPrincipal().toString();

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

  // Load club members when managing club
  useEffect(() => {
    if (type === 'club' && activeTab === 'manage') {
      getClubMembers(organizationId);
    }
  }, [type, activeTab, organizationId, getClubMembers]);

  // Search users when query changes
  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const timeoutId = setTimeout(() => {
        searchUsers(searchQuery.trim());
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [searchQuery, searchUsers]);

  const teamRoleOptions = [
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

  const handleRoleToggle = (role: TeamRole) => {
    setSelectedRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const handleAddUser = () => {
    if (!selectedUser) return;

    if (type === 'team') {
      if (selectedRoles.length === 0) {
        setErrorMessage('Please select at least one role for the user');
        setTimeout(() => setErrorMessage(''), 3000);
        return;
      }

      addUserToTeam({
        teamId: organizationId,
        userPrincipal: selectedUser.principal,
        roles: selectedRoles,
      }, {
        onSuccess: () => {
          const roleNames = selectedRoles.map(role => {
            const roleOption = teamRoleOptions.find(r => r.value === role);
            return roleOption?.name || role.toString();
          }).join(', ');
          
          setSuccessMessage(`${selectedUser.displayName} has been added to ${organizationName} with roles: ${roleNames}`);
          setSelectedUser(null);
          setSelectedRoles([]);
          setSearchQuery('');
          setTimeout(() => setSuccessMessage(''), 4000);
        },
        onError: (error) => {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to add user to team');
          setTimeout(() => setErrorMessage(''), 5000);
        }
      });
    } else {
      assignClubAdmin({
        clubId: organizationId,
        userPrincipal: selectedUser.principal,
      }, {
        onSuccess: () => {
          setSuccessMessage(`${selectedUser.displayName} has been assigned as club admin for ${organizationName}`);
          setSelectedUser(null);
          setSearchQuery('');
          setTimeout(() => setSuccessMessage(''), 4000);
        },
        onError: (error) => {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to assign club admin role');
          setTimeout(() => setErrorMessage(''), 5000);
        }
      });
    }
  };

  const handleRemoveUser = (user: any, removeType: 'team' | 'club_admin') => {
    setShowConfirmRemove({ user, type: removeType });
  };

  const handleRemoveRole = (user: any, role: TeamRole) => {
    const roleDisplayName = teamRoleOptions.find(r => r.value === role)?.name || role.toString();
    setShowRoleRemoveConfirm({ user, role, roleDisplayName });
  };

  const confirmRemoveUser = () => {
    if (!showConfirmRemove) return;

    const { user, type: removeType } = showConfirmRemove;

    if (removeType === 'team') {
      const userPrincipal = user.principal ? Principal.fromText(user.principal) : Principal.fromText(user.id);
      
      removeUserFromTeam({
        teamId: organizationId,
        userPrincipal,
      }, {
        onSuccess: () => {
          setSuccessMessage(`${user.name} has been removed from ${organizationName}`);
          setShowConfirmRemove(null);
          setTimeout(() => setSuccessMessage(''), 3000);
        },
        onError: (error) => {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to remove user from team');
          setShowConfirmRemove(null);
          setTimeout(() => setErrorMessage(''), 5000);
        }
      });
    } else {
      const userPrincipal = user.user || Principal.fromText(user.principal);
      
      removeClubAdmin({
        clubId: organizationId,
        userPrincipal,
      }, {
        onSuccess: () => {
          setSuccessMessage(`Club admin role removed from ${user.displayName || user.name}`);
          setShowConfirmRemove(null);
          setTimeout(() => setSuccessMessage(''), 3000);
        },
        onError: (error) => {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to remove club admin role');
          setShowConfirmRemove(null);
          setTimeout(() => setErrorMessage(''), 5000);
        }
      });
    }
  };

  const confirmRemoveRole = () => {
    if (!showRoleRemoveConfirm) return;

    const { user, role } = showRoleRemoveConfirm;
    const userPrincipal = user.principal ? Principal.fromText(user.principal) : Principal.fromText(user.id);
    
    removeTeamRole({
      teamId: organizationId,
      userPrincipal,
      role,
    }, {
      onSuccess: () => {
        setSuccessMessage(`${showRoleRemoveConfirm.roleDisplayName} role removed from ${user.name}`);
        setShowRoleRemoveConfirm(null);
        setTimeout(() => setSuccessMessage(''), 3000);
      },
      onError: (error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to remove role');
        setShowRoleRemoveConfirm(null);
        setTimeout(() => setErrorMessage(''), 5000);
      }
    });
  };

  const getRoleIcon = (role: TeamRole) => {
    const roleOption = teamRoleOptions.find(r => r.value === role);
    return roleOption ? <roleOption.icon className={`w-3 h-3 ${roleOption.color}`} /> : <User className="w-3 h-3 text-slate-400" />;
  };

  const getRoleText = (role: TeamRole) => {
    const roleOption = teamRoleOptions.find(r => r.value === role);
    return roleOption?.name || role.toString();
  };

  const getRoleColor = (role: TeamRole) => {
    const roleOption = teamRoleOptions.find(r => r.value === role);
    return roleOption ? `${roleOption.bgColor} ${roleOption.borderColor} ${roleOption.color}` : 'bg-slate-500/10 border-slate-500/20 text-slate-400';
  };

  const tabs = [
    { id: 'add' as const, label: 'Add Users', icon: UserPlus },
    { id: 'manage' as const, label: 'Manage Members', icon: Users },
  ];

  const renderAddUserTab = () => (
    <div className="space-y-6">
      {/* User Search */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Search className="w-5 h-5 text-emerald-400" />
          <h3 className="text-lg font-semibold text-slate-100">Search Users</h3>
        </div>
        
        <div className="card p-4 bg-blue-500/10 border-blue-500/20">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <UserCog className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-blue-400 font-medium">Direct User Management</p>
              <p className="text-blue-300 text-sm">
                Search for users by their display name or principal ID and add them directly to your {type}.
                Users must have logged in at least once to be found and added.
              </p>
            </div>
          </div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name or principal ID (minimum 2 characters)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-mobile pl-10"
            disabled={addingUser || assigningAdmin}
          />
        </div>

        {searchQuery.length >= 2 && (
          <div className="card p-4 max-h-64 overflow-y-auto">
            {searching ? (
              <div className="text-center py-4">
                <Loader2 className="w-6 h-6 text-emerald-400 animate-spin mx-auto mb-2" />
                <p className="text-slate-400 text-sm">Searching users...</p>
              </div>
            ) : !searchResults || searchResults.length === 0 ? (
              <div className="text-center py-4">
                <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">No users found</p>
                <p className="text-slate-500 text-xs">Try a different search term or check the spelling</p>
              </div>
            ) : (
              <div className="space-y-2">
                {searchResults.map((user) => (
                  <label
                    key={user.principal.toString()}
                    className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                      selectedUser?.principal.toString() === user.principal.toString()
                        ? 'bg-emerald-500/10 border-emerald-500/30 ring-2 ring-emerald-500/20'
                        : 'hover:bg-slate-800/50 border border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="user"
                      value={user.principal.toString()}
                      checked={selectedUser?.principal.toString() === user.principal.toString()}
                      onChange={() => setSelectedUser(user)}
                      className="w-4 h-4 text-emerald-500 bg-slate-800 border-slate-600 focus:ring-emerald-500"
                      disabled={addingUser || assigningAdmin}
                    />
                    <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-semibold">
                        {user.displayName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-slate-200 font-medium">{user.displayName}</p>
                      <p className="text-slate-400 text-xs font-mono">
                        {user.principal.toString().slice(0, 20)}...
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Role Selection for Teams */}
      {type === 'team' && selectedUser && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-slate-100">Assign Roles</h3>
          </div>
          
          <div className="card p-4 bg-blue-500/10 border-blue-500/20">
            <div className="flex items-center space-x-3 mb-3">
              <CheckCircle className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-blue-400 font-medium">Selected User</p>
                <p className="text-blue-300 text-sm">{selectedUser.displayName}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-slate-300 text-sm">Select one or more roles for this user:</p>
            {teamRoleOptions.map((roleOption) => {
              const Icon = roleOption.icon;
              const isSelected = selectedRoles.includes(roleOption.value);
              
              return (
                <label
                  key={roleOption.value}
                  className={`card p-4 cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? `${roleOption.bgColor} ${roleOption.borderColor} ring-2 ring-opacity-50`
                      : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleRoleToggle(roleOption.value)}
                      className="mt-1 w-4 h-4 text-emerald-500 bg-slate-800 border-slate-600 focus:ring-emerald-500"
                      disabled={addingUser}
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

      {/* Club Admin Assignment */}
      {type === 'club' && selectedUser && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Crown className="w-5 h-5 text-yellow-400" />
            <h3 className="text-lg font-semibold text-slate-100">Assign Club Admin</h3>
          </div>
          
          <div className="card p-4 bg-yellow-500/10 border-yellow-500/20">
            <div className="flex items-center space-x-3 mb-3">
              <Crown className="w-5 h-5 text-yellow-400" />
              <div>
                <p className="text-yellow-400 font-medium">Club Admin Role</p>
                <p className="text-yellow-300 text-sm">
                  {selectedUser.displayName} will be assigned as club admin for {organizationName}
                </p>
              </div>
            </div>
            
            <div className="text-yellow-300 text-sm space-y-1">
              <p>• Full administrative access to club management</p>
              <p>• Can manage teams and club settings</p>
              <p>• Can assign other club admins</p>
              <p>• Can create club-wide events and announcements</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderManageMembersTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-emerald-400" />
          <h3 className="text-lg font-semibold text-slate-100">Current Members</h3>
        </div>
        <button
          onClick={() => type === 'team' ? refetchTeamMembers() : getClubMembers(organizationId)}
          className="p-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800/50 transition-colors"
          disabled={teamMembersRefetching || clubMembersLoading}
          title="Refresh member list"
        >
          <RefreshCw className={`w-4 h-4 ${(teamMembersRefetching || clubMembersLoading) ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {type === 'team' ? (
        <div className="space-y-3">
          {teamMembersRefetching ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="card p-4 animate-pulse">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-slate-700 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-slate-700 rounded w-1/3 mb-2"></div>
                      <div className="h-3 bg-slate-700 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : !teamMembers || teamMembers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No team members found</p>
              <p className="text-slate-500 text-sm">Add users to see them listed here</p>
            </div>
          ) : (
            teamMembers.map((member) => (
              <div key={member.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold">
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-slate-100 font-medium">{member.name}</h4>
                        {member.isCreator && (
                          <span className="bg-yellow-500/10 text-yellow-400 text-xs px-2 py-1 rounded-full border border-yellow-500/20">
                            Creator
                          </span>
                        )}
                        {member.principal === currentUserPrincipal && (
                          <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-1 rounded-full border border-emerald-500/20">
                            You
                          </span>
                        )}
                      </div>
                      {member.roles && member.roles.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {member.roles.map((role, index) => (
                            <div key={index} className="flex items-center space-x-1">
                              <span
                                className={`text-xs px-2 py-1 rounded-full border flex items-center ${getRoleColor(role as TeamRole)}`}
                              >
                                {getRoleIcon(role as TeamRole)}
                                <span className="ml-1">{role}</span>
                              </span>
                              {/* Individual role removal button */}
                              {!member.isCreator && member.principal !== currentUserPrincipal && member.roles.length > 1 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const teamRole = role === 'Team Admin' ? TeamRole.teamAdmin :
                                                   role === 'Coach' ? TeamRole.coach :
                                                   role === 'Player' ? TeamRole.player :
                                                   role === 'Parent' ? TeamRole.parent : TeamRole.player;
                                    handleRemoveRole(member, teamRole);
                                  }}
                                  className="p-1 text-slate-400 hover:text-orange-400 rounded transition-all duration-200 ml-1"
                                  disabled={removingRole}
                                  title={`Remove ${role} role`}
                                >
                                  <XCircle className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {!member.isCreator && member.principal !== currentUserPrincipal && (
                    <button
                      onClick={() => handleRemoveUser(member, 'team')}
                      className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800/50 transition-colors"
                      disabled={removingUser}
                      title="Remove from team"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {clubMembersLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="card p-4 animate-pulse">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-slate-700 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-slate-700 rounded w-1/3 mb-2"></div>
                      <div className="h-3 bg-slate-700 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : !clubMemberships || clubMemberships.length === 0 ? (
            <div className="text-center py-8">
              <Crown className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No club admins found</p>
              <p className="text-slate-500 text-sm">Assign users as club admins to see them here</p>
            </div>
          ) : (
            clubMemberships
              .filter(membership => membership.roles.includes(ClubRole.clubAdmin))
              .map((membership) => (
                <div key={membership.user.toString()} className="card p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
                        <Crown className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="text-slate-100 font-medium">
                          {/* Display name will be resolved when backend provides it */}
                          {membership.user.toString().slice(0, 20)}...
                        </h4>
                        <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs border bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                          <Crown className="w-3 h-3" />
                          <span>Club Admin</span>
                        </div>
                        {membership.user.toString() === currentUserPrincipal && (
                          <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-1 rounded-full border border-emerald-500/20 mt-1 inline-block">
                            You
                          </span>
                        )}
                      </div>
                    </div>
                    {membership.user.toString() !== currentUserPrincipal && (
                      <button
                        onClick={() => handleRemoveUser({ user: membership.user, displayName: 'Club Admin' }, 'club_admin')}
                        className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800/50 transition-colors"
                        disabled={removingAdmin}
                        title="Remove club admin role"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
          )}
        </div>
      )}
    </div>
  );

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
          <h1 className="text-lg font-semibold text-slate-100">Manage Users</h1>
          <p className="text-sm text-slate-400">{organizationName}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 -mr-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mx-4 mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <p className="text-emerald-400 text-sm font-medium">{successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-sm font-medium">{errorMessage}</p>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-slate-800/50 bg-slate-900/95 backdrop-blur-sm">
        <div className="flex overflow-x-auto p-1 mx-4">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center space-x-2 py-3 px-4 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === id
                  ? 'bg-emerald-500 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 pb-32">
          {activeTab === 'add' ? renderAddUserTab() : renderManageMembersTab()}

          {/* User Management Info */}
          <div className="mt-8 card p-6 bg-blue-500/10 border-blue-500/20">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h4 className="font-medium text-slate-100 mb-2">Enhanced User Management System</h4>
                <div className="text-slate-300 text-sm space-y-2">
                  <p>As a {type} admin, you can now:</p>
                  <ul className="list-disc list-inside space-y-1 text-slate-400 ml-4">
                    {type === 'team' ? (
                      <>
                        <li><strong>Search Users:</strong> Find users by display name or principal ID</li>
                        <li><strong>Direct Addition:</strong> Add users to your team without requiring join requests</li>
                        <li><strong>Role Assignment:</strong> Assign multiple roles during user addition (Player, Coach, Team Admin, Parent)</li>
                        <li><strong>Member Removal:</strong> Remove users from your team when needed</li>
                        <li><strong>Individual Role Removal:</strong> Remove specific roles while preserving other roles</li>
                        <li><strong>Role Management:</strong> View and manage existing member roles with granular control</li>
                      </>
                    ) : (
                      <>
                        <li><strong>Search Users:</strong> Find users by display name or principal ID</li>
                        <li><strong>Club Admin Assignment:</strong> Assign other users as club admins for your club</li>
                        <li><strong>Admin Removal:</strong> Remove club admin roles from other users</li>
                        <li><strong>Permission Validation:</strong> Cannot remove your own admin role</li>
                        <li><strong>Membership Requirement:</strong> Users must be club or team members before admin assignment</li>
                      </>
                    )}
                    <li><strong>Real-time Updates:</strong> All changes are reflected immediately in member lists</li>
                    <li><strong>Audit Trail:</strong> All user management actions are tracked for accountability</li>
                    <li><strong>Permission Scoped:</strong> Actions are limited to your {type} only</li>
                  </ul>
                  <p className="mt-3 text-blue-300">
                    User management actions require proper admin permissions and are scoped to the specific {type} you manage.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800/50 p-4 bg-slate-900/95 backdrop-blur-sm sticky bottom-0 z-10">
        {activeTab === 'add' && selectedUser ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                setSelectedUser(null);
                setSelectedRoles([]);
              }}
              className="btn-secondary-mobile"
              disabled={addingUser || assigningAdmin}
            >
              Cancel
            </button>
            <button
              onClick={handleAddUser}
              disabled={
                addingUser || 
                assigningAdmin || 
                (type === 'team' && selectedRoles.length === 0)
              }
              className={`btn-primary-mobile ${(addingUser || assigningAdmin) ? 'btn-loading' : ''}`}
            >
              {addingUser || assigningAdmin ? (
                type === 'team' ? 'Adding to Team...' : 'Assigning Admin...'
              ) : (
                <>
                  <UserPlus className="w-5 h-5 mr-2" />
                  {type === 'team' ? 'Add to Team' : 'Assign Admin'}
                </>
              )}
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

      {/* Remove User Confirmation Modal */}
      {showConfirmRemove && (
        <div className="absolute inset-0 bg-black/75 flex items-center justify-center p-4 z-10">
          <div className="bg-slate-800 rounded-xl p-6 max-w-sm w-full">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-100 mb-2">
                {showConfirmRemove.type === 'team' ? 'Remove from Team' : 'Remove Club Admin'}
              </h3>
              <p className="text-slate-400 mb-6">
                Are you sure you want to {showConfirmRemove.type === 'team' ? 'remove' : 'remove club admin role from'} "{showConfirmRemove.user.name || showConfirmRemove.user.displayName}"? 
                {showConfirmRemove.type === 'team' 
                  ? ' This will remove them from the team and all their role assignments.'
                  : ' They will lose club admin privileges but remain a club member.'
                } This action cannot be undone.
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowConfirmRemove(null)}
                  className="btn-secondary"
                  disabled={removingUser || removingAdmin}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRemoveUser}
                  disabled={removingUser || removingAdmin}
                  className={`bg-red-500 hover:bg-red-600 disabled:bg-red-400 text-white py-2 px-4 rounded-lg transition-colors font-medium ${(removingUser || removingAdmin) ? 'btn-loading' : ''}`}
                >
                  {removingUser || removingAdmin ? 'Removing...' : 'Remove'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Role Removal Confirmation Modal */}
      {showRoleRemoveConfirm && (
        <div className="absolute inset-0 bg-black/75 flex items-center justify-center p-4 z-10">
          <div className="bg-slate-800 rounded-xl p-6 max-w-sm w-full">
            <div className="text-center">
              <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-6 h-6 text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-100 mb-2">Remove Team Role</h3>
              <p className="text-slate-400 mb-6">
                Are you sure you want to remove the "{showRoleRemoveConfirm.roleDisplayName}" role from "{showRoleRemoveConfirm.user.name}"? 
                This will remove their specific role while preserving any other roles they may have for this team. This action cannot be undone.
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowRoleRemoveConfirm(null)}
                  className="btn-secondary"
                  disabled={removingRole}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRemoveRole}
                  disabled={removingRole}
                  className={`bg-orange-500 hover:bg-orange-600 disabled:bg-orange-400 text-white py-2 px-4 rounded-lg transition-colors font-medium ${removingRole ? 'btn-loading' : ''}`}
                >
                  {removingRole ? 'Removing Role...' : 'Remove Role'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
