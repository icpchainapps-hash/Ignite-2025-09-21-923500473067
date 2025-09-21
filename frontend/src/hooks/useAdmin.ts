import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { StripeConfiguration, ShoppingItem } from '../backend';

// Admin Hooks
interface AdminStatistics {
  totalUsers: number;
  totalClubs: number;
  totalTeams: number;
  totalFeesCollected: number | null;
  loginStatistics: {
    totalLogins: number | null;
    activeUsers: number | null;
    newUsersThisMonth: number | null;
  };
}

export function useGetAdminStatistics() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<AdminStatistics>({
    queryKey: ['adminStatistics'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      
      const [clubs, teams, allMessages] = await Promise.all([
        actor.getAllClubs(),
        actor.getAllTeams(),
        actor.getAllMessages(),
      ]);

      const uniqueUsers = new Set<string>();
      
      clubs.forEach(club => uniqueUsers.add(club.creator.toString()));
      teams.forEach(team => uniqueUsers.add(team.creator.toString()));
      allMessages.forEach(message => uniqueUsers.add(message.sender.toString()));

      return {
        totalUsers: uniqueUsers.size,
        totalClubs: clubs.length,
        totalTeams: teams.length,
        totalFeesCollected: null,
        loginStatistics: {
          totalLogins: null,
          activeUsers: null,
          newUsersThisMonth: null,
        },
      };
    },
    enabled: !!actor && !actorFetching,
    refetchInterval: 30000,
  });
}

export function useIsStripeConfigured() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['isStripeConfigured'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.isStripeConfigured();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useSetStripeConfiguration() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: StripeConfiguration) => {
      if (!actor) throw new Error('Actor not available');
      await actor.setStripeConfiguration(config);
      return config;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isStripeConfigured'] });
    },
  });
}

// Stripe Checkout
export interface CheckoutSession {
  id: string;
  url: string;
}

export function useCreateCheckoutSession() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (items: ShoppingItem[]): Promise<CheckoutSession> => {
      if (!actor) throw new Error('Actor not available');
      
      const baseUrl = `${window.location.protocol}//${window.location.host}`;
      const successUrl = `${baseUrl}/payment-success`;
      const cancelUrl = `${baseUrl}/payment-failure`;
      
      const result = await actor.createCheckoutSession(items, successUrl, cancelUrl);
      return JSON.parse(result) as CheckoutSession;
    }
  });
}
