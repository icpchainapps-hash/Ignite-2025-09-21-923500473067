import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { UserProfile, UserRole } from '../backend';

// User Status Hook - Updated to include profile completion status
export function useGetUserStatus() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<{
    registered: boolean;
    isAdmin: boolean;
    role: UserRole;
    isProfileComplete: boolean;
  }>({
    queryKey: ['userStatus'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.me();
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

// Auth Hooks - Updated to handle profile completion
export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
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
      queryClient.setQueryData(['currentUserProfile'], profile);
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      queryClient.invalidateQueries({ queryKey: ['userStatus'] });
    },
  });
}

export function useIsCurrentUserAdmin() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery({
    queryKey: ['isCurrentUserAdmin'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });
}
