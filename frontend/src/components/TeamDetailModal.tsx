import React, { useState } from 'react';
import { X, Trophy, Users, Calendar, MessageCircle, Settings, ArrowLeft, Trash2, Crown, Hash, AlertTriangle, RefreshCw, UserPlus, CheckCircle, Baby, Megaphone, Shield, User, Settings as SettingsIcon, UserCog, UserMinus, XCircle, Edit } from 'lucide-react';
import { useGetTeamMembersByTeamId, useDeleteTeam, useGetTeamMessageThreads } from '../hooks/useTeams';
import { useGetAnnouncementsByTeamId } from '../hooks/useAnnouncements';
import { useGetEventsByTeamId } from '../hooks/useEvents';
import { useRemoveUserFromTeam, useRemoveTeamRole } from '../hooks/useUserManagement';
import { useManageTeamRoles } from '../hooks/useUserManagement';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useActor } from '../hooks/useActor';
import { useIsCurrentUserAdmin } from '../hooks/useUsers';
import type { TeamRole, Event } from '../backend';
import { Principal } from '@dfinity/principal';
import AnnouncementThreadModal from './AnnouncementThreadModal';
import UserManagementModal from './UserManagementModal';
import EventDetailModal from './EventDetailModal';
import TeamMemberRoleManagementModal from './TeamMemberRoleManagementModal';

interface Team {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  userRole: 'team_admin' | 'coach' | 'player' | 'parent' | 'basic_user';
  createdAt: number;
  ageGroup?: string;
  clubId: string;
  clubName: string;
  creator?: any;
}

interface TeamDetailModalProps {
  team: Team;
  onClose: () => void;
  onMessageThreadClick?: (threadId: string) => void;
}

export default function TeamDetailModal({ team, onClose, onMessageThreadClick }: TeamDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'events' | 'announcements' | 'messages'>('overview');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<{ member: any; memberName: string } | null>(null);
  const [showRoleRemoveConfirm, setShowRoleRemoveConfirm] = useState<{ member: any; memberName: string; role: TeamRole; roleDisplayName: string } | null>(null);
  const [showRoleManagement, setShowRoleManagement] = useState<{ member: any; memberName: string } | null>(null);
  const [isClubAdmin, setIsClubAdmin] = useState(false);
  
  const { identity } = useInternetIdentity();
  const { actor } = useActor();
  const { data: isAppAdmin } = useIsCurrentUserAdmin();
  
  const teamIdString = team?.id?.toString();
  
  const { 
    data: members, 
    isLoading: membersLoading, 
    error: membersError,
    refetch: refetchMembers,
    isRefetching: membersRefetching,
    isFetched: membersFetched,
  } = useGetTeamMembersByTeamId(teamIdString);
  
  const { mutate: getMessageThreads, data: messageThreads, isPending: messageThreadsLoading } = useGetTeamMessageThreads();
  const { mutate: getAnnouncements, data: announcements, isPending: announcementsLoading } = useGetAnnouncementsByTeamId();
  const { mutate: getTeamEvents, data: teamEvents, isPending: eventsLoading } = useGetEventsByTeamId();
  const { mutate: deleteTeam, isPending: isDeleting } = useDeleteTeam();
  const { mutate: removeUserFromTeam, isPending: isRemovingMember } = useRemoveUserFromTeam();
  const { mutate: removeTeamRole, isPending: isRemovingRole } = useRemoveTeamRole();

  const currentUserPrincipal = identity?.getPrincipal().toString();
  const canManage = team?.userRole === 'team_admin' || team?.userRole === 'coach';
  const canDelete = team?.userRole === 'team_admin' || (team?.creator && team.creator.toString() === currentUserPrincipal);
  const isTeamAdmin = team?.userRole === 'team_admin';

  // Check if current user is a club admin for this team's club
  React.useEffect(() => {
    const checkClubAdminStatus = async () => {
      if (!actor || !currentUserPrincipal || !team?.clubId) {
        setIsClubAdmin(false);
        return;
      }

      try {
        // Check if current user has club admin role for this team's club
        const clubMemberships = await actor.getClubMembershipsByClub(BigInt(team.clubId));
        const userClubMembership = clubMemberships.find(m => 
          m.user.toString() === currentUserPrincipal && 
          m.roles.some(role => role === 'clubAdmin')
        );
        
        setIsClubAdmin(!!userClubMembership);
      } catch (error) {
        console.error('Failed to check club admin status:', error);
        setIsClubAdmin(false);
      }
    };

    checkClubAdminStatus();
  }, [actor, currentUserPrincipal, team?.clubId]);

  // Permission check for member management actions
  // Only app admins, club admins of the relevant club, and team admins of the relevant team can manage members
  const canManageMembers = isAppAdmin || isClubAdmin || isTeamAdmin;

  React.useEffect(() => {
    if (!teamIdString) return;
    
    if (activeTab === 'messages') {
      getMessageThreads(teamIdString);
    } else if (activeTab === 'announcements') {
      getAnnouncements(teamIdString);
    } else if (activeTab === 'events') {
      getTeamEvents(teamIdString);
    }
  }, [activeTab, teamIdString, getMessageThreads, getAnnouncements, getTeamEvents]);

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: Trophy },
    { id: 'members' as const, label: 'Members', icon: UserPlus },
    { id: 'events' as const, label: 'Events', icon: Calendar },
    { id: 'messages' as const, label: 'Messages', icon: MessageCircle },
    { id: 'announcements' as const, label: 'News', icon: Megaphone },
  ];

  const handleDeleteTeam = () => {
    deleteTeam(teamIdString, {
      onSuccess: () => {
        onClose();
      },
    });
  };

  const handleAnnouncementClick = (announcement: any) => {
    setSelectedAnnouncement(announcement);
  };

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
  };

  const handleMessageThreadClick = (thread: any) => {
    if (onMessageThreadClick) {
      sessionStorage.setItem('openThreadId', thread.id.toString());
      onMessageThreadClick(thread.id.toString());
      onClose();
    }
  };

  const handleOpenMessenger = async () => {
    if (!actor || !teamIdString) return;
    
    try {
      // Backend function getMessageThreadIdForTeam is not available
      // Fall back to finding the first team message thread
      const teamThreads = await actor.getMessageThreadsByTeamId(BigInt(teamIdString));
      if (teamThreads.length > 0 && onMessageThreadClick) {
        sessionStorage.setItem('openThreadId', teamThreads[0].id.toString());
        onMessageThreadClick(teamThreads[0].id.toString());
        onClose();
      } else {
        console.warn('No message thread found for team:', teamIdString);
      }
    } catch (error) {
      console.error('Failed to get message thread for team:', error);
    }
  };

  const handleRemoveMember = (member: any) => {
    // Don't allow removing the team creator or current user
    if (member.isCreator || member.principal === currentUserPrincipal) {
      return;
    }
    
    setShowRemoveConfirm({
      member,
      memberName: member.name || 'Unknown Member'
    });
  };

  const handleRemoveRole = (member: any, role: string) => {
    // Don't allow removing roles from the team creator or current user
    if (member.isCreator || member.principal === currentUserPrincipal) {
      return;
    }
    
    // Convert role string to TeamRole enum
    let teamRole: TeamRole;
    switch (role) {
      case 'Team Admin':
        teamRole = TeamRole.teamAdmin;
        break;
      case 'Coach':
        teamRole = TeamRole.coach;
        break;
      case 'Player':
        teamRole = TeamRole.player;
        break;
      case 'Parent':
        teamRole = TeamRole.parent;
        break;
      default:
        console.error('Unknown role:', role);
        return;
    }
    
    setShowRoleRemoveConfirm({
      member,
      memberName: member.name || 'Unknown Member',
      role: teamRole,
      roleDisplayName: role
    });
  };

  const handleManageRoles = (member: any) => {
    // Don't allow managing roles for the team creator or current user
    if (member.isCreator || member.principal === currentUserPrincipal) {
      return;
    }
    
    setShowRoleManagement({
      member,
      memberName: member.name || 'Unknown Member'
    });
  };

  const confirmRemoveMember = () => {
    if (!showRemoveConfirm || !teamIdString) return;

    const { member } = showRemoveConfirm;
    
    try {
      const memberPrincipal = Principal.fromText(member.principal);
      
      removeUserFromTeam({
        teamId: teamIdString,
        userPrincipal: memberPrincipal,
      }, {
        onSuccess: () => {
          setShowRemoveConfirm(null);
          // Refresh the member list to show the updated membership
          refetchMembers();
        },
        onError: (error) => {
          console.error('Failed to remove team member:', error);
          setShowRemoveConfirm(null);
        }
      });
    } catch (error) {
      console.error('Invalid principal for member removal:', error);
      setShowRemoveConfirm(null);
    }
  };

  const confirmRemoveRole = () => {
    if (!showRoleRemoveConfirm || !teamIdString) return;

    const { member, role } = showRoleRemoveConfirm;
    
    try {
      const memberPrincipal = Principal.fromText(member.principal);
      
      removeTeamRole({
        teamId: teamIdString,
        userPrincipal: memberPrincipal,
        role: role,
      }, {
        onSuccess: () => {
          setShowRoleRemoveConfirm(null);
          // Refresh the member list to show the updated roles
          refetchMembers();
        },
        onError: (error) => {
          console.error('Failed to remove team role:', error);
          setShowRoleRemoveConfirm(null);
        }
      });
    } catch (error) {
      console.error('Invalid principal for role removal:', error);
      setShowRoleRemoveConfirm(null);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Team Admin':
        return <Shield className="w-3 h-3 text-blue-400" />;
      case 'Coach':
        return <SettingsIcon className="w-3 h-3 text-green-400" />;
      case 'Player':
        return <User className="w-3 h-3 text-purple-400" />;
      case 'Parent':
        return <Baby className="w-3 h-3 text-orange-400" />;
      case 'Child':
        return <Baby className="w-3 h-3 text-purple-400" />;
      default:
        return <User className="w-3 h-3 text-slate-400" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Team Admin':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Coach':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'Player':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'Parent':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'Child':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const renderMembersContent = () => {
    if (membersLoading || membersRefetching) {
      return (
        <div className="space-y-4">
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
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
          
          <div className="text-center py-4">
            <div className="inline-flex items-center space-x-3 text-slate-400">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-400 border-t-transparent"></div>
              <span className="text-sm font-medium">
                {membersRefetching ? 'Refreshing member data...' : 'Loading team members...'}
              </span>
            </div>
          </div>
        </div>
      );
    }

    if (membersError) {
      return (
        <div className="space-y-4">
          <div className="card p-6 bg-red-500/10 border-red-500/20">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-red-500/20">
                <AlertTriangle className="w-7 h-7 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-100 mb-2">Loading Error</h3>
              <p className="text-red-300 text-sm mb-4 leading-relaxed">
                {membersError instanceof Error ? membersError.message : 'Failed to load team members'}
              </p>
              
              <button
                onClick={() => refetchMembers()}
                className="btn-primary-mobile flex items-center justify-center"
                disabled={membersRefetching}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${membersRefetching ? 'animate-spin' : ''}`} />
                {membersRefetching ? 'Retrying...' : 'Try Again'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (membersFetched && (!members || members.length === 0)) {
      return (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <UserPlus className="w-8 h-8 text-slate-600" />
          </div>
          <h3 className="text-xl font-semibold text-slate-100 mb-3">No Members Found</h3>
          <p className="text-slate-400 leading-relaxed mb-4">
            This team doesn't have any visible members yet.
          </p>
          {canManageMembers && (
            <button
              onClick={() => setShowUserManagement(true)}
              className="btn-primary text-sm"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add First Member
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Team Admin User Management Controls */}
        {canManageMembers && (
          <div className="card p-4 bg-emerald-500/10 border-emerald-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                  <UserCog className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-emerald-400 font-medium">Team Admin Controls</p>
                  <p className="text-emerald-300 text-sm">
                    Add users directly to your team and assign roles
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowUserManagement(true)}
                className="btn-primary text-sm"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Manage Users
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {members!.map((member) => (
            <div key={member.id} className="card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`avatar-md shadow-lg ${
                    member.isChild ? 'bg-gradient-to-br from-purple-400 to-purple-600' :
                    'bg-gradient-to-br from-emerald-400 to-emerald-600'
                  }`}>
                    <span className="text-white font-semibold">
                      {member.name && member.name.length > 0 ? member.name.charAt(0).toUpperCase() : '?'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="text-slate-100 font-medium">
                        {member.name || 'Unknown Member'}
                      </h4>
                      {member.isCreator && (
                        <span className="bg-yellow-500/10 text-yellow-400 text-xs px-2 py-1 rounded-full border border-yellow-500/20">
                          Creator
                        </span>
                      )}
                      {member.isChild && (
                        <span className="bg-purple-500/10 text-purple-400 text-xs px-2 py-1 rounded-full border border-purple-500/20 flex items-center">
                          <Baby className="w-3 h-3 mr-1" />
                          Child
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400 text-sm mb-2">
                      {member.isChild ? (
                        `Born ${new Date(member.joinedAt).toLocaleDateString()}`
                      ) : (
                        `Joined ${member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : 'Unknown date'}`
                      )}
                    </p>
                    
                    {member.roles && member.roles.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {member.roles.map((role, index) => (
                          <div key={index} className="flex items-center space-x-1">
                            <span
                              className={`text-xs px-2 py-1 rounded-full border flex items-center ${getRoleColor(role)}`}
                            >
                              {getRoleIcon(role)}
                              <span className="ml-1">{role}</span>
                            </span>
                            {/* Individual role removal button - only show for authorized users and not for creator or current user */}
                            {canManageMembers && !member.isCreator && member.principal !== currentUserPrincipal && member.roles.length > 1 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveRole(member, role);
                                }}
                                className="p-1 text-slate-400 hover:text-red-400 rounded transition-all duration-200 ml-1"
                                disabled={isRemovingRole}
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
                
                <div className="flex items-center space-x-2">
                  {/* Manage Roles button - only visible to authorized users */}
                  {canManageMembers && !member.isCreator && member.principal !== currentUserPrincipal && (
                    <button
                      onClick={() => handleManageRoles(member)}
                      className="p-2 text-slate-400 hover:text-blue-400 rounded-lg hover:bg-slate-800/50 transition-all duration-200"
                      title="Manage roles"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  )}
                  
                  {/* Remove member button - only visible to authorized users */}
                  {canManageMembers && !member.isCreator && member.principal !== currentUserPrincipal && (
                    <button
                      onClick={() => handleRemoveMember(member)}
                      className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800/50 transition-all duration-200"
                      disabled={isRemovingMember}
                      title="Remove from team"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="text-center py-3">
          <div className="inline-flex items-center space-x-2 text-slate-500">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <p className="text-xs">
              {members!.length} member{members!.length !== 1 ? 's' : ''} loaded successfully
              {members!.some(m => m.isChild) && (
                <span className="text-purple-400 ml-1">
                  • {members!.filter(m => m.isChild).length} child{members!.filter(m => m.isChild).length !== 1 ? 'ren' : ''}
                </span>
              )}
            </p>
          </div>
          
          <button
            onClick={() => refetchMembers()}
            className="text-slate-500 hover:text-slate-400 text-xs mt-2 flex items-center justify-center space-x-1"
            disabled={membersRefetching}
          >
            <RefreshCw className={`w-3 h-3 ${membersRefetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Enhanced Role Assignment Notice */}
        <div className="card p-4 bg-emerald-500/10 border-emerald-500/20">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-emerald-400 font-medium">Enhanced User Management System</p>
              <p className="text-emerald-300 text-sm">
                {canManageMembers 
                  ? 'As team or club admin, you can now directly add users to your team, assign roles, remove members, remove individual roles, and manage all roles for each member. Use the "Manage Users" button above to search and add users.'
                  : 'Team and club admins can directly add users, assign roles, remove members, remove individual roles, and manage all roles for each member. When join requests are approved, users receive the precise role they requested.'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-100 mb-2">About</h3>
              <p className="text-slate-300">{team.description || 'No description available'}</p>
              {team.ageGroup && (
                <p className="text-slate-400 text-sm mt-2">🏆 {team.ageGroup}</p>
              )}
              <p className="text-slate-400 text-sm mt-1">Part of {team.clubName || 'Unknown Club'}</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="card p-4">
                <div className="flex items-center mb-2">
                  <Users className="w-5 h-5 text-emerald-500 mr-2" />
                  <span className="text-slate-100 font-medium">Members</span>
                </div>
                <div className="flex items-center space-x-2">
                  <p className="text-2xl font-bold text-slate-100">
                    {membersError ? (
                      <span className="text-orange-400 text-base font-normal">Error</span>
                    ) : (
                      members?.length || 1
                    )}
                  </p>
                  {membersError && (
                    <button
                      onClick={() => refetchMembers()}
                      className="p-1 text-orange-400 hover:text-orange-300 rounded"
                      disabled={membersRefetching}
                      title="Retry loading member count"
                    >
                      <RefreshCw className={`w-3 h-3 ${membersRefetching ? 'animate-spin' : ''}`} />
                    </button>
                  )}
                </div>
                {membersError ? (
                  <p className="text-orange-400 text-xs mt-1">Failed to load member count</p>
                ) : (
                  <div className="text-slate-400 text-xs mt-1">
                    <p>Including creator with assigned roles</p>
                    {members && members.some(m => m.isChild) && (
                      <p className="text-purple-400">
                        {members.filter(m => m.isChild).length} child{members.filter(m => m.isChild).length !== 1 ? 'ren' : ''}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <button 
                onClick={handleOpenMessenger}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Open Team Chat
              </button>
              
              {canManageMembers && (
                <button 
                  onClick={() => setShowUserManagement(true)}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
                >
                  <UserCog className="w-5 h-5 mr-2" />
                  Manage Team Users
                </button>
              )}
              
              {canDelete && (
                <button 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
                >
                  <Trash2 className="w-5 h-5 mr-2" />
                  Delete Team
                </button>
              )}
            </div>
          </div>
        );

      case 'members':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-100">Team Members</h3>
              <div className="flex items-center space-x-2">
                <p className="text-slate-400 text-sm">
                  {membersError ? (
                    <span className="text-orange-400">Error loading</span>
                  ) : (
                    `${members?.length || 1} member${(members?.length || 1) !== 1 ? 's' : ''}`
                  )}
                </p>
                {canManageMembers && (
                  <button
                    onClick={() => setShowUserManagement(true)}
                    className="btn-primary text-sm"
                  >
                    <UserCog className="w-4 h-4 mr-2" />
                    Manage
                  </button>
                )}
                <button
                  onClick={() => refetchMembers()}
                  className="p-1 text-slate-400 hover:text-slate-200 rounded transition-colors"
                  disabled={membersRefetching}
                  title="Refresh member list"
                >
                  <RefreshCw className={`w-4 h-4 ${membersRefetching ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
            
            {renderMembersContent()}
          </div>
        );

      case 'events':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-100">Team Events</h3>
              <div className="flex items-center space-x-2">
                <p className="text-slate-400 text-sm">{teamEvents?.length || 0} events</p>
                <button
                  onClick={() => getTeamEvents(teamIdString)}
                  className="p-1 text-slate-400 hover:text-slate-200 rounded transition-colors"
                  disabled={eventsLoading}
                  title="Refresh events list"
                >
                  <RefreshCw className={`w-4 h-4 ${eventsLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
            
            {eventsLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
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
            ) : !teamEvents || teamEvents.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No events scheduled</p>
                <p className="text-slate-500 text-sm">Events created for this team will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {teamEvents.map((event: Event) => {
                  const { date, time } = formatEventTime(event.startTime);
                  const eventTypeInfo = getEventTypeInfo(event.eventType);
                  const isUpcoming = Number(event.startTime) > Date.now();
                  
                  return (
                    <div 
                      key={event.id.toString()} 
                      className="card p-4 cursor-pointer hover:bg-slate-800/50 transition-colors"
                      onClick={() => handleEventClick(event)}
                    >
                      <div className="flex items-start space-x-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${eventTypeInfo.bgColor}`}>
                          <Calendar className={`w-6 h-6 ${eventTypeInfo.color}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium text-slate-100">{event.title}</h4>
                            <div className="flex items-center space-x-2">
                              <span className={`text-xs px-2 py-1 rounded-full border ${eventTypeInfo.bgColor} ${eventTypeInfo.borderColor} ${eventTypeInfo.color}`}>
                                {eventTypeInfo.label}
                              </span>
                              {!isUpcoming && (
                                <span className="text-red-400 text-xs">(Past)</span>
                              )}
                            </div>
                          </div>
                          <p className="text-slate-300 text-sm mb-2">{event.description}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4 text-slate-400 text-sm">
                              <span>{date}, {time}</span>
                              <span>{event.suburb}, {event.state}</span>
                            </div>
                            <span className="text-emerald-400 text-sm font-medium">
                              View Details →
                            </span>
                          </div>
                          
                          {/* Duty Roster Indicator */}
                          {event.dutyRoster.length > 0 && (
                            <div className="mt-2 p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                              <div className="flex items-center space-x-2">
                                <Trophy className="w-3 h-3 text-red-400" />
                                <span className="text-red-400 text-xs font-medium">
                                  {event.dutyRoster.length} dut{event.dutyRoster.length === 1 ? 'y' : 'ies'} assigned
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

      case 'messages':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-100">Message Threads</h3>
              <div className="flex items-center space-x-2">
                <p className="text-slate-400 text-sm">{messageThreads?.length || 0} threads</p>
                <button 
                  onClick={handleOpenMessenger}
                  className="btn-primary text-sm"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Open Messenger
                </button>
              </div>
            </div>
            
            {messageThreadsLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
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
            ) : !messageThreads || messageThreads.length === 0 ? (
              <div className="text-center py-8">
                <Hash className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No message threads yet</p>
                <p className="text-slate-500 text-sm">Message threads are automatically created when the team is created</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messageThreads.map((thread: any) => (
                  <div 
                    key={thread.id.toString()} 
                    className="card p-4 cursor-pointer hover:bg-slate-800/50 transition-colors"
                    onClick={() => handleMessageThreadClick(thread)}
                  >
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center shrink-0">
                        <Hash className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-slate-100">{thread.name}</h4>
                          <span className="text-slate-500 text-xs">
                            {new Date(Number(thread.createdAt / BigInt(1000000))).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-slate-400 text-sm mb-2">{thread.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 text-xs">Team thread</span>
                          <span className="text-emerald-400 text-sm font-medium">
                            Open in Messages →
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'announcements':
        return (
          <div className="space-y-4">
            {canManage && (
              <button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 px-4 rounded-lg transition-colors">
                Create Announcement
              </button>
            )}
            
            {announcementsLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="card p-4 animate-pulse">
                    <div className="h-4 bg-slate-700 rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-slate-700 rounded w-full mb-2"></div>
                    <div className="h-3 bg-slate-700 rounded w-1/4"></div>
                  </div>
                ))}
              </div>
            ) : !announcements || announcements.length === 0 ? (
              <div className="text-center py-8">
                <Megaphone className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No announcements yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {announcements.map((announcement: any) => (
                  <div 
                    key={announcement.id} 
                    className="card p-4 cursor-pointer hover:bg-slate-800/50 transition-colors"
                    onClick={() => handleAnnouncementClick(announcement)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-slate-100 font-medium">{announcement.title}</h4>
                      {announcement.pinned && (
                        <span className="bg-yellow-500 text-black text-xs px-2 py-1 rounded-full">
                          Pinned
                        </span>
                      )}
                    </div>
                    <p className="text-slate-300 text-sm mb-2 line-clamp-2">{announcement.content}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-slate-500 text-xs">
                        {new Date(Number(announcement.timestamp / BigInt(1000000))).toLocaleDateString()} • {announcement.authorName || 'Unknown'}
                      </p>
                      <span className="text-orange-400 text-sm font-medium">
                        Open Thread →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const formatEventTime = (timestamp: bigint) => {
    const date = new Date(Number(timestamp));
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    };
  };

  const getEventTypeInfo = (eventType: any) => {
    switch (eventType) {
      case 'game':
        return {
          label: 'Game',
          color: 'text-red-400',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/20',
        };
      case 'training':
        return {
          label: 'Training',
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/20',
        };
      case 'socialEvent':
        return {
          label: 'Social',
          color: 'text-purple-400',
          bgColor: 'bg-purple-500/10',
          borderColor: 'border-purple-500/20',
        };
      default:
        return {
          label: 'Event',
          color: 'text-slate-400',
          bgColor: 'bg-slate-500/10',
          borderColor: 'border-slate-500/20',
        };
    }
  };

  if (selectedAnnouncement) {
    return (
      <AnnouncementThreadModal
        announcement={selectedAnnouncement}
        onClose={() => setSelectedAnnouncement(null)}
      />
    );
  }

  if (selectedEvent) {
    return (
      <EventDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    );
  }

  if (showUserManagement) {
    return (
      <UserManagementModal
        type="team"
        organizationId={teamIdString}
        organizationName={team.name}
        onClose={() => setShowUserManagement(false)}
      />
    );
  }

  if (showRoleManagement) {
    return (
      <TeamMemberRoleManagementModal
        member={showRoleManagement.member}
        memberName={showRoleManagement.memberName}
        teamId={teamIdString}
        teamName={team.name}
        onClose={() => setShowRoleManagement(null)}
        onRolesUpdated={() => {
          setShowRoleManagement(null);
          refetchMembers();
        }}
      />
    );
  }

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
          <h1 className="text-lg font-semibold text-slate-100">{team.name}</h1>
          {team.ageGroup && <p className="text-sm text-slate-400">{team.ageGroup}</p>}
        </div>
        <div className="flex items-center space-x-2">
          {canManage && (
            <button className="p-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target">
              <Settings className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

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
              {id === 'members' && membersError && (
                <div className="w-2 h-2 bg-orange-400 rounded-full ml-1" title="Error loading members" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 pb-32">
          {renderTabContent()}
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-black/75 flex items-center justify-center p-4 z-10">
          <div className="bg-slate-800 rounded-xl p-6 max-w-sm w-full">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-100 mb-2">Delete Team</h3>
              <p className="text-slate-400 mb-6">
                Are you sure you want to delete "{team.name}"? This will permanently remove the team and all associated data. This action cannot be undone.
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="btn-secondary"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteTeam}
                  disabled={isDeleting}
                  className={`bg-red-500 hover:bg-red-600 disabled:bg-red-400 text-white py-2 px-4 rounded-lg transition-colors font-medium ${isDeleting ? 'btn-loading' : ''}`}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Team'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Member Removal Confirmation Modal */}
      {showRemoveConfirm && (
        <div className="absolute inset-0 bg-black/75 flex items-center justify-center p-4 z-10">
          <div className="bg-slate-800 rounded-xl p-6 max-w-sm w-full">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserMinus className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-100 mb-2">Remove Team Member</h3>
              <p className="text-slate-400 mb-6">
                Are you sure you want to remove "{showRemoveConfirm.memberName}" from {team.name}? 
                This will revoke all their team roles and remove them from the team. This action cannot be undone.
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowRemoveConfirm(null)}
                  className="btn-secondary"
                  disabled={isRemovingMember}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRemoveMember}
                  disabled={isRemovingMember}
                  className={`bg-red-500 hover:bg-red-600 disabled:bg-red-400 text-white py-2 px-4 rounded-lg transition-colors font-medium ${isRemovingMember ? 'btn-loading' : ''}`}
                >
                  {isRemovingMember ? 'Removing...' : 'Remove Member'}
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
                Are you sure you want to remove the "{showRoleRemoveConfirm.roleDisplayName}" role from "{showRoleRemoveConfirm.memberName}" in {team.name}? 
                {showRoleRemoveConfirm.member.roles?.length === 1 
                  ? ' This is their only role, so they will be completely removed from the team.'
                  : ' They will keep their other roles for this team.'
                } This action cannot be undone.
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowRoleRemoveConfirm(null)}
                  className="btn-secondary"
                  disabled={isRemovingRole}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRemoveRole}
                  disabled={isRemovingRole}
                  className={`bg-orange-500 hover:bg-orange-600 disabled:bg-orange-400 text-white py-2 px-4 rounded-lg transition-colors font-medium ${isRemovingRole ? 'btn-loading' : ''}`}
                >
                  {isRemovingRole ? 'Removing Role...' : 'Remove Role'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
