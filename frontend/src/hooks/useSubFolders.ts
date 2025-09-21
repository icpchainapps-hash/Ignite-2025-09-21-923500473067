import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import { Subfolder, ParentType } from '../backend';

// Subfolder Management Hooks
export function useGetSubfoldersByParent() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (parentType: ParentType): Promise<Subfolder[]> => {
      if (!actor) throw new Error('Actor not available');
      return actor.getSubfoldersByParent(parentType);
    },
  });
}

export function useCreateSubfolder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, parentType }: {
      name: string;
      parentType: ParentType;
    }) => {
      if (!actor) throw new Error('Actor not available');
      
      // Validate subfolder name
      if (!name.trim()) {
        throw new Error('Subfolder name is required');
      }
      
      if (name.trim().length > 50) {
        throw new Error('Subfolder name must be 50 characters or less');
      }
      
      // Check for invalid characters
      if (!/^[a-zA-Z0-9\s\-_]+$/.test(name.trim())) {
        throw new Error('Subfolder name can only contain letters, numbers, spaces, hyphens, and underscores');
      }
      
      return actor.createSubfolder(name.trim(), parentType);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subfolders'] });
      queryClient.invalidateQueries({ queryKey: ['vaultFolders'] });
    },
  });
}

export function useDeleteSubfolder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subfolderId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteSubfolder(BigInt(subfolderId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subfolders'] });
      queryClient.invalidateQueries({ queryKey: ['vaultFolders'] });
      queryClient.invalidateQueries({ queryKey: ['folderPhotos'] });
      queryClient.invalidateQueries({ queryKey: ['folderFiles'] });
    },
  });
}

export function useGetAllSubfolders() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Subfolder[]>({
    queryKey: ['allSubfolders'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getAllSubfolders() || [];
    },
    enabled: !!actor && !actorFetching,
    placeholderData: [],
  });
}
