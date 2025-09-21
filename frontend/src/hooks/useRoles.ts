import { useInternetIdentity } from './useInternetIdentity';
import { useGetUserClubs } from './useClubs';
import { useGetAllTeams } from './useTeams';
import { useIsCurrentUserAdmin, useGetCurrentUserRoles } from './useUsers';
import { useCanAccessFeature } from './useSubscriptions';
import { Event, MessageThread, DutyAssignment } from '../backend';
import { DutySwapRequest } from './useNotifications';

// Define frontend-only types until backend implements them
interface Photo {
  id: bigint;
  uploader: any;
  filePath: string;
  timestamp: bigint;
  clubId?: bigint;
  teamId?: bigint;
}

interface BackendFile {
  id: bigint;
  uploader: any;
  filePath: string;
  timestamp: bigint;
  clubId?: bigint;
  teamId?: bigint;
}

interface Announcement {
  id: bigint;
  title: string;
  content: string;
  creator: any;
  timestamp: bigint;
  clubId?: bigint;
  teamId?: bigint;
}

interface Subfolder {
  id: bigint;
  name: string;
  parentType: {
    __kind__: 'club' | 'team';
    club?: bigint;
    team?: bigint;
  };
  creator: any;
  createdAt: bigint;
}

// Role Management - Updated to use real backend role data
interface RoleAssignment {
  id: string;
  role: 'club_admin' | 'team_admin' | 'coach' | 'player' | 'parent' | 'app_admin';
  scope: 'club' | 'team' | 'global';
  organizationId: string;
  organizationName: string;
  assignedAt: number;
  isAutomatic: boolean;
}

export function useUserRoles() {
  const { identity } = useInternetIdentity();
  const { data: clubs } = useGetUserClubs();
  const { data: teams } = useGetAllTeams();
  const { data: isAdmin } = useIsCurrentUserAdmin();
  const { data: currentUserRoles } = useGetCurrentUserRoles();
  const { data: advancedChatAccess } = useCanAccessFeature('advanced_chat');
  const { data: fileStorageAccess } = useCanAccessFeature('file_storage');
  const hasAdvancedChatAccess = advancedChatAccess?.hasAccess || false;
  const hasFileStorageAccess = fileStorageAccess?.hasAccess || false;

  const userRoles: RoleAssignment[] = [];
  const currentUserPrincipal = identity?.getPrincipal().toString();

  if (currentUserPrincipal) {
    // Add app admin role if user is admin
    if (isAdmin) {
      userRoles.push({
        id: `${currentUserPrincipal}_global_app_admin_auto`,
        role: 'app_admin',
        scope: 'global',
        organizationId: 'global',
        organizationName: 'Application',
        assignedAt: Date.now(),
        isAutomatic: true,
      });
    }
    
    // Add roles from actual backend memberships
    if (currentUserRoles) {
      for (const roleData of currentUserRoles) {
        for (const roleName of roleData.roles) {
          let roleType: 'club_admin' | 'team_admin' | 'coach' | 'player' | 'parent';
          
          switch (roleName) {
            case 'Club Admin':
              roleType = 'club_admin';
              break;
            case 'Team Admin':
              roleType = 'team_admin';
              break;
            case 'Coach':
              roleType = 'coach';
              break;
            case 'Player':
              roleType = 'player';
              break;
            case 'Parent':
              roleType = 'parent';
              break;
            default:
              continue; // Skip unknown roles
          }

          userRoles.push({
            id: `${currentUserPrincipal}_${roleData.type}_${roleData.organizationId}_${roleType}`,
            role: roleType,
            scope: roleData.type,
            organizationId: roleData.organizationId,
            organizationName: roleData.organizationName,
            assignedAt: Date.now(),
            isAutomatic: false, // These are assigned through join requests or manual assignment
          });
        }
      }
    }
    
    // Add automatic roles for creators (these are always automatic)
    (clubs || []).forEach(club => {
      if (club.creator.toString() === currentUserPrincipal) {
        // Only add if not already present from memberships
        const existingClubAdmin = userRoles.find(r => 
          r.role === 'club_admin' && 
          r.scope === 'club' && 
          r.organizationId === club.id.toString()
        );
        
        if (!existingClubAdmin) {
          userRoles.push({
            id: `${currentUserPrincipal}_club_${club.id.toString()}_club_admin_auto`,
            role: 'club_admin',
            scope: 'club',
            organizationId: club.id.toString(),
            organizationName: club.name,
            assignedAt: Date.now(),
            isAutomatic: true,
          });
        }
      }
    });
    
    (teams || []).forEach(team => {
      if (team.creator.toString() === currentUserPrincipal) {
        // Only add if not already present from memberships
        const existingTeamAdmin = userRoles.find(r => 
          r.role === 'team_admin' && 
          r.scope === 'team' && 
          r.organizationId === team.id.toString()
        );
        
        if (!existingTeamAdmin) {
          userRoles.push({
            id: `${currentUserPrincipal}_team_${team.id.toString()}_team_admin_auto`,
            role: 'team_admin',
            scope: 'team',
            organizationId: team.id.toString(),
            organizationName: team.name,
            assignedAt: Date.now(),
            isAutomatic: true,
          });
        }
      }
    });
  }

  const hasRole = (role: string, scope: string, organizationId: string): boolean => {
    return userRoles.some(r => 
      r.role === role && 
      r.scope === scope && 
      r.organizationId === organizationId
    );
  };

  const isClubAdmin = (clubId: string): boolean => {
    return hasRole('club_admin', 'club', clubId) || hasRole('app_admin', 'global', 'global');
  };

  const isTeamAdmin = (teamId: string): boolean => {
    return hasRole('team_admin', 'team', teamId) || hasRole('app_admin', 'global', 'global');
  };

  const canManageEventPrivacy = (event: Event): boolean => {
    if (hasRole('app_admin', 'global', 'global')) {
      return true;
    }
    
    if (event.clubId && isClubAdmin(event.clubId.toString())) {
      return true;
    }
    
    if (event.teamId && isTeamAdmin(event.teamId.toString())) {
      return true;
    }
    
    return false;
  };

  // Updated announcement permissions - Team admins have full access for their teams
  const canCreateAnnouncementForClub = (clubId: string): boolean => {
    // Club announcements require Pro access or app admin
    if (!isAdmin && !hasAdvancedChatAccess) {
      return false;
    }
    return isClubAdmin(clubId);
  };

  const canCreateAnnouncementForTeam = (teamId: string): boolean => {
    // Team admins have full access to create team announcements (no restrictions)
    return isTeamAdmin(teamId);
  };

  // Updated announcement viewing permissions - Team admins have full access for their teams
  const canViewAnnouncementForClub = (clubId: string): boolean => {
    // Club announcements require Pro access or app admin to view
    if (!isAdmin && !hasAdvancedChatAccess) {
      return false;
    }
    return isClubAdmin(clubId);
  };

  const canViewAnnouncementForTeam = (teamId: string): boolean => {
    // Team admins have full access to view team announcements (no restrictions)
    return isTeamAdmin(teamId);
  };

  // Functions to get accessible clubs for announcements with Pro access control
  const getAccessibleClubsForAnnouncements = () => {
    if (!clubs || !identity) return [];
    
    // Club announcements require Pro access or app admin
    if (!isAdmin && !hasAdvancedChatAccess) {
      return [];
    }
    
    const currentUserPrincipal = identity.getPrincipal().toString();
    return clubs.filter(club => club.creator.toString() === currentUserPrincipal);
  };

  // Functions to get accessible teams for announcements - Team admins have full access
  const getAccessibleTeamsForAnnouncements = () => {
    if (!teams || !identity) return [];
    const currentUserPrincipal = identity.getPrincipal().toString();
    // Team admins have full access to create announcements for their teams
    return teams.filter(team => team.creator.toString() === currentUserPrincipal);
  };

  // Updated to get accessible clubs for team admins when creating team-level content
  const getAccessibleClubsForTeamAdmins = () => {
    if (!clubs || !teams || !identity) return [];
    
    const currentUserPrincipal = identity.getPrincipal().toString();
    const adminTeams = teams.filter(team => team.creator.toString() === currentUserPrincipal);
    
    // Get unique clubs that contain teams the user administers
    const clubIds = new Set(adminTeams.map(team => team.clubId.toString()));
    return clubs.filter(club => clubIds.has(club.id.toString()));
  };

  // Updated to get accessible teams for team admins filtered by club
  const getAccessibleTeamsForTeamAdminsByClub = (clubId: string) => {
    if (!teams || !identity) return [];
    const currentUserPrincipal = identity.getPrincipal().toString();
    return teams.filter(team => 
      team.creator.toString() === currentUserPrincipal && 
      team.clubId.toString() === clubId
    );
  };

  // Function to check if user has any announcement creation permissions
  const hasAnnouncementPermissions = (): boolean => {
    return getAccessibleClubsForAnnouncements().length > 0 || getAccessibleTeamsForAnnouncements().length > 0;
  };

  // Function to get detailed permission info for error messages
  const getAnnouncementPermissionDetails = () => {
    const accessibleClubs = getAccessibleClubsForAnnouncements();
    const accessibleTeams = getAccessibleTeamsForAnnouncements();
    
    return {
      hasPermissions: accessibleClubs.length > 0 || accessibleTeams.length > 0,
      clubCount: accessibleClubs.length,
      teamCount: accessibleTeams.length,
      clubNames: accessibleClubs.map(club => club.name),
      teamNames: accessibleTeams.map(team => team.name),
      accessibleClubs,
      accessibleTeams,
    };
  };

  // Chat thread permissions - Updated for team admin full access
  const canCreateChatThreadForClub = (clubId: string): boolean => {
    // Club chat threads require Pro access or app admin
    if (!isAdmin && !hasAdvancedChatAccess) {
      return false;
    }
    return isClubAdmin(clubId);
  };

  const canCreateChatThreadForTeam = (teamId: string): boolean => {
    // Team admins have full access to create chat threads for their teams
    return isTeamAdmin(teamId);
  };

  // Functions to get accessible clubs for chat threads with Pro access control
  const getAccessibleClubsForChatThreads = () => {
    if (!clubs || !identity) return [];
    
    // Club chat threads require Pro access or app admin
    if (!isAdmin && !hasAdvancedChatAccess) {
      return [];
    }
    
    const currentUserPrincipal = identity.getPrincipal().toString();
    return clubs.filter(club => club.creator.toString() === currentUserPrincipal);
  };

  // Functions to get accessible teams for chat threads - Team admins have full access
  const getAccessibleTeamsForChatThreads = () => {
    if (!teams || !identity) return [];
    const currentUserPrincipal = identity.getPrincipal().toString();
    // Team admins have full access to create chat threads for their teams
    return teams.filter(team => team.creator.toString() === currentUserPrincipal);
  };

  // Function to check if user has any chat thread creation permissions
  const hasChatThreadPermissions = (): boolean => {
    return getAccessibleClubsForChatThreads().length > 0 || getAccessibleTeamsForChatThreads().length > 0;
  };

  // Function to get detailed permission info for chat thread error messages
  const getChatThreadPermissionDetails = () => {
    const accessibleClubs = getAccessibleClubsForChatThreads();
    const accessibleTeams = getAccessibleTeamsForChatThreads();
    
    return {
      hasPermissions: accessibleClubs.length > 0 || accessibleTeams.length > 0,
      clubCount: accessibleClubs.length,
      teamCount: accessibleTeams.length,
      clubNames: accessibleClubs.map(club => club.name),
      teamNames: accessibleTeams.map(team => team.name),
      accessibleClubs,
      accessibleTeams,
    };
  };

  // Announcement deletion permissions - New functionality
  const canDeleteAnnouncement = (announcement: Announcement): boolean => {
    if (hasRole('app_admin', 'global', 'global')) {
      return true;
    }
    
    if (announcement.clubId && isClubAdmin(announcement.clubId.toString())) {
      return true;
    }
    
    if (announcement.teamId && isTeamAdmin(announcement.teamId.toString())) {
      return true;
    }
    
    return false;
  };

  // Chat thread deletion permissions
  const canDeleteChatThread = (thread: MessageThread): boolean => {
    if (hasRole('app_admin', 'global', 'global')) {
      return true;
    }
    
    if (thread.clubId && isClubAdmin(thread.clubId.toString())) {
      return true;
    }
    
    if (thread.teamId && isTeamAdmin(thread.teamId.toString())) {
      return true;
    }
    
    return false;
  };

  // Photo permissions - Enhanced for organized folder access
  const canViewPhoto = (photo: Photo): boolean => {
    if (hasRole('app_admin', 'global', 'global')) {
      return true;
    }
    
    if (photo.clubId && isClubAdmin(photo.clubId.toString())) {
      return true;
    }
    
    if (photo.teamId && isTeamAdmin(photo.teamId.toString())) {
      return true;
    }
    
    return false;
  };

  const canInteractWithPhoto = (photo: Photo): boolean => {
    return canViewPhoto(photo);
  };

  // File permissions - Enhanced for organized folder access
  const canViewFile = (file: BackendFile): boolean => {
    if (hasRole('app_admin', 'global', 'global')) {
      return true;
    }
    
    if (file.clubId && isClubAdmin(file.clubId.toString())) {
      return true;
    }
    
    if (file.teamId && isTeamAdmin(file.teamId.toString())) {
      return true;
    }
    
    return false;
  };

  const canInteractWithFile = (file: BackendFile): boolean => {
    return canViewFile(file);
  };

  // Vault permissions - Enhanced for organized folder access with membership checking
  const canAccessVaultFolder = (folderId: string): boolean => {
    if (hasRole('app_admin', 'global', 'global')) {
      return true;
    }
    
    if (folderId.startsWith('club_')) {
      const clubId = folderId.replace('club_', '');
      // Check if user is club creator/admin or has membership
      const club = clubs?.find(c => c.id.toString() === clubId);
      if (club && club.creator.toString() === currentUserPrincipal) {
        return true;
      }
      // Additional membership check would go here if we had membership data
      return isClubAdmin(clubId);
    }
    
    if (folderId.startsWith('team_')) {
      const teamId = folderId.replace('team_', '');
      // Check if user is team creator/admin or has membership
      const team = teams?.find(t => t.id.toString() === teamId);
      if (team && team.creator.toString() === currentUserPrincipal) {
        return true;
      }
      // Additional membership check would go here if we had membership data
      return isTeamAdmin(teamId);
    }
    
    return false;
  };

  // Enhanced photo upload permissions - Updated to allow all authenticated users
  const canUploadToClub = (clubId: string): boolean => {
    // Any authenticated user can upload to any club
    return true;
  };

  const canUploadToTeam = (teamId: string): boolean => {
    // Any authenticated user can upload to any team
    return true;
  };

  // Get accessible clubs for photo upload - Updated to include all clubs
  const getAccessibleClubsForPhotos = () => {
    // Return all clubs since any authenticated user can upload photos
    return clubs || [];
  };

  // Get accessible teams for photo upload - Updated to include all teams
  const getAccessibleTeamsForPhotos = () => {
    // Return all teams since any authenticated user can upload photos
    return teams || [];
  };

  // Enhanced file upload permissions - Updated to allow all authenticated users
  const canUploadFileToClub = (clubId: string): boolean => {
    // Any authenticated user can upload files to any club
    return true;
  };

  const canUploadFileToTeam = (teamId: string): boolean => {
    // Any authenticated user can upload files to any team
    return true;
  };

  // Get accessible clubs for file upload - Updated to include all clubs
  const getAccessibleClubsForFiles = () => {
    // Return all clubs since any authenticated user can upload files
    return clubs || [];
  };

  // Get accessible teams for file upload - Updated to include all teams
  const getAccessibleTeamsForFiles = () => {
    // Return all teams since any authenticated user can upload files
    return teams || [];
  };

  // Subfolder management permissions - New functionality
  const canManageSubfolders = (parentType: 'club' | 'team', organizationId: string): boolean => {
    if (hasRole('app_admin', 'global', 'global')) {
      return true;
    }
    
    if (parentType === 'club') {
      return isClubAdmin(organizationId);
    } else {
      return isTeamAdmin(organizationId);
    }
  };

  const canCreateSubfolder = (parentType: 'club' | 'team', organizationId: string): boolean => {
    return canManageSubfolders(parentType, organizationId);
  };

  const canDeleteSubfolder = (subfolder: Subfolder): boolean => {
    if (hasRole('app_admin', 'global', 'global')) {
      return true;
    }
    
    switch (subfolder.parentType.__kind__) {
      case 'club':
        return isClubAdmin(subfolder.parentType.club?.toString() || '');
      case 'team':
        return isTeamAdmin(subfolder.parentType.team?.toString() || '');
      default:
        return false;
    }
  };

  const canRenameSubfolder = (subfolder: Subfolder): boolean => {
    return canDeleteSubfolder(subfolder); // Same permissions as delete
  };

  // Enhanced duty swap permissions
  const canInitiateDutySwap = (event: Event, dutyAssignment: DutyAssignment): boolean => {
    if (!currentUserPrincipal) return false;
    return dutyAssignment.assignee.toString() === currentUserPrincipal;
  };

  const canAcceptDutySwap = (event: Event, swapRequest: DutySwapRequest): boolean => {
    if (!currentUserPrincipal) return false;
    
    // Can't accept your own swap request
    if (swapRequest.originalAssignee === currentUserPrincipal) return false;
    
    // Must be a member of the event's club or team
    if (event.clubId) {
      const club = clubs?.find(c => c.id === event.clubId);
      if (club && club.creator.toString() === currentUserPrincipal) return true;
    }
    
    if (event.teamId) {
      const team = teams?.find(t => t.id === event.teamId);
      if (team && team.creator.toString() === currentUserPrincipal) return true;
    }
    
    // Must not already be assigned to a duty for this event
    const isAlreadyAssigned = event.dutyRoster.some(duty => 
      duty.assignee.toString() === currentUserPrincipal
    );
    
    return !isAlreadyAssigned;
  };

  // Enhanced duty swap eligibility checking
  const getEligibleMembersForDutySwap = (event: Event, excludeAssignee: string): string[] => {
    const eligibleMembers: string[] = [];
    
    // Get all members of the event's club or team
    if (event.clubId) {
      const club = clubs?.find(c => c.id === event.clubId);
      if (club) {
        // Add club creator if not the original assignee and not already assigned
        const creatorPrincipal = club.creator.toString();
        const isAlreadyAssigned = event.dutyRoster.some(duty => 
          duty.assignee.toString() === creatorPrincipal
        );
        
        if (creatorPrincipal !== excludeAssignee && !isAlreadyAssigned) {
          eligibleMembers.push(creatorPrincipal);
        }
      }
    }
    
    if (event.teamId) {
      const team = teams?.find(t => t.id === event.teamId);
      if (team) {
        // Add team creator if not the original assignee and not already assigned
        const creatorPrincipal = team.creator.toString();
        const isAlreadyAssigned = event.dutyRoster.some(duty => 
          duty.assignee.toString() === creatorPrincipal
        );
        
        if (creatorPrincipal !== excludeAssignee && !isAlreadyAssigned) {
          eligibleMembers.push(creatorPrincipal);
        }
      }
    }
    
    return eligibleMembers;
  };

  // Match day post permissions - Updated with Pro access control
  const canGenerateMatchDayPost = (event: Event): boolean => {
    if (event.eventType !== 'game') {
      return false;
    }
    
    // App admins always have access
    if (hasRole('app_admin', 'global', 'global')) {
      return true;
    }
    
    // Non-admin users need Pro access for match day posts
    if (!hasFileStorageAccess) {
      return false;
    }
    
    if (event.clubId && isClubAdmin(event.clubId.toString())) {
      return true;
    }
    
    if (event.teamId && isTeamAdmin(event.teamId.toString())) {
      return true;
    }
    
    return false;
  };

  return {
    userRoles,
    hasRole,
    isClubAdmin,
    isTeamAdmin,
    canManageEventPrivacy,
    canCreateAnnouncementForClub,
    canCreateAnnouncementForTeam,
    canViewAnnouncementForClub,
    canViewAnnouncementForTeam,
    getAccessibleClubsForAnnouncements,
    getAccessibleTeamsForAnnouncements,
    getAccessibleClubsForTeamAdmins,
    getAccessibleTeamsForTeamAdminsByClub,
    hasAnnouncementPermissions,
    getAnnouncementPermissionDetails,
    canCreateChatThreadForClub,
    canCreateChatThreadForTeam,
    getAccessibleClubsForChatThreads,
    getAccessibleTeamsForChatThreads,
    hasChatThreadPermissions,
    getChatThreadPermissionDetails,
    canDeleteAnnouncement,
    canDeleteChatThread,
    canViewPhoto,
    canInteractWithPhoto,
    canViewFile,
    canInteractWithFile,
    canAccessVaultFolder,
    canUploadToClub,
    canUploadToTeam,
    getAccessibleClubsForPhotos,
    getAccessibleTeamsForPhotos,
    canUploadFileToClub,
    canUploadFileToTeam,
    getAccessibleClubsForFiles,
    getAccessibleTeamsForFiles,
    canManageSubfolders,
    canCreateSubfolder,
    canDeleteSubfolder,
    canRenameSubfolder,
    canInitiateDutySwap,
    canAcceptDutySwap,
    getEligibleMembersForDutySwap,
    canGenerateMatchDayPost,
  };
}
