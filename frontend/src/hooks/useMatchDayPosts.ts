import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';

// Define frontend-only type for match day posts until backend implements it
interface MatchDayPost {
  id: bigint;
  eventId: bigint;
  imagePath: string;
  timestamp: bigint;
}

// Match Day Post Hooks
export function useGenerateMatchDayPost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId }: { eventId: string }) => {
      if (!actor) throw new Error('Actor not available');
      
      // Backend function generateMatchDayPost is not available yet
      console.warn('generateMatchDayPost function not implemented in backend yet');
      throw new Error('Match day post generation functionality is not yet available. The generateMatchDayPost function needs to be implemented in the backend.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matchDayPosts'] });
    },
  });
}

export function useGetMatchDayPostsByEventId() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (eventId: string): Promise<MatchDayPost[]> => {
      if (!actor) throw new Error('Actor not available');
      
      // Backend function getMatchDayPostsByEventId is not available yet
      console.warn('getMatchDayPostsByEventId function not implemented in backend yet');
      return [];
    },
  });
}

export function useGetAllMatchDayPosts() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<MatchDayPost[]>({
    queryKey: ['matchDayPosts'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      
      // Backend function getAllMatchDayPosts is not available yet
      console.warn('getAllMatchDayPosts function not implemented in backend yet');
      return [];
    },
    enabled: !!actor && !actorFetching,
    placeholderData: [],
  });
}
