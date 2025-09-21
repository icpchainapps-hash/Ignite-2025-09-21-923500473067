import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import { Principal } from '@dfinity/principal';

// Define frontend-only types until backend types are available
export interface BroadcastMessageThread {
  threadId: bigint;
  creator: Principal;
  recipients: Array<Principal>;
  messageContent: string;
  timestamp: bigint;
  recipientCriteria: RecipientCriteria;
}

export interface RecipientCriteria {
  clubIds: Array<bigint>;
  roleTypes: Array<RoleType>;
}

export enum RoleType {
  basicUser = "basicUser",
  clubAdmin = "clubAdmin", 
  teamAdmin = "teamAdmin",
  coach = "coach",
  player = "player",
  parent = "parent",
  appAdmin = "appAdmin"
}

// Frontend-specific types for the hook parameters
export interface BroadcastMessageRequest {
  messageContent: string;
  recipientSelection: {
    clubs: {
      all: boolean;
      selected: string[];
    };
    roles: {
      all: boolean;
      selected: RoleType[];
    };
  };
}

// Hook for creating broadcast message threads
export function useCreateBroadcastMessageThread() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: BroadcastMessageRequest): Promise<BroadcastMessageThread> => {
      if (!actor) throw new Error('Actor not available');
      if (!identity) throw new Error('Identity not available');

      // Convert frontend selection to backend RecipientCriteria
      const recipientCriteria: RecipientCriteria = {
        clubIds: request.recipientSelection.clubs.all 
          ? [] // Empty array means all clubs when all is true
          : request.recipientSelection.clubs.selected.map(id => BigInt(id)),
        roleTypes: request.recipientSelection.roles.all
          ? [] // Empty array means all roles when all is true  
          : request.recipientSelection.roles.selected,
      };

      console.log('Creating broadcast message thread with criteria:', {
        messageContent: request.messageContent,
        recipientCriteria,
        creator: identity.getPrincipal().toString(),
      });

      try {
        // Check if the backend function exists
        if (!('createBroadcastMessageThread' in actor)) {
          throw new Error('Backend broadcast messaging functions are not yet implemented. The createBroadcastMessageThread function needs to be added to the backend and exposed in the Candid interface before this feature can be used.');
        }

        // Call the backend function (this will fail until backend is updated)
        const result = await (actor as any).createBroadcastMessageThread(
          request.messageContent,
          recipientCriteria
        );

        console.log('Broadcast message thread created successfully:', {
          threadId: result.threadId.toString(),
          recipientCount: result.recipients.length,
          messageContent: result.messageContent,
        });

        return result;
      } catch (error) {
        console.error('Failed to create broadcast message thread:', error);
        
        // Check if this is a backend function not implemented error
        if (error instanceof Error && (
          error.message.includes('has no update method') ||
          error.message.includes('createBroadcastMessageThread') ||
          error.message.includes('does not exist') ||
          error.message.includes('not yet implemented')
        )) {
          throw new Error('Backend broadcast messaging functions are not yet implemented. The createBroadcastMessageThread function needs to be added to the backend before this feature can be used.');
        }
        
        // Handle other specific errors
        if (error instanceof Error) {
          if (error.message.includes('Unauthorized')) {
            throw new Error('Only app administrators can create broadcast message threads.');
          } else if (error.message.includes('Invalid criteria')) {
            throw new Error('Invalid recipient selection criteria. Please check your club and role selections.');
          } else {
            throw new Error(`Failed to create broadcast thread: ${error.message}`);
          }
        }
        
        throw new Error('Failed to create broadcast message thread. Please try again.');
      }
    },
    onSuccess: (result) => {
      console.log('Broadcast message thread creation completed successfully:', result);
      
      // Invalidate relevant queries to update the UI
      queryClient.invalidateQueries({ queryKey: ['broadcastMessageThreads'] });
      queryClient.invalidateQueries({ queryKey: ['chatThreads'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      
      // Force immediate refresh for real-time updates
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['broadcastMessageThreads'] });
        queryClient.refetchQueries({ queryKey: ['notifications'] });
      }, 100);
    },
    onError: (error) => {
      console.error('Broadcast message thread creation failed:', error);
    },
  });
}

// Enhanced hook for getting broadcast message threads for the current user
export function useGetBroadcastMessageThreads() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<BroadcastMessageThread[]>({
    queryKey: ['broadcastMessageThreads'],
    queryFn: async () => {
      if (!actor || !identity) throw new Error('Actor or identity not available');

      console.log('Fetching broadcast message threads for user:', {
        userPrincipal: identity.getPrincipal().toString(),
        timestamp: new Date().toISOString(),
      });

      try {
        // Check if the backend function exists
        if (!('getBroadcastMessageThreads' in actor)) {
          console.warn('Backend getBroadcastMessageThreads function not yet implemented, returning empty array');
          return [];
        }

        // Call the backend function (this will fail until backend is updated)
        const threads = await (actor as any).getBroadcastMessageThreads();
        
        console.log('Retrieved broadcast message threads from backend:', {
          threadCount: threads?.length || 0,
          userPrincipal: identity.getPrincipal().toString(),
          threads: threads?.map((t: BroadcastMessageThread) => ({
            threadId: t.threadId.toString(),
            creator: t.creator.toString(),
            recipientCount: t.recipients.length,
            messagePreview: t.messageContent.slice(0, 50) + (t.messageContent.length > 50 ? '...' : ''),
            timestamp: t.timestamp.toString(),
          })) || [],
        });

        // Validate the response structure
        if (!Array.isArray(threads)) {
          console.error('Invalid response from getBroadcastMessageThreads - expected array, got:', typeof threads);
          return [];
        }

        // Validate each thread has the required properties
        const validatedThreads = threads.filter((thread: any) => {
          const isValid = thread && 
            typeof thread.threadId === 'bigint' &&
            thread.creator &&
            Array.isArray(thread.recipients) &&
            typeof thread.messageContent === 'string' &&
            typeof thread.timestamp === 'bigint' &&
            thread.recipientCriteria;

          if (!isValid) {
            console.warn('Invalid broadcast thread structure:', thread);
          }

          return isValid;
        });

        console.log('Validated broadcast message threads:', {
          originalCount: threads.length,
          validatedCount: validatedThreads.length,
          filteredOut: threads.length - validatedThreads.length,
        });

        // Sort by timestamp (newest first)
        validatedThreads.sort((a: BroadcastMessageThread, b: BroadcastMessageThread) => 
          Number(b.timestamp - a.timestamp)
        );

        return validatedThreads || [];
      } catch (error) {
        console.error('Failed to get broadcast message threads:', error);
        
        // Check if this is a backend function not implemented error
        if (error instanceof Error) {
          if (error.message.includes('has no query method') || 
              error.message.includes('getBroadcastMessageThreads') ||
              error.message.includes('does not exist')) {
            console.warn('Backend getBroadcastMessageThreads function not yet implemented, returning empty array');
            return []; // Return empty array when backend function is not available
          }
          
          // Handle authorization errors
          if (error.message.includes('Unauthorized') || error.message.includes('permission')) {
            console.error('User not authorized to access broadcast threads');
            return []; // Return empty array for unauthorized users
          }
          
          // Handle other backend errors
          console.error('Backend error retrieving broadcast threads:', error.message);
          throw new Error(`Failed to retrieve broadcast threads: ${error.message}`);
        }
        
        // For unknown errors, return empty array to prevent UI crashes
        console.warn('Unknown error retrieving broadcast threads, returning empty array:', error);
        return [];
      }
    },
    enabled: !!actor && !actorFetching && !!identity,
    placeholderData: [],
    staleTime: 300000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry if the backend function doesn't exist
      if (error instanceof Error && 
          (error.message.includes('has no query method') || 
           error.message.includes('getBroadcastMessageThreads') ||
           error.message.includes('does not exist'))) {
        return false;
      }
      
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
}

// Hook for getting all users for admin selection (simplified version)
export function useGetAllUsersForBroadcast() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Array<{ principal: Principal; displayName: string; clubs: bigint[]; roles: RoleType[] }>>({
    queryKey: ['allUsersForBroadcast'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      
      try {
        // This would be a dedicated backend function for getting user data for broadcast targeting
        // For now, we'll simulate this by collecting data from existing functions
        const [allClubs, allTeams, allMessages] = await Promise.all([
          actor.getAllClubs(),
          actor.getAllTeams(),
          actor.getAllMessages(),
        ]);
        
        const uniqueUsers = new Set<string>();
        const userResults: Array<{ principal: Principal; displayName: string; clubs: bigint[]; roles: RoleType[] }> = [];
        
        // Collect unique users from various sources
        allClubs.forEach(club => uniqueUsers.add(club.creator.toString()));
        allTeams.forEach(team => uniqueUsers.add(team.creator.toString()));
        allMessages.forEach(message => uniqueUsers.add(message.sender.toString()));
        
        // Get user profiles and build user data
        for (const principalStr of uniqueUsers) {
          try {
            const principal = Principal.fromText(principalStr);
            const profile = await actor.getUserProfile(principal);
            const displayName = profile?.name || principalStr;
            
            userResults.push({
              principal,
              displayName,
              clubs: [], // Would be populated by backend
              roles: [RoleType.basicUser], // Would be populated by backend
            });
          } catch (error) {
            console.warn('Failed to get profile for user:', principalStr, error);
          }
        }
        
        return userResults.sort((a, b) => a.displayName.localeCompare(b.displayName));
      } catch (error) {
        console.error('Failed to get users for broadcast:', error);
        return [];
      }
    },
    enabled: !!actor && !actorFetching,
    placeholderData: [],
    staleTime: 600000, // 10 minutes
  });
}

// Utility function to estimate recipient count based on selection criteria
export function estimateRecipientCount(
  recipientSelection: BroadcastMessageRequest['recipientSelection'],
  allUsers: Array<{ principal: Principal; displayName: string; clubs: bigint[]; roles: RoleType[] }>,
  allClubs: Array<{ id: bigint; name: string }> = []
): number {
  if (!allUsers || allUsers.length === 0) {
    // Fallback estimation when user data is not available
    let estimate = 0;
    
    if (recipientSelection.clubs.all) {
      estimate = allClubs.length * 5; // Estimate 5 users per club
    } else {
      estimate = recipientSelection.clubs.selected.length * 5;
    }
    
    if (!recipientSelection.roles.all) {
      const roleCount = Object.keys(RoleType).length;
      estimate = Math.floor(estimate * (recipientSelection.roles.selected.length / roleCount));
    }
    
    return Math.max(1, estimate);
  }

  // Accurate count based on actual user data
  return allUsers.filter(user => {
    // Check club criteria
    const clubMatch = recipientSelection.clubs.all || 
      recipientSelection.clubs.selected.some(clubId => 
        user.clubs.some(userClubId => userClubId.toString() === clubId)
      );
    
    // Check role criteria  
    const roleMatch = recipientSelection.roles.all ||
      recipientSelection.roles.selected.some(role => user.roles.includes(role));
    
    return clubMatch && roleMatch;
  }).length;
}
