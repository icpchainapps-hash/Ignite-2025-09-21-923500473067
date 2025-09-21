import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { Message, MessageThread } from '../backend';

// Message Hooks
const formatMessageTime = (timestamp: bigint): string => {
  const date = new Date(Number(timestamp / BigInt(1000000)));
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 1) {
    const diffInMinutes = Math.floor(diffInHours * 60);
    return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`;
  } else if (diffInHours < 24) {
    return `Today ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  }
};

interface EnhancedMessage extends Message {
  senderName: string;
  formattedTime: string;
}

export function useGetRecentMessages() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<EnhancedMessage[]>({
    queryKey: ['recentMessages'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      
      const messages = await actor.getAllMessages();
      const enhancedMessages: EnhancedMessage[] = [];
      
      for (const message of messages) {
        try {
          const profile = await actor.getUserProfile(message.sender);
          enhancedMessages.push({
            ...message,
            senderName: profile?.name || message.sender.toString(),
            formattedTime: formatMessageTime(message.timestamp),
          });
        } catch (error) {
          enhancedMessages.push({
            ...message,
            senderName: message.sender.toString(),
            formattedTime: formatMessageTime(message.timestamp),
          });
        }
      }
      
      enhancedMessages.sort((a, b) => Number(b.timestamp - a.timestamp));
      return enhancedMessages;
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useGetChatThreads() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<MessageThread[]>({
    queryKey: ['chatThreads'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      const threads = await actor.getAllMessageThreads();
      return threads.sort((a, b) => Number(b.createdAt - a.createdAt));
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useCreateChatThread() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (threadData: {
      name: string;
      description: string;
      clubId?: string;
      teamId?: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      
      const clubIdBigInt = threadData.clubId ? BigInt(threadData.clubId) : null;
      const teamIdBigInt = threadData.teamId ? BigInt(threadData.teamId) : null;
      
      try {
        return await actor.createMessageThread(
          threadData.name,
          threadData.description,
          clubIdBigInt,
          teamIdBigInt
        );
      } catch (error) {
        // Enhanced error handling to provide detailed authorization information
        if (error instanceof Error) {
          // Parse backend error messages that include club/team access information
          if (error.message.includes('Authorization failed')) {
            // Extract the detailed error message from backend
            throw new Error(error.message);
          }
          // Re-throw other errors as-is
          throw error;
        }
        throw new Error('Failed to create chat thread');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatThreads'] });
      queryClient.invalidateQueries({ queryKey: ['recentMessages'] });
    },
    onError: (error) => {
      console.error('Chat thread creation failed:', error);
      // Error will be handled by the component
    },
  });
}

export function useDeleteChatThread() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (threadId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteMessageThread(BigInt(threadId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatThreads'] });
      queryClient.invalidateQueries({ queryKey: ['recentMessages'] });
    },
    onError: (error) => {
      console.error('Chat thread deletion failed:', error);
    },
  });
}

export function useGetChatMessages() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (threadId: string): Promise<EnhancedMessage[]> => {
      if (!actor) throw new Error('Actor not available');
      
      const messages = await actor.getMessagesByThreadId(BigInt(threadId));
      const enhancedMessages: EnhancedMessage[] = [];
      
      for (const message of messages) {
        try {
          const profile = await actor.getUserProfile(message.sender);
          enhancedMessages.push({
            ...message,
            senderName: profile?.name || message.sender.toString(),
            formattedTime: formatMessageTime(message.timestamp),
          });
        } catch (error) {
          enhancedMessages.push({
            ...message,
            senderName: message.sender.toString(),
            formattedTime: formatMessageTime(message.timestamp),
          });
        }
      }
      
      enhancedMessages.sort((a, b) => Number(a.timestamp - b.timestamp));
      return enhancedMessages;
    },
  });
}

export function useSendMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ message, threadId }: { threadId: string; message: string }) => {
      if (!actor) throw new Error('Actor not available');
      
      console.log('Sending message to thread:', {
        threadId,
        messageLength: message.length,
        timestamp: new Date().toISOString(),
      });
      
      const result = await actor.sendMessage(message, BigInt(threadId));
      
      console.log('Message sent successfully, notifications will be created for all relevant members:', {
        messageId: result.id.toString(),
        threadId,
        sender: result.sender.toString(),
      });
      
      return result;
    },
    onSuccess: (result, variables) => {
      console.log('Message sent successfully, triggering notification updates for all club members:', {
        messageId: result.id.toString(),
        threadId: variables.threadId,
      });
      
      // Invalidate message-related queries
      queryClient.invalidateQueries({ queryKey: ['recentMessages'] });
      queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
      queryClient.invalidateQueries({ queryKey: ['chatThreads'] });
      
      // Immediately refresh notifications to show new message notifications for ALL club members
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      
      // Force an immediate refetch of notifications for real-time updates
      // This ensures all club members see the notification immediately
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['notifications'] });
      }, 100);
      
      // Additional refresh after a short delay to ensure backend processing is complete
      // This ensures the notification system has fully processed the club-wide notifications
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['notifications'] });
      }, 1000);
      
      // Final refresh to ensure all club members have received their notifications
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['notifications'] });
      }, 2000);
    },
  });
}

export function useGetClubMessageThreads() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (clubId: string): Promise<MessageThread[]> => {
      if (!actor) throw new Error('Actor not available');
      return actor.getMessageThreadsByClubId(BigInt(clubId)) || [];
    },
  });
}

export function useGetTeamMessageThreads() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (teamId: string): Promise<MessageThread[]> => {
      if (!actor) throw new Error('Actor not available');
      return actor.getMessageThreadsByTeamId(BigInt(teamId)) || [];
    },
  });
}
