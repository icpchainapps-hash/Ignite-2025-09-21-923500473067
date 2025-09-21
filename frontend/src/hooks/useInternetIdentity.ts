// frontend/src/hooks/useInternetIdentity.ts
// Minimal Internet Identity context + hook (no JSX in this file to keep .ts valid)

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AuthClient, type AuthClientLoginOptions } from '@dfinity/auth-client';
import type { Identity } from '@dfinity/agent';

/* ---------------------------------- Types --------------------------------- */

export interface IIContextValue {
  client: AuthClient | null;
  identity: Identity | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  error: string | null;

  /** Convenience accessor for logs/UI */
  principalText: string | null;

  login: (opts?: Partial<AuthClientLoginOptions>) => Promise<void>;
  logout: () => Promise<void>;
  /** Re-check auth state (e.g., after a tab came back to focus) */
  refresh: () => Promise<void>;
}

/* ---------------------------- Identity Provider --------------------------- */

const IIContext = createContext<IIContextValue | undefined>(undefined);

// Try to respect common envs; fall back to the public II canister
const resolveIdentityProvider = (): string => {
  // Vite style
  const vite = (import.meta as any)?.env;
  if (vite?.VITE_II_URL) return vite.VITE_II_URL as string;
  if (vite?.VITE_IDENTITY_PROVIDER) return vite.VITE_IDENTITY_PROVIDER as string;

  // Window/global hints
  const w = (globalThis as any) as Record<string, any>;
  if (w.II_URL) return String(w.II_URL);
  if (w.IDENTITY_PROVIDER) return String(w.IDENTITY_PROVIDER);

  // DFX local dev commonly exposes Internet Identity on 4943
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    // If you run II locally via dfx deploy internet_identity
    return w.LOCAL_II_URL ?? 'http://localhost:4943?canisterId=rdmx6-jaaaa-aaaaa-aaadq-cai';
  }

  // Production
  return 'https://identity.ic0.app';
};

export function InternetIdentityProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<AuthClient | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [isInitializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mounted = useRef(true);

  const readSession = useCallback(async (c: AuthClient) => {
    try {
      const authed = await c.isAuthenticated();
      if (!mounted.current) return;

      if (authed) {
        const id = c.getIdentity();
        setIdentity(id);
      } else {
        setIdentity(null);
      }
    } catch (e: any) {
      if (!mounted.current) return;
      setError(e?.message ?? String(e));
      setIdentity(null);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;

    (async () => {
      try {
        const c = await AuthClient.create();
        if (!mounted.current) return;
        setClient(c);
        await readSession(c);
      } catch (e: any) {
        if (!mounted.current) return;
        setError(e?.message ?? String(e));
      } finally {
        if (mounted.current) setInitializing(false);
      }
    })();

    return () => {
      mounted.current = false;
    };
  }, [readSession]);

  const login = useCallback(
    async (opts?: Partial<AuthClientLoginOptions>) => {
      setError(null);
      if (!client) {
        setError('AuthClient not ready');
        return;
      }

      const identityProvider = opts?.identityProvider ?? resolveIdentityProvider();

      await new Promise<void>((resolve, reject) => {
        client
          .login({
            identityProvider,
            // 8 hours by default (you can tune this)
            maxTimeToLive:
              (BigInt(8) * BigInt(60) * BigInt(60) * BigInt(1_000_000_000)) as unknown as number,
            onSuccess: async () => {
              try {
                await readSession(client);
                resolve();
              } catch (e) {
                reject(e);
              }
            },
            onError: (err) => {
              setError(typeof err === 'string' ? err : (err as Error)?.message ?? String(err));
              reject(err as unknown as Error);
            },
            ...(opts as AuthClientLoginOptions),
          })
          .catch(reject);
      });
    },
    [client, readSession]
  );

  const logout = useCallback(async () => {
    setError(null);
    if (!client) return;
    try {
      await client.logout();
    } finally {
      if (mounted.current) {
        setIdentity(null);
      }
    }
  }, [client]);

  const refresh = useCallback(async () => {
    if (!client) return;
    await readSession(client);
  }, [client, readSession]);

  const principalText = useMemo(() => {
    try {
      // Some identities (like AnonymousIdentity) may not have getPrincipal
      const p = (identity as any)?.getPrincipal?.();
      return p ? String(p.toText()) : null;
    } catch {
      return null;
    }
  }, [identity]);

  const value: IIContextValue = {
    client,
    identity,
    isAuthenticated: !!identity,
    isInitializing,
    error,
    principalText,
    login,
    logout,
    refresh,
  };

  // IMPORTANT: No JSX here — this file is .ts, not .tsx
  return React.createElement(IIContext.Provider, { value }, children);
}

/* ---------------------------------- Hook ---------------------------------- */

export function useInternetIdentity(): IIContextValue {
  const ctx = useContext(IIContext);
  if (!ctx) {
    throw new Error('useInternetIdentity must be used within <InternetIdentityProvider>');
  }
  return ctx;
}

export default useInternetIdentity;