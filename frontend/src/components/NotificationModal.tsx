import React, { useState, useEffect } from 'react';
import { X, Bell, CheckCircle, Clock, Users, Calendar, MessageCircle, Trophy, Gift, Zap, AlertCircle, Loader2, RefreshCw, Trash2, Check, ChevronRight, Crown, User, Heart, ThumbsUp, ArrowRight } from 'lucide-react';
import { useGetNotifications, useMarkNotificationAsRead, useClearAllNotifications, useProcessJoinRequest, useRefreshNotifications } from '../hooks/useNotifications';
import { formatTime } from '../utils/formatters';

interface NotificationModalProps {
  onClose: () => void;
  onDutyNotificationClick: (eventId: string, dutyRole?: string) => void;
  onRewardNotificationClick: (rewardId: string) => void;
  onClubChatNotificationClick: (clubId: string) => void;
  onChatThreadNotificationClick: (threadId: string) => void;
}

export default function NotificationModal({ 
  onClose, 
  onDutyNotificationClick, 
  onRewardNotificationClick, 
  onClubChatNotificationClick, 
  onChatThreadNotificationClick 
}: NotificationModalProps) {
  const { data: notifications, isLoading, error, refetch } = useGetNotifications();
  const { mutate: markAsRead } = useMarkNotificationAsRead();
  const { mutate: clearAll, isPending: isClearing } = useClearAllNotifications();
  const { mutate: processJoinRequest, isPending: isProcessing } = useProcessJoinRequest();
  const refreshNotifications = useRefreshNotifications();
  const [processingRequestIds, setProcessingRequestIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    document.body.classList.add('modal-open');
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    document.body.style.top = '0';
    document.body.style.left = '0';
    
    return () => {
      document.body.classList.remove('modal-open');
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.body.style.top = '';
      document.body.style.left = '';
    };
  }, []);

  const unreadNotifications = notifications?.filter(n => !n.read) || [];
  const readNotifications = notifications?.filter(n => n.read) || [];
  const totalNotifications = notifications?.length || 0;
  const unreadCount = unreadNotifications.length;

  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Handle different notification types
    switch (notification.type) {
      case 'duty_assignment':
      case 'duty_swap_request':
      case 'duty_swap_accepted':
        if (notification.eventId) {
          onDutyNotificationClick(notification.eventId, notification.dutyRole);
          onClose();
        }
        break;
      case 'reward_minted':
        if (notification.rewardId) {
          onRewardNotificationClick(notification.rewardId);
          onClose();
        }
        break;
      case 'club_chat_message':
        if (notification.chatThreadId) {
          onChatThreadNotificationClick(notification.chatThreadId);
          onClose();
        } else if (notification.clubId) {
          onClubChatNotificationClick(notification.clubId);
          onClose();
        }
        break;
      case 'team_chat_message':
      case 'message_reaction':
        if (notification.chatThreadId) {
          onChatThreadNotificationClick(notification.chatThreadId);
          onClose();
        }
        break;
      default:
        // For other notification types, just mark as read
        break;
    }
  };

  const handleJoinRequestAction = async (
    requestId: string, 
    action: 'approve' | 'deny',
    originalNotificationId: string
  ) => {
    if (!requestId || requestId === 'undefined' || requestId === 'null' || requestId === 'unknown') {
      console.error('Invalid request ID for join request action:', requestId);
      return;
    }

    setProcessingRequestIds(prev => new Set(prev).add(requestId));

    try {
      await processJoinRequest({
        requestId,
        action,
        originalNotificationId,
      });
      
      // Force refresh notifications after successful processing
      setTimeout(() => {
        refreshNotifications();
      }, 500);
      
    } catch (error) {
      console.error('Failed to process join request:', error);
    } finally {
      setProcessingRequestIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const handleClearAll = () => {
    clearAll();
  };

  const handleRefresh = () => {
    refetch();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'join_request':
        return <Users className="w-5 h-5 text-blue-400" />;
      case 'join_response':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'event_invitation':
      case 'duty_assignment':
        return <Calendar className="w-5 h-5 text-purple-400" />;
      case 'duty_swap_request':
      case 'duty_swap_accepted':
        return <RefreshCw className="w-5 h-5 text-orange-400" />;
      case 'club_chat_message':
      case 'team_chat_message':
      case 'message_reaction':
        return <MessageCircle className="w-5 h-5 text-emerald-400" />;
      case 'comment_reaction':
      case 'chat_comment_reaction':
        return <Heart className="w-5 h-5 text-pink-400" />;
      case 'reward_minted':
        return <Gift className="w-5 h-5 text-yellow-400" />;
      case 'points_awarded':
        return <Zap className="w-5 h-5 text-emerald-400" />;
      default:
        return <Bell className="w-5 h-5 text-slate-400" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'join_request':
        return 'border-blue-500/20 bg-blue-500/5';
      case 'join_response':
        return 'border-green-500/20 bg-green-500/5';
      case 'event_invitation':
      case 'duty_assignment':
        return 'border-purple-500/20 bg-purple-500/5';
      case 'duty_swap_request':
      case 'duty_swap_accepted':
        return 'border-orange-500/20 bg-orange-500/5';
      case 'club_chat_message':
      case 'team_chat_message':
      case 'message_reaction':
        return 'border-emerald-500/20 bg-emerald-500/5';
      case 'comment_reaction':
      case 'chat_comment_reaction':
        return 'border-pink-500/20 bg-pink-500/5';
      case 'reward_minted':
        return 'border-yellow-500/20 bg-yellow-500/5';
      case 'points_awarded':
        return 'border-emerald-500/20 bg-emerald-500/5';
      default:
        return 'border-slate-600/20 bg-slate-600/5';
    }
  };

  if (error) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-800/50 bg-slate-900/95 backdrop-blur-sm sticky top-0 z-10">
          <h1 className="text-lg font-semibold text-slate-100">Notifications</h1>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-100 mb-3">Failed to Load Notifications</h3>
            <p className="text-slate-400 leading-relaxed mb-6">
              {error instanceof Error ? error.message : 'An error occurred while loading notifications'}
            </p>
            <button
              onClick={handleRefresh}
              className="btn-primary-mobile"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-slate-800/50 bg-slate-900/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <h1 className="text-lg font-semibold text-slate-100">Notifications</h1>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 font-medium">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target disabled:opacity-50"
            title="Refresh notifications"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          {totalNotifications > 0 && (
            <button
              onClick={handleClearAll}
              disabled={isClearing}
              className="p-2 text-slate-400 hover:text-red-400 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target disabled:opacity-50"
              title="Clear all notifications"
            >
              {isClearing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Trash2 className="w-5 h-5" />
              )}
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 pb-32">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="card p-4 animate-pulse">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-slate-700 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-slate-700 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-slate-700 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : totalNotifications === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Bell className="w-8 h-8 text-slate-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-100 mb-3">No Notifications</h3>
              <p className="text-slate-400 leading-relaxed">
                You're all caught up! New notifications will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Unread Notifications */}
              {unreadNotifications.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-slate-300 mb-3 px-1">
                    New ({unreadCount})
                  </h2>
                  <div className="space-y-3">
                    {unreadNotifications.map((notification) => (
                      <NotificationCard
                        key={notification.id}
                        notification={notification}
                        onClick={() => handleNotificationClick(notification)}
                        onJoinRequestAction={handleJoinRequestAction}
                        isProcessing={processingRequestIds.has(notification.requestId || '')}
                        getNotificationIcon={getNotificationIcon}
                        getNotificationColor={getNotificationColor}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Read Notifications */}
              {readNotifications.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-slate-300 mb-3 px-1">
                    Earlier
                  </h2>
                  <div className="space-y-3">
                    {readNotifications.slice(0, 20).map((notification) => (
                      <NotificationCard
                        key={notification.id}
                        notification={notification}
                        onClick={() => handleNotificationClick(notification)}
                        onJoinRequestAction={handleJoinRequestAction}
                        isProcessing={processingRequestIds.has(notification.requestId || '')}
                        getNotificationIcon={getNotificationIcon}
                        getNotificationColor={getNotificationColor}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface NotificationCardProps {
  notification: any;
  onClick: () => void;
  onJoinRequestAction: (requestId: string, action: 'approve' | 'deny', originalNotificationId: string) => void;
  isProcessing: boolean;
  getNotificationIcon: (type: string) => React.ReactNode;
  getNotificationColor: (type: string) => string;
}

function NotificationCard({ 
  notification, 
  onClick, 
  onJoinRequestAction, 
  isProcessing,
  getNotificationIcon,
  getNotificationColor 
}: NotificationCardProps) {
  const isJoinRequest = notification.type === 'join_request';
  const hasValidRequestId = notification.requestId && 
    notification.requestId !== 'undefined' && 
    notification.requestId !== 'null' && 
    notification.requestId !== 'unknown' &&
    /^\d+$/.test(notification.requestId);

  const isClickable = !isJoinRequest && (
    notification.type === 'duty_assignment' ||
    notification.type === 'duty_swap_request' ||
    notification.type === 'duty_swap_accepted' ||
    notification.type === 'reward_minted' ||
    notification.type === 'club_chat_message' ||
    notification.type === 'team_chat_message' ||
    notification.type === 'message_reaction'
  );

  return (
    <div 
      className={`card p-4 border transition-all duration-200 ${
        getNotificationColor(notification.type)
      } ${!notification.read ? 'ring-1 ring-emerald-500/20' : ''} ${
        isClickable ? 'cursor-pointer hover:bg-slate-800/30' : ''
      }`}
      onClick={isClickable ? onClick : undefined}
    >
      <div className="flex items-start space-x-3">
        <div className="shrink-0 mt-0.5">
          {getNotificationIcon(notification.type)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-medium text-slate-100 text-sm leading-tight">
              {notification.title}
            </h4>
            <div className="flex items-center space-x-2 ml-3 shrink-0">
              {!notification.read && (
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              )}
              <span className="text-xs text-slate-500">
                {formatTime(notification.timestamp)}
              </span>
            </div>
          </div>
          
          <p className="text-slate-300 text-sm leading-relaxed mb-3">
            {notification.message}
          </p>

          {/* Enhanced context information */}
          <div className="flex flex-wrap gap-2 mb-3">
            {notification.clubName && (
              <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs border bg-blue-500/10 text-blue-400 border-blue-500/20">
                <Crown className="w-3 h-3" />
                <span>{notification.clubName}</span>
              </div>
            )}
            {notification.teamName && (
              <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs border bg-purple-500/10 text-purple-400 border-purple-500/20">
                <Trophy className="w-3 h-3" />
                <span>{notification.teamName}</span>
              </div>
            )}
            {notification.requestedRole && (
              <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                <User className="w-3 h-3" />
                <span>{notification.requestedRole}</span>
              </div>
            )}
            {notification.senderName && (
              <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs border bg-slate-500/10 text-slate-400 border-slate-500/20">
                <User className="w-3 h-3" />
                <span>{notification.senderName}</span>
              </div>
            )}
            {notification.reactorName && (
              <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs border bg-pink-500/10 text-pink-400 border-pink-500/20">
                <Heart className="w-3 h-3" />
                <span>{notification.reactorName}</span>
              </div>
            )}
          </div>

          {/* Join Request Actions */}
          {isJoinRequest && hasValidRequestId && (
            <div className="flex space-x-3 mt-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onJoinRequestAction(notification.requestId, 'approve', notification.id);
                }}
                disabled={isProcessing}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-400 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Approve
                  </>
                )}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onJoinRequestAction(notification.requestId, 'deny', notification.id);
                }}
                disabled={isProcessing}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-400 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <X className="w-4 h-4 mr-2" />
                    Deny
                  </>
                )}
              </button>
            </div>
          )}

          {/* Join Request Error State */}
          {isJoinRequest && !hasValidRequestId && (
            <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-red-400 text-xs">
                  This join request cannot be processed due to missing or invalid request data.
                </p>
              </div>
            </div>
          )}

          {/* Clickable indicator for actionable notifications */}
          {isClickable && (
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-700/50">
              <span className="text-xs text-slate-500">
                {notification.type === 'duty_assignment' || notification.type === 'duty_swap_request' || notification.type === 'duty_swap_accepted' 
                  ? 'Tap to view event details'
                  : notification.type === 'reward_minted'
                  ? 'Tap to view reward'
                  : notification.type === 'club_chat_message' || notification.type === 'team_chat_message' || notification.type === 'message_reaction'
                  ? 'Tap to open chat'
                  : 'Tap to view details'
                }
              </span>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
