import React, { useState } from 'react';
import { X, Users, Calendar, MessageCircle, Settings, Camera, Megaphone, Trophy, UserPlus, ArrowLeft, Trash2, AlertCircle, Hash, Baby, Crown, Shield, User, CheckCircle, RefreshCw, AlertTriangle, UserCog, Edit3, Upload, Loader2, Lock, CreditCard, UserMinus } from 'lucide-react';
import { useGetClubTeams, useGetClubEvents, useGetClubMembers, useGetClubAnnouncements, useDeleteClub, useUpdateClubLogo } from '../hooks/useClubs';
import { useGetClubMessageThreads } from '../hooks/useMessages';
import { useGetTeamsByClubId } from '../hooks/useTeams';
import { useRemoveUserFromTeam } from '../hooks/useUserManagement';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useActor } from '../hooks/useActor';
import { useFileUpload, useFileUrl } from '../blob-storage/FileStorage';
import { useCanAccessFeature } from '../hooks/useSubscriptions';
import { useIsCurrentUserAdmin } from '../hooks/useUsers';
import type { ClubRole, ClubMembership, Event } from '../backend';
import { Principal } from '@dfinity/principal';
import TeamDetailModal from './TeamDetailModal';
import TeamCreateModal from './TeamCreateModal';
import AnnouncementThreadModal from './AnnouncementThreadModal';
import UserManagementModal from './UserManagementModal';
import EventDetailModal from './EventDetailModal';
import SubscriptionUpgradeModal from './SubscriptionUpgradeModal';

interface ClubWithRole {
  id: bigint;
  name: string;
  description: string;
  location: string;
  creator: any;
  logo?: string;
  memberCount: number;
  teamCount: number;
  userRole: 'club_admin' | 'team_admin' | 'coach' | 'player' | 'parent' | 'basic_user';
  createdAt: number;
  sport?: string;
}

interface ClubDetailModalProps {
  club: ClubWithRole;
  onClose: () => void;
  onDeleted?: () => void;
  onMessageThreadClick?: (threadId: string) => void;
}

interface MemberWithDisplayName {
  principal: string;
  displayName: string;
  roles: ClubRole[];
  isCreator: boolean;
  isTeamMember?: boolean;
  teamNames?: string[];
  isChild?: boolean;
}

export default function ClubDetailModal({ club, onClose, onDeleted, onMessageThreadClick }: ClubDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'teams' | 'events' | 'members' | 'announcements' | 'messages'>('overview');
  const [showTeamCreateModal, setShowTeamCreateModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [membersWithDisplayNames, setMembersWithDisplayNames] = useState<MemberWithDisplayName[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<Error | null>(null);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showLogoEdit, setShowLogoEdit] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUploadSuccess, setLogoUploadSuccess] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeContext, setUpgradeContext] = useState<{ feature: string; description: string } | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<{ member: MemberWithDisplayName; memberName: string } | null>(null);
  
  const { data: teams, isLoading: teamsLoading, error: teamsError, refetch: refetchTeams } = useGetTeamsByClubId(club.id.toString());
  const { mutate: getEvents, data: events, isPending: eventsLoading } = useGetClubEvents();
  const { mutate: getMembers, data: clubMemberships, isPending: membersLoadingRaw } = useGetClubMembers();
  const { mutate: getAnnouncements, data: announcements, isPending: announcementsLoading } = useGetClubAnnouncements();
  const { mutate: getMessageThreads, data: messageThreads, isPending: messageThreadsLoading } = useGetClubMessageThreads();
  const { mutate: deleteClub, isPending: isDeleting, error: deleteError } = useDeleteClub();
  const { mutate: updateClubLogo, isPending: isUpdatingLogo } = useUpdateClubLogo();
  const { mutate: removeUserFromTeam, isPending: isRemovingMember } = useRemoveUserFromTeam();
  const { identity } = useInternetIdentity();
  const { actor } = useActor();
  const { uploadFile } = useFileUpload();
  const { data: logoUrl } = useFileUrl(club.logo || '');
  const { data: isAppAdmin } = useIsCurrentUserAdmin();

  const { data: clubChatAccess } = useCanAccessFeature('advanced_chat', 'club', club.id.toString());
  
  const canAccessClubChat = isAppAdmin || clubChatAccess?.hasAccess || false;

  const currentUserPrincipal = identity?.getPrincipal().toString();
  const canManage = club.userRole === 'club_admin' || club.creator.toString() === currentUserPrincipal;
  const canDelete = club.creator.toString() === currentUserPrincipal;
  const isClubAdmin = club.userRole === 'club_admin';

  // Permission check for member management actions
  // Only app admins and club admins can manage club members
  const canManageMembers = isAppAdmin || isClubAdmin;

  React.useEffect(() => {
    const clubIdString = club.id.toString();
    switch (activeTab) {
      case 'teams':
        break;
      case 'events':
        getEvents(clubIdString);
        break;
      case 'members':
        loadMembersWithDisplayNames();
        break;
      case 'announcements':
        getAnnouncements(clubIdString);
        break;
      case 'messages':
        getMessageThreads(clubIdString);
        break;
    }
  }, [activeTab, club.id, getEvents, getAnnouncements, getMessageThreads]);

  const loadMembersWithDisplayNames = async () => {
    if (!actor) return;
    
    setMembersLoading(true);
    setMembersError(null);
    
    try {
      // Backend function getClubMembersWithDisplayNames is not available
      // Fall back to using club memberships and user profiles
      const clubMembershipsData = await actor.getClubMembershipsByClub(club.id);
      
      const enhancedMembers: MemberWithDisplayName[] = [];
      
      for (const membership of clubMembershipsData) {
        try {
          const userProfile = await actor.getUserProfile(membership.user);
          const displayName = userProfile?.name || membership.user.toString();
          
          enhancedMembers.push({
            principal: membership.user.toString(),
            displayName,
            roles: membership.roles || [],
            isCreator: club.creator.toString() === membership.user.toString(),
            isTeamMember: false,
            teamNames: [],
            isChild: false,
          });
        } catch (error) {
          enhancedMembers.push({
            principal: membership.user.toString(),
            displayName: membership.user.toString(),
            roles: membership.roles || [],
            isCreator: club.creator.toString() === membership.user.toString(),
            isTeamMember: false,
            teamNames: [],
            isChild: false,
          });
        }
      }

      const creatorPrincipalStr = club.creator.toString();
      const creatorExists = enhancedMembers.some(m => m.principal === creatorPrincipalStr);
      
      if (!creatorExists) {
        try {
          // Backend function getDisplayName is not available
          // Fall back to user profile
          const creatorProfile = await actor.getUserProfile(club.creator);
          const creatorDisplayName = creatorProfile?.name || creatorPrincipalStr;
          
          enhancedMembers.push({
            principal: creatorPrincipalStr,
            displayName: creatorDisplayName,
            roles: [ClubRole.clubAdmin],
            isCreator: true,
            isTeamMember: false,
            teamNames: [],
            isChild: false,
          });
        } catch (error) {
          enhancedMembers.push({
            principal: creatorPrincipalStr,
            displayName: creatorPrincipalStr,
            roles: [ClubRole.clubAdmin],
            isCreator: true,
            isTeamMember: false,
            teamNames: [],
            isChild: false,
          });
        }
      }

      const clubTeams = await actor.getTeamsByClubId(club.id);
      
      for (const team of clubTeams) {
        try {
          // Backend function getTeamMembersWithDisplayNames is not available
          // Fall back to using team memberships
          const teamMemberships = await actor.getTeamMembershipsByTeam(team.id);
          
          for (const teamMembership of teamMemberships) {
            const teamMemberPrincipalStr = teamMembership.user.toString();
            
            const existingMember = enhancedMembers.find(m => m.principal === teamMemberPrincipalStr);
            
            if (existingMember) {
              existingMember.isTeamMember = true;
              if (!existingMember.teamNames) existingMember.teamNames = [];
              if (!existingMember.teamNames.includes(team.name)) {
                existingMember.teamNames.push(team.name);
              }
            } else {
              try {
                const userProfile = await actor.getUserProfile(teamMembership.user);
                const displayName = userProfile?.name || teamMemberPrincipalStr;
                
                enhancedMembers.push({
                  principal: teamMemberPrincipalStr,
                  displayName,
                  roles: [],
                  isCreator: false,
                  isTeamMember: true,
                  teamNames: [team.name],
                  isChild: false,
                });
              } catch (error) {
                enhancedMembers.push({
                  principal: teamMemberPrincipalStr,
                  displayName: teamMemberPrincipalStr,
                  roles: [],
                  isCreator: false,
                  isTeamMember: true,
                  teamNames: [team.name],
                  isChild: false,
                });
              }
            }
          }
        } catch (error) {
          console.warn('Failed to load members for team:', team.id.toString(), error);
        }
      }

      try {
        const allChildren = await actor.getAllChildren();
        const clubChildren = allChildren.filter(child => {
          if (!child.teamId) return false;
          return clubTeams.some(team => team.id === child.teamId);
        });
        
        for (const child of clubChildren) {
          const childPrincipalStr = `child_${child.id.toString()}`;
          
          const existingChild = enhancedMembers.find(m => m.principal === childPrincipalStr);
          
          if (!existingChild) {
            const childTeam = clubTeams.find(team => team.id === child.teamId);
            
            enhancedMembers.push({
              principal: childPrincipalStr,
              displayName: child.name,
              roles: [],
              isCreator: false,
              isTeamMember: true,
              teamNames: childTeam ? [childTeam.name] : [],
              isChild: true,
            });
          }
        }
      } catch (error) {
        console.warn('Failed to load children for club:', club.id.toString(), error);
      }

      setMembersWithDisplayNames(enhancedMembers);
    } catch (error) {
      console.error('Failed to load members with display names:', error);
      setMembersError(error instanceof Error ? error : new Error('Failed to load members'));
    } finally {
      setMembersLoading(false);
    }
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setLogoFile(file);
      const previewUrl = URL.createObjectURL(file);
      setLogoPreview(previewUrl);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const handleLogoUpdate = async () => {
    if (!logoFile) return;

    setIsUploadingLogo(true);
    try {
      const timestamp = Date.now();
      const fileExtension = logoFile.name.split('.').pop() || 'png';
      const fileName = `club-logo-${club.id.toString()}-${timestamp}.${fileExtension}`;
      const path = `club-logos/${fileName}`;
      
      const uploadResult = await uploadFile(path, logoFile);
      
      updateClubLogo({
        clubId: club.id.toString(),
        logoPath: uploadResult.path,
      }, {
        onSuccess: () => {
          setLogoUploadSuccess(true);
          setShowLogoEdit(false);
          setLogoFile(null);
          setLogoPreview(null);
          setTimeout(() => setLogoUploadSuccess(false), 3000);
        },
        onError: (error) => {
          console.error('Failed to update club logo:', error);
        }
      });
    } catch (error) {
      console.error('Failed to upload logo:', error);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveMember = (member: MemberWithDisplayName) => {
    // Don't allow removing the club creator or current user
    if (member.isCreator || member.principal === currentUserPrincipal) {
      return;
    }
    
    setShowRemoveConfirm({
      member,
      memberName: member.displayName || 'Unknown Member'
    });
  };

  const confirmRemoveMember = () => {
    if (!showRemoveConfirm) return;

    const { member } = showRemoveConfirm;
    
    // For club members who are also team members, we need to remove them from all teams in the club
    if (member.isTeamMember && member.teamNames && member.teamNames.length > 0) {
      // Find the first team they're a member of and remove them from it
      // This is a simplified approach - in a full implementation, you might want to remove from all teams
      const firstTeamName = member.teamNames[0];
      const team = teams?.find(t => t.name === firstTeamName);
      
      if (team) {
        try {
          const memberPrincipal = Principal.fromText(member.principal);
          
          removeUserFromTeam({
            teamId: team.id.toString(),
            userPrincipal: memberPrincipal,
          }, {
            onSuccess: () => {
              setShowRemoveConfirm(null);
              // Refresh the member list to show the updated membership
              loadMembersWithDisplayNames();
            },
            onError: (error) => {
              console.error('Failed to remove club member from team:', error);
              setShowRemoveConfirm(null);
            }
          });
        } catch (error) {
          console.error('Invalid principal for member removal:', error);
          setShowRemoveConfirm(null);
        }
      } else {
        setShowRemoveConfirm(null);
      }
    } else {
      // For direct club members, we would need a removeClubMember function
      // For now, show an error that this functionality needs backend implementation
      console.error('Direct club member removal requires backend implementation');
      setShowRemoveConfirm(null);
    }
  };

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: Users },
    { id: 'teams' as const, label: 'Teams', icon: Trophy },
    { id: 'events' as const, label: 'Events', icon: Calendar },
    { id: 'members' as const, label: 'Members', icon: UserPlus },
    { id: 'messages' as const, label: 'Messages', icon: MessageCircle },
    { id: 'announcements' as const, label: 'News', icon: Megaphone },
  ];

  const handleDeleteClub = () => {
    deleteClub(club.id.toString(), {
      onSuccess: () => {
        setDeleteSuccess(true);
        setShowDeleteConfirm(false);
        
        setTimeout(() => {
          if (onDeleted) {
            onDeleted();
          }
          onClose();
        }, 1500);
      },
      onError: (error) => {
        console.error('Club deletion failed:', error);
      }
    });
  };

  const handleTeamCreated = () => {
    refetchTeams();
    setShowTeamCreateModal(false);
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
    if (!actor) return;
    
    if (!canAccessClubChat) {
      setUpgradeContext({
        feature: 'Club Chat',
        description: 'Club-level messaging requires Pro subscription to access advanced chat features.'
      });
      setShowUpgradeModal(true);
      return;
    }
    
    try {
      // Backend function getMessageThreadIdForClub is not available
      // Fall back to finding the first club message thread
      const clubThreads = await actor.getMessageThreadsByClubId(club.id);
      if (clubThreads.length > 0 && onMessageThreadClick) {
        sessionStorage.setItem('openThreadId', clubThreads[0].id.toString());
        onMessageThreadClick(clubThreads[0].id.toString());
        onClose();
      } else {
        console.warn('No message thread found for club:', club.id.toString());
      }
    } catch (error) {
      console.error('Failed to get message thread for club:', error);
    }
  };

  if (showTeamCreateModal) {
    return (
      <TeamCreateModal
        clubId={club.id.toString()}
        onClose={() => setShowTeamCreateModal(false)}
        onTeamCreated={handleTeamCreated}
      />
    );
  }

  if (selectedTeam) {
    return (
      <TeamDetailModal
        team={selectedTeam}
        onClose={() => setSelectedTeam(null)}
        onMessageThreadClick={onMessageThreadClick}
      />
    );
  }

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
        type="club"
        organizationId={club.id.toString()}
        organizationName={club.name}
        onClose={() => setShowUserManagement(false)}
      />
    );
  }

  const handleCreateTeam = () => {
    setShowTeamCreateModal(true);
  };

  const getRoleIcon = (role: ClubRole) => {
    switch (role) {
      case ClubRole.clubAdmin:
        return <Crown className="w-3 h-3 text-yellow-400" />;
      default:
        return <User className="w-3 h-3 text-slate-400" />;
    }
  };

  const getRoleText = (role: ClubRole) => {
    switch (role) {
      case ClubRole.clubAdmin:
        return 'Club Admin';
      default:
        return 'Member';
    }
  };

  const getRoleColor = (role: ClubRole) => {
    switch (role) {
      case ClubRole.clubAdmin:
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-100">Club Logo</h3>
                {canManage && (
                  <button
                    onClick={() => setShowLogoEdit(!showLogoEdit)}
                    className="text-emerald-400 hover:text-emerald-300 text-sm flex items-center space-x-1"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>{showLogoEdit ? 'Cancel' : 'Edit Logo'}</span>
                  </button>
                )}
              </div>

              {logoUploadSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                  <p className="text-emerald-400 text-sm font-medium">Club logo updated successfully!</p>
                </div>
              )}

              {showLogoEdit && canManage ? (
                <div className="card p-4 bg-blue-500/10 border-blue-500/20">
                  <div className="space-y-4">
                    <div className={`border-2 border-dashed rounded-xl p-6 text-center relative ${
                      'border-slate-600'
                    }`}>
                      {logoPreview ? (
                        <div className="space-y-4">
                          <img 
                            src={logoPreview} 
                            alt="New club logo preview" 
                            className="w-24 h-24 object-cover rounded-lg mx-auto shadow-lg"
                          />
                          <div className="space-y-2">
                            <p className="text-white text-sm font-medium">{logoFile?.name}</p>
                            <div className="flex items-center justify-center space-x-3">
                              <label className="btn-secondary text-sm cursor-pointer">
                                <Camera className="w-4 h-4 mr-2" />
                                Change Logo
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleLogoSelect}
                                  className="hidden"
                                  disabled={isUploadingLogo || isUpdatingLogo}
                                />
                              </label>
                              <button
                                type="button"
                                onClick={removeLogo}
                                className="btn-secondary text-sm text-red-400 hover:text-red-300"
                                disabled={isUploadingLogo || isUpdatingLogo}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="py-8">
                          <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                          <p className="text-slate-400 text-lg font-medium mb-2">Upload New Logo</p>
                          <p className="text-slate-500 text-sm">JPG, PNG, or GIF up to 10MB</p>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoSelect}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={isUploadingLogo || isUpdatingLogo}
                      />
                    </div>

                    <div className="flex space-x-3">
                      <button
                        onClick={handleLogoUpdate}
                        disabled={!logoFile || isUploadingLogo || isUpdatingLogo}
                        className={`btn-primary text-sm ${(isUploadingLogo || isUpdatingLogo) ? 'btn-loading' : ''}`}
                      >
                        {isUploadingLogo ? 'Uploading...' : isUpdatingLogo ? 'Updating...' : 'Update Logo'}
                      </button>
                      <button
                        onClick={() => {
                          setShowLogoEdit(false);
                          removeLogo();
                        }}
                        className="btn-secondary text-sm"
                        disabled={isUploadingLogo || isUpdatingLogo}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="card p-4">
                  {logoUrl ? (
                    <div className="flex items-center space-x-4">
                      <img 
                        src={logoUrl} 
                        alt={`${club.name} logo`} 
                        className="w-16 h-16 object-cover rounded-lg shadow-lg"
                      />
                      <div>
                        <p className="text-slate-200 font-medium">Club Logo</p>
                        <p className="text-slate-400 text-sm">Displayed across the application</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-slate-700 rounded-lg flex items-center justify-center">
                        <Camera className="w-8 h-8 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-slate-400 font-medium">No Logo</p>
                        <p className="text-slate-500 text-sm">
                          {canManage ? 'Click "Edit Logo" to add a club logo' : 'No logo has been set for this club'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-100 mb-2">About</h3>
              <p className="text-slate-300">{club.description}</p>
              {club.location && (
                <p className="text-slate-400 text-sm mt-2">📍 {club.location}</p>
              )}
              {club.sport && (
                <p className="text-slate-400 text-sm mt-1">🏆 {club.sport}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="card p-4">
                <div className="flex items-center mb-2">
                  <Users className="w-5 h-5 text-emerald-500 mr-2" />
                  <span className="text-slate-100 font-medium">Members</span>
                </div>
                <p className="text-2xl font-bold text-slate-100">{membersWithDisplayNames?.length || 1}</p>
                <div className="text-slate-400 text-xs mt-1">
                  <p>Including team members</p>
                  {membersWithDisplayNames && membersWithDisplayNames.some(m => m.isChild) && (
                    <p className="text-purple-400">
                      {membersWithDisplayNames.filter(m => m.isChild).length} child{membersWithDisplayNames.filter(m => m.isChild).length !== 1 ? 'ren' : ''}
                    </p>
                  )}
                </div>
              </div>
              <div className="card p-4">
                <div className="flex items-center mb-2">
                  <Trophy className="w-5 h-5 text-yellow-500 mr-2" />
                  <span className="text-slate-100 font-medium">Teams</span>
                </div>
                <p className="text-2xl font-bold text-slate-100">{teams?.length || 0}</p>
              </div>
            </div>

            <div className="space-y-3">
              <button 
                onClick={handleOpenMessenger}
                className={`w-full py-3 px-4 rounded-lg transition-colors flex items-center justify-center relative ${
                  canAccessClubChat 
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    : 'bg-red-500/20 text-red-400 border-2 border-red-500/30 cursor-not-allowed'
                }`}
                disabled={!canAccessClubChat}
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                <span>Open Club Chat</span>
                {!canAccessClubChat && (
                  <Lock className="w-4 h-4 ml-2" />
                )}
              </button>
              
              {canManageMembers && (
                <button 
                  onClick={() => setShowUserManagement(true)}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
                >
                  <UserCog className="w-5 h-5 mr-2" />
                  Manage Club Users
                </button>
              )}

              {canDelete && (
                <button 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
                >
                  <Trash2 className="w-5 h-5 mr-2" />
                  Delete Club
                </button>
              )}
            </div>

            {!canAccessClubChat && !isAppAdmin && (
              <div className="card p-4 bg-red-500/10 border-red-500/20">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                    <Lock className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <p className="text-red-400 font-medium">Pro Features Required</p>
                    <p className="text-red-300 text-sm">
                      Club chat requires Pro subscription for advanced messaging features.
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <button
                    onClick={() => {
                      setUpgradeContext({
                        feature: 'Club Features',
                        description: 'Unlock club chat with Pro subscription.'
                      });
                      setShowUpgradeModal(true);
                    }}
                    className="btn-primary text-sm"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Upgrade to Pro
                  </button>
                </div>
              </div>
            )}
          </div>
        );

      case 'teams':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-100">Club Teams</h3>
              <div className="flex items-center space-x-2">
                <p className="text-slate-400 text-sm">
                  {teamsError ? (
                    <span className="text-orange-400">Error loading</span>
                  ) : (
                    `${teams?.length || 0} team${(teams?.length || 0) !== 1 ? 's' : ''}`
                  )}
                </p>
                <button
                  onClick={() => refetchTeams()}
                  className="p-1 text-slate-400 hover:text-slate-200 rounded transition-colors"
                  disabled={teamsLoading}
                  title="Refresh teams list"
                >
                  <RefreshCw className={`w-4 h-4 ${teamsLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {canManage && (
              <button 
                onClick={handleCreateTeam}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 px-4 rounded-lg transition-colors"
              >
                Create New Team
              </button>
            )}
            
            {teamsLoading ? (
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
            ) : teamsError ? (
              <div className="space-y-4">
                <div className="card p-6 bg-red-500/10 border-red-500/20">
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-red-500/20">
                      <AlertTriangle className="w-7 h-7 text-red-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-100 mb-2">Loading Error</h3>
                    <p className="text-red-300 text-sm mb-4 leading-relaxed">
                      {teamsError instanceof Error ? teamsError.message : 'Failed to load teams'}
                    </p>
                    
                    <button
                      onClick={() => refetchTeams()}
                      className="btn-primary-mobile flex items-center justify-center"
                      disabled={teamsLoading}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${teamsLoading ? 'animate-spin' : ''}`} />
                      {teamsLoading ? 'Retrying...' : 'Try Again'}
                    </button>
                  </div>
                </div>
              </div>
            ) : !teams || teams.length === 0 ? (
              <div className="text-center py-8">
                <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No teams yet</p>
                <p className="text-slate-500 text-sm">Create the first team to get started</p>
                {canManage && (
                  <button
                    onClick={handleCreateTeam}
                    className="btn-primary text-sm mt-4"
                  >
                    Create First Team
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {teams.map((team: any) => (
                  <div 
                    key={team.id.toString()} 
                    className="card p-4 cursor-pointer hover:bg-slate-800/50 transition-colors"
                    onClick={() => setSelectedTeam(team)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
                          <Trophy className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h4 className="text-slate-100 font-medium">{team.name}</h4>
                          <p className="text-slate-400 text-sm">{team.description}</p>
                          <p className="text-slate-500 text-xs mt-1">
                            Created {new Date(Number(team.createdAt || Date.now())).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="bg-slate-600 text-slate-300 text-xs px-2 py-1 rounded-full">
                          {team.creator.toString() === currentUserPrincipal ? 'team_admin' : 'member'}
                        </span>
                        {team.creator.toString() === currentUserPrincipal && (
                          <span className="bg-yellow-500/10 text-yellow-400 text-xs px-2 py-1 rounded-full border border-yellow-500/20">
                            Creator
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'events':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-100">Club Events</h3>
              <div className="flex items-center space-x-2">
                <p className="text-slate-400 text-sm">{events?.length || 0} events</p>
                <button
                  onClick={() => getEvents(club.id.toString())}
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
            ) : !events || events.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No events scheduled</p>
                <p className="text-slate-500 text-sm">Events created for this club will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((event: Event) => {
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

      case 'members':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-100">Club Members</h3>
              <div className="flex items-center space-x-2">
                <p className="text-slate-400 text-sm">
                  {membersError ? (
                    <span className="text-orange-400">Error loading</span>
                  ) : (
                    `${membersWithDisplayNames?.length || 1} member${(membersWithDisplayNames?.length || 1) !== 1 ? 's' : ''}`
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
                  onClick={loadMembersWithDisplayNames}
                  className="p-1 text-slate-400 hover:text-slate-200 rounded transition-colors"
                  disabled={membersLoading}
                  title="Refresh member list"
                >
                  <RefreshCw className={`w-4 h-4 ${membersLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
            
            {canManageMembers && (
              <div className="card p-4 bg-emerald-500/10 border-emerald-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                      <UserCog className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-emerald-400 font-medium">Club Admin Controls</p>
                      <p className="text-emerald-300 text-sm">
                        Search and assign users as club admins for your club
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
            
            <div className="card p-4 bg-blue-500/10 border-blue-500/20">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-blue-400 font-medium">Enhanced Club Membership</p>
                  <p className="text-blue-300 text-sm">
                    This list includes all direct club members plus team members from all teams within this club. 
                    Team members are automatically considered club members.
                  </p>
                </div>
              </div>
            </div>
            
            {membersLoading ? (
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
            ) : membersError ? (
              <div className="space-y-4">
                <div className="card p-6 bg-red-500/10 border-red-500/20">
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-red-500/20">
                      <AlertTriangle className="w-7 h-7 text-red-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-100 mb-2">Loading Error</h3>
                    <p className="text-red-300 text-sm mb-4 leading-relaxed">
                      {membersError instanceof Error ? membersError.message : 'Failed to load club members'}
                    </p>
                    
                    <button
                      onClick={loadMembersWithDisplayNames}
                      className="btn-primary-mobile flex items-center justify-center"
                      disabled={membersLoading}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${membersLoading ? 'animate-spin' : ''}`} />
                      {membersLoading ? 'Retrying...' : 'Try Again'}
                    </button>
                  </div>
                </div>
              </div>
            ) : !membersWithDisplayNames || membersWithDisplayNames.length === 0 ? (
              <div className="text-center py-8">
                <UserPlus className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No members found</p>
                <p className="text-slate-500 text-sm">Club creator should be automatically added as a member</p>
                {canManageMembers && (
                  <button
                    onClick={() => setShowUserManagement(true)}
                    className="btn-primary text-sm mt-4"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add First Member
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {membersWithDisplayNames.map((member) => (
                  <div key={`${club.id}_${member.principal}`} className="card p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`avatar-md shadow-lg ${
                          member.isChild ? 'bg-gradient-to-br from-purple-400 to-purple-600' :
                          'bg-gradient-to-br from-emerald-400 to-emerald-600'
                        }`}>
                          <span className="text-white font-semibold">
                            {member.displayName && member.displayName.length > 0 ? member.displayName.charAt(0).toUpperCase() : '?'}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="text-slate-100 font-medium">
                              {member.displayName || 'Unknown Member'}
                            </h4>
                            {member.isCreator && (
                              <span className="bg-yellow-500/10 text-yellow-400 text-xs px-2 py-1 rounded-full border border-yellow-500/20">
                                Creator
                              </span>
                            )}
                            {member.isTeamMember && !member.isCreator && (
                              <span className="bg-purple-500/10 text-purple-400 text-xs px-2 py-1 rounded-full border border-purple-500/20">
                                Team Member
                              </span>
                            )}
                            {member.isChild && (
                              <span className="bg-purple-500/10 text-purple-400 text-xs px-2 py-1 rounded-full border border-purple-500/20 flex items-center">
                                <Baby className="w-3 h-3 mr-1" />
                                Child
                              </span>
                            )}
                            {member.principal === currentUserPrincipal && (
                              <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-1 rounded-full border border-emerald-500/20">
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-slate-400 text-sm mb-2">
                            {member.isChild ? (
                              `Born ${new Date().toLocaleDateString()}`
                            ) : (
                              `Joined ${new Date().toLocaleDateString()}`
                            )}
                          </p>
                          
                          {member.teamNames && member.teamNames.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {member.teamNames.map((teamName, index) => (
                                <span
                                  key={index}
                                  className="text-xs px-2 py-1 rounded-full border bg-purple-500/10 text-purple-400 border-purple-500/20"
                                >
                                  {teamName}
                                </span>
                              ))}
                            </div>
                          )}
                          {member.roles && member.roles.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {member.roles.map((role: ClubRole, index: number) => (
                                <span
                                  key={index}
                                  className={`text-xs px-2 py-1 rounded-full border flex items-center ${getRoleColor(role)}`}
                                >
                                  {getRoleIcon(role)}
                                  <span className="ml-1">{getRoleText(role)}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Remove button - only show for club admins and not for creator or current user */}
                      {canManageMembers && !member.isCreator && member.principal !== currentUserPrincipal && (
                        <button
                          onClick={() => handleRemoveMember(member)}
                          className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800/50 transition-all duration-200"
                          disabled={isRemovingMember}
                          title="Remove from club"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
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
                  className={`btn-primary text-sm ${!canAccessClubChat ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={!canAccessClubChat}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  {!canAccessClubChat && <Lock className="w-3 h-3 mr-1" />}
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
                <p className="text-slate-500 text-sm">Message threads are automatically created when the club is created</p>
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
                          <span className="text-slate-500 text-xs">Club thread</span>
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
          <div className="flex items-center justify-center space-x-3 mb-1">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt={`${club.name} logo`} 
                className="w-8 h-8 object-cover rounded-lg"
              />
            ) : (
              <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-slate-400" />
              </div>
            )}
            <h1 className="text-lg font-semibold text-slate-100">{club.name}</h1>
          </div>
          {club.location && <p className="text-sm text-slate-400">{club.location}</p>}
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
              <h3 className="text-lg font-semibold text-slate-100 mb-2">Delete Club</h3>
              <p className="text-slate-400 mb-6">
                Are you sure you want to delete "{club.name}"? This will permanently remove the club and all associated data. This action cannot be undone.
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
                  onClick={handleDeleteClub}
                  disabled={isDeleting}
                  className={`bg-red-500 hover:bg-red-600 disabled:bg-red-400 text-white py-2 px-4 rounded-lg transition-colors font-medium ${isDeleting ? 'btn-loading' : ''}`}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Club'}
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
              <h3 className="text-lg font-semibold text-slate-100 mb-2">Remove Club Member</h3>
              <p className="text-slate-400 mb-6">
                Are you sure you want to remove "{showRemoveConfirm.memberName}" from {club.name}? 
                This will revoke all their roles and remove them from the club and its teams. This action cannot be undone.
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

      {showUpgradeModal && upgradeContext && (
        <SubscriptionUpgradeModal
          organizationType="club"
          organizationId={club.id.toString()}
          organizationName={upgradeContext.feature}
          onClose={() => {
            setShowUpgradeModal(false);
            setUpgradeContext(null);
          }}
        />
      )}
    </div>
  );
}
