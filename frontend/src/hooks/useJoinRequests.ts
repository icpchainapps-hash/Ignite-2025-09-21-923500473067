import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { TeamRole } from '../backend';

export function useSubmitJoinRequest() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clubId, teamId, requestedRole }: {
      clubId: string;
      teamId: string;
      requestedRole: TeamRole;
    }) => {
      if (!actor) throw new Error('Actor not available');
      
      // Validate inputs before making backend call
      if (!clubId || !teamId || !requestedRole) {
        throw new Error('Missing required information: club ID, team ID, and requested role are all required');
      }
      
      console.log('Starting single role join request submission:', {
        clubId,
        teamId,
        requestedRole,
        timestamp: new Date().toISOString(),
      });
      
      try {
        // Step 1: Verify club and team exist before submitting request
        const [club, team] = await Promise.all([
          actor.getClubById(BigInt(clubId)),
          actor.getTeamById(BigInt(teamId))
        ]);
        
        if (!club) {
          throw new Error(`Club with ID ${clubId} not found. Please refresh the page and try again.`);
        }
        
        if (!team) {
          throw new Error(`Team with ID ${teamId} not found. Please refresh the page and try again.`);
        }
        
        if (team.clubId.toString() !== clubId) {
          throw new Error(`Team "${team.name}" does not belong to club "${club.name}". Please select the correct club and team combination.`);
        }
        
        console.log('Club and team validation passed:', {
          clubName: club.name,
          teamName: team.name,
          clubId: club.id.toString(),
          teamId: team.id.toString(),
        });
        
        // Step 2: Check if user is already a member of this team
        const existingMemberships = await actor.getTeamMembershipsByTeam(BigInt(teamId));
        const existingMembership = existingMemberships.find(m => m.user.toString() === actor.toString());
        
        if (existingMembership) {
          throw new Error(`You are already a member of ${team.name} in ${club.name}. You cannot submit another join request.`);
        }
        
        // Step 3: Check for existing pending requests for this specific team
        const existingRequests = await actor.getJoinRequestsByTeam(BigInt(teamId));
        const pendingRequest = existingRequests.find(r => 
          r.user.toString() === actor.toString() && 
          r.status === 'pending'
        );
        
        if (pendingRequest) {
          throw new Error(`You already have a pending join request for ${team.name} in ${club.name}. Please wait for admin approval.`);
        }
        
        console.log('Membership and request validation passed - no conflicts found');
        
        // Step 4: Submit the join request with the specific requested role only
        // Backend will create a single request with only the requested role
        const result = await actor.submitJoinRequest(BigInt(clubId), BigInt(teamId), requestedRole);
        
        console.log('Single role join request submitted successfully:', {
          requestId: result.id.toString(),
          status: result.status,
          clubId: result.clubId.toString(),
          teamId: result.teamId.toString(),
          user: result.user.toString(),
          requestedRole: result.requestedRole,
          timestamp: result.timestamp.toString(),
        });
        
        // Step 5: Verify the request was created with the exact requested role
        if (!result || !result.id) {
          throw new Error('Join request was not created properly. Please try again.');
        }
        
        if (result.clubId.toString() !== clubId || result.teamId.toString() !== teamId) {
          throw new Error('Join request was created but with incorrect club/team association. Please contact support.');
        }
        
        if (result.requestedRole !== requestedRole) {
          throw new Error(`Join request was created but with incorrect role. Expected: ${requestedRole}, Got: ${result.requestedRole}. Please try again.`);
        }
        
        if (result.status !== 'pending') {
          throw new Error('Join request was created but with incorrect status. Please contact support.');
        }
        
        // Step 6: Verify the request can be retrieved by ID to ensure proper storage
        try {
          const verificationRequest = await actor.getJoinRequestById(result.id);
          if (!verificationRequest) {
            throw new Error('Join request was created but could not be verified in storage. Please contact support.');
          }
          
          if (verificationRequest.id !== result.id) {
            throw new Error('Join request ID mismatch during verification. Please contact support.');
          }
          
          if (verificationRequest.requestedRole !== requestedRole) {
            throw new Error(`Join request role mismatch during verification. Expected: ${requestedRole}, Stored: ${verificationRequest.requestedRole}. Please contact support.`);
          }
          
          console.log('Single role join request storage verification passed:', {
            originalId: result.id.toString(),
            verifiedId: verificationRequest.id.toString(),
            verifiedStatus: verificationRequest.status,
            verifiedClubId: verificationRequest.clubId.toString(),
            verifiedTeamId: verificationRequest.teamId.toString(),
            verifiedRequestedRole: verificationRequest.requestedRole,
            requestedRole: requestedRole,
            roleMatch: verificationRequest.requestedRole === requestedRole,
          });
        } catch (verificationError) {
          console.error('Join request verification failed:', verificationError);
          throw new Error('Join request was created but verification failed. Please contact support if you don\'t receive a response.');
        }
        
        console.log('Single role join request created and verified successfully:', {
          requestId: result.id.toString(),
          clubName: club.name,
          teamName: team.name,
          requestedRole: result.requestedRole,
          status: result.status,
          timestamp: result.timestamp.toString(),
        });
        
        return {
          ...result,
          clubName: club.name,
          teamName: team.name,
        };
        
      } catch (submitError) {
        console.error('Single role join request submission failed:', submitError);
        
        if (submitError instanceof Error) {
          if (submitError.message.includes('already a member')) {
            throw new Error(`You are already a member of the selected team. You cannot submit another join request.`);
          } else if (submitError.message.includes('duplicate request') || submitError.message.includes('pending')) {
            throw new Error(`You already have a pending join request for this team. Please wait for admin approval.`);
          } else if (submitError.message.includes('not found')) {
            throw new Error(`Failed to submit join request: ${submitError.message}. Please refresh the page and try again.`);
          } else if (submitError.message.includes('verification failed')) {
            throw submitError; // Pass through verification errors as-is
          } else {
            throw new Error(`Failed to submit join request: ${submitError.message}`);
          }
        }
        
        throw new Error(`Failed to submit join request. Please try again.`);
      }
    },
    onSuccess: (result) => {
      console.log('Single role join request submission completed successfully:', {
        requestId: result.id.toString(),
        clubName: result.clubName,
        teamName: result.teamName,
        requestedRole: result.requestedRole,
      });
      
      // Invalidate and refresh all relevant queries
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['joinRequests'] });
      queryClient.invalidateQueries({ queryKey: ['teamJoinRequests'] });
      queryClient.invalidateQueries({ queryKey: ['clubJoinRequests'] });
      
      // Force immediate refresh for real-time updates
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['notifications'] });
      }, 100);
      
      // Additional refresh to ensure backend processing is complete
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['notifications'] });
      }, 500);
      
      // Final refresh to ensure all notifications are loaded
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['notifications'] });
      }, 1500);
    },
    onError: (error) => {
      console.error('Single role join request submission failed with error:', error);
    },
  });
}
