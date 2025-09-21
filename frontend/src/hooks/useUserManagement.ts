import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import type { TeamRole, ClubRole, UserProfile } from '../backend';
import { Principal } from '@dfinity/principal';

/* ---------- Inline types & consts (replaces ../backend) ---------- */
export const TeamRole = {
  teamAdmin: 'teamAdmin',
  coach: 'coach',
  player: 'player',
  parent: 'parent',
} as const;
export type TeamRole = (typeof TeamRole)[keyof typeof TeamRole] | string;

export const ClubRole = {
  clubAdmin: 'clubAdmin',
} as const;
export type ClubRole = (typeof ClubRole)[keyof typeof ClubRole] | string;

export type UserProfile = {
  id?: string;             // principal as string
  name?: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  bio?: string;
  isProfileComplete?: boolean;
  roles?: Array<TeamRole | ClubRole>;
  [key: string]: any;
};
/* ----------------------------------------------------------------- */

// User Management Hooks for Team and Club Admins

// Search users by display name or principal ID
export function useSearchUsers() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (query: string): Promise<Array<{ principal: Principal; displayName: string }>> => {
      if (!actor) throw new Error('Actor not available');

      // For now, client-side search via available data until backend search is implemented
      const [allClubs, allTeams, allMessages] = await Promise.all([
        actor.getAllClubs(),
        actor.getAllTeams(),
        actor.getAllMessages(),
      ]);

      const uniqueUsers = new Set<string>();
      const userResults: Array<{ principal: Principal; displayName: string }> = [];

      // Collect unique users from clubs, teams, and messages
      allClubs.forEach((club: any) => uniqueUsers.add(club.creator.toString()));
      allTeams.forEach((team: any) => uniqueUsers.add(team.creator.toString()));
      allMessages.forEach((message: any) => uniqueUsers.add(message.sender.toString()));

      // Get user profiles and filter by search query
      for (const principalStr of uniqueUsers) {
        try {
          const principal = Principal.fromText(principalStr);
          const profile: UserProfile | null = await actor.getUserProfile(principal);
          const displayName = profile?.name || principalStr;

          const q = query.toLowerCase();
          if (displayName.toLowerCase().includes(q) || principalStr.toLowerCase().includes(q)) {
            userResults.push({ principal, displayName });
          }
        } catch (error) {
          console.warn('Failed to get profile for user:', principalStr, error);
        }
      }

      return userResults.sort((a, b) => a.displayName.localeCompare(b.displayName));
    },
  });
}

// Add user to team with role assignment
export function useAddUserToTeam() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ teamId, userPrincipal, roles }: {
      teamId: string;
      userPrincipal: Principal;
      roles: TeamRole[];
    }) => {
      if (!actor) throw new Error('Actor not available');

      // Ensure user exists
      const userProfile: UserProfile | null = await actor.getUserProfile(userPrincipal);
      if (!userProfile) {
        throw new Error('User not found or has no profile. The user must log in at least once before being added to teams.');
      }

      // Prevent duplicates
      const existingMemberships = await actor.getTeamMembershipsByTeam(BigInt(teamId));
      const existingMembership = existingMemberships.find((m: any) => m.user.toString() === userPrincipal.toString());
      if (existingMembership) {
        throw new Error(`${userProfile.name} is already a member of this team`);
      }

      // Create team membership with specified roles
      const membership = await actor.addTeamMembership(BigInt(teamId), roles);

      return {
        membership,
        userDisplayName: userProfile.name,
        teamId,
        roles,
      };
    },
    onSuccess: (result) => {
      // Invalidate relevant caches
      queryClient.invalidateQueries({ queryKey: ['teamMembersByTeamId', result.teamId] });
      queryClient.invalidateQueries({ queryKey: ['teamMemberships'] });
      queryClient.invalidateQueries({ queryKey: ['clubMemberships'] });
      queryClient.invalidateQueries({ queryKey: ['currentUserRoles'] });

      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['teamMembersByTeamId', result.teamId] });
      }, 100);
    },
  });
}

// Remove user from team
export function useRemoveUserFromTeam() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ teamId, userPrincipal }: {
      teamId: string;
      userPrincipal: Principal;
    }) => {
      if (!actor) throw new Error('Actor not available');

      const memberships = await actor.getTeamMembershipsByTeam(BigInt(teamId));
      const membership = memberships.find((m: any) => m.user.toString() === userPrincipal.toString());
      if (!membership) {
        throw new Error('User is not a member of this team');
      }

      const userProfile: UserProfile | null = await actor.getUserProfile(userPrincipal);
      const displayName = userProfile?.name || userPrincipal.toString();

      await actor.removeTeamMember(BigInt(teamId), userPrincipal);

      return { teamId, userPrincipal, displayName };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['teamMembersByTeamId', result.teamId] });
      queryClient.invalidateQueries({ queryKey: ['teamMemberships'] });
      queryClient.invalidateQueries({ queryKey: ['clubMemberships'] });
      queryClient.invalidateQueries({ queryKey: ['currentUserRoles'] });

      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['teamMembersByTeamId', result.teamId] });
      }, 100);
    },
  });
}

// Remove specific role from a team member
export function useRemoveTeamRole() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ teamId, userPrincipal, role }: {
      teamId: string;
      userPrincipal: Principal;
      role: TeamRole;
    }) => {
      if (!actor) throw new Error('Actor not available');

      const memberships = await actor.getTeamMembershipsByTeam(BigInt(teamId));
      const membership = memberships.find((m: any) => m.user.toString() === userPrincipal.toString());
      if (!membership) {
        throw new Error('User is not a member of this team');
      }

      if (!membership.roles.includes(role)) {
        throw new Error('User does not have this role');
      }

      const userProfile: UserProfile | null = await actor.getUserProfile(userPrincipal);
      const displayName = userProfile?.name || userPrincipal.toString();

      await actor.removeTeamRole(BigInt(teamId), userPrincipal, role);

      return { teamId, userPrincipal, role, displayName };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['teamMembersByTeamId', result.teamId] });
      queryClient.invalidateQueries({ queryKey: ['teamMemberships'] });
      queryClient.invalidateQueries({ queryKey: ['clubMemberships'] });
      queryClient.invalidateQueries({ queryKey: ['currentUserRoles'] });

      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['teamMembersByTeamId', result.teamId] });
      }, 100);
    },
  });
}

// Manage multiple team roles at once
export function useManageTeamRoles() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ teamId, userPrincipal, roles }: {
      teamId: string;
      userPrincipal: Principal;
      roles: TeamRole[];
    }) => {
      if (!actor) throw new Error('Actor not available');

      const memberships = await actor.getTeamMembershipsByTeam(BigInt(teamId));
      const membership = memberships.find((m: any) => m.user.toString() === userPrincipal.toString());
      if (!membership) {
        throw new Error('User is not a member of this team');
      }

      const userProfile: UserProfile | null = await actor.getUserProfile(userPrincipal);
      const displayName = userProfile?.name || userPrincipal.toString();

      await actor.manageTeamRoles(BigInt(teamId), userPrincipal, roles);

      return { teamId, userPrincipal, roles, displayName };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['teamMembersByTeamId', result.teamId] });
      queryClient.invalidateQueries({ queryKey: ['teamMemberships'] });
      queryClient.invalidateQueries({ queryKey: ['clubMemberships'] });
      queryClient.invalidateQueries({ queryKey: ['currentUserRoles'] });

      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['teamMembersByTeamId', result.teamId] });
      }, 100);
    },
  });
}

// Assign club admin role to a user
export function useAssignClubAdmin() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clubId, userPrincipal }: {
      clubId: string;
      userPrincipal: Principal;
    }) => {
      if (!actor) throw new Error('Actor not available');

      // Ensure user exists
      const userProfile: UserProfile | null = await actor.getUserProfile(userPrincipal);
      if (!userProfile) {
        throw new Error('User not found or has no profile. The user must log in at least once before being assigned as club admin.');
      }

      const clubMemberships = await actor.getClubMembershipsByClub(BigInt(clubId));
      const isClubMember = clubMemberships.some((m: any) => m.user.toString() === userPrincipal.toString());

      if (!isClubMember) {
        // Check if user is a member of any team in this club
        const clubTeams = await actor.getTeamsByClubId(BigInt(clubId));
        let isTeamMember = false;

        for (const team of clubTeams) {
          const teamMemberships = await actor.getTeamMembershipsByTeam(team.id);
          if (teamMemberships.some((m: any) => m.user.toString() === userPrincipal.toString())) {
            isTeamMember = true;
            break;
          }
        }

        if (!isTeamMember) {
          throw new Error(`${userProfile.name} must be a member of the club or one of its teams before being assigned as club admin`);
        }
      }

      // Already an admin?
      const existingMembership = clubMemberships.find((m: any) => m.user.toString() === userPrincipal.toString());
      if (existingMembership && existingMembership.roles.includes(ClubRole.clubAdmin)) {
        throw new Error(`${userProfile.name} is already a club admin`);
      }

      // Add club admin membership
      const membership = await actor.addClubMembership(BigInt(clubId), [ClubRole.clubAdmin]);

      return {
        membership,
        userDisplayName: userProfile.name,
        clubId,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['clubMemberships', result.clubId] });
      queryClient.invalidateQueries({ queryKey: ['clubMembers'] });
      queryClient.invalidateQueries({ queryKey: ['currentUserRoles'] });

      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['clubMemberships', result.clubId] });
      }, 100);
    },
  });
}

// Remove club admin role from a user
export function useRemoveClubAdmin() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();

  return useMutation({
    mutationFn: async ({ clubId, userPrincipal }: {
      clubId: string;
      userPrincipal: Principal;
    }) => {
      if (!actor || !identity) throw new Error('Actor or identity not available');

      const currentUserPrincipal = identity.getPrincipal();

      // Prevent self-removal
      if (userPrincipal.toString() === currentUserPrincipal.toString()) {
        throw new Error('You cannot remove your own club admin role');
      }

      const clubMemberships = await actor.getClubMembershipsByClub(BigInt(clubId));
      const membership = clubMemberships.find(
        (m: any) => m.user.toString() === userPrincipal.toString() && m.roles.includes(ClubRole.clubAdmin)
      );

      if (!membership) {
        throw new Error('User is not a club admin for this club');
      }

      const userProfile: UserProfile | null = await actor.getUserProfile(userPrincipal);
      const displayName = userProfile?.name || userPrincipal.toString();

      // TODO: implement backend removal; for now, surface a clear message
      throw new Error(`Backend function to remove club admin role from ${displayName} is not yet implemented. Please contact support.`);
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clubMemberships', variables.clubId] });
      queryClient.invalidateQueries({ queryKey: ['clubMembers'] });
      queryClient.invalidateQueries({ queryKey: ['currentUserRoles'] });

      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['clubMemberships', variables.clubId] });
      }, 100);
    },
  });
}

// Get all users for admin selection (simplified)
export function useGetAllUsers() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Array<{ principal: Principal; displayName: string }>>({
    queryKey: ['allUsers'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');

      const [allClubs, allTeams, allMessages] = await Promise.all([
        actor.getAllClubs(),
        actor.getAllTeams(),
        actor.getAllMessages(),
      ]);

      const uniqueUsers = new Set<string>();
      const userResults: Array<{ principal: Principal; displayName: string }> = [];

      allClubs.forEach((club: any) => uniqueUsers.add(club.creator.toString()));
      allTeams.forEach((team: any) => uniqueUsers.add(team.creator.toString()));
      allMessages.forEach((message: any) => uniqueUsers.add(message.sender.toString()));

      for (const principalStr of uniqueUsers) {
        try {
          const principal = Principal.fromText(principalStr);
          const profile: UserProfile | null = await actor.getUserProfile(principal);
          const displayName = profile?.name || principalStr;
          userResults.push({ principal, displayName });
        } catch (error) {
          console.warn('Failed to get profile for user:', principalStr, error);
        }
      }

      return userResults.sort((a, b) => a.displayName.localeCompare(b.displayName));
    },
    enabled: !!actor && !actorFetching,
    placeholderData: [],
    staleTime: 300000, // 5 minutes
  });
}