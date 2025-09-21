import React, { useState, useEffect } from 'react';
import { MessageCircle, Search, Plus, Users, Send, ArrowLeft, X, Megaphone, Hash, Bell, CheckCircle, Loader2, Zap, Sparkles, Trash2, AlertTriangle, Crown, Trophy, Shield, Radio, AlertCircle, Lock, Unlock, CreditCard, Smile, Heart, ThumbsUp } from 'lucide-react';
import { useGetRecentMessages, useGetChatThreads, useGetChatMessages, useSendMessage, useCreateChatThread, useDeleteChatThread } from '../../hooks/useMessages';
import { useGetNotifications } from '../../hooks/useNotifications';
import { useUserRoles } from '../../hooks/useRoles';
import { useIsCurrentUserAdmin } from '../../hooks/useUsers';
import { useCanAccessFeature } from '../../hooks/useSubscriptions';
import { useGetBroadcastMessageThreads, type BroadcastMessageThread } from '../../hooks/useBroadcastMessaging';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { MessageThread } from '../../backend';
import ChatThreadCreateModal from '../ChatThreadCreateModal';
import AnnouncementCreateModal from '../AnnouncementCreateModal';
import BroadcastThreadCreateModal from '../BroadcastThreadCreateModal';
import SubscriptionUpgradeModal from '../SubscriptionUpgradeModal';
import ProFeatureGate from '../ProFeatureGate';

interface EnhancedMessageThread extends MessageThread {
  participantCount: number;
  lastMessage?: {
    content: string;
    senderName: string;
    timestamp: number;
  };
  unreadCount: number;
  isBroadcast?: boolean;
  broadcastData?: {
    messageContent: string;
    recipientCount: number;
    creatorName: string;
  };
}

interface EnhancedMessage {
  id: bigint;
  content: string;
  sender: any;
  timestamp: bigint;
  senderName: string;
  formattedTime: string;
  reactions?: MessageReaction[];
}

interface MessageReaction {
  id: string;
  messageId: string;
  user: string;
  reaction: string;
  timestamp: number;
}

interface MessagesPageProps {
  selectedThreadId?: string | null;
  onThreadSelect?: (threadId: string | null) => void;
}

// Local storage for message reactions with single reaction per user enforcement
const MESSAGE_REACTIONS_STORAGE_KEY = 'ignite_message_reactions';

function getStoredMessageReactions(): MessageReaction[] {
  try {
    const stored = localStorage.getItem(MESSAGE_REACTIONS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    return [];
  }
}

function setStoredMessageReactions(reactions: MessageReaction[]): void {
  try {
    localStorage.setItem(MESSAGE_REACTIONS_STORAGE_KEY, JSON.stringify(reactions));
  } catch (error) {
    console.error('Failed to store message reactions:', error);
  }
}

export default function MessagesPage({ selectedThreadId, onThreadSelect }: MessagesPageProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedThread, setSelectedThread] = useState<EnhancedMessageThread | null>(null);

  const { data: chatThreads, isLoading } = useGetChatThreads();
  const { data: notifications } = useGetNotifications();
  const { data: isAppAdmin } = useIsCurrentUserAdmin();
  const { data: broadcastThreads, isLoading: broadcastLoading, error: broadcastError } = useGetBroadcastMessageThreads();
  const { canDeleteChatThread, hasChatThreadPermissions, hasAnnouncementPermissions } = useUserRoles();

  // Check Pro access for advanced chat features (club-level messaging)
  const { data: advancedChatAccess } = useCanAccessFeature('advanced_chat', 'club', '1');
  const hasAdvancedChatAccess = advancedChatAccess?.hasAccess || false;

  // Handle thread selection from props (for navigation from other pages)
  useEffect(() => {
    if (selectedThreadId && (chatThreads || broadcastThreads)) {
      // First check regular chat threads
      const regularThread = chatThreads?.find(t => t.id.toString() === selectedThreadId);
      if (regularThread) {
        // Check if this is a club-level thread and user has access
        if (regularThread.clubId && !regularThread.teamId && !isAppAdmin && !hasAdvancedChatAccess) {
          // Block access to club-level messaging for Free users
          return;
        }

        const enhancedThread: EnhancedMessageThread = {
          ...regularThread,
          participantCount: 1,
          unreadCount: 0,
          isBroadcast: false,
        };
        setSelectedThread(enhancedThread);
        if (onThreadSelect) {
          onThreadSelect(null); // Clear the selection after opening
        }
        return;
      }

      // Then check broadcast threads
      const broadcastThread = broadcastThreads?.find(t => t.threadId.toString() === selectedThreadId);
      if (broadcastThread) {
        const enhancedBroadcastThread: EnhancedMessageThread = {
          id: broadcastThread.threadId,
          name: `Broadcast: ${broadcastThread.messageContent.slice(0, 50)}${broadcastThread.messageContent.length > 50 ? '...' : ''}`,
          description: broadcastThread.messageContent,
          clubId: undefined,
          teamId: undefined,
          creator: broadcastThread.creator,
          createdAt: broadcastThread.timestamp,
          participantCount: broadcastThread.recipients.length,
          unreadCount: 0,
          isBroadcast: true,
          broadcastData: {
            messageContent: broadcastThread.messageContent,
            recipientCount: broadcastThread.recipients.length,
            creatorName: 'App Admin', // Will be resolved from creator principal
          },
        };
        setSelectedThread(enhancedBroadcastThread);
        if (onThreadSelect) {
          onThreadSelect(null); // Clear the selection after opening
        }
      }
    }
  }, [selectedThreadId, chatThreads, broadcastThreads, onThreadSelect, isAppAdmin, hasAdvancedChatAccess]);

  // Count unread message notifications
  const messageNotifications = notifications?.filter(n => n.type === 'message' && !n.read).length || 0;

  // Transform MessageThread to EnhancedMessageThread
  const enhancedThreads: EnhancedMessageThread[] = (chatThreads || []).map(thread => ({
    ...thread,
    participantCount: 1, // Default participant count
    unreadCount: 0, // Default unread count
    isBroadcast: false, // Regular threads are not broadcast
  }));

  // Transform BroadcastMessageThread to EnhancedMessageThread with enhanced display
  const enhancedBroadcastThreads: EnhancedMessageThread[] = (broadcastThreads || []).map(broadcastThread => {
    // Create a more descriptive name for the broadcast thread
    const messagePreview = broadcastThread.messageContent.slice(0, 50);
    const threadName = `Broadcast: ${messagePreview}${broadcastThread.messageContent.length > 50 ? '...' : ''}`;
    
    return {
      id: broadcastThread.threadId,
      name: threadName,
      description: broadcastThread.messageContent,
      clubId: undefined,
      teamId: undefined,
      creator: broadcastThread.creator,
      createdAt: broadcastThread.timestamp,
      participantCount: broadcastThread.recipients.length,
      unreadCount: 0,
      isBroadcast: true,
      broadcastData: {
        messageContent: broadcastThread.messageContent,
        recipientCount: broadcastThread.recipients.length,
        creatorName: 'App Admin', // Will be resolved from creator principal
      },
    };
  });

  // Separate club and team threads with Pro access enforcement
  const clubThreads = enhancedThreads.filter(thread => thread.clubId && !thread.teamId && !thread.isBroadcast);
  const teamThreads = enhancedThreads.filter(thread => thread.teamId && !thread.isBroadcast);

  // Filter threads based on search query
  const filteredClubThreads = clubThreads.filter(thread =>
    thread.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    thread.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTeamThreads = teamThreads.filter(thread =>
    thread.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    thread.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBroadcastThreads = enhancedBroadcastThreads.filter(thread =>
    thread.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    thread.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (thread.broadcastData?.messageContent.toLowerCase().includes(searchQuery.toLowerCase()) || false)
  );

  const handleThreadSelect = (thread: EnhancedMessageThread) => {
    // Check if this is a club-level thread and user has access
    if (thread.clubId && !thread.teamId && !isAppAdmin && !hasAdvancedChatAccess) {
      // Show upgrade modal for club-level messaging
      setShowUpgradeModal(true);
      return;
    }

    setSelectedThread(thread);
    if (onThreadSelect) {
      onThreadSelect(thread.id.toString());
    }
  };

  const handleThreadClose = () => {
    setSelectedThread(null);
    if (onThreadSelect) {
      onThreadSelect(null);
    }
  };

  const handleUpgradeClick = () => {
    setShowUpgradeModal(true);
  };

  if (selectedThread) {
    return (
      <ChatModal 
        thread={selectedThread} 
        onClose={handleThreadClose}
      />
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Messages</h1>
        </div>
        <div className="flex items-center space-x-2">
          {hasAnnouncementPermissions() && (
            <button 
              onClick={() => setShowAnnouncementModal(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white p-3 rounded-full transition-colors"
              title="Create Announcement"
            >
              <Megaphone className="w-5 h-5" />
            </button>
          )}
          {isAppAdmin && (
            <button 
              onClick={() => setShowBroadcastModal(true)}
              className="bg-purple-500 hover:bg-purple-600 text-white p-3 rounded-full transition-colors"
              title="Create Broadcast Message"
            >
              <Radio className="w-5 h-5" />
            </button>
          )}
          {hasChatThreadPermissions() && (
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white p-3 rounded-full transition-colors"
              title="New Chat Thread"
            >
              <Plus className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-3">
        {hasAnnouncementPermissions() && (
          <button 
            onClick={() => setShowAnnouncementModal(true)}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 px-6 rounded-xl transition-colors flex items-center justify-center space-x-3"
          >
            <Megaphone className="w-5 h-5" />
            <span className="font-semibold">Create Announcement</span>
          </button>
        )}
        {isAppAdmin && (
          <button 
            onClick={() => setShowBroadcastModal(true)}
            className="w-full bg-purple-500 hover:bg-purple-600 text-white py-4 px-6 rounded-xl transition-colors flex items-center justify-center space-x-3"
          >
            <Radio className="w-5 h-5" />
            <span className="font-semibold">Create Broadcast Message</span>
          </button>
        )}
        {hasChatThreadPermissions() && (
          <button 
            onClick={() => setShowCreateModal(true)}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 px-6 rounded-xl transition-colors flex items-center justify-center space-x-3"
          >
            <Plus className="w-5 h-5" />
            <span className="font-semibold">New Chat Thread</span>
          </button>
        )}
      </div>

      {/* Loading State */}
      {(isLoading || broadcastLoading) && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-xl p-4 border border-gray-700 animate-pulse">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gray-700 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-700 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Broadcast Messages Section - App Admin and Recipients */}
      {(isAppAdmin || filteredBroadcastThreads.length > 0) && !isLoading && !broadcastLoading && (
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <Radio className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Broadcast Messages</h2>
            <span className="text-slate-400 text-sm">({filteredBroadcastThreads.length})</span>
          </div>
          
          {broadcastError && (
            <div className="card p-4 bg-orange-500/10 border-orange-500/20">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-orange-400" />
                <div>
                  <p className="text-orange-400 font-medium">Broadcast Loading Error</p>
                  <p className="text-orange-300 text-sm">
                    {broadcastError instanceof Error ? broadcastError.message : 'Failed to load broadcast threads'}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {filteredBroadcastThreads.length === 0 ? (
            <div className="card p-4 bg-blue-500/10 border-blue-500/20">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-blue-400 font-medium">
                    {isAppAdmin ? 'No Broadcast Messages' : 'No Broadcast Messages'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBroadcastThreads.map((thread) => (
                <ThreadCard
                  key={thread.id.toString()}
                  thread={thread}
                  onSelect={handleThreadSelect}
                  canDeleteThread={false} // Broadcast threads have different deletion rules
                  isBroadcastThread={true}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Club Chats Section */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <Crown className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-white">Club Chats</h2>
          <span className="text-slate-400 text-sm">({filteredClubThreads.length})</span>
        </div>
        
        {/* Show club threads for Pro users and app admins, locked screen for Free users */}
        {isAppAdmin || hasAdvancedChatAccess ? (
          filteredClubThreads.length === 0 ? (
            <div className="card p-4 bg-blue-500/10 border-blue-500/20">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-blue-400 font-medium">No Club Chat Threads</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredClubThreads.map((thread) => (
                <ThreadCard
                  key={thread.id.toString()}
                  thread={thread}
                  onSelect={handleThreadSelect}
                  canDeleteThread={canDeleteChatThread(thread)}
                />
              ))}
            </div>
          )
        ) : (
          <div className="card p-6 bg-red-500/10 border-red-500/20">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center shrink-0">
                <Lock className="w-6 h-6 text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-100 mb-2">
                  Club-Level Messaging - Pro Feature
                </h3>
                <div className="flex justify-start">
                  <button
                    onClick={handleUpgradeClick}
                    className="btn-primary text-sm"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Upgrade to Pro
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Team Chats Section */}
      {!isLoading && filteredTeamThreads.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <Trophy className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-white">Team Chats</h2>
            <span className="text-slate-400 text-sm">({filteredTeamThreads.length})</span>
          </div>
          <div className="space-y-3">
            {filteredTeamThreads.map((thread) => (
              <ThreadCard
                key={thread.id.toString()}
                thread={thread}
                onSelect={handleThreadSelect}
                canDeleteThread={canDeleteChatThread(thread)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !broadcastLoading && 
       filteredClubThreads.length === 0 && 
       filteredTeamThreads.length === 0 && 
       filteredBroadcastThreads.length === 0 && (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="text-center py-12">
            <MessageCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Messages Yet</h3>
            <p className="text-gray-400 mb-6">
              {searchQuery 
                ? 'No conversations match your search. Try a different term.'
                : 'Create a chat thread or announcement to start communicating with your clubs and teams.'
              }
            </p>
          </div>
        </div>
      )}

      {showCreateModal && (
        <ChatThreadCreateModal onClose={() => setShowCreateModal(false)} />
      )}

      {showAnnouncementModal && (
        <AnnouncementCreateModal onClose={() => setShowAnnouncementModal(false)} />
      )}

      {showBroadcastModal && (
        <BroadcastThreadCreateModal onClose={() => setShowBroadcastModal(false)} />
      )}

      {showUpgradeModal && (
        <SubscriptionUpgradeModal
          organizationType="club"
          organizationId="1"
          organizationName="Club Messaging"
          onClose={() => setShowUpgradeModal(false)}
        />
      )}
    </div>
  );
}

interface ThreadCardProps {
  thread: EnhancedMessageThread;
  onSelect: (thread: EnhancedMessageThread) => void;
  canDeleteThread: boolean;
  isBroadcastThread?: boolean;
}

function ThreadCard({ thread, onSelect, canDeleteThread, isBroadcastThread = false }: ThreadCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { mutate: deleteThread, isPending } = useDeleteChatThread();
  const { data: isAppAdmin } = useIsCurrentUserAdmin();
  const { data: advancedChatAccess } = useCanAccessFeature('advanced_chat', 'club', '1');
  const hasAdvancedChatAccess = advancedChatAccess?.hasAccess || false;

  // Check if this is a locked club thread for Free users
  const isClubThreadLocked = thread.clubId && !thread.teamId && !isAppAdmin && !hasAdvancedChatAccess;

  const handleDelete = () => {
    deleteThread(thread.id.toString(), {
      onSuccess: () => {
        setShowDeleteConfirm(false);
      },
      onError: (error) => {
        console.error('Failed to delete thread:', error);
        setShowDeleteConfirm(false);
      }
    });
  };

  const getThreadTypeInfo = () => {
    if (isBroadcastThread) {
      return {
        type: 'Broadcast',
        icon: Radio,
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/10',
        borderColor: 'border-purple-500/20',
      };
    } else if (thread.clubId && !thread.teamId) {
      return {
        type: 'Club',
        icon: Crown,
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20',
      };
    } else if (thread.teamId) {
      return {
        type: 'Team',
        icon: Trophy,
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/20',
      };
    } else {
      return {
        type: 'General',
        icon: Hash,
        color: 'text-slate-400',
        bgColor: 'bg-slate-500/10',
        borderColor: 'border-slate-500/20',
      };
    }
  };

  const threadTypeInfo = getThreadTypeInfo();

  // Format timestamp for display
  const formatTimestamp = (timestamp: bigint) => {
    try {
      const date = new Date(Number(timestamp / BigInt(1000000)));
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

      if (diffInHours < 1) {
        const diffInMinutes = Math.floor(diffInHours * 60);
        return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`;
      } else if (diffInHours < 24) {
        return `${Math.floor(diffInHours)}h ago`;
      } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Unknown time';
    }
  };

  return (
    <>
      <div 
        className={`bg-gray-800 rounded-xl p-4 border border-gray-700 transition-colors cursor-pointer ${
          isBroadcastThread ? 'bg-purple-500/5 border-purple-500/20' : 
          isClubThreadLocked ? 'bg-red-500/5 border-red-500/20 opacity-75' : 'hover:bg-gray-750'
        }`}
        onClick={() => onSelect(thread)}
      >
        <div className="flex items-start space-x-4">
          <div 
            className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 relative ${
              isBroadcastThread ? 'bg-purple-500' : 
              isClubThreadLocked ? 'bg-red-500/50' : 'bg-emerald-500'
            }`}
          >
            {isBroadcastThread ? (
              <Radio className="w-6 h-6 text-white" />
            ) : isClubThreadLocked ? (
              <Lock className="w-6 h-6 text-white" />
            ) : (
              <Hash className="w-6 h-6 text-white" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h4 className={`font-medium truncate ${isClubThreadLocked ? 'text-slate-300' : 'text-slate-100'}`}>
                {thread.name}
              </h4>
              <div className="flex items-center space-x-2">
                <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs border ${threadTypeInfo.bgColor} ${threadTypeInfo.borderColor}`}>
                  <threadTypeInfo.icon className={`w-3 h-3 ${threadTypeInfo.color}`} />
                  <span className={threadTypeInfo.color}>{threadTypeInfo.type}</span>
                </div>
                {thread.unreadCount > 0 && (
                  <span className="bg-emerald-500 text-white text-xs px-2 py-1 rounded-full">
                    {thread.unreadCount}
                  </span>
                )}
                {canDeleteThread && !isClubThreadLocked && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteConfirm(true);
                    }}
                    className="p-1 text-slate-400 hover:text-red-400 rounded transition-colors"
                    title="Delete thread"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <p className={`text-sm mb-2 truncate ${isClubThreadLocked ? 'text-slate-500' : 'text-slate-400'}`}>
              {isBroadcastThread && thread.broadcastData 
                ? `${thread.broadcastData.messageContent.slice(0, 100)}${thread.broadcastData.messageContent.length > 100 ? '...' : ''}`
                : thread.description
              }
            </p>
            <div className="flex items-center justify-between">
              <span className={`text-xs ${isClubThreadLocked ? 'text-slate-500' : 'text-slate-500'}`}>
                {isBroadcastThread 
                  ? `${thread.participantCount} recipient${thread.participantCount !== 1 ? 's' : ''}`
                  : `${thread.participantCount} participant${thread.participantCount !== 1 ? 's' : ''}`
                }
                {isBroadcastThread && thread.broadcastData && (
                  <span className="text-purple-400 ml-2">• by {thread.broadcastData.creatorName}</span>
                )}
              </span>
              <span className={`text-xs ${isClubThreadLocked ? 'text-slate-500' : 'text-slate-500'}`}>
                {formatTimestamp(thread.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-[9999]">
          <div className="bg-slate-800 rounded-xl p-6 max-w-sm w-full">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-100 mb-2">Delete Chat Thread</h3>
              
              <div className={`card p-3 mb-4 ${threadTypeInfo.bgColor} ${threadTypeInfo.borderColor}`}>
                <div className="flex items-center justify-center space-x-2">
                  <threadTypeInfo.icon className={`w-4 h-4 ${threadTypeInfo.color}`} />
                  <span className={`text-sm font-medium ${threadTypeInfo.color}`}>
                    {threadTypeInfo.type} Thread
                  </span>
                </div>
                <p className="text-slate-300 text-sm mt-1">"{thread.name}"</p>
              </div>
              
              <p className="text-slate-400 mb-6">
                Are you sure you want to delete this chat thread? This will permanently remove the thread and all its messages. This action cannot be undone.
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="btn-secondary"
                  disabled={isPending}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isPending}
                  className={`bg-red-500 hover:bg-red-600 disabled:bg-red-400 text-white py-2 px-4 rounded-lg transition-colors font-medium ${isPending ? 'btn-loading' : ''}`}
                >
                  {isPending ? 'Deleting...' : 'Delete Thread'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface ChatModalProps {
  thread: EnhancedMessageThread;
  onClose: () => void;
}

function ChatModal({ thread, onClose }: ChatModalProps) {
  const [message, setMessage] = useState('');
  const [sendingSuccess, setSendingSuccess] = useState(false);
  const [notificationsSent, setNotificationsSent] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [messageReactions, setMessageReactions] = useState<Record<string, MessageReaction[]>>({});
  const [showMessageReactionPicker, setShowMessageReactionPicker] = useState<string | null>(null);
  
  const { mutate: getChatMessages, data: messages, isPending: messagesLoading } = useGetChatMessages();
  const { mutate: sendMessage, isPending: sendingMessage } = useSendMessage();
  const { mutate: deleteThread, isPending: isDeletingThread } = useDeleteChatThread();
  const { canDeleteChatThread } = useUserRoles();
  const { data: isAppAdmin } = useIsCurrentUserAdmin();
  const { data: advancedChatAccess } = useCanAccessFeature('advanced_chat', 'club', '1');
  const { identity } = useInternetIdentity();
  
  const hasAdvancedChatAccess = advancedChatAccess?.hasAccess || false;
  const currentUserPrincipal = identity?.getPrincipal().toString();

  const canDeleteThreadPermission = canDeleteChatThread(thread);
  const isBroadcastThread = thread.isBroadcast || false;

  // Check if this is a locked club thread for Free users
  const isClubThreadLocked = thread.clubId && !thread.teamId && !isAppAdmin && !hasAdvancedChatAccess;

  // Available emoji reactions
  const reactionEmojis = ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '⚽'];

  React.useEffect(() => {
    // Only load messages for regular threads, not broadcast threads, and not locked threads
    if (!isBroadcastThread && !isClubThreadLocked) {
      getChatMessages(thread.id.toString());
    }
  }, [thread.id, getChatMessages, isBroadcastThread, isClubThreadLocked]);

  // Load message reactions from local storage
  React.useEffect(() => {
    const reactions = getStoredMessageReactions();
    const reactionsByMessage: Record<string, MessageReaction[]> = {};
    
    reactions.forEach(reaction => {
      if (!reactionsByMessage[reaction.messageId]) {
        reactionsByMessage[reaction.messageId] = [];
      }
      reactionsByMessage[reaction.messageId].push(reaction);
    });
    
    setMessageReactions(reactionsByMessage);
  }, []);

  const handleSendMessage = () => {
    if (message.trim() && !sendingMessage && !isBroadcastThread && !isClubThreadLocked) {
      sendMessage({ threadId: thread.id.toString(), message: message.trim() }, {
        onSuccess: () => {
          setMessage('');
          setSendingSuccess(true);
          setNotificationsSent(true);
          
          // Clear success states after showing feedback
          setTimeout(() => {
            setSendingSuccess(false);
            setNotificationsSent(false);
          }, 3000);
          
          // Refresh messages to show the new message
          getChatMessages(thread.id.toString());
        }
      });
    }
  };

  const handleDeleteThread = () => {
    deleteThread(thread.id.toString(), {
      onSuccess: () => {
        setShowDeleteConfirm(false);
        onClose(); // Close the chat modal after successful deletion
      },
      onError: (error) => {
        console.error('Failed to delete thread:', error);
        setShowDeleteConfirm(false);
      }
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleMessageReaction = (messageId: string, emoji: string) => {
    if (!currentUserPrincipal) return;

    const reactions = getStoredMessageReactions();
    const messageId_str = messageId;
    
    // Remove any existing reaction from the same user for the same message (single reaction per user)
    const filteredReactions = reactions.filter(r => 
      !(r.messageId === messageId_str && r.user === currentUserPrincipal)
    );
    
    // Check if user already reacted with this emoji
    const existingReaction = reactions.find(r => 
      r.messageId === messageId_str && 
      r.user === currentUserPrincipal && 
      r.reaction === emoji
    );
    
    if (!existingReaction) {
      // Add new reaction (replacing any previous reaction)
      const newReaction: MessageReaction = {
        id: `reaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        messageId: messageId_str,
        user: currentUserPrincipal,
        reaction: emoji,
        timestamp: Date.now(),
      };
      filteredReactions.push(newReaction);
    }
    // If user clicked the same emoji they already reacted with, just remove it (handled by filteredReactions)
    
    setStoredMessageReactions(filteredReactions);
    
    // Update local state
    const reactionsByMessage: Record<string, MessageReaction[]> = {};
    filteredReactions.forEach(reaction => {
      if (!reactionsByMessage[reaction.messageId]) {
        reactionsByMessage[reaction.messageId] = [];
      }
      reactionsByMessage[reaction.messageId].push(reaction);
    });
    setMessageReactions(reactionsByMessage);
    
    // Close the reaction picker
    setShowMessageReactionPicker(null);
  };

  const addEmojiToMessage = (emoji: string) => {
    setMessage(message + emoji);
    setShowEmojiPicker(false);
  };

  const getThreadTypeInfo = () => {
    if (isBroadcastThread) {
      return {
        type: 'Broadcast',
        icon: Radio,
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/10',
        borderColor: 'border-purple-500/20',
      };
    } else if (thread.clubId && !thread.teamId) {
      return {
        type: 'Club',
        icon: Crown,
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20',
      };
    } else if (thread.teamId) {
      return {
        type: 'Team',
        icon: Trophy,
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/20',
      };
    } else {
      return {
        type: 'General',
        icon: Hash,
        color: 'text-slate-400',
        bgColor: 'bg-slate-500/10',
        borderColor: 'border-slate-500/20',
      };
    }
  };

  const threadTypeInfo = getThreadTypeInfo();

  // Format timestamp for display
  const formatTimestamp = (timestamp: bigint) => {
    try {
      const date = new Date(Number(timestamp / BigInt(1000000)));
      return date.toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric',
        month: 'long', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Unknown time';
    }
  };

  // If this is a locked club thread, show upgrade prompt
  if (isClubThreadLocked) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-800/50 bg-slate-900/95 backdrop-blur-sm sticky top-0 z-10">
          <button
            onClick={onClose}
            className="p-2 -ml-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-semibold text-slate-100">Club Chat - Pro Required</h1>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="card p-8 text-center max-w-md">
            <div className="w-20 h-20 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Lock className="w-10 h-10 text-red-400" />
            </div>
            <h3 className="text-2xl font-semibold text-slate-100 mb-4">Club Messaging - Pro Feature</h3>
            
            <button
              onClick={onClose}
              className="btn-primary-mobile"
            >
              <CreditCard className="w-5 h-5 mr-2" />
              Back to Messages
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col" style={{
      position: 'fixed',
      top: '0',
      right: '0',
      bottom: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      margin: '0',
      padding: '0',
      border: 'none',
      borderRadius: '0',
      zIndex: 9999
    }}>
      <div className="flex items-center justify-between p-4 border-b border-slate-800/50 bg-slate-900/95 backdrop-blur-sm sticky top-0 z-10" style={{
        position: 'sticky',
        top: '0',
        margin: '0',
        paddingTop: 'max(env(safe-area-inset-top), 1rem)',
        paddingBottom: '1rem',
        paddingLeft: 'max(env(safe-area-inset-left), 1rem)',
        paddingRight: 'max(env(safe-area-inset-right), 1rem)'
      }}>
        <button
          onClick={onClose}
          className="p-2 -ml-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-semibold text-slate-100">
            {isBroadcastThread ? 'Broadcast Message' : thread.name}
          </h1>
          <div className="flex items-center justify-center space-x-2">
            <p className="text-sm text-slate-400">
              {isBroadcastThread 
                ? `${thread.participantCount} recipients`
                : `${thread.participantCount} participants`
              }
            </p>
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs border ${threadTypeInfo.bgColor} ${threadTypeInfo.borderColor}`}>
              <threadTypeInfo.icon className={`w-3 h-3 ${threadTypeInfo.color}`} />
              <span className={threadTypeInfo.color}>{threadTypeInfo.type}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {canDeleteThreadPermission && !isBroadcastThread && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-slate-400 hover:text-red-400 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
              title="Delete thread"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Enhanced message sending success indicator */}
      {sendingSuccess && !isBroadcastThread && (
        <div className="mx-4 mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-emerald-400 text-sm font-medium">
              Message sent successfully!
            </p>
            {notificationsSent && (
              <p className="text-emerald-300 text-xs mt-1">
                All thread members have been automatically notified of your new message
              </p>
            )}
          </div>
        </div>
      )}

      {/* Enhanced message sending indicator */}
      {sendingMessage && !isBroadcastThread && (
        <div className="mx-4 mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center space-x-2">
          <Loader2 className="w-5 h-5 text-blue-400 animate-spin flex-shrink-0" />
          <div className="flex-1">
            <p className="text-blue-400 text-sm font-medium">
              Sending message...
            </p>
          </div>
        </div>
      )}

      {/* Broadcast Thread Details */}
      {isBroadcastThread && thread.broadcastData && (
        <div className="mx-4 mt-4 space-y-4">
          <div className="card p-4 bg-purple-500/10 border-purple-500/20">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center shrink-0">
                <Radio className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-purple-400 font-medium">App Admin Broadcast Message</h3>
                  <span className="text-slate-400 text-sm">
                    {formatTimestamp(thread.createdAt)}
                  </span>
                </div>
                <p className="text-purple-300 text-sm mb-3">
                  From: {thread.broadcastData.creatorName} • To: {thread.broadcastData.recipientCount} recipients
                </p>
                <div className="card p-4 bg-purple-500/5 border-purple-500/10">
                  <p className="text-slate-200 leading-relaxed">
                    {thread.broadcastData.messageContent}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Regular Chat Messages with Reactions and Single Reaction Per User System */}
      {!isBroadcastThread && (
        <div className="flex-1 overflow-y-auto p-4">
          {messagesLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-slate-700 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-3 bg-slate-700 rounded w-1/4 mb-2"></div>
                      <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : messages && messages.length > 0 ? (
            <div className="space-y-4">
              {messages.map((msg: EnhancedMessage) => {
                const msgReactions = messageReactions[msg.id.toString()] || [];
                const userReaction = msgReactions.find(r => r.user === currentUserPrincipal);
                
                // Group reactions by emoji with single reaction per user enforcement
                const reactionGroups = msgReactions.reduce((groups, reaction) => {
                  if (!groups[reaction.reaction]) {
                    groups[reaction.reaction] = {
                      emoji: reaction.reaction,
                      count: 0,
                      users: [],
                      userReacted: false,
                    };
                  }
                  groups[reaction.reaction].count++;
                  groups[reaction.reaction].users.push(reaction.user);
                  if (reaction.user === currentUserPrincipal) {
                    groups[reaction.reaction].userReacted = true;
                  }
                  return groups;
                }, {} as Record<string, { emoji: string; count: number; users: string[]; userReacted: boolean }>);

                return (
                  <div key={msg.id.toString()} className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-white text-xs font-semibold">
                        {msg.senderName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-slate-200 text-sm">{msg.senderName}</span>
                        <span className="text-slate-500 text-xs">{msg.formattedTime}</span>
                      </div>
                      <div className="bg-slate-800 rounded-lg p-3 relative group">
                        <p className="text-slate-100">{msg.content}</p>
                        
                        {/* Message reaction button */}
                        <button
                          onClick={() => {
                            setShowMessageReactionPicker(
                              showMessageReactionPicker === msg.id.toString() ? null : msg.id.toString()
                            );
                          }}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-200 rounded transition-all duration-200"
                          title="React to message"
                        >
                          <Smile className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {/* Message Reaction Picker */}
                      {showMessageReactionPicker === msg.id.toString() && (
                        <div className="mt-2 card p-2 bg-slate-800/50">
                          <div className="mb-2">
                            <p className="text-slate-400 text-xs">
                              {userReaction 
                                ? `Current reaction: ${userReaction.reaction}. Tap any emoji to replace it.`
                                : 'Tap any emoji to react to this message'
                              }
                            </p>
                          </div>
                          <div className="grid grid-cols-8 gap-1">
                            {reactionEmojis.map((emoji) => {
                              const isCurrentReaction = userReaction?.reaction === emoji;
                              return (
                                <button
                                  key={emoji}
                                  onClick={() => handleMessageReaction(msg.id.toString(), emoji)}
                                  className={`p-1 text-lg rounded transition-colors ${
                                    isCurrentReaction
                                      ? 'bg-emerald-500/20 border border-emerald-500/50'
                                      : 'hover:bg-slate-700'
                                  }`}
                                  title={isCurrentReaction ? 'Your current reaction' : `React with ${emoji}`}
                                >
                                  {emoji}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* Message Reactions Display with Single Reaction Per User */}
                      {Object.keys(reactionGroups).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {Object.values(reactionGroups).map((group) => (
                            <button
                              key={group.emoji}
                              onClick={() => {
                                setShowMessageReactionPicker(
                                  showMessageReactionPicker === msg.id.toString() ? null : msg.id.toString()
                                );
                              }}
                              className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs border transition-all duration-200 ${
                                group.userReacted
                                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 scale-105'
                                  : 'bg-slate-700/50 text-slate-400 border-slate-600/50 hover:bg-slate-600/50'
                              }`}
                              title={group.userReacted ? 'Your reaction - click to change' : `React with ${group.emoji}`}
                            >
                              <span>{group.emoji}</span>
                              <span>{group.count}</span>
                            </button>
                          ))}
                          
                          {/* Add reaction button */}
                          <button
                            onClick={() => {
                              setShowMessageReactionPicker(
                                showMessageReactionPicker === msg.id.toString() ? null : msg.id.toString()
                              );
                            }}
                            className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs border bg-slate-700/50 text-slate-400 border-slate-600/50 hover:bg-slate-600/50 transition-all duration-200"
                            title={userReaction ? 'Change your reaction' : 'Add reaction'}
                          >
                            <Smile className="w-3 h-3" />
                            <span>{userReaction ? '↻' : '+'}</span>
                          </button>
                        </div>
                      )}
                      
                      {/* Quick reaction bar for messages without reactions */}
                      {Object.keys(reactionGroups).length === 0 && (
                        <div className="mt-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          {reactionEmojis.slice(0, 4).map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => handleMessageReaction(msg.id.toString(), emoji)}
                              className="p-1 text-lg hover:bg-slate-700 rounded transition-colors"
                              title={`React with ${emoji}`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Show user's current reaction status */}
                      {userReaction && (
                        <div className="mt-2 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                          <p className="text-emerald-400 text-xs">
                            Your reaction: {userReaction.reaction} (click any reaction to change it)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <MessageCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No messages yet</p>
              <p className="text-slate-500 text-sm">Start the conversation!</p>
            </div>
          )}
        </div>
      )}

      {/* Message Input with Emoji Support - Only show for regular threads, not broadcast threads */}
      {!isBroadcastThread && (
        <div className="border-t border-slate-800/50 p-4 bg-slate-900/95 backdrop-blur-sm sticky bottom-0 z-10" style={{
          position: 'sticky',
          bottom: '0',
          margin: '0',
          paddingTop: '1rem',
          paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)',
          paddingLeft: 'max(env(safe-area-inset-left), 1rem)',
          paddingRight: 'max(env(safe-area-inset-right), 1rem)'
        }}>
          {/* Emoji Picker */}
          {showEmojiPicker && (
            <div className="mb-4 card p-4 bg-slate-800/50">
              <div className="mb-3">
                <h5 className="text-slate-200 font-medium text-sm mb-2">Add emoji to your message</h5>
              </div>
              <div className="grid grid-cols-8 gap-2">
                {['😀', '😂', '😍', '🤔', '😎', '😊', '👍', '❤️', '🎉', '🔥', '⚽', '🏆', '💪', '👏', '🙌', '✨'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => addEmojiToMessage(emoji)}
                    className="p-2 text-xl hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex space-x-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message... (emojis supported 😊)"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 pr-12 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                disabled={sendingMessage}
              />
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 rounded transition-colors"
                title="Add emoji"
                disabled={sendingMessage}
              >
                <Smile className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!message.trim() || sendingMessage}
              className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-400 text-white p-3 rounded-xl transition-colors flex items-center justify-center min-w-[48px]"
            >
              {sendingMessage ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Broadcast Thread Footer - Read-only */}
      {isBroadcastThread && (
        <div className="border-t border-slate-800/50 p-4 bg-slate-900/95 backdrop-blur-sm sticky bottom-0 z-10" style={{
          position: 'sticky',
          bottom: '0',
          margin: '0',
          paddingTop: '1rem',
          paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)',
          paddingLeft: 'max(env(safe-area-inset-left), 1rem)',
          paddingRight: 'max(env(safe-area-inset-right), 1rem)'
        }}>
          <div className="card p-4 bg-purple-500/10 border-purple-500/20">
            <div className="flex items-center space-x-3">
              <Radio className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-purple-400 font-medium">Broadcast Message (Read-Only)</p>
                <p className="text-purple-300 text-sm">
                  This is a one-way broadcast message from an app administrator. Recipients cannot reply to broadcast messages.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-black/75 flex items-center justify-center p-4 z-10">
          <div className="bg-slate-800 rounded-xl p-6 max-w-sm w-full">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-100 mb-2">Delete Chat Thread</h3>
              
              <div className={`card p-3 mb-4 ${threadTypeInfo.bgColor} ${threadTypeInfo.borderColor}`}>
                <div className="flex items-center justify-center space-x-2">
                  <threadTypeInfo.icon className={`w-4 h-4 ${threadTypeInfo.color}`} />
                  <span className={`text-sm font-medium ${threadTypeInfo.color}`}>
                    {threadTypeInfo.type} Thread
                  </span>
                </div>
                <p className="text-slate-300 text-sm mt-1">"{thread.name}"</p>
              </div>
              
              <p className="text-slate-400 mb-6">
                Are you sure you want to delete this chat thread? This will permanently remove the thread and all its messages for all participants. This action cannot be undone.
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="btn-secondary"
                  disabled={isDeletingThread}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteThread}
                  disabled={isDeletingThread}
                  className={`bg-red-500 hover:bg-red-600 disabled:bg-red-400 text-white py-2 px-4 rounded-lg transition-colors font-medium ${isDeletingThread ? 'btn-loading' : ''}`}
                >
                  {isDeletingThread ? 'Deleting...' : 'Delete Thread'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
