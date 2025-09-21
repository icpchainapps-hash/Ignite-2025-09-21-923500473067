import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import { Team, MessageThread } from '../backend';
import { getRoleText } from '../utils/roleHelpers';

export function useGetAllTeams() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Team[]>({
    queryKey: ['allTeams'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getAllTeams() || [];
    },
    enabled: !!actor && !actorFetching,
    placeholderData: [],
  });
}

export function useCreateTeam() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (teamData: {
      clubId: string;
      name: string;
      description: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      
      const createdTeam = await actor.createTeam(teamData.name, teamData.description, BigInt(teamData.clubId));
      return createdTeam;
    },
    onSuccess: (createdTeam) => {
      queryClient.setQueryData(['allTeams'], (oldTeams: Team[] | undefined) => {
        const currentTeams = oldTeams || [];
        return [...currentTeams, createdTeam];
      });
      
      queryClient.invalidateQueries({ queryKey: ['allTeams'] });
      queryClient.invalidateQueries({ queryKey: ['vaultFolders'] });
      queryClient.invalidateQueries({ queryKey: ['clubTeams', createdTeam.clubId.toString()] });
      
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['allTeams'] });
        queryClient.refetchQueries({ queryKey: ['clubTeams', createdTeam.clubId.toString()] });
      }, 100);
    },
  });
}

export function useDeleteTeam() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();

  return useMutation({
    mutationFn: async (teamId: string) => {
      if (!actor || !identity) throw new Error('Actor or identity not available');
      return actor.deleteTeam(identity.getPrincipal(), BigInt(teamId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allTeams'] });
      queryClient.invalidateQueries({ queryKey: ['vaultFolders'] });
      queryClient.invalidateQueries({ queryKey: ['clubTeams'] });
    },
  });
}

export function useGetTeamsByClubId(clubId?: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Team[]>({
    queryKey: ['clubTeams', clubId || ''],
    queryFn: async () => {
      if (!actor || !clubId) return [];
      return actor.getTeamsByClubId(BigInt(clubId));
    },
    enabled: !!actor && !actorFetching && !!clubId,
    placeholderData: [],
  });
}

interface TeamMember {
  id: string;
  name: string;
  role?: string;
  roles: string[];
  joinedAt: number;
  isCreator?: boolean;
  isChild?: boolean;
  parentId?: string;
  principal: string;
}

export function useGetTeamMembersByTeamId(teamId?: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<TeamMember[]>({
    queryKey: ['teamMembersByTeamId', teamId || ''],
    queryFn: async () => {
      if (!actor || !teamId) return [];
      
      const team = await actor.getTeamById(BigInt(teamId));
      if (!team) throw new Error(`Team with ID ${teamId} was not found.`);
      
      const members: TeamMember[] = [];
      const seenPrincipals = new Set<string>();
      
      try {
        // Backend function getTeamMembersWithDisplayNames is not available
        // Fall back to using team memberships and user profiles
        const memberships = await actor.getTeamMembershipsByTeam(BigInt(teamId));
        
        for (const membership of memberships) {
          const principalStr = membership.user.toString();
          
          if (seenPrincipals.has(principalStr)) {
            continue;
          }
          seenPrincipals.add(principalStr);
          
          try {
            const userProfile = await actor.getUserProfile(membership.user);
            const displayName = userProfile?.name || principalStr;
            const memberRoles = membership.roles || [];
            const roleStrings = memberRoles.map(role => getRoleText(role));
            const primaryRole = roleStrings[0] || 'Player';
            
            members.push({
              id: `${teamId}_${principalStr}`,
              name: displayName,
              role: primaryRole,
              roles: roleStrings,
              joinedAt: Date.now(),
              isCreator: team.creator.toString() === principalStr,
              isChild: false,
              principal: principalStr,
            });
          } catch (error) {
            const memberRoles = membership.roles || [];
            const roleStrings = memberRoles.map(role => getRoleText(role));
            const primaryRole = roleStrings[0] || 'Player';
            
            members.push({
              id: `${teamId}_${principalStr}`,
              name: principalStr,
              role: primaryRole,
              roles: roleStrings,
              joinedAt: Date.now(),
              isCreator: team.creator.toString() === principalStr,
              isChild: false,
              principal: principalStr,
            });
          }
        }
      } catch (error) {
        console.warn('Failed to load team members with display names:', error);
      }
      
      const creatorPrincipalStr = team.creator.toString();
      if (!seenPrincipals.has(creatorPrincipalStr)) {
        seenPrincipals.add(creatorPrincipalStr);
        
        try {
          // Backend function getDisplayName is not available
          // Fall back to user profile
          const creatorProfile = await actor.getUserProfile(team.creator);
          const creatorDisplayName = creatorProfile?.name || creatorPrincipalStr;
          
          members.push({
            id: `${teamId}_${creatorPrincipalStr}`,
            name: creatorDisplayName,
            role: 'Team Admin',
            roles: ['Team Admin'],
            joinedAt: Date.now(),
            isCreator: true,
            isChild: false,
            principal: creatorPrincipalStr,
          });
        } catch (error) {
          members.push({
            id: `${teamId}_${creatorPrincipalStr}`,
            name: creatorPrincipalStr,
            role: 'Team Admin',
            roles: ['Team Admin'],
            joinedAt: Date.now(),
            isCreator: true,
            isChild: false,
            principal: creatorPrincipalStr,
          });
        }
      }
      
      try {
        const allChildren = await actor.getAllChildren();
        const teamChildren = allChildren.filter(child => 
          child.teamId && child.teamId.toString() === teamId
        );
        
        for (const child of teamChildren) {
          const childPrincipalStr = `child_${child.id.toString()}`;
          
          if (seenPrincipals.has(childPrincipalStr)) continue;
          seenPrincipals.add(childPrincipalStr);
          
          members.push({
            id: `${teamId}_child_${child.id.toString()}`,
            name: child.name,
            role: 'Child',
            roles: ['Child'],
            joinedAt: Number(child.dateOfBirth),
            isCreator: false,
            isChild: true,
            parentId: child.parent.toString(),
            principal: childPrincipalStr,
          });
        }
      } catch (error) {
        console.warn('Failed to load children for team:', teamId, error);
      }
      
      return members;
    },
    enabled: !!actor && !actorFetching && !!teamId,
    placeholderData: [],
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

export function useGetAnnouncementsByTeamId() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (teamId: string): Promise<any[]> => {
      if (!actor) throw new Error('Actor not available');
      
      // Backend function getAnnouncementsByTeamId is not available yet
      console.warn('getAnnouncementsByTeamId function not implemented in backend yet');
      return [];
    },
  });
}
