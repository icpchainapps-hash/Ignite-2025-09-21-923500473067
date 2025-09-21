import { useMutation } from '@tanstack/react-query';
import { useActor } from './useActor';
import { ShoppingItem } from '../backend';

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

