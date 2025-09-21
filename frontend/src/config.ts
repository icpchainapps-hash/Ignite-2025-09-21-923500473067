// frontend/src/config.ts

/** -------- Public constants (tweak as needed) -------- */
export const DEFAULT_STORAGE_GATEWAY_URL = 'https://dev-blob.caffeine.ai';
export const DEFAULT_BUCKET_NAME = 'default-bucket';
export const DEFAULT_PROJECT_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Backend canister id. Resolved from:
 *  - Vite env (VITE_CANISTER_ID_BACKEND)
 *  - global/window (CANISTER_ID_BACKEND)
 *  - empty string (caller should handle)
 */
export const CANISTER_ID_BACKEND: string =
  (import.meta as any)?.env?.VITE_CANISTER_ID_BACKEND ??
  (globalThis as any)?.CANISTER_ID_BACKEND ??
  '';

/** Shape some modules expect when reading config */
export type FrontendConfig = {
  STORAGE_GATEWAY_URL: string;
  BUCKET_NAME: string;
  PROJECT_ID: string;
  CANISTER_ID_BACKEND: string;
};

/**
 * Small helper used by blob storage and other modules.
 * Centralizes how the app-level config is loaded.
 */
export function loadConfig(): FrontendConfig {
  return {
    STORAGE_GATEWAY_URL: DEFAULT_STORAGE_GATEWAY_URL,
    BUCKET_NAME: DEFAULT_BUCKET_NAME,
    PROJECT_ID: DEFAULT_PROJECT_ID,
    CANISTER_ID_BACKEND,
  };
}

/** -------- Actor factory expected by hooks/useActor.ts -------- */

export type CreateActorOptions = {
  agentOptions?: {
    host?: string;
    fetchRootKey?: boolean;
    identity?: unknown;
  };
};

import { createActor as createBackendActor } from './backend';
import type { backendInterface } from './backend';

/**
 * Creates a typed backend actor using the configured canister id.
 * This is what hooks/useActor.ts imports and calls.
 */
export function createActorWithConfig(
  options?: CreateActorOptions
): backendInterface {
  return createBackendActor(CANISTER_ID_BACKEND, options);
}