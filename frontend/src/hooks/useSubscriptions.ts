// frontend/src/hooks/useSubscriptions.ts
// Centralized subscription/feature-gating + a couple of compatibility helpers.
// This file is self-contained (no ../backend imports).

import { useQuery, useMutation } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';

/* -------------------- Types -------------------- */

export type FeatureScope = 'user' | 'club' | 'team';

export interface FeatureAccess {
  hasAccess: boolean;
  plan?: 'Free' | 'Plus' | 'Pro';
  reason?: string;
}

// Minimal type for checkout items (kept inline)
export type ShoppingItem = { priceId: string; quantity: number };

export interface CheckoutSession {
  id: string;
  url: string;
}

/* For club-scoped subscription lists (used by cancellation modal, etc.) */
export type ClubSubscription = {
  id: string;
  clubId: string;
  plan: 'Free' | 'Plus' | 'Pro';
  status: string; // e.g. 'active' | 'canceled' | 'trialing'
  currentPeriodEnd?: number; // epoch ms, optional
};

/* -------------------- Feature Access -------------------- */

export function useCanAccessFeature(
  feature: string,
  scope: FeatureScope = 'user',
  scopeId?: string
) {
  return useQuery<FeatureAccess>({
    queryKey: ['feature-access', feature, scope, scopeId],
    queryFn: async () => {
      // Allow-list any always-free features here
      const freeAllowed = new Set<string>([
        // 'basic_chat'
      ]);

      if (freeAllowed.has(feature)) {
        return { hasAccess: true, plan: 'Free' };
      }

      // Default gated (until wired to backend/subscriptions)
      return { hasAccess: false, plan: 'Free', reason: 'stubbed' };
    },
    staleTime: 60_000,
  });
}

// Friendly aliases used around the app
export const useFeatureAccess = useCanAccessFeature;
export const useCanAccessProFeatures = () => useCanAccessFeature('pro_features', 'user');
export const useCanAccessAdvancedChat = (scope: FeatureScope = 'club', scopeId?: string) =>
  useCanAccessFeature('advanced_chat', scope, scopeId);
export const useCanAccessSocialFeed = (scope: FeatureScope = 'club', scopeId?: string) =>
  useCanAccessFeature('social_feed', scope, scopeId);
export const useCanCreateUnlimitedAnnouncements = (
  scope: FeatureScope = 'club',
  scopeId?: string
) => useCanAccessFeature('unlimited_announcements', scope, scopeId);

/* -------------------- Subscription Status (stubs) -------------------- */

export function useGetSubscriptionStatus() {
  return useQuery<{ plan: 'Free' | 'Plus' | 'Pro'; status: 'active' | 'canceled' | 'none' }>({
    queryKey: ['subscription-status'],
    queryFn: async () => ({ plan: 'Free', status: 'none' }),
    staleTime: 60_000,
  });
}

export function useHasProAccess() {
  return useQuery<boolean>({
    queryKey: ['has-pro-access'],
    queryFn: async () => false,
    staleTime: 60_000,
  });
}

export function useGetAllSubscriptions() {
  return useQuery<Array<{ id: string; plan: 'Free' | 'Plus' | 'Pro'; status: string }>>({
    queryKey: ['all-subscriptions'],
    queryFn: async () => [],
    staleTime: 60_000,
  });
}

export function useUpgradeToProPlan() {
  return useMutation({
    mutationFn: async (_opts?: { paymentMethodId?: string }) => ({ success: false }),
  });
}

export function useCancelProSubscription() {
  return useMutation({
    mutationFn: async () => ({ success: false }),
  });
}

/* -------------------- Stripe Checkout (via backend actor) -------------------- */

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
    },
  });
}

/* -------------------- Compatibility helpers expected by UI -------------------- */

/**
 * Some screens import `useUpgradeClubToProPlan` from this file.
 * We create/return a Stripe checkout session and hand back the URL.
 */
export function useUpgradeClubToProPlan() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async ({
      clubId,
      priceId = 'pro_default_price', // change if you have a real Stripe price id
    }: {
      clubId: string;
      priceId?: string;
    }): Promise<CheckoutSession> => {
      if (!actor) throw new Error('Actor not available');

      const baseUrl = `${window.location.protocol}//${window.location.host}`;
      const successUrl = `${baseUrl}/payment-success?club=${encodeURIComponent(clubId)}`;
      const cancelUrl = `${baseUrl}/payment-failure`;

      // createCheckoutSession is assumed to exist on your actor
      const raw = await actor.createCheckoutSession(
        [{ priceId, quantity: 1 }],
        successUrl,
        cancelUrl
      );

      // If backend returns JSON string with {id,url}
      try {
        return JSON.parse(raw) as CheckoutSession;
      } catch {
        // Fallback shape if backend returns only a URL
        return { id: 'session', url: String(raw) };
      }
    },
  });
}

/**
 * Some components need to know if the caller is a club admin.
 * We try to resolve this from memberships; fall back to app-admin check.
 */
export function useIsClubAdmin(clubId?: string) {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<boolean>({
    queryKey: ['is-club-admin', clubId],
    enabled: !!actor && !!identity && !!clubId && !isFetching,
    queryFn: async () => {
      if (!actor || !identity || !clubId) return false;

      // If your backend exposes a global admin flag, check it first.
      try {
        const isAppAdmin = await actor.isCallerAdmin?.();
        if (isAppAdmin) return true;
      } catch {
        /* ignore */
      }

      // Then check club memberships for 'clubAdmin'
      try {
        const memberships = await actor.getClubMembershipsByClub(BigInt(clubId));
        const me = identity.getPrincipal().toString();

        return memberships.some((m: any) => {
          const isMe = m.user?.toString?.() === me;
          const roles: any[] = Array.isArray(m.roles) ? m.roles : [];
          const hasClubAdmin = roles.some((r) =>
            typeof r === 'string' ? r === 'clubAdmin' : r?.toString?.() === 'clubAdmin'
          );
          return isMe && hasClubAdmin;
        });
      } catch {
        return false;
      }
    },
    placeholderData: false,
  });
}

/**
 * Needed by SubscriptionCancellationModal: returns the club's subscriptions.
 * Stubbed to an empty list until wired to the backend.
 */
export function useGetAllClubSubscriptions(clubId?: string) {
  const { actor } = useActor(); // reserved for future use
  return useQuery<ClubSubscription[]>({
    queryKey: ['club-subscriptions', clubId],
    queryFn: async () => {
      // TODO: replace with real backend call when available:
      // const list = await actor.getClubSubscriptions(BigInt(clubId!));
      // return transform(list);
      return [];
    },
    enabled: !!clubId,
    staleTime: 60_000,
  });
}

/**
 * Needed by SubscriptionCancellationModal: cancels a club's Pro subscription.
 * Stubbed to a no-op result until a backend endpoint exists.
 */
export function useCancelClubProSubscription() {
  const { actor } = useActor(); // reserved for future use
  return useMutation({
    mutationFn: async ({ clubId }: { clubId: string }) => {
      if (!clubId) throw new Error('clubId is required');

      // TODO: replace with real backend call when implemented, e.g.:
      // const res = await actor.cancelClubProSubscription(BigInt(clubId));
      // return normalize(res);

      return { success: false };
    },
  });
}

/* -------------------- Default export -------------------- */

export default useCanAccessFeature;