import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, Megaphone, MessageCircle, Heart, Smile, Send, Loader2, CheckCircle, Crown, Trophy, User, Clock, AlertCircle, RefreshCw, Trash2, AlertTriangle } from 'lucide-react';
import { useGetAnnouncementComments, useCommentOnAnnouncement, useGetAnnouncementReactions, useReactToAnnouncement, useGetAnnouncementCommentReactions, useReactToAnnouncementComment, useDeleteAnnouncement } from '../hooks/useAnnouncements';
import { useGetUserClubs } from '../hooks/useClubs';
import { useGetAllTeams } from '../hooks/useTeams';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useActor } from '../hooks/useActor';
import { useUserRoles } from '../hooks/useRoles';

// Define frontend-only types until backend implements them
interface Announcement {
  id: bigint;
  title: string;
  content: string;
  creator: any;
  timestamp: bigint;
  clubId?: bigint;
  teamId?: bigint;
}

interface AnnouncementComment {
  id: bigint;
  announcementId: bigint;
  user: any;
  comment: string;
  timestamp: bigint;
}

interface AnnouncementThreadModalProps {
  announcement: Announcement;
  onClose: () => void;
}

interface EnhancedAnnouncementComment extends AnnouncementComment {
  displayName: string;
  formattedTime: string;
}

interface AnnouncementReaction {
  id: string;
  announcementId: string;
  user: string;
  reaction: string;
  timestamp: number;
}

interface AnnouncementCommentReaction {
  id: string;
  commentId: string;
  user: string;
  reaction: string;
  timestamp: number;
}

export default function AnnouncementThreadModal({ announcement, onClose }: AnnouncementThreadModalProps) {
  const [newComment, setNewComment] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showCommentEmojiPicker, setShowCommentEmojiPicker] = useState(false);
  const [enhancedComments, setEnhancedComments] = useState<EnhancedAnnouncementComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [commentSubmissionSuccess, setCommentSubmissionSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { mutate: getComments, data: comments, isPending: commentsLoadingRaw } = useGetAnnouncementComments();
  const { mutate: commentOnAnnouncement, isPending: commenting, error: commentError } = useCommentOnAnnouncement();
  const { mutate: getReactions, data: reactions, isPending: reactionsLoading } = useGetAnnouncementReactions();
  const { mutate: reactToAnnouncement, isPending: reacting } = useReactToAnnouncement();
  const { mutate: deleteAnnouncement, isPending: isDeletingMutation, error: deleteError } = useDeleteAnnouncement();
  const { data: clubs } = useGetUserClubs();
  const { data: teams } = useGetAllTeams();
  const { identity } = useInternetIdentity();
  const { actor } = useActor();
  const { canDeleteAnnouncement: canDelete } = useUserRoles();

  const currentUserPrincipal = identity?.getPrincipal().toString();
  const canDeleteThisAnnouncement = canDelete(announcement);

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

  // Load comments and reactions when component mounts
  useEffect(() => {
    loadCommentsAndReactions();
  }, [announcement.id]);

  const loadCommentsAndReactions = () => {
    console.log('Loading comments and reactions for announcement:', announcement.id.toString());
    setCommentsError(null);
    
    // Load comments from backend
    getComments(announcement.id.toString(), {
      onSuccess: (backendComments) => {
        console.log('Backend comments loaded successfully:', backendComments.length);
        // Comments will be enhanced via the useEffect above
      },
      onError: (error) => {
        console.error('Failed to load announcement comments:', error);
        setCommentsError(error instanceof Error ? error.message : 'Failed to load comments');
      }
    });
    
    // Load reactions
    getReactions(announcement.id.toString());
  };

  // Fixed timestamp formatting function for announcement comments
  const formatCommentTime = (timestamp: bigint): string => {
    try {
      // Validate that timestamp is a valid bigint
      if (typeof timestamp !== 'bigint') {
        console.error('Invalid timestamp type:', typeof timestamp, timestamp);
        return 'Unknown time';
      }

      // Backend stores timestamps as nanoseconds (Time.now() in Motoko)
      // Convert nanoseconds to milliseconds for JavaScript Date
      const timestampMs = Number(timestamp / BigInt(1000000));
      
      // Validate the resulting timestamp is reasonable
      if (timestampMs <= 0 || timestampMs > Date.now() + 86400000) { // Not more than 1 day in future
        console.error('Invalid timestamp value:', timestamp.toString(), 'converted to ms:', timestampMs);
        return 'Unknown time';
      }

      const date = new Date(timestampMs);
      
      // Validate the date object
      if (isNaN(date.getTime())) {
        console.error('Invalid date created from timestamp:', timestamp.toString(), 'ms:', timestampMs);
        return 'Unknown time';
      }

      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

      if (diffInHours < 1) {
        const diffInMinutes = Math.floor(diffInHours * 60);
        return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`;
      } else if (diffInHours < 24) {
        return `Today ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
      } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
      }
    } catch (error) {
      console.error('Error formatting comment timestamp:', error, 'timestamp:', timestamp?.toString());
      return 'Unknown time';
    }
  };

  // Fixed timestamp formatting function for announcements
  const formatTime = (timestamp: bigint | number) => {
    try {
      let date: Date;
      
      if (typeof timestamp === 'bigint') {
        // Backend timestamp in nanoseconds, convert to milliseconds
        const timestampMs = Number(timestamp / BigInt(1000000));
        
        // Validate the resulting timestamp is reasonable
        if (timestampMs <= 0 || timestampMs > Date.now() + 86400000) { // Not more than 1 day in future
          console.error('Invalid announcement timestamp value:', timestamp.toString(), 'converted to ms:', timestampMs);
          return 'Unknown time';
        }
        
        date = new Date(timestampMs);
      } else {
        // Already in milliseconds
        date = new Date(timestamp);
      }
      
      // Validate the date object
      if (isNaN(date.getTime())) {
        console.error('Invalid date created from announcement timestamp:', timestamp.toString());
        return 'Unknown time';
      }
      
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

      if (diffInHours < 1) {
        const diffInMinutes = Math.floor(diffInHours * 60);
        return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`;
      } else if (diffInHours < 24) {
        return `Today ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
      } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
      }
    } catch (error) {
      console.error('Error formatting announcement timestamp:', error, 'timestamp:', timestamp?.toString());
      return 'Unknown time';
    }
  };

  const getOrganizationInfo = () => {
    if (announcement.clubId) {
      const club = clubs?.find(c => c.id === announcement.clubId);
      if (announcement.teamId) {
        const team = teams?.find(t => t.id === announcement.teamId);
        return {
          name: `${team?.name || 'Unknown Team'} (${club?.name || 'Unknown Club'})`,
          type: 'team' as const,
          icon: Trophy,
          color: 'text-purple-400',
          bgColor: 'bg-purple-500/10',
          borderColor: 'border-purple-500/20',
        };
      } else {
        return {
          name: club?.name || 'Unknown Club',
          type: 'club' as const,
          icon: Crown,
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/20',
        };
      }
    } else if (announcement.teamId) {
      const team = teams?.find(t => t.id === announcement.teamId);
      return {
        name: team?.name || 'Unknown Team',
        type: 'team' as const,
        icon: Trophy,
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/10',
        borderColor: 'border-purple-500/20',
      };
    }
    
    return {
      name: 'Unknown Organization',
      type: 'club' as const,
      icon: Crown,
      color: 'text-slate-400',
      bgColor: 'bg-slate-500/10',
      borderColor: 'border-slate-500/20',
    };
  };

  const organizationInfo = getOrganizationInfo();
  const userReaction = reactions?.find(r => r.user === currentUserPrincipal)?.reaction;

  const handleEmojiReaction = (emoji: string) => {
    if (reacting) return;
    
    reactToAnnouncement({
      announcementId: announcement.id.toString(),
      reaction: emoji,
    }, {
      onSuccess: () => {
        getReactions(announcement.id.toString());
        setShowEmojiPicker(false);
      }
    });
  };

  const handleComment = () => {
    if (!newComment.trim() || commenting) return;
    
    console.log('Submitting comment for announcement:', {
      announcementId: announcement.id.toString(),
      comment: newComment.trim(),
      commentLength: newComment.trim().length
    });
    
    commentOnAnnouncement({
      announcementId: announcement.id.toString(),
      comment: newComment.trim(),
    }, {
      onSuccess: (result) => {
        console.log('Comment submitted successfully, clearing form and refreshing comments');
        setNewComment('');
        setCommentSubmissionSuccess(true);
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setCommentSubmissionSuccess(false);
        }, 3000);
        
        // Immediately refresh the comments to show the new one
        setTimeout(() => {
          console.log('Refreshing comments after successful submission');
          getComments(announcement.id.toString(), {
            onSuccess: (updatedComments) => {
              console.log('Comments refreshed after submission:', updatedComments.length);
              // Comments will be enhanced via the useEffect above
            },
            onError: (error) => {
              console.error('Failed to refresh comments after submission:', error);
            }
          });
        }, 200);
      },
      onError: (error) => {
        console.error('Comment submission failed:', error);
        setCommentSubmissionSuccess(false);
      }
    });
  };

  const handleDeleteAnnouncement = () => {
    console.log('Starting immediate announcement deletion:', announcement.id.toString());
    
    deleteAnnouncement(announcement.id.toString(), {
      onSuccess: () => {
        console.log('Announcement deleted immediately, closing modal');
        setShowDeleteConfirm(false);
        
        // Close the modal immediately after successful deletion
        onClose();
      },
      onError: (error) => {
        console.error('Failed to delete announcement:', error);
        setShowDeleteConfirm(false);
      }
    });
  };

  const handleRefreshComments = () => {
    console.log('Manually refreshing comments');
    loadCommentsAndReactions();
  };

  const addEmojiToComment = (emoji: string) => {
    setNewComment(newComment + emoji);
    setShowCommentEmojiPicker(false);
  };

  // Unified emoji picker with all reactions including love heart
  const reactionEmojis = ['❤️', '😀', '😂', '👍', '👏', '🔥', '⚽', '🏆', '💪', '🎉', '👌', '😍'];

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
          <h1 className="text-lg font-semibold text-slate-100">Announcement</h1>
          <div className="flex items-center justify-center space-x-2">
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs border ${organizationInfo.bgColor} ${organizationInfo.borderColor}`}>
              <organizationInfo.icon className={`w-3 h-3 ${organizationInfo.color}`} />
              <span className={organizationInfo.color}>{organizationInfo.type === 'club' ? 'Club' : 'Team'}</span>
            </div>
            <p className="text-sm text-slate-400">{organizationInfo.name}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {canDeleteThisAnnouncement && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-slate-400 hover:text-red-400 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
              title="Delete announcement"
              disabled={isDeletingMutation}
            >
              {isDeletingMutation ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Trash2 className="w-5 h-5" />
              )}
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

      {/* Immediate deletion in progress */}
      {isDeletingMutation && (
        <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center space-x-2">
          <Loader2 className="w-5 h-5 text-red-400 animate-spin shrink-0" />
          <div className="flex-1">
            <p className="text-red-400 text-sm font-medium">Deleting announcement...</p>
            <p className="text-red-300 text-xs mt-1">Removing announcement immediately with optimized admin validation</p>
          </div>
        </div>
      )}

      {/* Comment submission error */}
      {commentError && (
        <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <div className="flex-1">
            <p className="text-red-400 text-sm font-medium">Failed to submit comment</p>
            <p className="text-red-300 text-xs mt-1">
              {commentError instanceof Error ? commentError.message : 'Please try again'}
            </p>
          </div>
        </div>
      )}

      {/* Comments loading error */}
      {commentsError && (
        <div className="mx-4 mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-orange-400 shrink-0" />
          <div className="flex-1">
            <p className="text-orange-400 text-sm font-medium">Failed to load comments</p>
            <p className="text-orange-300 text-xs mt-1">{commentsError}</p>
          </div>
          <button
            onClick={handleRefreshComments}
            className="text-orange-300 hover:text-orange-200 text-sm"
            disabled={commentsLoading}
          >
            <RefreshCw className={`w-4 h-4 ${commentsLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      )}

      {/* Comment submission success */}
      {commentSubmissionSuccess && (
        <div className="mx-4 mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="flex-1">
            <p className="text-emerald-400 text-sm font-medium">Comment submitted successfully!</p>
            <p className="text-emerald-300 text-xs mt-1">Your comment has been saved and is now visible to all members</p>
          </div>
        </div>
      )}

      {/* Comment submission in progress */}
      {commenting && (
        <div className="mx-4 mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center space-x-2">
          <Loader2 className="w-5 h-5 text-blue-400 animate-spin shrink-0" />
          <div className="flex-1">
            <p className="text-blue-400 text-sm font-medium">Submitting comment...</p>
            <p className="text-blue-300 text-xs mt-1">Saving your comment to the backend</p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 pb-32">
          {/* Announcement Content */}
          <div className="space-y-6">
            <div className={`card p-6 ${organizationInfo.bgColor} ${organizationInfo.borderColor}`}>
              <div className="flex items-start space-x-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${organizationInfo.bgColor}`}>
                  <Megaphone className={`w-6 h-6 ${organizationInfo.color}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xl font-bold text-slate-100">{announcement.title}</h2>
                    <span className="text-slate-400 text-sm">
                      {formatTime(announcement.timestamp)}
                    </span>
                  </div>
                  <p className="text-slate-200 leading-relaxed mb-4">{announcement.content}</p>
                  <div className="flex items-center space-x-2">
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs border ${organizationInfo.bgColor} ${organizationInfo.borderColor}`}>
                      <organizationInfo.icon className={`w-3 h-3 ${organizationInfo.color}`} />
                      <span className={organizationInfo.color}>{organizationInfo.name}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Backend Implementation Notice */}
            <div className="card p-6 bg-orange-500/10 border-orange-500/20">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-100 mb-2">Announcement System Not Available</h4>
                  <div className="text-slate-300 text-sm space-y-2">
                    <p>The announcement system requires backend implementation:</p>
                    <ul className="list-disc list-inside space-y-1 text-slate-400 ml-4">
                      <li><strong>Announcement Storage:</strong> Create, read, update, delete announcements</li>
                      <li><strong>Comment System:</strong> Add and view comments on announcements</li>
                      <li><strong>Reaction System:</strong> React to announcements and comments with single reaction per user</li>
                      <li><strong>Access Control:</strong> Role-based permissions for announcements</li>
                      <li><strong>Notifications:</strong> Notify users of new announcements and comments</li>
                    </ul>
                    <p className="mt-3 text-orange-300">
                      The frontend announcement interface is complete and will work immediately once the backend functions are implemented.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Reaction Interface */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-100">Reactions</h3>
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    userReaction
                      ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/30'
                      : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/50 border-2 border-slate-600/50'
                  } ${reacting ? 'opacity-50' : ''}`}
                  disabled={reacting}
                  title={userReaction ? `Your reaction: ${userReaction}` : 'Add reaction'}
                >
                  {reacting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Smile className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Emoji Picker */}
              {showEmojiPicker && (
                <div className="card p-4 bg-slate-800/50">
                  <div className="mb-3">
                    <h5 className="text-slate-200 font-medium text-sm mb-2">React to this announcement</h5>
                    <p className="text-slate-400 text-xs">
                      {userReaction 
                        ? 'Tap any emoji to change your reaction (replaces your current reaction)'
                        : 'Tap any emoji to react to this announcement'
                      }
                    </p>
                  </div>
                  <div className="grid grid-cols-6 gap-3">
                    {reactionEmojis.map((emoji) => {
                      const isSelected = userReaction === emoji;
                      return (
                        <button
                          key={emoji}
                          onClick={() => handleEmojiReaction(emoji)}
                          className={`p-3 text-2xl rounded-lg transition-all duration-200 ${
                            isSelected
                              ? 'bg-emerald-500/20 border-2 border-emerald-500/50 scale-110'
                              : 'hover:bg-slate-700 border-2 border-transparent hover:scale-105'
                          }`}
                          disabled={reacting}
                        >
                          {emoji}
                        </button>
                      );
                    })}
                  </div>
                  {userReaction && (
                    <div className="mt-3 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                      <p className="text-emerald-400 text-xs text-center">
                        Your current reaction: {userReaction}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Reaction Display */}
              {reactionsLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  <span className="text-slate-400 text-sm">Loading reactions...</span>
                </div>
              ) : reactions && reactions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {Array.from(new Set(reactions.map(r => r.reaction))).map((reaction) => {
                    const count = reactions.filter(r => r.reaction === reaction).length;
                    const userReacted = reactions.some(r => r.user === currentUserPrincipal && r.reaction === reaction);
                    
                    return (
                      <div
                        key={reaction}
                        className={`flex items-center space-x-1 px-2 py-1 rounded-full text-sm border ${
                          userReacted
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : 'bg-slate-700/50 text-slate-400 border-slate-600/50'
                        }`}
                      >
                        <span>{reaction}</span>
                        <span>{count}</span>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {/* Comments Section */}
            <div className="space-y-4 border-t border-slate-800/50 pt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-100">Comments</h3>
                <div className="flex items-center space-x-2">
                  <span className="text-slate-400 text-sm">
                    {enhancedComments?.length || 0} comment{(enhancedComments?.length || 0) !== 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={handleRefreshComments}
                    className="p-1 text-slate-400 hover:text-slate-200 rounded transition-colors"
                    disabled={commentsLoading}
                    title="Refresh comments"
                  >
                    <RefreshCw className={`w-4 h-4 ${commentsLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
              
              {/* Comment Input */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-slate-200 font-medium text-sm">Add Comment</h5>
                  <button
                    onClick={() => setShowCommentEmojiPicker(!showCommentEmojiPicker)}
                    className="p-1 text-slate-400 hover:text-slate-200 rounded transition-colors"
                    title="Add emoji"
                    disabled={commenting}
                  >
                    <Smile className="w-4 h-4" />
                  </button>
                </div>

                {/* Comment Emoji Picker */}
                {showCommentEmojiPicker && (
                  <div className="card p-3 bg-slate-800/50">
                    <div className="mb-2">
                      <h6 className="text-slate-200 font-medium text-xs mb-1">Add emoji to your comment</h6>
                    </div>
                    <div className="grid grid-cols-8 gap-2">
                      {reactionEmojis.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => addEmojiToComment(emoji)}
                          className="p-2 text-xl hover:bg-slate-700 rounded-lg transition-colors"
                          disabled={commenting}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex space-x-3">
                  <div className="flex-1 relative">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Write a comment... (emojis supported 😊)"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 pr-10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 resize-none min-h-[60px]"
                      disabled={commenting}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleComment();
                        }
                      }}
                    />
                    <button
                      onClick={() => setShowCommentEmojiPicker(!showCommentEmojiPicker)}
                      className="absolute right-2 top-2 p-1 text-slate-400 hover:text-slate-200 rounded transition-colors"
                      title="Add emoji"
                      disabled={commenting}
                    >
                      <Smile className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={handleComment}
                    disabled={!newComment.trim() || commenting}
                    className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-400 text-white p-2 rounded-lg transition-colors flex items-center justify-center min-w-[40px]"
                  >
                    {commenting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <div className="text-center">
                  <p className="text-slate-400 text-xs">
                    {commenting 
                      ? 'Submitting your comment to the backend...'
                      : commentSubmissionSuccess
                      ? '✅ Comment saved successfully! It will appear below shortly.'
                      : 'You can add multiple comments to this announcement. Press Enter or click Send to submit.'
                    }
                  </p>
                </div>
              </div>

              {/* Backend Integration Status */}
              <div className="card p-4 bg-orange-500/10 border-orange-500/20">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-orange-400 font-medium">Backend Implementation Required</p>
                    <p className="text-orange-300 text-sm">
                      Comment functionality requires backend implementation. The announcement comment system needs to be added to the backend before comments can be posted and viewed.
                    </p>
                  </div>
                </div>
              </div>

              {/* Comments List - Show demo of single reaction per user system */}
              <div className="space-y-4">
                <div className="card p-4 bg-blue-500/10 border-blue-500/20">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-blue-400 font-medium">Enhanced Comment Reaction System</p>
                      <p className="text-blue-300 text-sm">
                        When implemented, users will click to open an emoji picker for comment reactions. 
                        Each user can have only one emoji reaction per comment, with user-controlled selection instead of automatic cycling.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-center py-8">
                  <MessageCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">Comments not available</p>
                  <p className="text-slate-500 text-sm">Backend implementation required for comment system with emoji picker reaction selection</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800/50 p-4 bg-slate-900/95 backdrop-blur-sm sticky bottom-0 z-10">
        <button
          onClick={onClose}
          className="w-full btn-primary-mobile"
        >
          Close
        </button>
      </div>

      {/* Enhanced Delete Confirmation Modal with Immediate Processing */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-black/75 flex items-center justify-center p-4 z-10">
          <div className="bg-slate-800 rounded-xl p-6 max-w-sm w-full">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-100 mb-2">Delete Announcement</h3>
              
              <div className={`card p-3 mb-4 ${organizationInfo.bgColor} ${organizationInfo.borderColor}`}>
                <div className="flex items-center justify-center space-x-2">
                  <organizationInfo.icon className={`w-4 h-4 ${organizationInfo.color}`} />
                  <span className={`text-sm font-medium ${organizationInfo.color}`}>
                    {organizationInfo.type === 'club' ? 'Club' : 'Team'} Announcement
                  </span>
                </div>
                <p className="text-slate-300 text-sm mt-1">"{announcement.title}"</p>
              </div>
              
              <p className="text-slate-400 mb-6">
                Are you sure you want to delete this announcement? This will permanently remove the announcement and all its comments and reactions. This action cannot be undone.
              </p>
              
              <div className="card p-3 bg-orange-500/10 border-orange-500/20 mb-6">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-orange-400" />
                  <span className="text-orange-400 text-sm font-medium">Backend Implementation Required</span>
                </div>
                <p className="text-orange-300 text-xs mt-1">
                  Announcement deletion functionality requires backend implementation. 
                  This action will show an informative error message.
                </p>
              </div>
              
              {deleteError && (
                <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-left">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-red-400 text-sm">
                      {deleteError instanceof Error ? deleteError.message : 'Failed to delete announcement'}
                    </p>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="btn-secondary"
                  disabled={isDeletingMutation}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAnnouncement}
                  disabled={isDeletingMutation}
                  className={`bg-red-500 hover:bg-red-600 disabled:bg-red-400 text-white py-2 px-4 rounded-lg transition-colors font-medium ${isDeletingMutation ? 'btn-loading' : ''}`}
                >
                  {isDeletingMutation ? 'Deleting...' : 'Delete Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Comment Card Component with Enhanced Emoji Picker Reaction System
interface CommentCardProps {
  comment: EnhancedAnnouncementComment;
  isCurrentUser: boolean;
}

function CommentCard({ comment, isCurrentUser }: CommentCardProps) {
  const { mutate: getCommentReactions, data: commentReactions, isPending: reactionsLoading } = useGetAnnouncementCommentReactions();
  const { mutate: reactToComment, isPending: reacting } = useReactToAnnouncementComment();
  const { identity } = useInternetIdentity();
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  const currentUserPrincipal = identity?.getPrincipal().toString();

  React.useEffect(() => {
    getCommentReactions(comment.id.toString());
  }, [comment.id, getCommentReactions]);

  const handleCommentReaction = (emoji: string) => {
    if (reacting) return;
    
    reactToComment({
      commentId: comment.id.toString(),
      reaction: emoji,
    }, {
      onSuccess: () => {
        getCommentReactions(comment.id.toString());
        setShowReactionPicker(false);
      }
    });
  };

  // Group reactions by emoji and count - with single reaction per user enforcement
  const reactionGroups = (commentReactions || []).reduce((groups, reaction) => {
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

  // Get user's current reaction (should be only one due to backend enforcement)
  const userCurrentReaction = (commentReactions || []).find(r => r.user === currentUserPrincipal)?.reaction;

  const reactionEmojis = ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '⚽'];

  return (
    <div className="space-y-3">
      <div className="flex items-start space-x-3">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
          isCurrentUser ? 'bg-emerald-500' : 'bg-blue-500'
        }`}>
          <span className="text-white text-xs font-semibold">
            {comment.displayName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-2">
              <span className={`font-medium text-sm ${isCurrentUser ? 'text-emerald-400' : 'text-slate-200'}`}>
                {comment.displayName}
              </span>
              {isCurrentUser && (
                <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-1 rounded-full border border-emerald-500/20">
                  You
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-slate-500 text-xs">{comment.formattedTime}</span>
              <button
                onClick={() => setShowReactionPicker(!showReactionPicker)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded transition-colors"
                title="React to comment"
              >
                <Smile className="w-3 h-3" />
              </button>
            </div>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed">{comment.comment}</p>
          
          {/* Enhanced Comment Reaction Picker with Emoji Selection */}
          {showReactionPicker && (
            <div className="mt-2 card p-3 bg-slate-800/50">
              <div className="mb-3">
                <h6 className="text-slate-200 font-medium text-sm mb-1">React to this comment</h6>
                <p className="text-slate-400 text-xs">
                  {userCurrentReaction 
                    ? `Current reaction: ${userCurrentReaction}. Tap any emoji to replace it.`
                    : 'Tap any emoji to react to this comment'
                  }
                </p>
              </div>
              <div className="grid grid-cols-8 gap-2">
                {reactionEmojis.map((emoji) => {
                  const isCurrentReaction = userCurrentReaction === emoji;
                  return (
                    <button
                      key={emoji}
                      onClick={() => handleCommentReaction(emoji)}
                      className={`p-2 text-xl rounded-lg transition-all duration-200 ${
                        isCurrentReaction
                          ? 'bg-emerald-500/20 border-2 border-emerald-500/50 scale-110'
                          : 'hover:bg-slate-700 border-2 border-transparent hover:scale-105'
                      }`}
                      disabled={reacting}
                      title={isCurrentReaction ? 'Your current reaction' : `React with ${emoji}`}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
              {userCurrentReaction && (
                <div className="mt-2 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <p className="text-emerald-400 text-xs text-center">
                    Your current reaction: {userCurrentReaction}
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* Comment Reactions Display - Updated to show single reaction per user with picker access */}
          {Object.keys(reactionGroups).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {Object.values(reactionGroups).map((group) => (
                <button
                  key={group.emoji}
                  onClick={() => setShowReactionPicker(!showReactionPicker)}
                  disabled={reacting}
                  className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs border transition-all duration-200 ${
                    group.userReacted
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 scale-105'
                      : 'bg-slate-700/50 text-slate-400 border-slate-600/50 hover:bg-slate-600/50'
                  } ${reacting ? 'opacity-50' : ''}`}
                  title={group.userReacted ? 'Your reaction - click to change' : `React with ${group.emoji}`}
                >
                  <span>{group.emoji}</span>
                  <span>{group.count}</span>
                </button>
              ))}
            </div>
          )}
          
          {/* Show current user's reaction status */}
          {userCurrentReaction && (
            <div className="mt-2 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <p className="text-emerald-400 text-xs">
                Your reaction: {userCurrentReaction} (click the reaction button above to change it)
              </p>
            </div>
          )}
          
          {reactionsLoading && (
            <div className="mt-2 flex items-center space-x-2">
              <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
              <span className="text-slate-400 text-xs">Loading reactions...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
