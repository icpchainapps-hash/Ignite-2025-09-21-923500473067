import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';

// Duty Points Hooks - New functionality for duty completion and point system
export interface UserPoints {
  user: string;
  points: number;
  lastUpdated: number;
}

export interface DutyCompletion {
  id: string;
  eventId: string;
  dutyRole: string;
  assignee: string;
  status: 'pending' | 'completed' | 'approved';
  completedAt?: number;
  approvedAt?: number;
  approvedBy?: string;
  pointsAwarded: boolean;
}

// Mock storage keys for localStorage implementation until backend is ready
const USER_POINTS_STORAGE_KEY = 'ignite_user_points';
const DUTY_COMPLETIONS_STORAGE_KEY = 'ignite_duty_completions';

function getStoredUserPoints(): UserPoints[] {
  try {
    const stored = localStorage.getItem(USER_POINTS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    return [];
  }
}

function setStoredUserPoints(points: UserPoints[]): void {
  try {
    localStorage.setItem(USER_POINTS_STORAGE_KEY, JSON.stringify(points));
  } catch (error) {
    console.error('Failed to store user points:', error);
  }
}

function getStoredDutyCompletions(): DutyCompletion[] {
  try {
    const stored = localStorage.getItem(DUTY_COMPLETIONS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    return [];
  }
}

function setStoredDutyCompletions(completions: DutyCompletion[]): void {
  try {
    localStorage.setItem(DUTY_COMPLETIONS_STORAGE_KEY, JSON.stringify(completions));
  } catch (error) {
    console.error('Failed to store duty completions:', error);
  }
}

// Get user's points balance
export function useGetUserPoints() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<number>({
    queryKey: ['userPoints', identity?.getPrincipal().toString() || ''],
    queryFn: async () => {
      if (!identity) return 0;
      
      // TODO: Replace with backend call when available
      // if (!actor) throw new Error('Actor not available');
      // return actor.getUserPoints(identity.getPrincipal());
      
      // Mock implementation using localStorage
      const userPrincipal = identity.getPrincipal().toString();
      const allPoints = getStoredUserPoints();
      const userPoints = allPoints.find(p => p.user === userPrincipal);
      
      return userPoints?.points || 0;
    },
    enabled: !!identity,
    placeholderData: 0,
    staleTime: 30000, // 30 seconds
  });
}

// Mark duty as completed by the assigned user
export function useMarkDutyAsCompleted() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();

  return useMutation({
    mutationFn: async ({ eventId, dutyRole }: {
      eventId: string;
      dutyRole: string;
    }) => {
      if (!identity) throw new Error('Identity not available');
      
      // TODO: Replace with backend call when available
      // if (!actor) throw new Error('Actor not available');
      // return actor.markDutyAsCompleted(BigInt(eventId), dutyRole);
      
      // Mock implementation using localStorage
      const userPrincipal = identity.getPrincipal().toString();
      const completions = getStoredDutyCompletions();
      
      // Check if duty is already completed
      const existingCompletion = completions.find(c => 
        c.eventId === eventId && 
        c.dutyRole === dutyRole && 
        c.assignee === userPrincipal
      );
      
      if (existingCompletion) {
        throw new Error('This duty has already been marked as completed');
      }
      
      const newCompletion: DutyCompletion = {
        id: `completion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        eventId,
        dutyRole,
        assignee: userPrincipal,
        status: 'completed',
        completedAt: Date.now(),
        pointsAwarded: false,
      };
      
      completions.push(newCompletion);
      setStoredDutyCompletions(completions);
      
      console.log(`Duty marked as completed: ${dutyRole} for event ${eventId}`);
      
      return newCompletion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dutyCompletions'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingEvents'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      
      // Force immediate refresh for real-time updates
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['dutyCompletions'] });
        queryClient.refetchQueries({ queryKey: ['notifications'] });
      }, 100);
    },
  });
}

// Approve duty completion by team admin (awards points)
export function useApproveDutyCompletion() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();

  return useMutation({
    mutationFn: async ({ eventId, dutyRole, assignee }: {
      eventId: string;
      dutyRole: string;
      assignee: string;
    }) => {
      if (!identity) throw new Error('Identity not available');
      
      // TODO: Replace with backend call when available
      // if (!actor) throw new Error('Actor not available');
      // return actor.approveDutyCompletion(BigInt(eventId), dutyRole, Principal.fromText(assignee));
      
      // Mock implementation using localStorage
      const adminPrincipal = identity.getPrincipal().toString();
      const completions = getStoredDutyCompletions();
      
      // Find the completion to approve
      const completionIndex = completions.findIndex(c => 
        c.eventId === eventId && 
        c.dutyRole === dutyRole && 
        c.assignee === assignee &&
        c.status === 'completed'
      );
      
      if (completionIndex === -1) {
        throw new Error('Duty completion not found or already approved');
      }
      
      // Update completion status
      completions[completionIndex] = {
        ...completions[completionIndex],
        status: 'approved',
        approvedAt: Date.now(),
        approvedBy: adminPrincipal,
        pointsAwarded: true,
      };
      
      setStoredDutyCompletions(completions);
      
      // Award 5 points to the user
      const allPoints = getStoredUserPoints();
      const userPointsIndex = allPoints.findIndex(p => p.user === assignee);
      
      if (userPointsIndex >= 0) {
        allPoints[userPointsIndex] = {
          ...allPoints[userPointsIndex],
          points: allPoints[userPointsIndex].points + 5,
          lastUpdated: Date.now(),
        };
      } else {
        allPoints.push({
          user: assignee,
          points: 5,
          lastUpdated: Date.now(),
        });
      }
      
      setStoredUserPoints(allPoints);
      
      console.log(`Duty approved and 5 points awarded: ${dutyRole} for ${assignee}`);
      
      return {
        completion: completions[completionIndex],
        pointsAwarded: 5,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['dutyCompletions'] });
      queryClient.invalidateQueries({ queryKey: ['userPoints'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingEvents'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      
      // Force immediate refresh for real-time updates
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['dutyCompletions'] });
        queryClient.refetchQueries({ queryKey: ['userPoints'] });
        queryClient.refetchQueries({ queryKey: ['notifications'] });
      }, 100);
      
      console.log('Duty approval completed successfully:', result);
    },
  });
}

// Get duty completions for an event
export function useGetDutyCompletions() {
  const { actor, isFetching: actorFetching } = useActor();

  return useMutation({
    mutationFn: async (eventId: string): Promise<DutyCompletion[]> => {
      // TODO: Replace with backend call when available
      // if (!actor) throw new Error('Actor not available');
      // return actor.getCompletedDuties(BigInt(eventId));
      
      // Mock implementation using localStorage
      const completions = getStoredDutyCompletions();
      return completions.filter(c => c.eventId === eventId);
    },
  });
}

// Get pending duty approvals for team admin
export function useGetPendingDutyApprovals() {
  const { actor, isFetching: actorFetching } = useActor();

  return useMutation({
    mutationFn: async (teamId: string): Promise<DutyCompletion[]> => {
      // TODO: Replace with backend call when available
      // if (!actor) throw new Error('Actor not available');
      // return actor.getPendingDutyApprovals(BigInt(teamId));
      
      // Mock implementation using localStorage
      const completions = getStoredDutyCompletions();
      return completions.filter(c => c.status === 'completed');
    },
  });
}

// Get all duty completions for admin overview
export function useGetAllDutyCompletions() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<DutyCompletion[]>({
    queryKey: ['dutyCompletions'],
    queryFn: async () => {
      // TODO: Replace with backend call when available
      // if (!actor) throw new Error('Actor not available');
      // return actor.getAllDutyCompletions();
      
      // Mock implementation using localStorage
      return getStoredDutyCompletions();
    },
    enabled: !!actor && !actorFetching,
    placeholderData: [],
    staleTime: 30000, // 30 seconds
  });
}

// Get leaderboard of users by points
export function useGetPointsLeaderboard() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<UserPoints[]>({
    queryKey: ['pointsLeaderboard'],
    queryFn: async () => {
      // TODO: Replace with backend call when available
      // if (!actor) throw new Error('Actor not available');
      // return actor.getPointsLeaderboard();
      
      // Mock implementation using localStorage
      const allPoints = getStoredUserPoints();
      return allPoints.sort((a, b) => b.points - a.points);
    },
    enabled: !!actor && !actorFetching,
    placeholderData: [],
    staleTime: 60000, // 1 minute
  });
}
