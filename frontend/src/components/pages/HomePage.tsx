import React, { useState } from 'react';
import { UserProfile } from '../../backend';
import { Users, Calendar, MessageCircle, Bell, Megaphone, Plus, ArrowRight, Zap, UserPlus, CheckCircle, ThumbsUp, Sparkles, Star, Shield, Crown, ClipboardList, UserCheck, Trophy } from 'lucide-react';
import { useGetUserClubs } from '../../hooks/useClubs';
import { useGetUpcomingEvents } from '../../hooks/useEvents';
import { useGetRecentMessages } from '../../hooks/useMessages';
import { useGetNotifications } from '../../hooks/useNotifications';
import { useGetRecentAnnouncements } from '../../hooks/useAnnouncements';
import { useIsCurrentUserAdmin } from '../../hooks/useUsers';
import { useUserRoles } from '../../hooks/useRoles';
import ClubCreateModal from '../ClubCreateModal';
import JoinTeamModal from '../JoinTeamModal';
import BrowseEventsModal from '../BrowseEventsModal';
import AnnouncementCreateModal from '../AnnouncementCreateModal';
import AnnouncementThreadModal from '../AnnouncementThreadModal';
import NotificationModal from '../NotificationModal';

interface HomePageProps {
  userProfile: UserProfile | null;
}

export default function HomePage({ userProfile }: HomePageProps) {
  const [showCreateClubModal, setShowCreateClubModal] = useState(false);
  const [showJoinTeamModal, setShowJoinTeamModal] = useState(false);
  const [showBrowseEventsModal, setShowBrowseEventsModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null);
  
  const { data: clubs } = useGetUserClubs();
  const { data: upcomingEvents } = useGetUpcomingEvents();
  const { data: recentMessages } = useGetRecentMessages();
  const { data: notifications } = useGetNotifications();
  const { data: recentAnnouncements } = useGetRecentAnnouncements();
  const { data: isAdmin } = useIsCurrentUserAdmin();
  const { userRoles, hasAnnouncementPermissions, getAnnouncementPermissionDetails } = useUserRoles();

  const totalMessages = recentMessages?.length || 0;
  const unreadNotifications = notifications?.filter(n => !n.read).length || 0;
  const thisWeekEvents = upcomingEvents?.filter(e => {
    const eventDate = new Date(Number(e.startTime));
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    return eventDate <= weekFromNow && Number(e.startTime) > Date.now();
  }).length || 0;

  const joinRequestNotifications = notifications?.filter(n => n.type === 'join_request' && !n.read).length || 0;
  const joinResponseNotifications = notifications?.filter(n => n.type === 'join_response' && !n.read).length || 0;
  const approvedJoinResponses = notifications?.filter(n => 
    n.type === 'join_response' && 
    !n.read && 
    (n.message.includes('approved') || n.message.includes('has been approved'))
  ).length || 0;

  // Event-related notifications
  const eventInvitationNotifications = notifications?.filter(n => n.type === 'event_invitation' && !n.read).length || 0;
  const dutyAssignmentNotifications = notifications?.filter(n => n.type === 'duty_assignment' && !n.read).length || 0;
  const eventRsvpNotifications = notifications?.filter(n => n.type === 'event_rsvp' && !n.read).length || 0;

  // Reward-related notifications
  const rewardNotifications = notifications?.filter(n => n.type === 'reward_minted' && !n.read).length || 0;

  // Check if user has team admin or club admin role
  const hasTeamAdminRole = userRoles.some(role => role.role === 'team_admin');
  const hasClubAdminRole = userRoles.some(role => role.role === 'club_admin');

  // Check if user can create announcements
  const canCreateAnnouncements = hasAnnouncementPermissions();
  const announcementPermissionDetails = getAnnouncementPermissionDetails();

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  };

  const formatAnnouncementTime = (timestamp: bigint) => {
    const date = new Date(Number(timestamp / BigInt(1000000)));
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const quickActions = [
    {
      title: 'Create New Club',
      icon: Plus,
      action: () => setShowCreateClubModal(true),
      primary: true,
      description: 'Start your own sports club.'
    },
    {
      title: isAdmin ? 'Join Team' : 'Request Team Access',
      icon: isAdmin ? Users : UserPlus,
      action: () => setShowJoinTeamModal(true),
      description: isAdmin ? 'Join teams directly' : 'Request approval to join a team'
    },
    {
      title: 'Browse Events',
      icon: Calendar,
      action: () => setShowBrowseEventsModal(true),
      description: 'Discover upcoming events'
    }
  ];

  const stats = [
    { label: 'My Clubs', value: clubs?.length || 0, icon: Users, color: 'blue' },
    { label: 'This Week', value: thisWeekEvents, icon: Calendar, color: 'emerald' },
    { label: 'Messages', value: totalMessages, icon: MessageCircle, color: 'purple' },
    { label: 'Notifications', value: unreadNotifications, icon: Bell, color: 'orange' }
  ];

  const handleAnnouncementClick = (announcement: any) => {
    setSelectedAnnouncement(announcement);
  };

  const handleDutyNotificationClick = (eventId: string, dutyRole?: string) => {
    // This function will be passed to NotificationModal
    console.log('Navigate to duty:', eventId, dutyRole);
  };

  const handleRewardNotificationClick = (rewardId: string) => {
    // This function will be passed to NotificationModal
    console.log('Navigate to reward:', rewardId);
  };

  const handleClubChatNotificationClick = (clubId: string) => {
    // This function will be passed to NotificationModal
    console.log('Navigate to club chat:', clubId);
  };

  const handleChatThreadNotificationClick = (threadId: string) => {
    // This function will be passed to NotificationModal
    console.log('Navigate to chat thread:', threadId);
  };

  return (
    <div className="p-4 space-y-6 pb-24">
      <div className="card p-6 bg-gradient-to-br from-emerald-500/10 via-slate-900/50 to-slate-900/50 border-emerald-500/20">
        <div className="flex items-center space-x-4">
          <div className="avatar-lg bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg">
            {userProfile?.name ? (
              <span className="text-white text-xl font-bold">
                {userProfile.name.charAt(0).toUpperCase()}
              </span>
            ) : (
              <Zap className="w-8 h-8 text-white" />
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-100 mb-1">
              Good {getTimeOfDay()}, {userProfile?.name || 'User'}!
            </h2>
            <p className="text-emerald-400 font-medium">
              Ready to manage your sports activities today?
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-100">Quick Actions</h3>
        <div className="grid grid-cols-1 gap-3">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              className={`card p-6 text-left hover:bg-slate-800/50 transition-all duration-200 group w-full ${
                action.primary ? 'bg-emerald-500/10 border-emerald-500/20' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    action.primary 
                      ? 'bg-emerald-500/20' 
                      : 'bg-blue-500/20'
                  }`}>
                    <action.icon className={`w-6 h-6 ${
                      action.primary 
                        ? 'text-emerald-400' 
                        : 'text-blue-400'
                    } group-hover:scale-110 transition-transform`} />
                  </div>
                  <div>
                    <h4 className={`font-semibold text-lg ${
                      action.primary 
                        ? 'text-emerald-400' 
                        : 'text-blue-400'
                    } group-hover:text-emerald-400 transition-colors`}>
                      {action.title}
                    </h4>
                    <p className="text-slate-400 group-hover:text-slate-300 transition-colors">
                      {action.description}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`stat-card bg-gradient-to-br from-${color}-500/10 to-slate-900/50 border-${color}-500/20`}>
            <div className="flex items-center justify-center mb-3">
              <Icon className={`w-6 h-6 text-${color}-400`} />
            </div>
            <div className="stat-value">{value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Enhanced Event Invitation Notifications */}
      {eventInvitationNotifications > 0 && (
        <div className="card p-6 bg-gradient-to-br from-blue-500/10 via-emerald-500/5 to-slate-900/50 border-blue-500/20">
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-100 mb-2 flex items-center">
                📅 New Event Invitations
              </h3>
              <p className="text-slate-300 text-sm mb-4">
                You have {eventInvitationNotifications} new event invitation{eventInvitationNotifications !== 1 ? 's' : ''}! 
                You've been automatically invited to upcoming events.
              </p>
              
              <div className="card p-3 bg-blue-500/10 border-blue-500/20 mb-4">
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-blue-400" />
                  <span className="text-blue-400 font-medium text-sm">AUTO-INVITE SYSTEM</span>
                </div>
                <p className="text-blue-300 text-xs">
                  You receive notifications immediately when events are created and you're invited
                </p>
              </div>
              
              <button
                onClick={() => setShowNotificationModal(true)}
                className="btn-primary text-sm"
              >
                <Calendar className="w-4 h-4 mr-2" />
                View Event Invitations
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Duty Assignment Notifications */}
      {dutyAssignmentNotifications > 0 && (
        <div className="card p-6 bg-gradient-to-br from-red-500/10 via-orange-500/5 to-slate-900/50 border-red-500/20">
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center shrink-0">
              <ClipboardList className="w-5 h-5 text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-100 mb-2 flex items-center">
                📋 New Duty Assignments
              </h3>
              <p className="text-slate-300 text-sm mb-4">
                You have {dutyAssignmentNotifications} new duty assignment{dutyAssignmentNotifications !== 1 ? 's' : ''} for game events! 
                Check your responsibilities and coordinate with other duty holders.
              </p>
              
              <div className="card p-3 bg-red-500/10 border-red-500/20 mb-4">
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-red-400" />
                  <span className="text-red-400 font-medium text-sm">GAME DAY DUTIES</span>
                </div>
                <p className="text-red-300 text-xs">
                  You've been assigned specific duties to help organize game day activities
                </p>
              </div>
              
              <button
                onClick={() => setShowNotificationModal(true)}
                className="btn-primary text-sm"
              >
                <ClipboardList className="w-4 h-4 mr-2" />
                View Duty Assignments
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Admin Join Request Notifications - Updated for both team and club admins */}
      {(hasTeamAdminRole || hasClubAdminRole) && joinRequestNotifications > 0 && (
        <div className="card p-6 bg-gradient-to-br from-blue-500/10 via-emerald-500/5 to-slate-900/50 border-blue-500/20">
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-100 mb-2 flex items-center">
                <Crown className="w-5 h-5 text-blue-400 mr-2" />
                Admin: New Join Requests
              </h3>
              <p className="text-slate-300 text-sm mb-4">
                You have {joinRequestNotifications} new join request{joinRequestNotifications !== 1 ? 's' : ''} for your {hasClubAdminRole && hasTeamAdminRole ? 'clubs and teams' : hasClubAdminRole ? 'club teams' : 'teams'}! 
                Users are requesting to join with specific roles.
              </p>
              
              <div className="card p-3 bg-blue-500/10 border-blue-500/20 mb-4">
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-blue-400" />
                  <span className="text-blue-400 font-medium text-sm">ENHANCED ADMIN PERMISSIONS</span>
                </div>
                <p className="text-blue-300 text-xs">
                  {hasClubAdminRole 
                    ? 'As a club admin, you can approve join requests for any team within your club. Team admins can approve requests for their specific teams with full privileges.'
                    : 'As a team admin, you have full privileges to approve join requests for your teams. Club admins can also approve requests for teams within their club.'
                  }
                </p>
              </div>
              
              <button
                onClick={() => setShowNotificationModal(true)}
                className="btn-primary text-sm"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Review Join Requests
              </button>
            </div>
          </div>
        </div>
      )}

      {!isAdmin && !hasTeamAdminRole && !hasClubAdminRole && joinResponseNotifications > 0 && (
        <div className="card p-6 bg-gradient-to-br from-emerald-500/10 via-blue-500/5 to-slate-900/50 border-emerald-500/20">
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center shrink-0">
              <Star className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-100 mb-2">Join Request Updates</h3>
              <p className="text-slate-300 text-sm mb-4">
                You have {joinResponseNotifications} new response{joinResponseNotifications !== 1 ? 's' : ''} to your join requests!
              </p>
              
              {approvedJoinResponses > 0 && (
                <div className="card p-3 bg-emerald-500/10 border-emerald-500/20 mb-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 font-medium text-sm">APPROVED</span>
                  </div>
                  <p className="text-emerald-300 text-xs">
                    {approvedJoinResponses} request{approvedJoinResponses !== 1 ? 's' : ''} approved ✅
                  </p>
                </div>
              )}
              
              <button
                onClick={() => setShowNotificationModal(true)}
                className="btn-primary text-sm"
              >
                <Star className="w-4 h-4 mr-2" />
                View Notifications
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-100 flex items-center">
            <Megaphone className="w-5 h-5 text-orange-400 mr-2" />
            Recent Announcements
          </h3>
          {canCreateAnnouncements && (
            <button
              onClick={() => setShowAnnouncementModal(true)}
              className="p-2 text-orange-400 hover:text-orange-300 rounded-lg hover:bg-slate-800/50 transition-all duration-200"
              title="Create Announcement"
            >
              <Plus className="w-5 h-5" />
            </button>
          )}
        </div>
        
        {!recentAnnouncements || recentAnnouncements.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Megaphone className="w-8 h-8 text-slate-600" />
            </div>
            <h4 className="text-xl font-semibold text-slate-100 mb-3">No Announcements</h4>
            <p className="text-slate-400 font-medium mb-2">No announcements from your clubs and teams</p>
            <p className="text-slate-500 text-sm mb-4">
              {canCreateAnnouncements 
                ? 'Create announcements to keep your teams and clubs informed'
                : 'Announcements from club and team admins will appear here'
              }
            </p>
            
            {canCreateAnnouncements && (
              <button
                onClick={() => setShowAnnouncementModal(true)}
                className="btn-primary text-sm"
              >
                Create First Announcement
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {recentAnnouncements.map((announcement) => (
              <div 
                key={announcement.id.toString()} 
                className="card p-4 hover:bg-slate-800/30 transition-colors cursor-pointer"
                onClick={() => handleAnnouncementClick(announcement)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-slate-100">{announcement.title}</h4>
                  <div className="flex items-center space-x-2">
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs border ${
                      announcement.clubId 
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                    }`}>
                      {announcement.clubId ? (
                        <Crown className="w-3 h-3" />
                      ) : (
                        <Trophy className="w-3 h-3" />
                      )}
                      <span>{announcement.clubId ? 'Club' : 'Team'}</span>
                    </div>
                    <div className="flex items-center text-slate-500 text-xs">
                      {formatAnnouncementTime(announcement.timestamp)}
                    </div>
                  </div>
                </div>
                <p className="text-slate-300 text-sm mb-2 line-clamp-2">
                  {announcement.content}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-xs">
                    {announcement.clubId ? 'Club' : 'Team'}: {(announcement as any).organizationName || 'Unknown'}
                  </span>
                  <div className="flex items-center space-x-2 text-slate-500 text-xs">
                    <MessageCircle className="w-3 h-3" />
                    <span>Click to view thread</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Enhanced Event Notification Summary */}
      {(eventInvitationNotifications > 0 || dutyAssignmentNotifications > 0 || eventRsvpNotifications > 0 || rewardNotifications > 0) && (
        <div className="card p-6 bg-gradient-to-br from-purple-500/10 via-blue-500/5 to-slate-900/50 border-purple-500/20">
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-100 mb-2 flex items-center">
                🎯 Event Activity Summary
              </h3>
              <div className="space-y-2 mb-4">
                {eventInvitationNotifications > 0 && (
                  <p className="text-blue-300 text-sm">
                    📅 {eventInvitationNotifications} new event invitation{eventInvitationNotifications !== 1 ? 's' : ''}
                  </p>
                )}
                {dutyAssignmentNotifications > 0 && (
                  <p className="text-red-300 text-sm">
                    📋 {dutyAssignmentNotifications} new duty assignment{dutyAssignmentNotifications !== 1 ? 's' : ''}
                  </p>
                )}
                {eventRsvpNotifications > 0 && (
                  <p className="text-green-300 text-sm">
                    ✅ {eventRsvpNotifications} new RSVP response{eventRsvpNotifications !== 1 ? 's' : ''} to your events
                  </p>
                )}
                {rewardNotifications > 0 && (
                  <p className="text-purple-300 text-sm">
                    🎁 {rewardNotifications} new reward{rewardNotifications !== 1 ? 's' : ''} minted for you!
                  </p>
                )}
              </div>
              
              <div className="card p-3 bg-purple-500/10 border-purple-500/20 mb-4">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span className="text-purple-400 font-medium text-sm">COMPREHENSIVE EVENT NOTIFICATIONS</span>
                </div>
                <p className="text-purple-300 text-xs">
                  Stay updated on all event-related activities including invitations, duties, and responses
                </p>
              </div>
              
              <button
                onClick={() => setShowNotificationModal(true)}
                className="btn-primary text-sm"
              >
                <Calendar className="w-4 h-4 mr-2" />
                View All Event Notifications
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="text-center py-8">
        <p className="text-slate-500 text-sm">
          © 2025. Built with ❤️ using{' '}
          <a href="https://caffeine.ai" className="text-emerald-400 hover:text-emerald-300 transition-colors">
            caffeine.ai
          </a>
        </p>
      </div>

      {showCreateClubModal && (
        <ClubCreateModal onClose={() => setShowCreateClubModal(false)} />
      )}

      {showJoinTeamModal && (
        <JoinTeamModal onClose={() => setShowJoinTeamModal(false)} />
      )}

      {showBrowseEventsModal && (
        <BrowseEventsModal onClose={() => setShowBrowseEventsModal(false)} />
      )}

      {showAnnouncementModal && (
        <AnnouncementCreateModal onClose={() => setShowAnnouncementModal(false)} />
      )}

      {showNotificationModal && (
        <NotificationModal 
          onClose={() => setShowNotificationModal(false)}
          onDutyNotificationClick={handleDutyNotificationClick}
          onRewardNotificationClick={handleRewardNotificationClick}
          onClubChatNotificationClick={handleClubChatNotificationClick}
          onChatThreadNotificationClick={handleChatThreadNotificationClick}
        />
      )}

      {selectedAnnouncement && (
        <AnnouncementThreadModal
          announcement={selectedAnnouncement}
          onClose={() => setSelectedAnnouncement(null)}
        />
      )}
    </div>
  );
}
