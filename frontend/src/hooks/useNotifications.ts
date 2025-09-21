import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import { JoinRequest } from '../backend';

interface NotificationData {
  id: string;
  title: string;
  message: string;
  type: 'event' | 'message' | 'club' | 'announcement' | 'role_request' | 'join_request' | 'join_response' | 'event_invitation' | 'event_rsvp' | 'duty_assignment' | 'duty_swap_request' | 'duty_swap_accepted' | 'reward_minted' | 'points_awarded' | 'club_chat_message' | 'team_chat_message' | 'chat_comment_reaction' | 'comment_reaction' | 'message_reaction';
  timestamp: number;
  read: boolean;
  requestId?: string;
  requestedRole?: string;
  eventId?: string;
  eventTitle?: string;
  swapRequestId?: string;
  dutyRole?: string;
  clubName?: string;
  teamName?: string;
  clubId?: string;
  teamId?: string;
  requesterName?: string;
  messagePreview?: string;
  rewardId?: string;
  pointsAwarded?: number;
  senderName?: string;
  threadId?: string;
  chatThreadId?: string;
  reactorName?: string;
  commentPreview?: string;
  commentId?: string;
  commentAuthor?: string;
  messageId?: string;
  messageAuthor?: string;
}

interface JoinRequestProcessResult {
  success: boolean;
  action: 'approve' | 'deny';
  requestId: string;
  originalNotificationId: string;
  joinRequest: JoinRequest | null;
  clubName: string;
  teamName: string;
  requesterName: string;
  assignedRole?: string;
  backendImplemented: boolean;
}

const NOTIFICATION_READ_STATUS_KEY = 'ignite_notification_read_status';

function getReadNotifications(): Set<string> {
  try {
    const stored = localStorage.getItem(NOTIFICATION_READ_STATUS_KEY);
    return new Set(stored ? JSON.parse(stored) : []);
  } catch (error) {
    return new Set();
  }
}

function markNotificationAsRead(notificationId: string): void {
  try {
    const readNotifications = getReadNotifications();
    readNotifications.add(notificationId);
    localStorage.setItem(NOTIFICATION_READ_STATUS_KEY, JSON.stringify(Array.from(readNotifications)));
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
  }
}

export function useGetNotifications() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<NotificationData[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      
      const notifications: NotificationData[] = [];
      const readNotifications = getReadNotifications();
      
      try {
        const [backendNotifications, allClubs, allTeams, allMessageThreads, allComments] = await Promise.all([
          actor.getNotifications(),
          actor.getAllClubs(),
          actor.getAllTeams(),
          actor.getAllMessageThreads(),
          actor.getAllComments()
        ]);
        
        console.log('Processing notifications from backend:', {
          notificationCount: backendNotifications.length,
          clubCount: allClubs.length,
          teamCount: allTeams.length,
          threadCount: allMessageThreads.length,
          commentCount: allComments.length,
        });
        
        for (const backendNotification of backendNotifications) {
          const message = backendNotification.message;
          let notificationType: NotificationData['type'] = 'join_response';
          let title = 'Notification';
          let eventId: string | undefined;
          let eventTitle: string | undefined;
          let requestId: string | undefined;
          let clubName: string | undefined;
          let teamName: string | undefined;
          let clubId: string | undefined;
          let teamId: string | undefined;
          let requesterName: string | undefined;
          let messagePreview: string | undefined;
          let rewardId: string | undefined;
          let pointsAwarded: number | undefined;
          let swapRequestId: string | undefined;
          let dutyRole: string | undefined;
          let requestedRole: string | undefined;
          let senderName: string | undefined;
          let threadId: string | undefined;
          let chatThreadId: string | undefined;
          let reactorName: string | undefined;
          let commentPreview: string | undefined;
          let commentId: string | undefined;
          let commentAuthor: string | undefined;
          let messageId: string | undefined;
          let messageAuthor: string | undefined;
          
          // Extract chat thread ID from backend notification if available
          if (backendNotification.chatThreadId) {
            chatThreadId = backendNotification.chatThreadId.toString();
          }
          
          // Enhanced message reaction notification processing - UPDATED
          if (message.includes('has reacted to your message')) {
            notificationType = 'message_reaction';
            title = '💬 Message Reaction';
            
            console.log('Processing message reaction notification:', {
              message,
              notificationId: backendNotification.id.toString(),
              timestamp: Number(backendNotification.timestamp / BigInt(1000000))
            });
            
            // Extract reactor name from the message
            // Message format: "[Username] has reacted to your message"
            const reactorMatch = message.match(/^(.+?) has reacted to your message$/);
            if (reactorMatch) {
              reactorName = reactorMatch[1];
              
              console.log('Message reaction notification parsed:', {
                reactorName,
              });
            } else {
              console.warn('Could not parse message reaction notification:', message);
              reactorName = 'Someone';
            }
            
            const notificationId = `backend_${backendNotification.id.toString()}`;
            
            notifications.push({
              id: notificationId,
              title,
              message,
              type: notificationType,
              timestamp: Number(backendNotification.timestamp / BigInt(1000000)),
              read: backendNotification.isRead || readNotifications.has(notificationId),
              reactorName,
              chatThreadId,
            });
            
            console.log('Message reaction notification processed successfully:', {
              notificationId,
              reactorName,
              chatThreadId,
            });
            
            continue;
          }
          
          // Enhanced comment reaction notification processing - CRITICAL for reliable notifications
          if (message.includes('comment received a new reaction')) {
            notificationType = 'comment_reaction';
            title = '💬 Comment Reaction';
            
            console.log('Processing comment reaction notification:', {
              message,
              notificationId: backendNotification.id.toString(),
              timestamp: Number(backendNotification.timestamp / BigInt(1000000))
            });
            
            // Extract reaction emoji from the message
            // Message format: "Your comment received a new reaction: [emoji]"
            const reactionMatch = message.match(/Your comment received a new reaction: (.+)$/);
            if (reactionMatch) {
              const reactionEmoji = reactionMatch[1];
              commentPreview = `Reacted with ${reactionEmoji}`;
              
              console.log('Comment reaction notification parsed:', {
                reactionEmoji,
                commentPreview,
              });
            } else {
              console.warn('Could not parse comment reaction notification:', message);
              commentPreview = 'New reaction';
            }
            
            // For comment reactions, we need to find the comment to get more context
            // Extract comment ID if available in the message or notification
            const commentIdMatch = message.match(/comment (\d+)/i);
            if (commentIdMatch) {
              commentId = commentIdMatch[1];
              
              // Try to find the comment to get author info
              const comment = allComments.find(c => c.id.toString() === commentId);
              if (comment) {
                commentAuthor = comment.author.toString();
                
                // Get comment author display name
                try {
                  const authorProfile = await actor.getUserProfile(comment.author);
                  reactorName = authorProfile?.name || comment.author.toString();
                } catch (error) {
                  console.warn('Could not get comment author profile:', error);
                  reactorName = comment.author.toString();
                }
              }
            }
            
            // If we don't have specific reactor info, use generic
            if (!reactorName) {
              reactorName = 'Someone';
            }
            
            const notificationId = `backend_${backendNotification.id.toString()}`;
            
            notifications.push({
              id: notificationId,
              title,
              message,
              type: notificationType,
              timestamp: Number(backendNotification.timestamp / BigInt(1000000)),
              read: backendNotification.isRead || readNotifications.has(notificationId),
              reactorName,
              commentPreview,
              commentId,
              commentAuthor,
              chatThreadId,
            });
            
            console.log('Comment reaction notification processed successfully:', {
              notificationId,
              reactorName,
              commentPreview,
              commentId,
              commentAuthor,
              chatThreadId,
            });
            
            continue;
          }
          
          // Enhanced chat comment reaction notification processing
          if (message.includes('chat comment received a new reaction')) {
            notificationType = 'chat_comment_reaction';
            title = '💬 Chat Comment Reaction';
            
            console.log('Processing chat comment reaction notification:', message);
            
            // Extract reactor name and reaction from the message
            // Message format: "Your chat comment received a new reaction: [emoji]"
            const reactionMatch = message.match(/Your chat comment received a new reaction: (.+)$/);
            if (reactionMatch) {
              const reactionEmoji = reactionMatch[1];
              
              // For now, we'll use a generic reactor name since the backend doesn't include it
              // This would be enhanced when the backend includes reactor information
              reactorName = 'Someone';
              commentPreview = `Reacted with ${reactionEmoji}`;
              
              console.log('Chat comment reaction notification parsed:', {
                reactorName,
                reactionEmoji,
                commentPreview,
              });
            } else {
              console.warn('Could not parse chat comment reaction notification:', message);
              reactorName = 'Unknown User';
              commentPreview = 'New reaction';
            }
            
            const notificationId = `backend_${backendNotification.id.toString()}`;
            
            notifications.push({
              id: notificationId,
              title,
              message,
              type: notificationType,
              timestamp: Number(backendNotification.timestamp / BigInt(1000000)),
              read: backendNotification.isRead || readNotifications.has(notificationId),
              reactorName,
              commentPreview,
              chatThreadId,
            });
            
            console.log('Chat comment reaction notification processed successfully:', {
              notificationId,
              reactorName,
              commentPreview,
              chatThreadId,
            });
            
            continue;
          }
          
          // Enhanced club chat message notification processing - now handles messages from ANY user
          if (message.includes('has sent a message in club chat')) {
            notificationType = 'club_chat_message';
            title = '💬 Club Chat Message';
            
            console.log('Processing club chat message notification from any user:', message);
            
            // Extract sender name and club name from the message
            // Message format: "[SenderName] has sent a message in club chat [ClubName]"
            const senderMatch = message.match(/^(.+?) has sent a message in club chat (.+)$/);
            if (senderMatch) {
              senderName = senderMatch[1];
              clubName = senderMatch[2];
              
              console.log('Club chat message notification parsed (from any user):', {
                senderName,
                clubName,
              });
            } else {
              console.warn('Could not parse club chat message notification:', message);
              senderName = 'Unknown User';
              clubName = 'Unknown Club';
            }
            
            // Find the club ID by name for navigation
            const club = allClubs.find(c => c.name === clubName);
            if (club) {
              clubId = club.id.toString();
              
              // Find the club's message thread for navigation
              const clubThread = allMessageThreads.find(t => 
                t.clubId && t.clubId.toString() === clubId && !t.teamId
              );
              if (clubThread) {
                chatThreadId = clubThread.id.toString();
              }
            }
            
            const notificationId = `backend_${backendNotification.id.toString()}`;
            
            notifications.push({
              id: notificationId,
              title,
              message,
              type: notificationType,
              timestamp: Number(backendNotification.timestamp / BigInt(1000000)),
              read: backendNotification.isRead || readNotifications.has(notificationId),
              senderName,
              clubName,
              clubId,
              chatThreadId,
            });
            
            console.log('Club chat message notification processed successfully (from any user):', {
              notificationId,
              senderName,
              clubName,
              clubId,
              chatThreadId,
            });
            
            continue;
          }
          
          // Enhanced team chat message notification processing
          if (message.includes('has sent you a message:')) {
            notificationType = 'team_chat_message';
            title = '💬 Team Chat Message';
            
            console.log('Processing team chat message notification:', message);
            
            // Extract sender name and message preview
            const messageMatch = message.match(/(.+) has sent you a message: (.+)$/);
            if (messageMatch) {
              senderName = messageMatch[1];
              messagePreview = messageMatch[2];
              
              console.log('Team chat message notification parsed:', {
                senderName,
                messagePreview,
              });
            } else {
              console.warn('Could not parse team chat message notification:', message);
              senderName = 'Unknown User';
              messagePreview = 'New message';
            }
            
            // For team chat messages, we need to find the team thread
            // Since we don't have team info in the message, we'll use the chatThreadId from backend
            if (backendNotification.chatThreadId) {
              chatThreadId = backendNotification.chatThreadId.toString();
              
              // Try to find the team info from the thread
              const teamThread = allMessageThreads.find(t => 
                t.id.toString() === chatThreadId && t.teamId
              );
              if (teamThread) {
                teamId = teamThread.teamId?.toString();
                const team = allTeams.find(t => t.id === teamThread.teamId);
                if (team) {
                  teamName = team.name;
                }
              }
            }
            
            const notificationId = `backend_${backendNotification.id.toString()}`;
            
            notifications.push({
              id: notificationId,
              title,
              message,
              type: notificationType,
              timestamp: Number(backendNotification.timestamp / BigInt(1000000)),
              read: backendNotification.isRead || readNotifications.has(notificationId),
              senderName,
              messagePreview,
              teamName,
              teamId,
              chatThreadId,
            });
            
            console.log('Team chat message notification processed successfully:', {
              notificationId,
              senderName,
              messagePreview,
              teamName,
              teamId,
              chatThreadId,
            });
            
            continue;
          }
          
          // Enhanced join request notification processing with specific role extraction
          if (message.includes('New join request from')) {
            notificationType = 'join_request';
            title = '🔔 New Join Request';
            
            console.log('Processing single role join request notification:', message);
            
            // First, check if the backend notification already has a requestId field
            if (backendNotification.requestId) {
              requestId = backendNotification.requestId.toString();
              console.log('Request ID found in backend notification field:', requestId);
              
              // Verify the request exists in the backend and extract the specific requested role
              try {
                const verificationRequest = await actor.getJoinRequestById(backendNotification.requestId);
                if (!verificationRequest) {
                  console.error('Join request verification failed - request not found in backend:', requestId);
                  requestId = undefined; // Clear invalid request ID
                } else {
                  console.log('Join request verified successfully from backend field:', {
                    requestId: verificationRequest.id.toString(),
                    status: verificationRequest.status,
                    clubId: verificationRequest.clubId.toString(),
                    teamId: verificationRequest.teamId.toString(),
                    requestedRole: verificationRequest.requestedRole,
                  });
                  
                  // Extract the specific requested role from the verified request
                  requestedRole = verificationRequest.requestedRole.toString();
                }
              } catch (verificationError) {
                console.error('Join request verification failed:', verificationError);
                requestId = undefined; // Clear unverifiable request ID
              }
            } else {
              // Fallback: Extract request ID from message text with multiple robust patterns
              const requestIdPatterns = [
                /Request ID:\s*(\d+)/i,           // Primary pattern: "Request ID: 123"
                /request ID:\s*(\d+)/i,           // Case variation: "request ID: 123"
                /with request ID\s*(\d+)/i,       // Alternative: "with request ID 123"
                /ID:\s*(\d+)/i,                   // Simplified: "ID: 123"
                /request\s+(\d+)/i,               // Fallback: "request 123"
                /\b(\d+)\b(?=\s*$)/               // Last number in message
              ];
              
              let extractedRequestId: string | null = null;
              for (const pattern of requestIdPatterns) {
                const match = message.match(pattern);
                if (match && match[1]) {
                  extractedRequestId = match[1];
                  console.log('Request ID extracted using pattern:', pattern.source, 'ID:', extractedRequestId);
                  break;
                }
              }
              
              // Validate the extracted request ID and get the specific requested role
              if (extractedRequestId && /^\d+$/.test(extractedRequestId)) {
                requestId = extractedRequestId;
                
                // Verify the request exists in the backend and extract the specific role
                try {
                  const verificationRequest = await actor.getJoinRequestById(BigInt(requestId));
                  if (!verificationRequest) {
                    console.error('Join request verification failed - request not found in backend:', requestId);
                    requestId = undefined; // Clear invalid request ID
                  } else {
                    console.log('Join request verified successfully from message parsing:', {
                      requestId: verificationRequest.id.toString(),
                      status: verificationRequest.status,
                      clubId: verificationRequest.clubId.toString(),
                      teamId: verificationRequest.teamId.toString(),
                      requestedRole: verificationRequest.requestedRole,
                    });
                    
                    // Extract the specific requested role from the verified request
                    requestedRole = verificationRequest.requestedRole.toString();
                  }
                } catch (verificationError) {
                  console.error('Join request verification failed:', verificationError);
                  requestId = undefined; // Clear unverifiable request ID
                }
              } else {
                console.error('Invalid or missing request ID in join request notification:', message);
                requestId = undefined;
              }
            }
            
            // Extract the specific requested role from the message if not already found
            if (!requestedRole) {
              const rolePatterns = [
                /with requested role\s+([^.\s]+)/i,
                /requested role\s+([^.\s]+)/i,
                /role\s+([^.\s]+)/i,
                /as\s+([^.\s]+)/i
              ];
              
              for (const pattern of rolePatterns) {
                const match = message.match(pattern);
                if (match && match[1]) {
                  requestedRole = match[1].trim();
                  console.log('Requested role extracted from message:', requestedRole);
                  break;
                }
              }
            }
            
            // Extract requester display name from the message
            const requesterNameMatch = message.match(/New join request from\s+([^"]+?)\s+for team/i);
            if (requesterNameMatch) {
              requesterName = requesterNameMatch[1].trim();
              console.log('Requester display name extracted:', requesterName);
            } else {
              console.warn('Could not extract requester display name from message');
              requesterName = 'Unknown User';
            }
            
            // Extract team and club information with enhanced patterns
            const teamIdPatterns = [
              /for team\s+(\d+)/i,
              /team\s+(\d+)/i,
              /teamId\s*:\s*(\d+)/i
            ];
            
            let extractedTeamId: string | null = null;
            for (const pattern of teamIdPatterns) {
              const match = message.match(pattern);
              if (match && match[1]) {
                extractedTeamId = match[1];
                console.log('Team ID extracted using pattern:', pattern.source, 'ID:', extractedTeamId);
                break;
              }
            }
            
            const clubIdPatterns = [
              /in club\s+(\d+)/i,
              /club\s+(\d+)/i,
              /clubId\s*:\s*(\d+)/i
            ];
            
            let extractedClubId: string | null = null;
            for (const pattern of clubIdPatterns) {
              const match = message.match(pattern);
              if (match && match[1]) {
                extractedClubId = match[1];
                console.log('Club ID extracted using pattern:', pattern.source, 'ID:', extractedClubId);
                break;
              }
            }
            
            // Get club and team names with error handling
            if (extractedTeamId) {
              try {
                const team = allTeams.find(t => t.id.toString() === extractedTeamId);
                if (team) {
                  teamName = team.name;
                  teamId = extractedTeamId;
                  
                  // Find the team's message thread for navigation
                  const teamThread = allMessageThreads.find(t => 
                    t.teamId && t.teamId.toString() === extractedTeamId
                  );
                  if (teamThread) {
                    chatThreadId = teamThread.id.toString();
                  }
                  
                  const club = allClubs.find(c => c.id === team.clubId);
                  if (club) {
                    clubName = club.name;
                    clubId = club.id.toString();
                  } else {
                    console.warn('Club not found for team:', team.clubId.toString());
                    clubName = `Unknown Club (ID: ${team.clubId.toString()})`;
                    clubId = team.clubId.toString();
                  }
                } else {
                  console.warn('Team not found for ID:', extractedTeamId);
                  teamName = `Unknown Team (ID: ${extractedTeamId})`;
                  teamId = extractedTeamId;
                }
              } catch (error) {
                console.error('Error resolving team/club names:', error);
                teamName = `Team ${extractedTeamId}`;
                teamId = extractedTeamId;
              }
            }
            
            // If we have club ID but no team ID, try to get club name directly
            if (extractedClubId && !extractedTeamId) {
              try {
                const club = allClubs.find(c => c.id.toString() === extractedClubId);
                if (club) {
                  clubName = club.name;
                  clubId = extractedClubId;
                } else {
                  console.warn('Club not found for ID:', extractedClubId);
                  clubName = `Unknown Club (ID: ${extractedClubId})`;
                  clubId = extractedClubId;
                }
              } catch (error) {
                console.error('Error resolving club name:', error);
                clubName = `Club ${extractedClubId}`;
                clubId = extractedClubId;
              }
            }
            
            const notificationId = `backend_${backendNotification.id.toString()}`;
            
            // Only create notification if we have a valid request ID
            if (requestId && /^\d+$/.test(requestId)) {
              const enhancedMessage = requesterName && teamName && clubName
                ? `${requesterName} wants to join ${teamName} in ${clubName}${requestedRole ? ` as ${requestedRole}` : ''}`
                : `New join request for ${teamName || 'Unknown Team'} in ${clubName || 'Unknown Club'}${requestedRole ? ` as ${requestedRole}` : ''}`;
              
              notifications.push({
                id: notificationId,
                title,
                message: enhancedMessage,
                type: notificationType,
                timestamp: Number(backendNotification.timestamp / BigInt(1000000)),
                read: backendNotification.isRead || readNotifications.has(notificationId),
                requestId,
                requestedRole,
                clubName,
                teamName,
                clubId,
                teamId,
                requesterName,
                chatThreadId,
              });
              
              console.log('Single role join request notification processed successfully:', {
                notificationId,
                requestId,
                requestedRole,
                clubName,
                teamName,
                requesterName,
                enhancedMessage,
                hasBackendRequestId: !!backendNotification.requestId,
                chatThreadId,
              });
            } else {
              console.error('Join request notification rejected - no valid request ID found:', {
                message,
                backendRequestId: backendNotification.requestId,
                extractedRequestId: requestId,
                notificationId: backendNotification.id.toString(),
              });
              // Don't create a notification without a valid request ID
              // This prevents broken notifications from appearing in the UI
            }
            
            continue;
          }
          
          // Process other notification types with improved error handling
          if (message.includes('NFT minted') || message.includes('NFT awarded') || message.includes('sausage sizzle NFT') || message.includes('reward minted') || message.includes('reward awarded')) {
            notificationType = 'reward_minted';
            title = '🎁 Reward Minted!';
            
            const rewardIdMatch = message.match(/(?:NFT|reward) ID: (\w+)/i);
            rewardId = rewardIdMatch ? rewardIdMatch[1] : 'unknown';
          } else if (message.includes('points awarded') || message.includes('duty completed') || message.includes('earned points')) {
            notificationType = 'points_awarded';
            title = '⚡ Points Awarded!';
            
            const pointsMatch = message.match(/(\d+) points/);
            pointsAwarded = pointsMatch ? parseInt(pointsMatch[1]) : 10;
          } else if (message.includes('duty swap request') || message.includes('wants to swap duty')) {
            notificationType = 'duty_swap_request';
            title = '🔄 Duty Swap Request';
            
            const dutyRoleMatch = message.match(/(\w+) duty/);
            const eventTitleMatch = message.match(/for event: (.+)$/);
            
            dutyRole = dutyRoleMatch ? dutyRoleMatch[1] : 'Unknown Duty';
            eventTitle = eventTitleMatch ? eventTitleMatch[1] : 'Unknown Event';
            
            const swapIdMatch = message.match(/swap request (\w+)/);
            swapRequestId = swapIdMatch ? swapIdMatch[1] : backendNotification.id.toString();
          } else if (message.includes('duty swap accepted') || message.includes('duty has been reassigned')) {
            notificationType = 'duty_swap_accepted';
            title = '✅ Duty Swap Completed';
            
            const dutyRoleMatch = message.match(/(\w+) duty/);
            const eventTitleMatch = message.match(/for event: (.+)$/);
            
            dutyRole = dutyRoleMatch ? dutyRoleMatch[1] : 'Unknown Duty';
            eventTitle = eventTitleMatch ? eventTitleMatch[1] : 'Unknown Event';
            
            const swapIdMatch = message.match(/swap request (\w+)/);
            swapRequestId = swapIdMatch ? swapIdMatch[1] : backendNotification.id.toString();
          } else if (message.includes('You have been invited to event:')) {
            notificationType = 'event_invitation';
            title = '📅 Event Invitation';
            
            const eventTitleMatch = message.match(/You have been invited to event: (.+)$/);
            eventTitle = eventTitleMatch ? eventTitleMatch[1] : 'Unknown Event';
          } else if (message.includes('You have been assigned a duty for event:')) {
            notificationType = 'duty_assignment';
            title = '📋 Duty Assignment';
            
            const eventTitleMatch = message.match(/You have been assigned a duty for event: (.+)$/);
            eventTitle = eventTitleMatch ? eventTitleMatch[1] : 'Unknown Event';
          } else if (message.includes('approved') || message.includes('has been approved') || message.includes('denied') || message.includes('has been denied')) {
            if (message.includes('approved') || message.includes('has been approved')) {
              title = '✅ Join Request Approved';
            } else {
              title = '❌ Join Request Denied';
            }
            
            const teamIdMatch = message.match(/team (\d+)/);
            const clubIdMatch = message.match(/club (\d+)/);
            
            if (teamIdMatch && clubIdMatch) {
              const extractedTeamId = teamIdMatch[1];
              const extractedClubId = clubIdMatch[1];
              
              const club = allClubs.find(c => c.id.toString() === extractedClubId);
              const team = allTeams.find(t => t.id.toString() === extractedTeamId);
              
              clubName = club?.name || `Unknown Club (ID: ${extractedClubId})`;
              teamName = team?.name || `Unknown Team (ID: ${extractedTeamId})`;
              clubId = extractedClubId;
              teamId = extractedTeamId;
            }
          } else {
            title = 'Notification';
            notificationType = 'message';
          }
          
          const notificationId = `backend_${backendNotification.id.toString()}`;
          
          notifications.push({
            id: notificationId,
            title,
            message,
            type: notificationType,
            timestamp: Number(backendNotification.timestamp / BigInt(1000000)),
            read: backendNotification.isRead || readNotifications.has(notificationId),
            clubName,
            teamName,
            clubId,
            teamId,
            requestId,
            requestedRole,
            eventId,
            eventTitle,
            swapRequestId,
            dutyRole,
            requesterName,
            messagePreview,
            rewardId,
            pointsAwarded,
            senderName,
            threadId,
            chatThreadId,
            reactorName,
            commentPreview,
            commentId,
            commentAuthor,
            messageId,
            messageAuthor,
          });
        }
        
        console.log('Notification processing completed:', {
          totalProcessed: backendNotifications.length,
          joinRequestNotifications: notifications.filter(n => n.type === 'join_request').length,
          clubChatMessageNotifications: notifications.filter(n => n.type === 'club_chat_message').length,
          teamChatMessageNotifications: notifications.filter(n => n.type === 'team_chat_message').length,
          chatCommentReactionNotifications: notifications.filter(n => n.type === 'chat_comment_reaction').length,
          commentReactionNotifications: notifications.filter(n => n.type === 'comment_reaction').length,
          messageReactionNotifications: notifications.filter(n => n.type === 'message_reaction').length,
          notificationsWithValidRequestId: notifications.filter(n => n.requestId && n.requestId !== 'unknown').length,
          notificationsWithSpecificRole: notifications.filter(n => n.requestedRole && n.requestedRole !== 'unknown').length,
          notificationsWithChatThreadId: notifications.filter(n => n.chatThreadId).length,
          rejectedNotifications: backendNotifications.length - notifications.length,
        });
        
      } catch (error) {
        console.warn('Failed to fetch backend notifications:', error);
      }
      
      notifications.sort((a, b) => b.timestamp - a.timestamp);
      return notifications;
    },
    enabled: !!actor && !actorFetching && !!identity,
    placeholderData: [],
    staleTime: 15000, // Reduced from 30 seconds to 15 seconds for more frequent updates
    refetchInterval: 30000, // Reduced from 60 seconds to 30 seconds for better real-time updates
  });
}

export function useMarkNotificationAsRead() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      // Handle both backend and local notifications
      if (notificationId.startsWith('backend_')) {
        const backendId = notificationId.replace('backend_', '');
        if (actor) {
          try {
            await actor.markNotificationAsRead(BigInt(backendId));
          } catch (error) {
            console.warn('Failed to mark backend notification as read:', error);
          }
        }
      }
      
      // Also mark as read locally for immediate UI updates
      markNotificationAsRead(notificationId);
      return { success: true };
    },
    onSuccess: (_, notificationId) => {
      queryClient.setQueryData(['notifications'], (oldData: NotificationData[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true }
            : notification
        );
      });
      
      // Refetch to ensure backend state is synchronized
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['notifications'] });
      }, 100);
    },
  });
}

export function useClearAllNotifications() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      await actor.clearAllNotifications();
      
      localStorage.removeItem(NOTIFICATION_READ_STATUS_KEY);
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.setQueryData(['notifications'], []);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useRefreshNotifications() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.refetchQueries({ queryKey: ['notifications'] });
  };
}

export function useNavigateToDuty() {
  return useMutation({
    mutationFn: async ({ eventId, dutyRole, activeTabSetter }: { 
      eventId: string; 
      dutyRole?: string;
      activeTabSetter: (tab: 'events') => void;
    }) => {
      activeTabSetter('events');
      sessionStorage.setItem('openEventId', eventId);
      if (dutyRole) {
        sessionStorage.setItem('highlightDutyRole', dutyRole);
      }
      return { success: true, eventId, dutyRole };
    },
  });
}

export function useNavigateToReward() {
  return useMutation({
    mutationFn: async ({ rewardId, activeTabSetter }: { 
      rewardId: string; 
      activeTabSetter: (tab: 'profile') => void;
    }) => {
      sessionStorage.setItem('highlightRewardId', rewardId);
      return { success: true, rewardId };
    },
  });
}

export function useNavigateToClubChat() {
  return useMutation({
    mutationFn: async ({ clubId, activeTabSetter }: { 
      clubId: string; 
      activeTabSetter: (tab: 'messages') => void;
    }) => {
      activeTabSetter('messages');
      sessionStorage.setItem('openClubChatId', clubId);
      return { success: true, clubId };
    },
  });
}

export function useNavigateToChatThread() {
  return useMutation({
    mutationFn: async ({ threadId, activeTabSetter }: { 
      threadId: string; 
      activeTabSetter: (tab: 'messages') => void;
    }) => {
      activeTabSetter('messages');
      sessionStorage.setItem('openThreadId', threadId);
      return { success: true, threadId };
    },
  });
}

export function useProcessJoinRequest() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<JoinRequestProcessResult, Error, {
    requestId: string;
    action: 'approve' | 'deny';
    originalNotificationId: string;
  }>({
    mutationFn: async ({ 
      requestId, 
      action,
      originalNotificationId 
    }) => {
      if (!actor) throw new Error('Actor not available');

      console.log('Processing single role join request with enhanced validation:', {
        requestId,
        action,
        originalNotificationId,
        timestamp: new Date().toISOString(),
      });
      
      // Validate request ID format and existence
      if (!requestId || requestId === 'undefined' || requestId === 'null' || requestId === 'unknown' || !/^\d+$/.test(requestId)) {
        throw new Error(`Invalid join request ID: "${requestId}". The request may have been corrupted or removed.`);
      }
      
      // Step 1: Retrieve the join request by its unique ID with enhanced error handling
      let joinRequest: JoinRequest | null = null;
      
      try {
        console.log('Attempting to retrieve join request by ID:', requestId);
        joinRequest = await actor.getJoinRequestById(BigInt(requestId));
        
        if (!joinRequest) {
          console.error('Join request not found in backend storage:', requestId);
          throw new Error(`Join request with ID ${requestId} does not exist. It may have already been processed or removed by another admin.`);
        }
        
        console.log('Join request retrieved successfully with specific role:', {
          id: joinRequest.id.toString(),
          status: joinRequest.status,
          clubId: joinRequest.clubId.toString(),
          teamId: joinRequest.teamId.toString(),
          user: joinRequest.user.toString(),
          requestedRole: joinRequest.requestedRole,
          timestamp: joinRequest.timestamp.toString(),
        });
        
        // Step 2: Verify the request is still pending
        if (joinRequest.status !== 'pending') {
          console.error('Join request status is not pending:', joinRequest.status);
          throw new Error(`Join request has already been ${joinRequest.status}. Current status: ${joinRequest.status}.`);
        }
        
      } catch (retrievalError) {
        console.error('Failed to retrieve join request by ID:', retrievalError);
        if (retrievalError instanceof Error) {
          throw retrievalError; // Re-throw with original message
        }
        throw new Error(`Unable to find join request with ID ${requestId}. The request may have been removed or processed by another admin.`);
      }

      // Step 3: Get organization names for user feedback with error handling
      let club: any = null;
      let team: any = null;
      let clubName = 'Unknown Club';
      let teamName = 'Unknown Team';
      
      try {
        [club, team] = await Promise.all([
          actor.getClubById(joinRequest.clubId),
          actor.getTeamById(joinRequest.teamId)
        ]);
        
        clubName = club?.name || `Unknown Club (ID: ${joinRequest.clubId.toString()})`;
        teamName = team?.name || `Unknown Team (ID: ${joinRequest.teamId.toString()})`;
        
        console.log('Organization names resolved:', { clubName, teamName });
      } catch (error) {
        console.warn('Failed to resolve organization names:', error);
        // Continue with default names
      }

      // Step 4: Get requester display name with error handling
      let requesterName = 'Unknown User';
      try {
        const requesterProfile = await actor.getUserProfile(joinRequest.user);
        requesterName = requesterProfile?.name || joinRequest.user.toString();
        console.log('Requester display name resolved:', requesterName);
      } catch (error) {
        console.warn('Failed to get requester profile:', error);
        requesterName = joinRequest.user.toString();
      }

      // Step 5: Process the approval/denial with specific role assignment
      try {
        console.log(`Starting ${action} process for single role join request:`, {
          requestId: joinRequest.id.toString(),
          requesterName,
          teamName,
          clubName,
          requestedRole: joinRequest.requestedRole,
        });
        
        if (action === 'approve') {
          await actor.approveJoinRequest(joinRequest.id);
          console.log('Join request approved successfully - user assigned the specific requested role:', joinRequest.requestedRole);
        } else {
          await actor.denyJoinRequest(joinRequest.id);
          console.log('Join request denied successfully via backend');
        }
        
        // Step 6: Verify the status change was applied and role assignment is correct
        try {
          const updatedRequest = await actor.getJoinRequestById(joinRequest.id);
          if (updatedRequest) {
            const expectedStatus = action === 'approve' ? 'approved' : 'denied';
            if (updatedRequest.status !== expectedStatus) {
              console.warn('Status change verification failed:', {
                expected: expectedStatus,
                actual: updatedRequest.status,
              });
            } else {
              console.log('Status change verified successfully:', updatedRequest.status);
              
              // For approved requests, verify the team membership was created with the specific requested role
              if (action === 'approve') {
                try {
                  const teamMemberships = await actor.getTeamMembershipsByTeam(joinRequest.teamId);
                  const userMembership = teamMemberships.find(m => m.user.toString() === joinRequest.user.toString());
                  
                  if (userMembership) {
                    console.log('Team membership verified after approval with specific role:', {
                      userId: userMembership.user.toString(),
                      teamId: userMembership.teamId.toString(),
                      assignedRoles: userMembership.roles,
                      requestedRole: joinRequest.requestedRole,
                      rolesMatch: userMembership.roles.includes(joinRequest.requestedRole),
                    });
                    
                    if (!userMembership.roles.includes(joinRequest.requestedRole)) {
                      console.warn('Specific requested role not found in assigned roles:', {
                        requestedRole: joinRequest.requestedRole,
                        assignedRoles: userMembership.roles,
                      });
                    }
                  } else {
                    console.warn('Team membership not found after approval for user:', joinRequest.user.toString());
                  }
                } catch (membershipError) {
                  console.warn('Could not verify team membership after approval:', membershipError);
                }
              }
            }
          }
        } catch (verificationError) {
          console.warn('Could not verify status change:', verificationError);
        }
        
        // Mark the original notification as read
        markNotificationAsRead(originalNotificationId);

        return { 
          success: true,
          action, 
          requestId,
          originalNotificationId,
          joinRequest,
          clubName,
          teamName,
          requesterName,
          assignedRole: joinRequest.requestedRole.toString(),
          backendImplemented: true,
        };
        
      } catch (backendError) {
        console.error('Backend join request processing failed:', backendError);
        
        if (backendError instanceof Error) {
          if (backendError.message.includes('Unauthorized')) {
            throw new Error(`You don't have permission to ${action} this join request. Only club admins can process join requests for ${teamName} in ${clubName}.`);
          } else if (backendError.message.includes('not found')) {
            throw new Error(`Join request no longer exists. It may have been processed by another admin.`);
          } else if (backendError.message.includes('verification failed')) {
            throw backendError; // Pass through verification errors as-is
          } else {
            throw new Error(`Failed to ${action} join request: ${backendError.message}`);
          }
        }
        
        throw new Error(`Failed to ${action} join request for ${requesterName}. Please try again.`);
      }
    },
    onSuccess: (result) => {
      console.log('Single role join request processing completed successfully:', {
        action: result.action,
        requestId: result.requestId,
        clubName: result.clubName,
        teamName: result.teamName,
        requesterName: result.requesterName,
        assignedRole: result.assignedRole,
      });
      
      // Invalidate and refresh all relevant queries
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['joinRequests'] });
      queryClient.refetchQueries({ queryKey: ['notifications'] });
      
      if (result.action === 'approve' && result.backendImplemented && result.joinRequest) {
        // Refresh membership-related queries when a request is approved with specific role
        queryClient.invalidateQueries({ queryKey: ['teamMemberships'] });
        queryClient.invalidateQueries({ queryKey: ['clubMemberships'] });
        queryClient.invalidateQueries({ queryKey: ['teamMembersByTeamId'] });
        queryClient.invalidateQueries({ queryKey: ['currentUserRoles'] });
        
        // Refresh specific team and club member lists
        queryClient.invalidateQueries({ queryKey: ['teamMembersByTeamId', result.joinRequest.teamId.toString()] });
        queryClient.invalidateQueries({ queryKey: ['clubMemberships', result.joinRequest.clubId.toString()] });
        
        // Force immediate refresh for real-time updates to show the new member with the specific assigned role
        setTimeout(() => {
          queryClient.refetchQueries({ queryKey: ['currentUserRoles'] });
          queryClient.refetchQueries({ queryKey: ['teamMembersByTeamId', result.joinRequest!.teamId.toString()] });
        }, 100);
        
        // Additional refresh to ensure backend processing is complete and specific role assignment is reflected
        setTimeout(() => {
          queryClient.refetchQueries({ queryKey: ['currentUserRoles'] });
          queryClient.refetchQueries({ queryKey: ['teamMembersByTeamId', result.joinRequest!.teamId.toString()] });
        }, 500);
        
        // Final refresh to ensure all UI components show the correct specific role assignment
        setTimeout(() => {
          queryClient.refetchQueries({ queryKey: ['teamMembersByTeamId', result.joinRequest!.teamId.toString()] });
        }, 1000);
      }
    },
    onError: (error) => {
      console.error('Single role join request processing failed with error:', error);
    },
  });
}

export interface DutySwapRequest {
  id: string;
  eventId: string;
  originalAssignee: string;
  requestedRole: string;
  status: 'pending' | 'accepted' | 'cancelled';
  timestamp: number;
  acceptedBy?: string;
}

export function useCreateDutySwapRequest() {
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();
  const { actor } = useActor();

  return useMutation({
    mutationFn: async ({ eventId, role }: {
      eventId: string;
      role: string;
    }) => {
      if (!identity || !actor) throw new Error('Identity or actor not available');
      
      throw new Error('Duty swap creation requires backend implementation. The createDutySwapRequest function needs to be added to the backend to handle duty swap requests and notifications.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dutySwapRequests'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingEvents'] });
      
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['notifications'] });
      }, 500);
      
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['notifications'] });
      }, 1500);
    },
  });
}

export function useGetDutySwapRequests() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<DutySwapRequest[]>({
    queryKey: ['dutySwapRequests'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      
      console.warn('getDutySwapRequests not implemented in backend yet, returning empty array');
      return [];
    },
    enabled: !!actor && !actorFetching,
    placeholderData: [],
    staleTime: 30000,
  });
}

export function useAcceptDutySwapRequest() {
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();
  const { actor } = useActor();

  return useMutation({
    mutationFn: async ({ swapRequestId, eventId }: {
      swapRequestId: string;
      eventId: string;
    }) => {
      if (!identity || !actor) throw new Error('Identity or actor not available');
      
      throw new Error('Duty swap acceptance requires backend implementation. The acceptDutySwapRequest function needs to be added to the backend to handle immediate duty reassignment and ensure all event queries reflect the new assignee.');
    },
    onSuccess: (acceptedSwap) => {
      queryClient.invalidateQueries({ queryKey: ['dutySwapRequests'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingEvents'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['notifications'] });
        queryClient.refetchQueries({ queryKey: ['events'] });
        queryClient.refetchQueries({ queryKey: ['upcomingEvents'] });
      }, 100);
      
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['events'] });
        queryClient.refetchQueries({ queryKey: ['upcomingEvents'] });
      }, 500);
    },
  });
}

export function useCancelDutySwapRequest() {
  const queryClient = useQueryClient();
  const { actor } = useActor();

  return useMutation({
    mutationFn: async ({ swapRequestId }: {
      swapRequestId: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      
      throw new Error('Duty swap cancellation requires backend implementation. The cancelDutySwapRequest function needs to be added to the backend.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dutySwapRequests'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['notifications'] });
      }, 100);
    },
  });
}
