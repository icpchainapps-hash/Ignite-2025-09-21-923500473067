import React, { useState } from 'react';
import { Image, Plus, Camera, Upload, Heart, MessageCircle, X, ArrowLeft, Users, Trophy, Crown, Search, Filter, Smile, Send, Loader2, CheckCircle, AlertCircle, Eye, EyeOff, ThumbsUp, Trash2, FolderOpen, Edit3 } from 'lucide-react';
import { useFileUpload, useFileUrl } from '../../blob-storage/FileStorage';
import { useGetUserPhotos, useUploadPhoto, useGetPhotoReactions, useReactToPhoto, useGetPhotoComments, useCommentOnPhoto, useUserRoles, useGetCommentReactions, useReactToComment } from '../../hooks/useQueries';
import { useGetUserClubs, useGetAllTeams } from '../../hooks/useQueries';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { Photo, PhotoReaction, PhotoComment } from '../../backend';
import VaultModal from '../VaultModal';

interface EnhancedPhoto extends Photo {
  organizationName?: string;
  organizationType?: 'club' | 'team';
  reactionCount?: number;
  commentCount?: number;
  userReaction?: string;
}

interface EnhancedPhotoComment extends PhotoComment {
  senderName: string;
  formattedTime: string;
}

interface CommentReaction {
  id: string;
  commentId: string;
  user: string;
  reaction: string;
  timestamp: number;
}

// Helper function to format photo timestamps
const formatPhotoTime = (timestamp: bigint): string => {
  const date = new Date(Number(timestamp / BigInt(1000000)));
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function GalleryPage() {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'club' | 'team'>('all');
  const [showVaultModal, setShowVaultModal] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [newComments, setNewComments] = useState<Record<string, string>>({});
  const [editingComments, setEditingComments] = useState<Set<string>>(new Set());

  const { data: photos, isLoading } = useGetUserPhotos();
  const { data: clubs } = useGetUserClubs();
  const { data: teams } = useGetAllTeams();
  const { identity } = useInternetIdentity();

  // Enhance photos with organization info using actual club and team names
  const enhancedPhotos: EnhancedPhoto[] = (photos || []).map(photo => {
    let organizationName = 'Unknown Organization';
    let organizationType: 'club' | 'team' | undefined;
    
    if (photo.clubId) {
      const club = clubs?.find(c => c.id === photo.clubId);
      organizationName = club?.name || 'Unknown Club';
      organizationType = 'club';
    } else if (photo.teamId) {
      const team = teams?.find(t => t.id === photo.teamId);
      organizationName = team?.name || 'Unknown Team';
      organizationType = 'team';
    }
    
    return {
      ...photo,
      organizationName,
      organizationType,
    };
  });

  // Filter photos based on search and type
  const filteredPhotos = enhancedPhotos.filter(photo => {
    const matchesSearch = !searchQuery || 
      photo.organizationName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'all' || 
      (filterType === 'club' && photo.clubId) ||
      (filterType === 'team' && photo.teamId);
    
    return matchesSearch && matchesType;
  });

  const clubPhotos = enhancedPhotos.filter(p => p.clubId);
  const teamPhotos = enhancedPhotos.filter(p => p.teamId);

  const toggleComments = (photoId: string) => {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(photoId)) {
      newExpanded.delete(photoId);
    } else {
      newExpanded.add(photoId);
    }
    setExpandedComments(newExpanded);
  };

  const updateComment = (photoId: string, comment: string) => {
    setNewComments(prev => ({ ...prev, [photoId]: comment }));
  };

  const toggleEditComment = (photoId: string) => {
    const newEditing = new Set(editingComments);
    if (newEditing.has(photoId)) {
      newEditing.delete(photoId);
      // Clear the comment text when canceling edit
      setNewComments(prev => ({ ...prev, [photoId]: '' }));
    } else {
      newEditing.add(photoId);
    }
    setEditingComments(newEditing);
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Gallery</h1>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setShowVaultModal(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full transition-colors"
            title="Open Vault"
          >
            <FolderOpen className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setShowUploadModal(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white p-3 rounded-full transition-colors"
            title="Upload Photo"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search photos by organization..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-mobile pl-10"
          />
        </div>

        <div className="flex bg-slate-800 rounded-lg p-1 overflow-x-auto">
          {[
            { id: 'all', label: 'All Photos' },
            { id: 'club', label: 'Club Photos' },
            { id: 'team', label: 'Team Photos' },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setFilterType(id as any)}
              className={`py-2 px-4 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                filterType === id
                  ? 'bg-emerald-500 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center mb-2">
            <Camera className="w-5 h-5 text-emerald-500 mr-2" />
            <span className="text-white font-semibold text-sm">Total</span>
          </div>
          <p className="text-xl font-bold text-white">{enhancedPhotos.length}</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center mb-2">
            <Crown className="w-5 h-5 text-blue-500 mr-2" />
            <span className="text-white font-semibold text-sm">Club</span>
          </div>
          <p className="text-xl font-bold text-white">{clubPhotos.length}</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center mb-2">
            <Trophy className="w-5 h-5 text-purple-500 mr-2" />
            <span className="text-white font-semibold text-sm">Team</span>
          </div>
          <p className="text-xl font-bold text-white">{teamPhotos.length}</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center mb-2">
            <FolderOpen className="w-5 h-5 text-orange-500 mr-2" />
            <span className="text-white font-semibold text-sm">Vault</span>
          </div>
          <button
            onClick={() => setShowVaultModal(true)}
            className="text-xl font-bold text-orange-400 hover:text-orange-300 transition-colors"
          >
            Browse
          </button>
        </div>
      </div>

      {/* Vault Access Notice */}
      <div className="card p-4 bg-blue-500/10 border-blue-500/20">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <FolderOpen className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-slate-100">Enhanced Vault Access</h4>
              <button
                onClick={() => setShowVaultModal(true)}
                className="text-blue-400 hover:text-blue-300 text-sm font-medium"
              >
                Open Vault →
              </button>
            </div>
            <p className="text-slate-400 text-sm mt-1">
              Access organized folders with both images and files. Switch between file types within each club/team folder.
            </p>
          </div>
        </div>
      </div>

      {/* Enhanced Comment System Notice */}
      <div className="card p-4 bg-purple-500/10 border-purple-500/20">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-slate-100 mb-2">Enhanced Comment System</h4>
            <div className="text-slate-300 text-sm space-y-1">
              <p>✅ One comment per user per photo - edit to update your comment</p>
              <p>✅ Full emoji support within comment text 😊🎉⚽</p>
              <p>✅ React to individual comments with emoji reactions</p>
              <p>✅ Mobile-optimized touch interface for reactions</p>
              <p>✅ Real-time updates and notifications</p>
            </div>
          </div>
        </div>
      </div>

      {/* Photos List - Full Width with Inline Interactions */}
      {isLoading ? (
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="w-full h-64 bg-slate-700 rounded-lg mb-4"></div>
              <div className="h-4 bg-slate-700 rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-slate-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : filteredPhotos.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Camera className="w-8 h-8 text-slate-600" />
          </div>
          <h3 className="text-xl font-semibold text-slate-100 mb-3">
            {searchQuery || filterType !== 'all' ? 'No Photos Found' : 'No Photos Yet'}
          </h3>
          <p className="text-slate-400 leading-relaxed mb-6">
            {searchQuery || filterType !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : 'Share photos from your club activities and events with your teams and clubs.'
            }
          </p>
          {!searchQuery && filterType === 'all' && (
            <div className="space-y-3">
              <button 
                onClick={() => setShowUploadModal(true)}
                className="btn-primary-mobile"
              >
                Upload First Photo
              </button>
              <button 
                onClick={() => setShowVaultModal(true)}
                className="btn-secondary-mobile"
              >
                <FolderOpen className="w-5 h-5 mr-2" />
                Browse Vault
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredPhotos.map((photo) => (
            <FullWidthPhotoCard
              key={photo.id.toString()}
              photo={photo}
              isCommentsExpanded={expandedComments.has(photo.id.toString())}
              onToggleComments={() => toggleComments(photo.id.toString())}
              newComment={newComments[photo.id.toString()] || ''}
              onUpdateComment={(comment) => updateComment(photo.id.toString(), comment)}
              isEditingComment={editingComments.has(photo.id.toString())}
              onToggleEditComment={() => toggleEditComment(photo.id.toString())}
            />
          ))}
        </div>
      )}

      {showUploadModal && (
        <PhotoUploadModal onClose={() => setShowUploadModal(false)} />
      )}

      {showVaultModal && (
        <VaultModal onClose={() => setShowVaultModal(false)} />
      )}
    </div>
  );
}

interface FullWidthPhotoCardProps {
  photo: EnhancedPhoto;
  isCommentsExpanded: boolean;
  onToggleComments: () => void;
  newComment: string;
  onUpdateComment: (comment: string) => void;
  isEditingComment: boolean;
  onToggleEditComment: () => void;
}

function FullWidthPhotoCard({ 
  photo, 
  isCommentsExpanded, 
  onToggleComments, 
  newComment, 
  onUpdateComment,
  isEditingComment,
  onToggleEditComment
}: FullWidthPhotoCardProps) {
  const { data: imageUrl } = useFileUrl(photo.filePath);
  const { mutate: getReactions, data: reactions, isPending: reactionsLoading } = useGetPhotoReactions();
  const { mutate: reactToPhoto, isPending: reacting } = useReactToPhoto();
  const { mutate: getComments, data: comments, isPending: commentsLoading } = useGetPhotoComments();
  const { mutate: commentOnPhoto, isPending: commenting } = useCommentOnPhoto();
  const { identity } = useInternetIdentity();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showCommentEmojiPicker, setShowCommentEmojiPicker] = useState(false);

  const currentUserPrincipal = identity?.getPrincipal().toString();

  React.useEffect(() => {
    getReactions(photo.id.toString());
    getComments(photo.id.toString());
  }, [photo.id, getReactions, getComments]);

  const likeCount = reactions?.filter(r => r.reaction === 'like').length || 0;
  const userHasLiked = reactions?.some(r => r.user.toString() === currentUserPrincipal && r.reaction === 'like') || false;
  const commentCount = comments?.length || 0;

  // Check if current user has already commented on this photo
  const userExistingComment = comments?.find(c => c.user.toString() === currentUserPrincipal);
  const hasUserCommented = !!userExistingComment;

  const handleLike = () => {
    if (reacting) return;
    
    reactToPhoto({
      photoId: photo.id.toString(),
      reaction: 'like',
    }, {
      onSuccess: () => {
        getReactions(photo.id.toString());
      }
    });
  };

  const handleEmojiReaction = (emoji: string) => {
    if (reacting) return;
    
    reactToPhoto({
      photoId: photo.id.toString(),
      reaction: emoji,
    }, {
      onSuccess: () => {
        getReactions(photo.id.toString());
        setShowEmojiPicker(false);
      }
    });
  };

  const handleComment = () => {
    if (!newComment.trim() || commenting) return;
    
    commentOnPhoto({
      photoId: photo.id.toString(),
      comment: newComment.trim(),
    }, {
      onSuccess: () => {
        onUpdateComment('');
        getComments(photo.id.toString());
        if (isEditingComment) {
          onToggleEditComment();
        }
      }
    });
  };

  const addEmojiToComment = (emoji: string) => {
    onUpdateComment(newComment + emoji);
    setShowCommentEmojiPicker(false);
  };

  // Initialize comment text when editing existing comment
  React.useEffect(() => {
    if (isEditingComment && userExistingComment && !newComment) {
      onUpdateComment(userExistingComment.comment);
    }
  }, [isEditingComment, userExistingComment, newComment, onUpdateComment]);

  const commonEmojis = ['😀', '😂', '❤️', '👍', '👏', '🔥', '⚽', '🏆', '💪', '🎉', '👌', '😍'];

  return (
    <div className="card p-0 overflow-hidden">
      {/* Photo Header with Actual Organization Names */}
      <div className="p-4 border-b border-slate-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              photo.organizationType === 'club' 
                ? 'bg-blue-500/20' 
                : 'bg-purple-500/20'
            }`}>
              {photo.organizationType === 'club' ? (
                <Crown className="w-5 h-5 text-blue-400" />
              ) : (
                <Trophy className="w-5 h-5 text-purple-400" />
              )}
            </div>
            <div>
              <h4 className="font-semibold text-slate-100">
                {photo.organizationName}
              </h4>
              <div className="flex items-center space-x-2">
                <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs border ${
                  photo.organizationType === 'club' 
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                }`}>
                  {photo.organizationType === 'club' ? (
                    <Crown className="w-3 h-3" />
                  ) : (
                    <Trophy className="w-3 h-3" />
                  )}
                  <span>{photo.organizationName}</span>
                </div>
                <span className="text-slate-400 text-sm">
                  {formatPhotoTime(photo.timestamp)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full Width Photo Display */}
      <div className="relative w-full">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`Photo from ${photo.organizationName}`}
            className="w-full object-cover"
            style={{ maxHeight: '70vh', minHeight: '300px' }}
          />
        ) : (
          <div className="w-full h-64 bg-slate-700 flex items-center justify-center">
            <Camera className="w-12 h-12 text-slate-500" />
          </div>
        )}
      </div>

      {/* Inline Reactions and Comments - Direct interaction without clicking */}
      <div className="p-4 space-y-4">
        {/* Reaction Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleLike}
              disabled={reacting}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                userHasLiked
                  ? 'bg-red-500 text-white'
                  : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              } ${reacting ? 'opacity-50' : ''}`}
            >
              {reacting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Heart className={`w-4 h-4 ${userHasLiked ? 'fill-current' : ''}`} />
              )}
              <span>{likeCount}</span>
            </button>
            
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
              disabled={reacting}
            >
              <Smile className="w-4 h-4" />
            </button>

            <button
              onClick={onToggleComments}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{commentCount}</span>
            </button>
          </div>
        </div>

        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div className="card p-4 bg-slate-800/50">
            <div className="grid grid-cols-6 gap-2">
              {commonEmojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiReaction(emoji)}
                  className="p-2 text-2xl hover:bg-slate-700 rounded-lg transition-colors"
                  disabled={reacting}
                >
                  {emoji}
                </button>
              ))}
            </div>
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
              const userReacted = reactions.some(r => r.user.toString() === currentUserPrincipal && r.reaction === reaction);
              
              return (
                <div
                  key={reaction}
                  className={`flex items-center space-x-1 px-2 py-1 rounded-full text-sm border ${
                    userReacted
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-700/50 text-slate-400 border-slate-600/50'
                  }`}
                >
                  <span>{reaction === 'like' ? '❤️' : reaction}</span>
                  <span>{count}</span>
                </div>
              );
            })}
          </div>
        ) : null}

        {/* Comments Section - Always visible for direct interaction */}
        <div className="space-y-4 border-t border-slate-800/50 pt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-slate-200 font-medium">Comments</h4>
            <button
              onClick={onToggleComments}
              className="text-slate-400 hover:text-slate-200 text-sm"
            >
              {isCommentsExpanded ? 'Hide' : 'Show'} ({commentCount})
            </button>
          </div>
          
          {/* Comment Input - Enhanced with emoji support and edit mode */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-slate-200 font-medium text-sm">
                {hasUserCommented ? (isEditingComment ? 'Edit Your Comment' : 'Your Comment') : 'Add Comment'}
              </h5>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowCommentEmojiPicker(!showCommentEmojiPicker)}
                  className="p-1 text-slate-400 hover:text-slate-200 rounded transition-colors"
                  title="Add emoji"
                >
                  <Smile className="w-4 h-4" />
                </button>
                {hasUserCommented && !isEditingComment && (
                  <button
                    onClick={onToggleEditComment}
                    className="p-1 text-slate-400 hover:text-slate-200 rounded transition-colors"
                    title="Edit your comment"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Emoji Picker for Comments */}
            {showCommentEmojiPicker && (
              <div className="card p-3 bg-slate-800/50">
                <div className="grid grid-cols-8 gap-2">
                  {commonEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => addEmojiToComment(emoji)}
                      className="p-2 text-xl hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Show existing comment if user has commented and not editing */}
            {hasUserCommented && !isEditingComment && (
              <div className="card p-3 bg-emerald-500/10 border-emerald-500/20">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-semibold">
                      {userExistingComment?.senderName?.charAt(0).toUpperCase() || 'Y'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-emerald-400 text-sm">Your Comment</span>
                      <button
                        onClick={onToggleEditComment}
                        className="text-emerald-300 hover:text-emerald-200 text-xs flex items-center space-x-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    </div>
                    <p className="text-emerald-300 text-sm leading-relaxed">{userExistingComment?.comment}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Comment Input - Show when no comment exists or when editing */}
            {(!hasUserCommented || isEditingComment) && (
              <div className="flex space-x-3">
                <textarea
                  value={newComment}
                  onChange={(e) => onUpdateComment(e.target.value)}
                  placeholder={hasUserCommented ? "Edit your comment... (emojis supported 😊)" : "Write a comment... (emojis supported 😊)"}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 resize-none min-h-[60px]"
                  disabled={commenting}
                />
                <div className="flex flex-col space-y-2">
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
                  {isEditingComment && (
                    <button
                      onClick={() => {
                        onToggleEditComment();
                        onUpdateComment('');
                      }}
                      className="bg-slate-600 hover:bg-slate-500 text-white p-2 rounded-lg transition-colors flex items-center justify-center min-w-[40px]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Comment Status Indicator */}
            <div className="text-center">
              <p className="text-slate-400 text-xs">
                {hasUserCommented 
                  ? (isEditingComment 
                    ? 'Editing your comment - changes will update your existing comment'
                    : 'You have commented on this photo. Click Edit to update your comment.')
                  : 'Each user can leave one comment per photo'
                }
              </p>
            </div>
          </div>

          {/* Comments List - Show when expanded */}
          {isCommentsExpanded && (
            <div className="space-y-4">
              {commentsLoading ? (
                <div className="space-y-3">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="card p-3 animate-pulse">
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-slate-700 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-3 bg-slate-700 rounded w-1/4 mb-2"></div>
                          <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : !comments || comments.length === 0 ? (
                <div className="text-center py-4">
                  <MessageCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">No comments yet</p>
                  <p className="text-slate-500 text-xs">Be the first to comment!</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {comments.map((comment) => (
                    <CommentCard
                      key={comment.id.toString()}
                      comment={comment}
                      photoId={photo.id.toString()}
                      isCurrentUser={comment.user.toString() === currentUserPrincipal}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface CommentCardProps {
  comment: EnhancedPhotoComment;
  photoId: string;
  isCurrentUser: boolean;
}

function CommentCard({ comment, photoId, isCurrentUser }: CommentCardProps) {
  const { mutate: getCommentReactions, data: commentReactions, isPending: reactionsLoading } = useGetCommentReactions();
  const { mutate: reactToComment, isPending: reacting } = useReactToComment();
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

  // Group reactions by emoji and count
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

  const reactionEmojis = ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '⚽'];

  return (
    <div className="space-y-3">
      <div className="flex items-start space-x-3">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
          isCurrentUser ? 'bg-emerald-500' : 'bg-blue-500'
        }`}>
          <span className="text-white text-xs font-semibold">
            {comment.senderName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-2">
              <span className={`font-medium text-sm ${isCurrentUser ? 'text-emerald-400' : 'text-slate-200'}`}>
                {comment.senderName}
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
          
          {/* Comment Reaction Picker */}
          {showReactionPicker && (
            <div className="mt-2 card p-2 bg-slate-800/50">
              <div className="grid grid-cols-8 gap-1">
                {reactionEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleCommentReaction(emoji)}
                    className="p-1 text-lg hover:bg-slate-700 rounded transition-colors"
                    disabled={reacting}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Comment Reactions Display */}
          {Object.keys(reactionGroups).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {Object.values(reactionGroups).map((group) => (
                <button
                  key={group.emoji}
                  onClick={() => handleCommentReaction(group.emoji)}
                  disabled={reacting}
                  className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs border transition-all duration-200 ${
                    group.userReacted
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 scale-105'
                      : 'bg-slate-700/50 text-slate-400 border-slate-600/50 hover:bg-slate-600/50'
                  } ${reacting ? 'opacity-50' : ''}`}
                >
                  <span>{group.emoji}</span>
                  <span>{group.count}</span>
                </button>
              ))}
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

interface PhotoUploadModalProps {
  onClose: () => void;
}

function PhotoUploadModal({ onClose }: PhotoUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [organizationType, setOrganizationType] = useState<'club' | 'team'>('club');
  const [organizationId, setOrganizationId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { mutate: uploadPhoto, isPending, error } = useUploadPhoto();
  const { data: clubs } = useGetUserClubs();
  const { data: teams } = useGetAllTeams();
  const { identity } = useInternetIdentity();
  const { getAccessibleClubsForPhotos, getAccessibleTeamsForPhotos } = useUserRoles();

  React.useEffect(() => {
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

  // Get accessible organizations (same logic as announcements/chat threads)
  const accessibleClubs = getAccessibleClubsForPhotos();
  const accessibleTeams = getAccessibleTeamsForPhotos();

  const availableOrganizations = [
    ...accessibleClubs.map(club => ({
      id: club.id.toString(),
      name: club.name,
      type: 'club' as const,
    })),
    ...accessibleTeams.map(team => ({
      id: team.id.toString(),
      name: team.name,
      type: 'team' as const,
    })),
  ];

  const filteredOrganizations = availableOrganizations.filter(org => org.type === organizationType);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!file) {
      newErrors.file = 'Please select a photo';
    }

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!organizationId) {
      newErrors.organizationId = `Please select a ${organizationType}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpload = async () => {
    if (!validateForm() || !file) return;

    const photoData = {
      file,
      title: title.trim(),
      description: description.trim(),
      clubId: organizationType === 'club' ? organizationId : undefined,
      teamId: organizationType === 'team' ? organizationId : undefined,
    };

    uploadPhoto(photoData, {
      onSuccess: () => {
        onClose();
      },
      onError: (error) => {
        console.error('Upload failed:', error);
      }
    });
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'organizationType') {
      setOrganizationType(value as 'club' | 'team');
      setOrganizationId(''); // Reset organization selection
    } else if (field === 'organizationId') {
      setOrganizationId(value);
    } else if (field === 'title') {
      setTitle(value);
    } else if (field === 'description') {
      setDescription(value);
    }

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const getSelectedOrganizationName = () => {
    const selected = availableOrganizations.find(org => org.id === organizationId);
    return selected?.name || '';
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-slate-800/50 bg-slate-900/95 backdrop-blur-sm sticky top-0 z-10">
        <button
          onClick={onClose}
          className="p-2 -ml-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold text-slate-100">Upload Photo</h1>
        <button
          onClick={onClose}
          className="p-2 -mr-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-sm font-medium">
            {error instanceof Error ? error.message : 'Failed to upload photo'}
          </p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 pb-32">
          <div className="space-y-6">
            {/* File Selection */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-300">
                Select Photo *
              </label>
              <div className={`border-2 border-dashed rounded-xl p-6 text-center relative ${
                errors.file ? 'border-red-500/50' : 'border-slate-600'
              }`}>
                {file ? (
                  <div>
                    <img 
                      src={URL.createObjectURL(file)} 
                      alt="Preview" 
                      className="w-full h-48 object-cover rounded-lg mb-3"
                    />
                    <p className="text-white text-sm font-medium">{file.name}</p>
                  </div>
                ) : (
                  <div className="py-8">
                    <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-400 text-lg font-medium mb-2">Tap to select a photo</p>
                    <p className="text-slate-500 text-sm">JPG, PNG, or GIF up to 10MB</p>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isPending}
                />
              </div>
              {errors.file && <p className="text-red-400 text-sm mt-2">{errors.file}</p>}
            </div>

            {/* Organization Type */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-300">
                <Users className="w-4 h-4 inline mr-2" />
                Share With *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleInputChange('organizationType', 'club')}
                  className={`btn-mobile ${
                    organizationType === 'club'
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                  }`}
                  disabled={isPending || accessibleClubs.length === 0}
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Club {accessibleClubs.length === 0 && '(None)'}
                </button>
                <button
                  type="button"
                  onClick={() => handleInputChange('organizationType', 'team')}
                  className={`btn-mobile ${
                    organizationType === 'team'
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                  }`}
                  disabled={isPending || accessibleTeams.length === 0}
                >
                  <Trophy className="w-4 h-4 mr-2" />
                  Team {accessibleTeams.length === 0 && '(None)'}
                </button>
              </div>
              <p className="text-slate-400 text-sm">
                {organizationType === 'club' 
                  ? `Select a club you manage (${accessibleClubs.length} available)`
                  : `Select a team you manage (${accessibleTeams.length} available)`
                }
              </p>
            </div>

            {/* Organization Selection */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-300">
                Select {organizationType === 'club' ? 'Club' : 'Team'} *
              </label>
              
              <div className="card p-4 max-h-48 overflow-y-auto">
                {filteredOrganizations.length === 0 ? (
                  <div className="text-center py-6">
                    <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">
                      No {organizationType}s available for photo sharing.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredOrganizations.map((organization) => (
                      <label
                        key={organization.id}
                        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-800/50 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="organization"
                          value={organization.id}
                          checked={organizationId === organization.id}
                          onChange={(e) => handleInputChange('organizationId', e.target.value)}
                          className="w-4 h-4 text-emerald-500 bg-slate-800 border-slate-600 focus:ring-emerald-500 focus:ring-2"
                          disabled={isPending}
                        />
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          organization.type === 'club' ? 'bg-blue-500' : 'bg-purple-500'
                        }`}>
                          <span className="text-white text-xs font-semibold">
                            {organization.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="text-slate-200 text-sm font-medium">{organization.name}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {errors.organizationId && <p className="text-red-400 text-sm mt-2">{errors.organizationId}</p>}
            </div>

            {/* Title */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-300">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className={`input-mobile ${errors.title ? 'input-error' : ''}`}
                placeholder="Enter photo title"
                disabled={isPending}
              />
              {errors.title && <p className="text-red-400 text-sm mt-2">{errors.title}</p>}
            </div>

            {/* Description */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-300">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="input-mobile min-h-[100px] resize-none"
                placeholder="Describe the photo (optional)"
                disabled={isPending}
              />
            </div>

            {/* Preview */}
            {file && organizationId && (
              <div className="card p-4 bg-emerald-500/10 border-emerald-500/20">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Camera className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-emerald-400 font-medium">Photo Upload Preview</p>
                    <p className="text-emerald-300 text-sm mb-2">
                      Sharing "{title || file.name}" with {getSelectedOrganizationName()}
                    </p>
                    <div className="flex items-center space-x-2">
                      <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs border ${
                        organizationType === 'club' 
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                      }`}>
                        {organizationType === 'club' ? (
                          <Crown className="w-3 h-3" />
                        ) : (
                          <Trophy className="w-3 h-3" />
                        )}
                        <span>{organizationType === 'club' ? 'Club' : 'Team'}</span>
                      </div>
                      <span className="text-emerald-300 text-xs">
                        Will be organized in Vault as: Image
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Permission Notice */}
            <div className="card p-4 bg-blue-500/10 border-blue-500/20">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-slate-200 font-medium">Photo Organization</p>
                  <p className="text-slate-400 text-sm">
                    Photos are automatically organized in the Vault by {organizationType}. 
                    Only members of the selected {organizationType} will be able to view, react to, and comment on this photo.
                  </p>
                </div>
              </div>
            </div>

            {/* Enhanced Photo Interaction Notifications */}
            <div className="card p-4 bg-purple-500/10 border-purple-500/20">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-100 mb-2">Enhanced Photo Interaction System</h4>
                  <div className="text-slate-300 text-sm space-y-2">
                    <p>When members interact with your photos:</p>
                    <ul className="list-disc list-inside space-y-1 text-slate-400 ml-4">
                      <li><strong>Comments:</strong> One comment per user - editing updates existing comment</li>
                      <li><strong>Emoji Support:</strong> Full emoji integration within comment text 😊🎉⚽</li>
                      <li><strong>Comment Reactions:</strong> Users can react to individual comments with emojis</li>
                      <li><strong>Notifications:</strong> All {organizationType} members get notified of comments</li>
                      <li><strong>Photo Reactions:</strong> You get notified when someone reacts to your photos</li>
                      <li><strong>Comment Reactions:</strong> Comment authors get notified of reactions to their comments</li>
                      <li><strong>Real-time Updates:</strong> All interactions appear immediately</li>
                      <li><strong>Mobile Optimized:</strong> Touch-friendly interface for all interactions</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800/50 p-4 bg-slate-900/95 backdrop-blur-sm sticky bottom-0 z-10">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            className="btn-secondary-mobile"
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || !title.trim() || !organizationId || isPending}
            className={`btn-primary-mobile ${isPending ? 'btn-loading' : ''}`}
          >
            {isPending ? 'Uploading...' : 'Upload Photo'}
          </button>
        </div>
      </div>
    </div>
  );
}
