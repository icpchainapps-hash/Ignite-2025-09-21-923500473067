import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import { Child } from '../backend';

// Child Management Hooks
export function useGetCallerChildren() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<Child[]>({
    queryKey: ['callerChildren'],
    queryFn: async () => {
      if (!actor || !identity) throw new Error('Actor or identity not available');
      return actor.getChildrenByParent(identity.getPrincipal()) || [];
    },
    enabled: !!actor && !actorFetching && !!identity,
    placeholderData: [],
  });
}

export function useCreateChild() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (childData: {
      name: string;
      dateOfBirth: number;
      teamId?: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      
      const teamIdBigInt = childData.teamId ? BigInt(childData.teamId) : null;
      return actor.createChild(
        childData.name,
        BigInt(childData.dateOfBirth),
        teamIdBigInt
      );
    },
    onSuccess: (newChild) => {
      queryClient.invalidateQueries({ queryKey: ['callerChildren'] });
      
      if (newChild.teamId) {
        queryClient.invalidateQueries({ queryKey: ['teamMembersByTeamId', newChild.teamId.toString()] });
      }
    },
  });
}

export function useUpdateChild() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (childData: {
      childId: string;
      name: string;
      dateOfBirth: number;
      teamId?: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      
      const teamIdBigInt = childData.teamId ? BigInt(childData.teamId) : null;
      return actor.updateChild(
        BigInt(childData.childId),
        childData.name,
        BigInt(childData.dateOfBirth),
        teamIdBigInt
      );
    },
    onSuccess: (updatedChild, variables) => {
      const oldChild = queryClient.getQueryData<Child[]>(['callerChildren'])?.find(
        child => child.id.toString() === variables.childId
      );
      
      queryClient.invalidateQueries({ queryKey: ['callerChildren'] });
      
      if (oldChild?.teamId) {
        queryClient.invalidateQueries({ queryKey: ['teamMembersByTeamId', oldChild.teamId.toString()] });
      }
      if (updatedChild.teamId) {
        queryClient.invalidateQueries({ queryKey: ['teamMembersByTeamId', updatedChild.teamId.toString()] });
      }
    },
  });
}

export function useDeleteChild() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (childId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteChild(BigInt(childId));
    },
    onSuccess: (_, childId) => {
      const deletedChild = queryClient.getQueryData<Child[]>(['callerChildren'])?.find(
        child => child.id.toString() === childId
      );
      
      queryClient.invalidateQueries({ queryKey: ['callerChildren'] });
      
      if (deletedChild?.teamId) {
        queryClient.invalidateQueries({ queryKey: ['teamMembersByTeamId', deletedChild.teamId.toString()] });
      }
    },
  });
}
