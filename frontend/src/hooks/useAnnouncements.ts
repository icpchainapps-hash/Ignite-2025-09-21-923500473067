// frontend/src/hooks/useAnnouncements.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import useCanAccessFeature from './useSubscriptions'; // exact lowercase filename
import { useIsCurrentUserAdmin } from './useUsers';
// (remove any trailing comments on these import lines)


// Define frontend-only types for announcements until backend implements them
interface Announcement {
  id: bigint;
  title: string;
  content: string;
  creator: any;
  timestamp: bigint;
  clubId?: bigint;
  teamId?: bigint;
}

interface AnnouncementComment {
  id: bigint;
  announcementId: bigint;
  user: any;
  comment: string;
  timestamp: bigint;
}

// Announcements
export function useCreateAnnouncement() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { data: isAppAdmin } = useIsCurrentUserAdmin();
  const { data: advancedChatAccess } = useCanAccessFeature('advanced_chat', 'club', '1');
  const hasAdvancedChatAccess = advancedChatAccess?.hasAccess || false;

  return useMutation({
    mutationFn: async (announcementData: {
      title: string;
      content: string;
      clubId?: string;
      teamId?: string;
    }) => {
      if (!actor) throw new Error('Actor not available');

      // Check if this is a club-level announcement and user has access
      if (announcementData.clubId && !announcementData.teamId && !isAppAdmin && !hasAdvancedChatAccess) {
        throw new Error('Club-level announcements require Pro subscription. Upgrade to Pro to create club announcements.');
      }

      // Backend function createAnnouncement is not available yet
      console.warn('createAnnouncement function not implemented in backend yet');
      throw new Error('Announcement creation functionality is not yet available. The createAnnouncement function needs to be implemented in the backend.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userAnnouncements'] });
      queryClient.invalidateQueries({ queryKey: ['recentAnnouncements'] });
    },
  });
}

export function useDeleteAnnouncement() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (announcementId: string) => {
      if (!actor) throw new Error('Actor not available');

      // Backend function deleteAnnouncement is not available yet
      console.warn('deleteAnnouncement function not implemented in backend yet');
      throw new Error('Announcement deletion functionality is not yet available. The deleteAnnouncement function needs to be implemented in the backend.');
    },
    onSuccess: (_, announcementId) => {
      // Immediately remove from caches
      queryClient.setQueryData(['userAnnouncements'], (oldData: Announcement[] | undefined) =>
        oldData?.filter(a => a.id.toString() !== announcementId)
      );
      queryClient.setQueryData(['recentAnnouncements'], (oldData: Announcement[] | undefined) =>
        oldData?.filter(a => a.id.toString() !== announcementId)
      );

      // Invalidate all relevant caches
      queryClient.invalidateQueries({ queryKey: ['userAnnouncements'] });
      queryClient.invalidateQueries({ queryKey: ['recentAnnouncements'] });
      queryClient.invalidateQueries({ queryKey: ['clubAnnouncements'] });
      queryClient.invalidateQueries({ queryKey: ['teamAnnouncements'] });

      // Force immediate refetch
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['userAnnouncements'] });
        queryClient.refetchQueries({ queryKey: ['recentAnnouncements'] });
      }, 50);
    },
  });
}

export function useGetUserAnnouncements() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();
  const { data: isAppAdmin } = useIsCurrentUserAdmin();
  const { data: advancedChatAccess } = useCanAccessFeature('advanced_chat', 'club', '1');
  const hasAdvancedChatAccess = advancedChatAccess?.hasAccess || false;

  return useQuery<Announcement[]>({
    queryKey: ['userAnnouncements'],
    queryFn: async () => {
      if (!actor || !identity) throw new Error('Actor or identity not available');

      // Backend function getAllAnnouncements is not available yet
      console.warn('getAllAnnouncements function not implemented in backend yet');
      return [];
    },
    enabled: !!actor && !actorFetching && !!identity,
    placeholderData: [],
  });
}

// Convenience alias used by some imports; safe to keep
export function useAnnouncements() {
  return useGetUserAnnouncements();
}

export function useGetRecentAnnouncements() {
  const { data: userAnnouncements } = useGetUserAnnouncements();

  return useQuery<Announcement[]>({
    queryKey: ['recentAnnouncements'],
    queryFn: async () => (userAnnouncements ? userAnnouncements.slice(0, 10) : []),
    enabled: !!userAnnouncements,
    placeholderData: [],
  });
}

export function useGetAnnouncementsByTeamId() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (teamId: string): Promise<Announcement[]> => {
      if (!actor) throw new Error('Actor not available');

      // Backend function getAnnouncementsByTeamId is not available yet
      console.warn('getAnnouncementsByTeamId function not implemented in backend yet');
      return [];
    },
  });
}

export function useGetAnnouncementComments() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (announcementId: string): Promise<AnnouncementComment[]> => {
      if (!actor) throw new Error('Actor not available');

      // Backend function getAnnouncementComments is not available yet
      console.warn('getAnnouncementComments function not implemented in backend yet');
      throw new Error('Announcement comments functionality is not yet available. The getAnnouncementComments function needs to be implemented in the backend.');
    },
  });
}

export function useCommentOnAnnouncement() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ announcementId, comment }: { announcementId: string; comment: string }) => {
      if (!actor) throw new Error('Actor not available');

      // Backend function commentOnAnnouncement is not available yet
      console.warn('commentOnAnnouncement function not implemented in backend yet');
      throw new Error('Announcement commenting functionality is not yet available. The commentOnAnnouncement function needs to be implemented in the backend.');
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['announcementComments', variables.announcementId] });
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['announcementComments', variables.announcementId] });
      }, 100);
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['announcementComments', variables.announcementId] });
      }, 500);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// Announcement reaction hooks - Updated to use backend with single reaction per user enforcement
interface AnnouncementReaction {
  id: string;
  announcementId: string;
  user: string;
  reaction: string;
  timestamp: number;
}

interface AnnouncementCommentReaction {
  id: string;
  commentId: string;
  user: string;
  reaction: string;
  timestamp: number;
}

const ANNOUNCEMENT_REACTIONS_KEY = 'ignite_announcement_reactions';
const ANNOUNCEMENT_COMMENT_REACTIONS_KEY = 'ignite_announcement_comment_reactions';

function getStoredAnnouncementReactions(): AnnouncementReaction[] {
  try {
    const stored = localStorage.getItem(ANNOUNCEMENT_REACTIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function setStoredAnnouncementReactions(reactions: AnnouncementReaction[]): void {
  try {
    localStorage.setItem(ANNOUNCEMENT_REACTIONS_KEY, JSON.stringify(reactions));
  } catch (error) {
    console.error('Failed to store announcement reactions:', error);
  }
}

function getStoredAnnouncementCommentReactions(): AnnouncementCommentReaction[] {
  try {
    const stored = localStorage.getItem(ANNOUNCEMENT_COMMENT_REACTIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function setStoredAnnouncementCommentReactions(reactions: AnnouncementCommentReaction[]): void {
  try {
    localStorage.setItem(ANNOUNCEMENT_COMMENT_REACTIONS_KEY, JSON.stringify(reactions));
  } catch (error) {
    console.error('Failed to store announcement comment reactions:', error);
  }
}

export function useGetAnnouncementReactions() {
  return useMutation({
    mutationFn: async (announcementId: string): Promise<AnnouncementReaction[]> => {
      const reactions = getStoredAnnouncementReactions();
      return reactions.filter(r => r.announcementId === announcementId);
    },
  });
}

export function useReactToAnnouncement() {
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ announcementId, reaction }: { announcementId: string; reaction: string }) => {
      if (!identity) throw new Error('Identity not available');

      const reactions = getStoredAnnouncementReactions();
      const userPrincipal = identity.getPrincipal().toString();

      // single reaction per user per announcement
      const filtered = reactions.filter(r => !(r.announcementId === announcementId && r.user === userPrincipal));

      const newReaction: AnnouncementReaction = {
        id: `reaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        announcementId,
        user: userPrincipal,
        reaction,
        timestamp: Date.now(),
      };

      filtered.push(newReaction);
      setStoredAnnouncementReactions(filtered);

      return newReaction;
    },
    onSuccess: (_res, vars) => {
      queryClient.invalidateQueries({ queryKey: ['announcementReactions', vars.announcementId] });
    },
  });
}

export function useGetAnnouncementCommentReactions() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (commentId: string): Promise<AnnouncementCommentReaction[]> => {
      if (!actor) throw new Error('Actor not available');

      try {
        // Use backend function to get comment reactions
        // @ts-ignore depends on your candid
        const backendReactions = await actor.getCommentReactions(BigInt(commentId));
        return backendReactions.map((reaction: any) => ({
          id: `${reaction.commentId.toString()}_${reaction.user.toString()}_${reaction.reactionType}`,
          commentId: reaction.commentId.toString(),
          user: reaction.user.toString(),
          reaction: reaction.reactionType,
          timestamp: Number(reaction.timestamp / BigInt(1_000_000)), // ns -> ms
        }));
      } catch (error) {
        console.warn('Backend comment reactions not available, using localStorage fallback:', error);
        const reactions = getStoredAnnouncementCommentReactions();
        return reactions.filter(r => r.commentId === commentId);
      }
    },
  });
}

export function useReactToAnnouncementComment() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, reaction }: { commentId: string; reaction: string }) => {
      if (!identity) throw new Error('Identity not available');

      try {
        if (actor) {
          // @ts-ignore depends on your candid
          const result = await actor.addCommentReaction(BigInt(commentId), reaction);
          return {
            success: true,
            commentId,
            reaction,
            userPrincipal: identity.getPrincipal().toString(),
            backend: true,
            result,
            replacedPrevious: true,
          };
        }
      } catch (error) {
        console.warn('Backend comment reaction not available, using localStorage fallback:', error);
      }

      // Fallback: single reaction per user per comment enforced locally
      const reactions = getStoredAnnouncementCommentReactions();
      const userPrincipal = identity.getPrincipal().toString();
      const filtered = reactions.filter(r => !(r.commentId === commentId && r.user === userPrincipal));

      const newReaction: AnnouncementCommentReaction = {
        id: `reaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        commentId,
        user: userPrincipal,
        reaction,
        timestamp: Date.now(),
      };

      filtered.push(newReaction);
      setStoredAnnouncementCommentReactions(filtered);

      return {
        success: true,
        commentId,
        reaction,
        userPrincipal,
        backend: false,
        replacedPrevious: true,
      };
    },
    onSuccess: (_res, vars) => {
      queryClient.invalidateQueries({ queryKey: ['announcementCommentReactions', vars.commentId] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['notifications'] });
      }, 100);
    },
  });
}

// Default export for any code that does: `import useAnnouncements from './useAnnouncements'`
export default useAnnouncements;