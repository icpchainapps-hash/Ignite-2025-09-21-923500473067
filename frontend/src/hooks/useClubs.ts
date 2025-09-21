import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useFileUpload } from '../blob-storage/FileStorage';
import { Club, Team, Event, ClubMembership } from '../backend';

// Club Hooks - Updated to ensure completely unrestricted creation
export function useGetUserClubs() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Club[]>({
    queryKey: ['userClubs'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getAllClubs() || [];
    },
    enabled: !!actor && !actorFetching,
    placeholderData: [],
  });
}

export function useGetClubUniqueMemberCount() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (clubId: string): Promise<number> => {
      if (!actor) throw new Error('Actor not available');
      const count = await actor.getUniqueMemberCount(BigInt(clubId));
      return Number(count);
    },
  });
}

export function useGetTeamMemberCount() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (teamId: string): Promise<number> => {
      if (!actor) throw new Error('Actor not available');
      
      // Get team members and count them
      const teamMembers = await actor.getTeamMembersByTeamId(BigInt(teamId));
      return teamMembers.length;
    },
  });
}

export function useCreateClub() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { uploadFile } = useFileUpload();

  return useMutation({
    mutationFn: async (clubData: {
      name: string;
      description: string;
      location: string;
      logoPath?: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      
      console.log('Creating club with completely unrestricted access - no permission checks:', clubData);
      
      // Club creation is completely unrestricted - backend has been updated to remove ALL permission checks
      // Any authenticated user can create clubs without any restrictions whatsoever
      const createdClub = await actor.createClub(clubData.name, clubData.description, clubData.location);
      
      // Note: updateClubLogo function is not available in current backend
      // Logo functionality will need to be implemented when backend is updated
      if (clubData.logoPath) {
        console.warn('Club logo update not available - backend function updateClubLogo needs to be implemented');
      }
      
      console.log('Club created successfully with automatic admin role assignment:', createdClub);
      return createdClub;
    },
    onSuccess: (createdClub) => {
      console.log('Club creation mutation succeeded - creator automatically assigned as admin:', createdClub);
      
      // Immediately update the cache with the new club
      queryClient.setQueryData(['userClubs'], (oldClubs: Club[] | undefined) => {
        const currentClubs = oldClubs || [];
        return [...currentClubs, createdClub];
      });
      
      // Invalidate and refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['userClubs'] });
      queryClient.invalidateQueries({ queryKey: ['vaultFolders'] });
      queryClient.invalidateQueries({ queryKey: ['userStatus'] });
      
      // Force immediate refetch for real-time updates
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['userClubs'] });
      }, 100);
    },
    onError: (error) => {
      console.error('Club creation failed with technical error only (no permission issues possible):', error);
      // Since club creation is completely unrestricted, any errors are purely technical
    },
  });
}

export function useDeleteClub() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clubId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteClub(BigInt(clubId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userClubs'] });
      queryClient.invalidateQueries({ queryKey: ['allTeams'] });
      queryClient.invalidateQueries({ queryKey: ['vaultFolders'] });
    },
  });
}

export function useUpdateClubLogo() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clubId, logoPath }: {
      clubId: string;
      logoPath: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      
      // Backend function updateClubLogo is not available yet
      console.warn('updateClubLogo function not implemented in backend yet');
      throw new Error('Club logo update functionality is not yet available. The updateClubLogo function needs to be implemented in the backend.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userClubs'] });
    },
  });
}

export function useGetClubTeams() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (clubId: string): Promise<Team[]> => {
      if (!actor) throw new Error('Actor not available');
      return actor.getTeamsByClubId(BigInt(clubId));
    },
  });
}

export function useGetClubEvents() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (clubId: string): Promise<Event[]> => {
      if (!actor) throw new Error('Actor not available');
      return actor.getEventsByClubId(BigInt(clubId));
    },
  });
}

export function useGetClubMembers() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (clubId: string): Promise<ClubMembership[]> => {
      if (!actor) throw new Error('Actor not available');
      return actor.getClubMembershipsByClub(BigInt(clubId));
    },
  });
}

export function useGetClubAnnouncements() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (clubId: string): Promise<any[]> => {
      if (!actor) throw new Error('Actor not available');
      
      // Backend function getAnnouncementsByClubId is not available yet
      console.warn('getAnnouncementsByClubId function not implemented in backend yet');
      return [];
    },
  });
}

