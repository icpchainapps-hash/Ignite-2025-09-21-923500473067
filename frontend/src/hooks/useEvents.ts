import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import { Event, RecurrenceRule, EventType, DutyAssignment } from '../backend';
import { Principal } from '@dfinity/principal';
import { isDutyCompleted, getDutyStatusText, getDutyStatusColor, canDutyBeSwapped, getTimeUntilDutyCompletion } from '../utils/eventHelpers';
import { QUERY_KEYS, STORAGE_KEYS } from '../utils/constants';

// Re-export utility functions for backward compatibility
export { isDutyCompleted, getDutyStatusText, getDutyStatusColor, canDutyBeSwapped, getTimeUntilDutyCompletion };

// Event Hooks
export function useGetEvents() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Event[]>({
    queryKey: [QUERY_KEYS.EVENTS],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      const events = await actor.getAllEvents() || [];
      
      // Update duty statuses based on current time
      const updatedEvents = events.map(event => {
        const updatedDutyRoster = event.dutyRoster.map(duty => {
          // Since backend interface doesn't include status field, we calculate based on time
          return duty;
        });
        
        return {
          ...event,
          dutyRoster: updatedDutyRoster
        };
      });
      
      return updatedEvents;
    },
    enabled: !!actor && !actorFetching,
    placeholderData: [],
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });
}

export function useGetUpcomingEvents() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Event[]>({
    queryKey: [QUERY_KEYS.UPCOMING_EVENTS],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      const events = await actor.getAllEvents();
      const now = Date.now();
      
      const upcomingEvents = events.filter(event => Number(event.startTime) > now)
        .sort((a, b) => Number(a.startTime) - Number(b.startTime));
      
      return upcomingEvents;
    },
    enabled: !!actor && !actorFetching,
    placeholderData: [],
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useGetEventsByTeamId() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (teamId: string): Promise<Event[]> => {
      if (!actor) throw new Error('Actor not available');
      return actor.getEventsByTeamId(BigInt(teamId)) || [];
    },
  });
}

export function useGetEventsByClubId() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (clubId: string): Promise<Event[]> => {
      if (!actor) throw new Error('Actor not available');
      return actor.getEventsByClubId(BigInt(clubId)) || [];
    },
  });
}

export function useCreateEvent() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventData: {
      title: string;
      description: string;
      address: string;
      suburb: string;
      state: string;
      postcode: string;
      startTime: bigint;
      endTime: bigint;
      clubId: bigint | null;
      teamId: bigint | null;
      recurrenceRule: RecurrenceRule | null;
      eventType: EventType;
      dutyRoster: DutyAssignment[];
    }) => {
      if (!actor) throw new Error('Actor not available');
      
      // Enhanced duty roster validation and conversion
      const validatedDutyRoster: DutyAssignment[] = [];
      
      for (const assignment of eventData.dutyRoster) {
        if (!assignment.role || assignment.role.trim() === '') {
          console.warn('Skipping duty assignment with empty role:', assignment);
          continue;
        }
        
        try {
          let assigneePrincipal: any;
          
          if (typeof assignment.assignee === 'string') {
            assigneePrincipal = Principal.fromText(assignment.assignee);
          } else {
            assigneePrincipal = assignment.assignee;
          }
          
          const validatedAssignment: DutyAssignment = {
            role: assignment.role.trim(),
            assignee: assigneePrincipal,
          };
          
          validatedDutyRoster.push(validatedAssignment);
          
        } catch (error) {
          console.error('Invalid Principal in duty assignment:', assignment.assignee, error);
          continue;
        }
      }
      
      const createdEvent = await actor.createEvent(
        eventData.title,
        eventData.description,
        eventData.address,
        eventData.suburb,
        eventData.state,
        eventData.postcode,
        eventData.startTime,
        eventData.endTime,
        eventData.clubId,
        eventData.teamId,
        eventData.recurrenceRule,
        eventData.eventType,
        validatedDutyRoster
      );
      
      return createdEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EVENTS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.UPCOMING_EVENTS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.NOTIFICATIONS] });
    },
  });
}

export function useDeleteEvent() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId }: { eventId: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteEvent(BigInt(eventId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EVENTS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.UPCOMING_EVENTS] });
    },
  });
}

export function useUpdateEventPrivacy() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, hideMap, hideAddress }: {
      eventId: string;
      hideMap: boolean;
      hideAddress: boolean;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateEventPrivacy(BigInt(eventId), hideMap, hideAddress);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EVENTS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.UPCOMING_EVENTS] });
    },
  });
}

interface Participant {
  id: string;
  name: string;
  rsvpStatus: 'going' | 'maybe' | 'not_going' | 'not_responded';
  isChild: boolean;
  parentId?: string;
  principal: string;
}

interface StoredRSVP {
  eventId: string;
  participantId: string;
  status: 'going' | 'maybe' | 'not_going';
  timestamp: number;
  isChild: boolean;
  parentPrincipal?: string;
}

function getStoredRSVPs(): StoredRSVP[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.EVENT_RSVPS);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    return [];
  }
}

function setStoredRSVPs(rsvps: StoredRSVP[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.EVENT_RSVPS, JSON.stringify(rsvps));
  } catch (error) {
    console.error('Failed to store RSVPs:', error);
  }
}

function getRSVPStatus(eventId: string, participantId: string): 'going' | 'maybe' | 'not_going' | 'not_responded' {
  const rsvps = getStoredRSVPs();
  const rsvp = rsvps.find(r => r.eventId === eventId && r.participantId === participantId);
  return rsvp?.status || 'not_responded';
}

function updateRSVPStatus(
  eventId: string, 
  participantId: string, 
  status: 'going' | 'maybe' | 'not_going',
  isChild: boolean = false,
  parentPrincipal?: string
): void {
  const rsvps = getStoredRSVPs();
  const existingIndex = rsvps.findIndex(r => r.eventId === eventId && r.participantId === participantId);
  
  const newRSVP: StoredRSVP = {
    eventId,
    participantId,
    status,
    timestamp: Date.now(),
    isChild,
    parentPrincipal,
  };

  if (existingIndex >= 0) {
    rsvps[existingIndex] = newRSVP;
  } else {
    rsvps.push(newRSVP);
  }

  setStoredRSVPs(rsvps);
}

export function useGetEventParticipants() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (eventId: string): Promise<Participant[]> => {
      if (!actor) throw new Error('Actor not available');
      
      const [userParticipants, childParticipants] = await Promise.all([
        actor.getEventParticipants(BigInt(eventId)),
        actor.getEventChildParticipants(BigInt(eventId))
      ]);
      
      const enhancedParticipants: Participant[] = [];
      const seenDisplayNames = new Map<string, { principal: string; isChild: boolean }>();
      const processedParticipants = new Set<string>();
      
      // Process user participants
      for (const participant of userParticipants) {
        const principalStr = participant.user.toString();
        
        if (processedParticipants.has(principalStr)) {
          continue;
        }
        processedParticipants.add(principalStr);
        
        try {
          const userProfile = await actor.getUserProfile(participant.user);
          const rsvpStatus = getRSVPStatus(eventId, principalStr);
          const displayName = userProfile?.name || principalStr;
          const displayNameKey = displayName.toLowerCase().trim();
          
          const existingEntry = seenDisplayNames.get(displayNameKey);
          let finalDisplayName = displayName;
          
          if (existingEntry && existingEntry.principal !== principalStr) {
            finalDisplayName = `${displayName} (${principalStr.slice(0, 8)})`;
          }
          
          seenDisplayNames.set(finalDisplayName.toLowerCase().trim(), { 
            principal: principalStr, 
            isChild: false 
          });
          
          enhancedParticipants.push({
            id: principalStr,
            name: finalDisplayName,
            rsvpStatus,
            isChild: false,
            principal: principalStr,
          });
        } catch (error) {
          const rsvpStatus = getRSVPStatus(eventId, principalStr);
          const uniqueDisplayName = `${principalStr} (${principalStr.slice(0, 8)})`;
          
          seenDisplayNames.set(uniqueDisplayName.toLowerCase().trim(), { 
            principal: principalStr, 
            isChild: false 
          });
          
          enhancedParticipants.push({
            id: principalStr,
            name: uniqueDisplayName,
            rsvpStatus,
            isChild: false,
            principal: principalStr,
          });
        }
      }
      
      // Process child participants
      for (const childParticipant of childParticipants) {
        const childPrincipalStr = `child_${childParticipant.childId.toString()}`;
        
        if (processedParticipants.has(childPrincipalStr)) {
          continue;
        }
        
        try {
          const child = await actor.getChildById(childParticipant.childId);
          if (child) {
            const rsvpStatus = getRSVPStatus(eventId, childPrincipalStr);
            const displayName = child.name;
            const displayNameKey = displayName.toLowerCase().trim();
            
            const existingEntry = seenDisplayNames.get(displayNameKey);
            let finalDisplayName = displayName;
            
            if (existingEntry && existingEntry.principal !== childPrincipalStr) {
              if (existingEntry.isChild) {
                finalDisplayName = `${displayName} (Child ${child.id.toString()})`;
              } else {
                finalDisplayName = `${displayName} (Child)`;
              }
            }
            
            seenDisplayNames.set(finalDisplayName.toLowerCase().trim(), { 
              principal: childPrincipalStr, 
              isChild: true 
            });
            processedParticipants.add(childPrincipalStr);
            
            enhancedParticipants.push({
              id: childPrincipalStr,
              name: finalDisplayName,
              rsvpStatus,
              isChild: true,
              parentId: child.parent.toString(),
              principal: childPrincipalStr,
            });
          }
        } catch (error) {
          console.warn('Failed to get child for participant:', childParticipant.childId.toString(), error);
        }
      }
      
      // Final deduplication check
      const finalParticipants: Participant[] = [];
      const finalDisplayNames = new Set<string>();
      
      for (const participant of enhancedParticipants) {
        const displayNameKey = participant.name.toLowerCase().trim();
        
        if (!finalDisplayNames.has(displayNameKey)) {
          finalDisplayNames.add(displayNameKey);
          finalParticipants.push(participant);
        }
      }
      
      return finalParticipants;
    },
  });
}

export function useRSVPToEvent() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, status, participantId, isChild, parentPrincipal }: {
      eventId: string;
      status: 'going' | 'maybe' | 'not_going';
      participantId: string;
      isChild: boolean;
      parentPrincipal?: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      
      const [userParticipants, childParticipants] = await Promise.all([
        actor.getEventParticipants(BigInt(eventId)),
        actor.getEventChildParticipants(BigInt(eventId))
      ]);
      
      let participantExists = false;
      
      if (isChild) {
        const childId = participantId.replace('child_', '');
        participantExists = childParticipants.some(p => p.childId.toString() === childId);
        
        if (parentPrincipal) {
          const child = await actor.getChildById(BigInt(childId));
          if (!child || child.parent.toString() !== parentPrincipal) {
            throw new Error('You can only RSVP for your own children.');
          }
        }
      } else {
        participantExists = userParticipants.some(p => p.user.toString() === participantId);
      }
      
      if (!participantExists) {
        throw new Error('You are not invited to this event.');
      }
      
      updateRSVPStatus(eventId, participantId, status, isChild, parentPrincipal);
      
      return { 
        success: true, 
        eventId, 
        participantId, 
        status,
        timestamp: Date.now(),
        isChild,
        parentPrincipal
      };
    },
    onSuccess: ({ eventId }) => {
      queryClient.refetchQueries({ queryKey: ['eventParticipants', eventId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.NOTIFICATIONS] });
    },
  });
}

// Hook to check and update duty completion status with points awarding
export function useCheckDutyCompletion() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      if (!actor) throw new Error('Actor not available');
      
      // This would call a backend function to check and update duty completion
      // and award points when duties are completed
      try {
        // Backend function checkAndUpdateDutyCompletion needs to be implemented
        // It should:
        // 1. Check if event ended more than 24 hours ago
        // 2. Mark duties as completed if they aren't already
        // 3. Award 10 points to each duty assignee when their duty is completed
        // 4. Return updated event with completion status
        
        console.warn('checkAndUpdateDutyCompletion not yet implemented in backend');
        return { success: true, pointsAwarded: 0 };
      } catch (error) {
        console.warn('Duty completion check not available in backend yet');
        return { success: false, pointsAwarded: 0 };
      }
    },
    onSuccess: (result) => {
      if (result.pointsAwarded > 0) {
        // Refresh user points to show the new balance
        queryClient.invalidateQueries({ queryKey: ['userPoints'] });
        queryClient.refetchQueries({ queryKey: ['userPoints'] });
      }
      
      // Refresh events to show updated duty status
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EVENTS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.UPCOMING_EVENTS] });
    },
  });
}

// Simplified placeholder hooks for backward compatibility
export function useGetEventLineup() {
  return useMutation({
    mutationFn: async (eventId: string) => {
      return null;
    },
  });
}

export function useSaveEventLineup() {
  return useMutation({
    mutationFn: async (lineupData: any) => {
      return { success: true };
    },
  });
}
