import React, { useState, useEffect } from 'react';
import { Image, Plus, Camera, Upload, MessageCircle, X, ArrowLeft, Users, Trophy, Crown, Search, Filter, Smile, Send, Loader2, CheckCircle, AlertCircle, Eye, EyeOff, ThumbsUp, Trash2, FolderOpen, Edit3 } from 'lucide-react';
import { useFileUpload, useFileUrl } from '../../blob-storage/FileStorage';
import { useGetUserPhotos, useUploadPhoto, useGetPhotoReactions, useReactToPhoto, useGetPhotoComments, useCommentOnPhoto, useGetCommentReactions, useReactToComment } from '../../hooks/useVault';
import { useGetUserClubs } from '../../hooks/useClubs';
import { useGetAllTeams } from '../../hooks/useTeams';
import { useUserRoles } from '../../hooks/useRoles';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { useActor } from '../../hooks/useActor';
import { Photo, PhotoReaction, PhotoComment } from '../../backend';
import VaultModal from '../VaultModal';

interface EnhancedPhoto extends Photo {
  organizationName?: string;
  organizationType?: 'club' | 'team';
  clubName?: string;
  teamName?: string;
  reactionCount?: number;
  commentCount?: number;
  userReaction?: string;
  uploaderDisplayName?: string;
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

interface MediaPageProps {
  highlightPhotoId?: string | null;
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

export default function MediaPage({ highlightPhotoId }: MediaPageProps) {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'club' | 'team'>('all');
  const [showVaultModal, setShowVaultModal] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [newComments, setNewComments] = useState<Record<string, string>>({});

  const { data: photos, isLoading } = useGetUserPhotos();
  const { data: clubs } = useGetUserClubs();
  const { data: teams } = useGetAllTeams();
  const { identity } = useInternetIdentity();
  const { actor } = useActor();

  // Enhance photos with organization info and uploader display name
  const [enhancedPhotos, setEnhancedPhotos] = useState<EnhancedPhoto[]>([]);

  useEffect(() => {
    const enhancePhotos = async () => {
      if (!photos || !actor) {
        setEnhancedPhotos([]);
        return;
      }

      const enhanced: EnhancedPhoto[] = [];

      for (const photo of photos) {
        let organizationName = 'Unknown Organization';
        let organizationType: 'club' | 'team' | undefined;
        let clubName = '';
        let teamName = '';
        let uploaderDisplayName = 'Unknown User';

        // Get uploader display name
        try {
          const uploaderProfile = await actor.getUserProfile(photo.uploader);
          uploaderDisplayName = uploaderProfile?.name || photo.uploader.toString();
        } catch (error) {
          console.warn('Failed to get uploader display name:', error);
          uploaderDisplayName = photo.uploader.toString();
        }

        if (photo.clubId) {
          const club = clubs?.find(c => c.id === photo.clubId);
          clubName = club?.name || 'Unknown Club';
          
          if (photo.teamId) {
            // This is a team photo with club association
            const team = teams?.find(t => t.id === photo.teamId);
            teamName = team?.name || 'Unknown Team';
            organizationName = `${teamName} (${clubName})`;
            organizationType = 'team';
          } else {
            // This is a club-only photo
            organizationName = clubName;
            organizationType = 'club';
          }
        } else if (photo.teamId) {
          // This is a team photo without club association (legacy)
          const team = teams?.find(t => t.id === photo.teamId);
          teamName = team?.name || 'Unknown Team';
          organizationName = teamName;
          organizationType = 'team';
        }
        
        enhanced.push({
          ...photo,
          organizationName,
          organizationType,
          clubName,
          teamName,
          uploaderDisplayName,
        });
      }

      setEnhancedPhotos(enhanced);
    };

    enhancePhotos();
  }, [photos, clubs, teams, actor]);

  // Filter photos based on search and type
  const filteredPhotos = enhancedPhotos.filter(photo => {
    const matchesSearch = !searchQuery || 
      photo.organizationName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      photo.clubName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      photo.teamName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      photo.uploaderDisplayName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'all' || 
      (filterType === 'club' && photo.clubId && !photo.teamId) ||
      (filterType === 'team' && photo.teamId);
    
    return matchesSearch && matchesType;
  });

  const clubPhotos = enhancedPhotos.filter(p => p.clubId && !p.teamId);
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

  // Auto-scroll to highlighted photo when it becomes available
  useEffect(() => {
    if (highlightPhotoId && filteredPhotos.length > 0) {
      const photoElement = document.getElementById(`photo-${highlightPhotoId}`);
      if (photoElement) {
        photoElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add a highlight effect
        photoElement.classList.add('ring-4', 'ring-emerald-500/50', 'ring-offset-4', 'ring-offset-slate-950');
        
        // Remove highlight after animation
        setTimeout(() => {
          photoElement.classList.remove('ring-4', 'ring-emerald-500/50', 'ring-offset-4', 'ring-offset-slate-950');
        }, 3000);
      }
    }
  }, [highlightPhotoId, filteredPhotos]);

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Media</h1>
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
            placeholder="Search photos by organization or poster..."
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
            <h4 className="font-medium text-slate-100 mb-2">Enhanced Comment & Reaction System</h4>
            <div className="text-slate-300 text-sm space-y-1">
              <p>✅ Compact emoji reaction button matching comment emoji icon style</p>
              <p>✅ One reaction per user per photo - new reactions replace previous ones</p>
              <p>✅ Multiple comments per user per photo - add as many comments as you want</p>
              <p>✅ Integrated emoji icon inside comment input for seamless emoji insertion</p>
              <p>✅ React to individual comments with emoji reactions</p>
              <p>✅ Mobile-optimized touch interface with consistent styling</p>
              <p>✅ Real-time updates and notifications</p>
              <p>✅ Display actual user names in comments</p>
              <p>✅ Click photo notifications to navigate directly to photos</p>
              <p>✅ Enhanced club-team tagging for team photos</p>
              <p>✅ Photo poster display name as main heading</p>
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
              isHighlighted={highlightPhotoId === photo.id.toString()}
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
  isHighlighted?: boolean;
}

function FullWidthPhotoCard({ 
  photo, 
  isCommentsExpanded, 
  onToggleComments, 
  newComment, 
  onUpdateComment,
  isHighlighted = false
}: FullWidthPhotoCardProps) {
  const { data: imageUrl } = useFileUrl(photo.filePath);
  const { mutate: getReactions, data: reactions, isPending: reactionsLoading } = useGetPhotoReactions();
  const { mutate: reactToPhoto, isPending: reacting } = useReactToPhoto();
  const { mutate: getComments, data: comments, isPending: commentsLoading } = useGetPhotoComments();
  const { mutate: commentOnPhoto, isPending: commenting } = useCommentOnPhoto();
  const { identity } = useInternetIdentity();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const currentUserPrincipal = identity?.getPrincipal().toString();

  React.useEffect(() => {
    getReactions(photo.id.toString());
    getComments(photo.id.toString());
  }, [photo.id, getReactions, getComments]);

  const commentCount = comments?.length || 0;
  const userReaction = reactions?.find(r => r.user.toString() === currentUserPrincipal)?.reaction;

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
      }
    });
  };

  const addEmojiToComment = (emoji: string) => {
    onUpdateComment(newComment + emoji);
  };

  // Unified emoji picker with all reactions including love heart
  const reactionEmojis = ['❤️', '😀', '😂', '👍', '👏', '🔥', '⚽', '🏆', '💪', '🎉', '👌', '😍'];

  return (
    <div 
      id={`photo-${photo.id.toString()}`}
      className={`card p-0 overflow-hidden transition-all duration-300 ${
        isHighlighted ? 'ring-4 ring-emerald-500/50 ring-offset-4 ring-offset-slate-950' : ''
      }`}
    >
      {/* Photo Header with Poster Display Name as Main Heading */}
      <div className="p-4 border-b border-slate-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold">
                {photo.uploaderDisplayName?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div>
              {/* Main heading: Poster's display name */}
              <h4 className="font-semibold text-slate-100 text-lg">
                {photo.uploaderDisplayName || 'Unknown User'}
              </h4>
              {/* Club and team tags underneath */}
              <div className="flex items-center space-x-2 mt-1">
                {/* Enhanced tagging for team photos with club association */}
                {photo.teamId && photo.clubId ? (
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs border bg-blue-500/10 text-blue-400 border-blue-500/20">
                      <Crown className="w-3 h-3" />
                      <span>{photo.clubName}</span>
                    </div>
                    <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs border bg-purple-500/10 text-purple-400 border-purple-500/20">
                      <Trophy className="w-3 h-3" />
                      <span>{photo.teamName}</span>
                    </div>
                  </div>
                ) : photo.clubId ? (
                  <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs border bg-blue-500/10 text-blue-400 border-blue-500/20">
                    <Crown className="w-3 h-3" />
                    <span>{photo.clubName}</span>
                  </div>
                ) : photo.teamId ? (
                  <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs border bg-purple-500/10 text-purple-400 border-purple-500/20">
                    <Trophy className="w-3 h-3" />
                    <span>{photo.teamName}</span>
                  </div>
                ) : null}
                <span className="text-slate-400 text-sm">
                  {formatPhotoTime(photo.timestamp)}
                </span>
              </div>
            </div>
          </div>
          {isHighlighted && (
            <div className="mt-2 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 text-sm font-medium">
                  Navigated from notification
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Full Width Photo Display */}
      <div className="relative w-full">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`Photo from ${photo.uploaderDisplayName}`}
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
        {/* Updated Reaction Interface - Compact emoji icon matching comment style */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
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

            <button
              onClick={onToggleComments}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{commentCount}</span>
            </button>
          </div>
        </div>

        {/* Unified Emoji Picker - All emojis in one interface */}
        {showEmojiPicker && (
          <div className="card p-4 bg-slate-800/50">
            <div className="mb-3">
              <h5 className="text-slate-200 font-medium text-sm mb-2">React to this photo</h5>
              <p className="text-slate-400 text-xs">
                {userReaction 
                  ? 'Tap any emoji to change your reaction (replaces your current reaction)'
                  : 'Tap any emoji to react to this photo'
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
                  <span>{reaction}</span>
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
          
          {/* Comment Input - Updated with integrated emoji icon */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-slate-200 font-medium text-sm">
                Add Comment
              </h5>
            </div>

            {/* Comment Input with integrated emoji icon */}
            <div className="flex space-x-3">
              <div className="flex-1 relative">
                <textarea
                  value={newComment}
                  onChange={(e) => onUpdateComment(e.target.value)}
                  placeholder="Write a comment... (emojis supported 😊)"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 pr-10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 resize-none min-h-[60px]"
                  disabled={commenting}
                />
                <button
                  onClick={() => {
                    // Simple emoji insertion - add a smile emoji
                    onUpdateComment(newComment + '😊');
                  }}
                  className="absolute right-2 top-2 p-1 text-slate-400 hover:text-slate-200 rounded transition-colors"
                  title="Add emoji"
                  disabled={commenting}
                >
                  <Smile className="w-4 h-4" />
                </button>
              </div>
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
              </div>
            </div>

            {/* Comment Status Indicator - Updated for multiple comments */}
            <div className="text-center">
              <p className="text-slate-400 text-xs">
                You can add multiple comments to this photo. Each comment will be posted separately.
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
  const [clubId, setClubId] = useState('');
  const [teamId, setTeamId] = useState('');
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

  // Get accessible organizations
  const accessibleClubs = getAccessibleClubsForPhotos();
  const accessibleTeams = getAccessibleTeamsForPhotos();

  // Filter teams by selected club when uploading team photos
  const filteredTeams = organizationType === 'team' && clubId
    ? accessibleTeams.filter(team => team.clubId.toString() === clubId)
    : accessibleTeams;

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

    if (organizationType === 'club' && !clubId) {
      newErrors.clubId = 'Please select a club';
    }

    if (organizationType === 'team') {
      if (!clubId) {
        newErrors.clubId = 'Please select a club first';
      }
      if (!teamId) {
        newErrors.teamId = 'Please select a team';
      }
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
      clubId: clubId || undefined,
      teamId: organizationType === 'team' ? teamId : undefined,
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
      setClubId(''); // Reset club selection
      setTeamId(''); // Reset team selection
    } else if (field === 'clubId') {
      setClubId(value);
      setTeamId(''); // Reset team selection when club changes
    } else if (field === 'teamId') {
      setTeamId(value);
    } else if (field === 'title') {
      setTitle(value);
    } else if (field === 'description') {
      setDescription(value);
    }

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const getSelectedClubName = () => {
    const selected = accessibleClubs.find(club => club.id.toString() === clubId);
    return selected?.name || '';
  };

  const getSelectedTeamName = () => {
    const selected = filteredTeams.find(team => team.id.toString() === teamId);
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

            {/* Step 1: Club Selection - Always required */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                  clubId ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-slate-300'
                }`}>
                  1
                </div>
                <label className="block text-sm font-medium text-slate-300">
                  <Crown className="w-4 h-4 inline mr-2" />
                  Select Club *
                </label>
              </div>
              
              <div className="card p-4 max-h-48 overflow-y-auto">
                {accessibleClubs.length === 0 ? (
                  <div className="text-center py-6">
                    <Crown className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">
                      No clubs available for photo sharing.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {accessibleClubs.map((club) => (
                      <label
                        key={club.id.toString()}
                        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-800/50 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="club"
                          value={club.id.toString()}
                          checked={clubId === club.id.toString()}
                          onChange={(e) => handleInputChange('clubId', e.target.value)}
                          className="w-4 h-4 text-emerald-500 bg-slate-800 border-slate-600 focus:ring-emerald-500 focus:ring-2"
                          disabled={isPending}
                        />
                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                          <span className="text-white text-xs font-semibold">
                            {club.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="text-slate-200 text-sm font-medium">{club.name}</p>
                          <p className="text-slate-400 text-xs">Club</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {errors.clubId && <p className="text-red-400 text-sm mt-2">{errors.clubId}</p>}
              
              <div className="card p-3 bg-blue-500/10 border-blue-500/20">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-blue-400" />
                  <span className="text-blue-400 text-sm font-medium">Step 1: Club Selection Required</span>
                </div>
                <p className="text-blue-300 text-xs mt-1">
                  {organizationType === 'club' 
                    ? 'Select the club to share this photo with.'
                    : 'Select the club that contains the team you want to share this photo with.'
                  }
                </p>
              </div>
            </div>

            {/* Step 2: Team Selection - Only show for team photos and after club is selected */}
            {organizationType === 'team' && clubId && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                    teamId ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-slate-300'
                  }`}>
                    2
                  </div>
                  <label className="block text-sm font-medium text-slate-300">
                    <Trophy className="w-4 h-4 inline mr-2" />
                    Select Team *
                  </label>
                  <span className="text-slate-400 text-sm">in {getSelectedClubName()}</span>
                </div>
                
                <div className="card p-4 max-h-48 overflow-y-auto">
                  {filteredTeams.length === 0 ? (
                    <div className="text-center py-6">
                      <Trophy className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-slate-400 text-sm">
                        No teams available in {getSelectedClubName()}.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredTeams.map((team) => (
                        <label
                          key={team.id.toString()}
                          className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-800/50 cursor-pointer"
                        >
                          <input
                            type="radio"
                            name="team"
                            value={team.id.toString()}
                            checked={teamId === team.id.toString()}
                            onChange={(e) => handleInputChange('teamId', e.target.value)}
                            className="w-4 h-4 text-emerald-500 bg-slate-800 border-slate-600 focus:ring-emerald-500 focus:ring-2"
                            disabled={isPending}
                          />
                          <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                            <span className="text-white text-xs font-semibold">
                              {team.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className="text-slate-200 text-sm font-medium">{team.name}</p>
                            <p className="text-slate-400 text-xs">Team in {getSelectedClubName()}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                {errors.teamId && <p className="text-red-400 text-sm mt-2">{errors.teamId}</p>}
                
                <div className="card p-3 bg-emerald-500/10 border-emerald-500/20">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 text-sm font-medium">Step 2: Team Selection</span>
                  </div>
                  <p className="text-emerald-300 text-xs mt-1">
                    Select a team from {getSelectedClubName()} to share this photo with the team.
                  </p>
                </div>
              </div>
            )}

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

            {/* Enhanced Preview with Club-Team Association */}
            {file && clubId && (organizationType === 'club' || teamId) && (
              <div className="card p-4 bg-emerald-500/10 border-emerald-500/20">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Camera className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-emerald-400 font-medium">Photo Upload Preview</p>
                    <p className="text-emerald-300 text-sm mb-2">
                      Sharing "{title || file.name}" with {organizationType === 'team' ? `${getSelectedTeamName()} in ${getSelectedClubName()}` : getSelectedClubName()}
                    </p>
                    <div className="flex items-center space-x-2">
                      {organizationType === 'team' && teamId ? (
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs border bg-blue-500/10 text-blue-400 border-blue-500/20">
                            <Crown className="w-3 h-3" />
                            <span>Club: {getSelectedClubName()}</span>
                          </div>
                          <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs border bg-purple-500/10 text-purple-400 border-purple-500/20">
                            <Trophy className="w-3 h-3" />
                            <span>Team: {getSelectedTeamName()}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs border bg-blue-500/10 text-blue-400 border-blue-500/20">
                          <Crown className="w-3 h-3" />
                          <span>Club: {getSelectedClubName()}</span>
                        </div>
                      )}
                      <span className="text-emerald-300 text-xs">
                        Will be organized in Vault as: Image
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Club-Team Association Notice */}
            {organizationType === 'team' && clubId && teamId && (
              <div className="card p-4 bg-blue-500/10 border-blue-500/20">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-slate-200 font-medium">Club-Team Association</p>
                    <p className="text-slate-400 text-sm">
                      This photo will be tagged with both {getSelectedClubName()} (club) and {getSelectedTeamName()} (team).
                      Only team members will be able to view, react to, and comment on this photo.
                    </p>
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
                    Only members of the selected {organizationType === 'team' ? 'team' : 'club'} will be able to view, react to, and comment on this photo.
                    {organizationType === 'team' && ' The photo will be associated with both the club and team for proper organization.'}
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
                      <li><strong>Compact Reaction Button:</strong> Emoji icon matching comment style for visual consistency</li>
                      <li><strong>One-Tap Reactions:</strong> Quick emoji reactions that replace previous ones</li>
                      <li><strong>Multiple Comments:</strong> Users can add multiple comments per photo</li>
                      <li><strong>Integrated Emoji Input:</strong> Emoji icon inside comment box for seamless insertion</li>
                      <li><strong>Comment Reactions:</strong> Users can react to individual comments with emojis</li>
                      <li><strong>Notifications:</strong> All {organizationType} members get notified of comments</li>
                      <li><strong>Photo Reactions:</strong> You get notified when someone reacts to your photos</li>
                      <li><strong>Comment Reactions:</strong> Comment authors get notified of reactions to their comments</li>
                      <li><strong>Real-time Updates:</strong> All interactions appear immediately</li>
                      <li><strong>Mobile Optimized:</strong> Touch-friendly interface for all interactions</li>
                      <li><strong>Display Names:</strong> Comments show actual user display names</li>
                      <li><strong>Direct Navigation:</strong> Click photo notifications to go directly to photos</li>
                      <li><strong>Enhanced Tagging:</strong> Team photos show both club and team tags</li>
                      <li><strong>Poster Identification:</strong> Photo poster's display name shown as main heading</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Upload Flow Notice */}
            <div className="card p-4 bg-emerald-500/10 border-emerald-500/20">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-100 mb-2">Enhanced Upload Flow</h4>
                  <div className="text-slate-300 text-sm space-y-2">
                    <p>Photo upload now supports multi-club team management:</p>
                    <ul className="list-disc list-inside space-y-1 text-slate-400 ml-4">
                      <li><strong>Club Photos:</strong> Direct club selection for club-wide photo sharing</li>
                      <li><strong>Team Photos:</strong> Club selection first, then team selection for proper association</li>
                      <li><strong>Multi-Club Support:</strong> Manage teams across multiple clubs with clear club context</li>
                      <li><strong>Backend Integration:</strong> Photos store both club and team associations when applicable</li>
                      <li><strong>Enhanced Tagging:</strong> Team photos display both club and team names in the UI</li>
                      <li><strong>Organized Structure:</strong> Clear hierarchy for users managing multiple organizations</li>
                      <li><strong>Poster Display:</strong> Your display name will appear as the main heading on the photo</li>
                    </ul>
                    
                    <div className="card p-3 bg-emerald-500/10 border-emerald-500/20 mt-3">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400 font-medium text-sm">ENHANCED CLUB-TEAM FLOW</span>
                      </div>
                      <p className="text-emerald-300 text-xs">
                        Team photos now include club selection for users managing teams across multiple clubs
                      </p>
                    </div>
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
            disabled={
              !file || 
              !title.trim() || 
              !clubId || 
              (organizationType === 'team' && !teamId) || 
              isPending
            }
            className={`btn-primary-mobile ${isPending ? 'btn-loading' : ''}`}
          >
            {isPending ? 'Uploading...' : 'Upload Photo'}
          </button>
        </div>
      </div>
    </div>
  );
}

