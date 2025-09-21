// Centralized hook exports - optimized and consolidated
export { 
  useGetUserStatus,
  useGetCallerUserProfile, 
  useSaveCallerUserProfile, 
  useIsCurrentUserAdmin,
  useGetCurrentUserRoles,
  useGetUserPoints,
  useRefreshUserPoints,
  useGetUserRewards,
  useRefreshUserRewards,
  useCheckRewardMinting
} from './useUsers';

export { 
  useGetUserClubs, 
  useCreateClub, 
  useDeleteClub, 
  useUpdateClubLogo,
  useGetClubTeams,
  useGetClubEvents,
  useGetClubMembers,
  useGetClubAnnouncements,
  useGetClubUniqueMemberCount
} from './useClubs';

export { 
  useGetAllTeams, 
  useCreateTeam, 
  useDeleteTeam,
  useGetTeamsByClubId,
  useGetTeamMembersByTeamId,
  useGetClubMessageThreads,
  useGetTeamMessageThreads,
  useGetAnnouncementsByTeamId
} from './useTeams';

export { 
  useGetEvents, 
  useGetUpcomingEvents, 
  useCreateEvent, 
  useDeleteEvent,
  useUpdateEventPrivacy,
  useGetEventParticipants,
  useRSVPToEvent,
  useGetEventLineup,
  useSaveEventLineup,
  useCheckDutyCompletion,
  isDutyCompleted,
  getDutyStatusText,
  getDutyStatusColor,
  canDutyBeSwapped,
  getTimeUntilDutyCompletion,
  useGetEventsByTeamId,
  useGetEventsByClubId
} from './useEvents';

export { 
  useGetRecentMessages, 
  useGetChatThreads, 
  useGetChatMessages, 
  useSendMessage, 
  useCreateChatThread, 
  useDeleteChatThread
} from './useMessages';

export { 
  useGetNotifications, 
  useMarkNotificationAsRead, 
  useRefreshNotifications,
  useProcessJoinRequest,
  useCreateDutySwapRequest,
  useGetDutySwapRequests,
  useAcceptDutySwapRequest,
  useCancelDutySwapRequest,
  useClearAllNotifications,
  useNavigateToDuty,
  useNavigateToReward,
  useNavigateToChatThread
} from './useNotifications';

export { 
  useGetCallerChildren, 
  useCreateChild, 
  useUpdateChild, 
  useDeleteChild 
} from './useChildren';

export { 
  useCreateAnnouncement, 
  useGetUserAnnouncements, 
  useGetRecentAnnouncements,
  useDeleteAnnouncement,
  useGetAnnouncementComments,
  useCommentOnAnnouncement,
  useGetAnnouncementReactions,
  useReactToAnnouncement,
  useGetAnnouncementCommentReactions,
  useReactToAnnouncementComment
} from './useAnnouncements';

export { 
  useGetAdminStatistics, 
  useIsStripeConfigured, 
  useSetStripeConfiguration,
  useCreateCheckoutSession
} from './useAdmin';

export { useUserRoles } from './useRoles';
export { useSubmitJoinRequest } from './useJoinRequests';

export { 
  useGenerateMatchDayPost, 
  useGetMatchDayPostsByEventId, 
  useGetAllMatchDayPosts 
} from './useMatchDayPosts';

export {
  useSearchUsers,
  useAddUserToTeam,
  useRemoveUserFromTeam,
  useRemoveTeamRole,
  useAssignClubAdmin,
  useRemoveClubAdmin,
  useGetAllUsers
} from './useUserManagement';

export {
  useCreateBroadcastMessageThread,
  useGetBroadcastMessageThreads,
  useGetAllUsersForBroadcast,
  estimateRecipientCount
} from './useBroadcastMessaging';

export {
  useGetSubscriptionStatus,
  useHasProAccess,
  useUpgradeToProPlan,
  useCancelProSubscription,
  useFeatureAccess,
  useGetAllSubscriptions,
  useCanAccessProFeatures,
  useCanAccessFeature,
  useCanAccessAdvancedChat,
  useCanAccessSocialFeed,
  useCanCreateUnlimitedAnnouncements
} from './useSubscriptions';
