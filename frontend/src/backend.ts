// frontend/src/backend.ts
// Actor factory + shared UI types, with NO dependency on `declarations/backend`.

import type { ActorSubclass } from '@dfinity/agent';
import type { Principal } from '@dfinity/principal';
import { createActorWithConfig, loadConfig } from './config';

/* ============================================================================
 * Actor creation (via config helpers)
 * ========================================================================== */

export type backendInterface = ActorSubclass<any>;

/**
 * Create a typed actor for the backend canister.
 * Note: returns a Promise because configuration (canister id, idl) is loaded first.
 */
export async function createActor(
  id?: string,
  options?: { agentOptions?: { host?: string; fetchRootKey?: boolean; identity?: unknown } }
): Promise<backendInterface> {
  const cfg = await loadConfig();
  return createActorWithConfig(id ?? cfg.canisterId, options) as unknown as backendInterface;
}

/**
 * Helper to fetch the backend canister id when you actually need it.
 * (Use this instead of importing a build-time `canisterId` constant.)
 */
export async function getCanisterId(): Promise<string> {
  const { canisterId } = await loadConfig();
  return canisterId;
}

/**
 * Legacy placeholder so old imports don’t crash at build time.
 * Prefer `getCanisterId()` in new code.
 */
// @ts-expect-error: runtime placeholder; do not use directly
export const canisterId: string = '' as unknown as string;

/* ============================================================================
 * App-wide enums & types referenced by the UI
 * ========================================================================== */

export enum UserRole {
  admin = 'admin',
  user = 'user',
}

export type TeamRole = 'teamAdmin' | 'coach' | 'player' | 'parent';
export type ClubRole = 'clubAdmin';

export interface UserProfile {
  name: string;
  bio?: string;
  avatarUrl?: string;
  isProfileComplete?: boolean;
}

export interface Club {
  id: bigint;
  name: string;
  creator: Principal;
}

export interface Team {
  id: bigint;
  clubId: bigint;
  name: string;
  creator: Principal;
}

export enum EventType {
  game = 'game',
  training = 'training',
  socialEvent = 'socialEvent',
}

export enum RecurrenceFrequency {
  daily = 'daily',
  weekly = 'weekly',
  monthly = 'monthly',
  custom = 'custom',
}

export type RecurrenceRule = {
  frequency: RecurrenceFrequency;
  interval: bigint;       // Nat in milliseconds or unit steps
  endDate?: bigint;       // optional ms since epoch
  occurrences?: bigint;   // optional count
};

export type DutyAssignment = {
  role: string;           // e.g. "BBQ", "Timekeeper"
  assignee: Principal;
};

export interface Event {
  id: bigint;
  title: string;
  description?: string;

  address?: string;
  suburb?: string;
  state?: string;
  postcode?: string;

  clubId: bigint | null;
  teamId: bigint | null;

  startTime: bigint;      // ms since epoch
  endTime: bigint;        // ms since epoch

  recurrenceRule?: RecurrenceRule | null;
  eventType: EventType;

  dutyRoster: DutyAssignment[];
}

export type FileReference = {
  id: string;
  name: string;
  size: number;
  contentType?: string;
  url?: string;
};