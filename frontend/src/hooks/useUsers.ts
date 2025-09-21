import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { UserRole } from '../backend';
import type { UserProfile, TeamRole, ClubRole } from '../backend';
import { useInternetIdentity } from './useInternetIdentity';
import { QUERY_KEYS } from '../utils/constants';

/* ---------- Inline types (replaces ../backend) ---------- */
// Value + type so you can use both `UserRole` as a type and `UserRole.admin` at runtime.
export const UserRole = {
  admin: 'admin',
  user: 'user',
  Owner: 'Owner',
  Admin: 'Admin',
  Coach: 'Coach',
  Member: 'Member',
  Parent: 'Parent',
  Player: 'Player',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export type UserProfile = {
  id?: string;           // principal as string
  username?: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  bio?: string;
  isProfileComplete?: boolean;
  roles?: UserRole[];
  points?: number;
  [key: string]: any;    // allow extra fields
};
/* -------------------------------------------------------- */

// User Status Hook - Updated to handle missing backend function
export function useGetUserStatus() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  const query = useQuery<{
    registered: boolean;
    isAdmin: boolean;
    role: UserRole;
    isProfileComplete: boolean;
  }>({
    queryKey: [QUERY_KEYS.USER_STATUS],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');

      // Since me() function is not available, simulate the response
      const isAdmin = await actor.isCallerAdmin();
      const userProfile = await actor.getCallerUserProfile();

      return {
        registered: !!userProfile,
        isAdmin,
        role: isAdmin ? UserRole.admin : UserRole.user,
        isProfileComplete: userProfile?.isProfileComplete || false,
      };
    },
    enabled: !!actor && !actorFetching && !!identity,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

// Auth Hooks - Updated to handle profile completion
export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: [QUERY_KEYS.USER_PROFILE],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not available');
      await actor.saveCallerUserProfile(profile);
      return profile;
    },
    onSuccess: (profile) => {
      queryClient.setQueryData([QUERY_KEYS.USER_PROFILE], profile);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USER_PROFILE] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USER_STATUS] });
    },
  });
}

export function useIsCurrentUserAdmin() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery({
    queryKey: [QUERY_KEYS.IS_ADMIN],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });
}

// New hook to get current user's actual role assignments from memberships
export function useGetCurrentUserRoles() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery({
    queryKey: [QUERY_KEYS.USER_ROLES],
    queryFn: async () => {
      if (!actor || !identity) throw new Error('Actor or identity not available');

      const currentUserPrincipal = identity.getPrincipal();
      const roles: Array<{
        type: 'club' | 'team';
        organizationId: string;
        organizationName: string;
        roles: string[];
      }> = [];

      try {
        // Get all clubs and teams to resolve names
        const [allClubs, allTeams] = await Promise.all([
          actor.getAllClubs(),
          actor.getAllTeams(),
        ]);

        // Get user's club memberships
        for (const club of allClubs) {
          try {
            const clubMemberships = await actor.getClubMembershipsByClub(club.id);
            const userMembership = clubMemberships.find(
              (m: any) => m.user.toString() === currentUserPrincipal.toString()
            );

            if (userMembership) {
              const roleStrings = userMembership.roles.map((role: any) => {
                switch (role) {
                  case 'clubAdmin':
                    return 'Club Admin';
                  default:
                    return role.toString();
                }
              });

              roles.push({
                type: 'club',
                organizationId: club.id.toString(),
                organizationName: club.name,
                roles: roleStrings,
              });
            }
          } catch (error) {
            console.warn('Failed to get club memberships for club:', club.id.toString(), error);
          }
        }

        // Get user's team memberships
        for (const team of allTeams) {
          try {
            const teamMemberships = await actor.getTeamMembershipsByTeam(team.id);
            const userMembership = teamMemberships.find(
              (m: any) => m.user.toString() === currentUserPrincipal.toString()
            );

            if (userMembership) {
              const roleStrings = userMembership.roles.map((role: any) => {
                switch (role) {
                  case 'teamAdmin':
                    return 'Team Admin';
                  case 'coach':
                    return 'Coach';
                  case 'player':
                    return 'Player';
                  case 'parent':
                    return 'Parent';
                  default:
                    return role.toString();
                }
              });

              roles.push({
                type: 'team',
                organizationId: team.id.toString(),
                organizationName: team.name,
                roles: roleStrings,
              });
            }
          } catch (error) {
            console.warn('Failed to get team memberships for team:', team.id.toString(), error);
          }
        }

        return roles;
      } catch (error) {
        console.error('Failed to get current user roles:', error);
        return [];
      }
    },
    enabled: !!actor && !actorFetching && !!identity,
    placeholderData: [],
    // Disable caching to ensure we always get fresh role data
    staleTime: 0,
    gcTime: 0,
  });
}

// Enhanced hook to get user's Ignite points balance with simulation until backend is ready
export function useGetUserPoints() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<number>({
    queryKey: ['userPoints'],
    queryFn: async () => {
      if (!actor || !identity) throw new Error('Actor or identity not available');

      // Simulate points based on completed duties until backend implements getUserPoints
      const allEvents = await actor.getAllEvents();
      const currentUserPrincipal = identity.getPrincipal().toString();
      let simulatedPoints = 0;

      // Count completed duties for the current user
      for (const event of allEvents) {
        const eventEndTime = Number(event.endTime);
        const twentyFourHoursAfterEvent = eventEndTime + 24 * 60 * 60 * 1000;
        const isEventCompleted = Date.now() > twentyFourHoursAfterEvent;

        if (isEventCompleted) {
          for (const duty of event.dutyRoster) {
            if (duty.assignee.toString() === currentUserPrincipal) {
              simulatedPoints += 10; // 10 points per completed duty
            }
          }
        }
      }

      return simulatedPoints;
    },
    enabled: !!actor && !actorFetching && !!identity,
    placeholderData: 0,
    // Refresh points frequently to show real-time updates
    refetchInterval: 30000, // 30 seconds
  });
}

// Hook to manually refresh points (for immediate updates after duty completion)
export function useRefreshUserPoints() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ['userPoints'] });
    queryClient.refetchQueries({ queryKey: ['userPoints'] });
  };
}

// Enhanced hook to get user's rewards with simulation until backend is ready
export function useGetUserRewards() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<
    Array<{
      id: string;
      mintedAt: number;
      metadata: { name: string; description: string; image?: string };
    }>
  >({
    queryKey: ['userRewards'],
    queryFn: async () => {
      if (!actor || !identity) throw new Error('Actor or identity not available');

      // Simulate rewards based on points until backend implements getUserRewards
      const allEvents = await actor.getAllEvents();
      const currentUserPrincipal = identity.getPrincipal().toString();
      let simulatedPoints = 0;

      // Count completed duties for the current user
      for (const event of allEvents) {
        const eventEndTime = Number(event.endTime);
        const twentyFourHoursAfterEvent = eventEndTime + 24 * 60 * 60 * 1000;
        const isEventCompleted = Date.now() > twentyFourHoursAfterEvent;

        if (isEventCompleted) {
          for (const duty of event.dutyRoster) {
            if (duty.assignee.toString() === currentUserPrincipal) {
              simulatedPoints += 10; // 10 points per completed duty
            }
          }
        }
      }

      // Calculate how many rewards the user should have (one per 20 points)
      const rewardCount = Math.floor(simulatedPoints / 20);
      const simulatedRewards: Array<{
        id: string;
        mintedAt: number;
        metadata: { name: string; description: string; image?: string };
      }> = [];

      for (let i = 0; i < rewardCount; i++) {
        simulatedRewards.push({
          id: `reward_${i + 1}_${currentUserPrincipal}`,
          mintedAt: Date.now() - i * 24 * 60 * 60 * 1000, // Simulate different mint times
          metadata: {
            name: `Sausage Sizzle Reward #${i + 1}`,
            description: `This reward entitles you to one free sausage sizzle. Earned by completing ${
              (i + 1) * 2
            } duties and reaching ${(i + 1) * 20} Ignite points.`,
            image: undefined, // Will be generated by backend
          },
        });
      }

      return simulatedRewards.reverse(); // Most recent first
    },
    enabled: !!actor && !actorFetching && !!identity,
    placeholderData: [],
    // Refresh rewards when points might have changed
    refetchInterval: 60000, // 1 minute
  });
}

// Hook to manually refresh rewards (for immediate updates after minting)
export function useRefreshUserRewards() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ['userRewards'] });
    queryClient.refetchQueries({ queryKey: ['userRewards'] });
  };
}

// New hook to check for reward minting eligibility and trigger notifications
export function useCheckRewardMinting() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor || !identity) throw new Error('Actor or identity not available');

      // Simulate reward minting check until backend implements the functionality
      const allEvents = await actor.getAllEvents();
      const currentUserPrincipal = identity.getPrincipal().toString();
      let simulatedPoints = 0;

      // Count completed duties for the current user
      for (const event of allEvents) {
        const eventEndTime = Number(event.endTime);
        const twentyFourHoursAfterEvent = eventEndTime + 24 * 60 * 60 * 1000;
        const isEventCompleted = Date.now() > twentyFourHoursAfterEvent;

        if (isEventCompleted) {
          for (const duty of event.dutyRoster) {
            if (duty.assignee.toString() === currentUserPrincipal) {
              simulatedPoints += 10; // 10 points per completed duty
            }
          }
        }
      }

      const rewardCount = Math.floor(simulatedPoints / 20);

      return {
        points: simulatedPoints,
        rewardCount: rewardCount,
        shouldHaveRewards: rewardCount,
      };
    },
    onSuccess: (result) => {
      if (result) {
        // Refresh user points and rewards to show any updates
        queryClient.invalidateQueries({ queryKey: ['userPoints'] });
        queryClient.invalidateQueries({ queryKey: ['userRewards'] });
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.NOTIFICATIONS] });

        // Force immediate refresh
        queryClient.refetchQueries({ queryKey: ['userPoints'] });
        queryClient.refetchQueries({ queryKey: ['userRewards'] });
        queryClient.refetchQueries({ queryKey: [QUERY_KEYS.NOTIFICATIONS] });
      }
    },
  });
}