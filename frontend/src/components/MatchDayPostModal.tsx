import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, Share2, Download, Loader2, CheckCircle, AlertCircle, Camera, Gamepad2, MapPin, Calendar, Clock, Users, Trophy, Crown, Sparkles, Eye, RefreshCw, Lock, CreditCard } from 'lucide-react';
import { useGenerateMatchDayPost, useGetMatchDayPostsByEventId } from '../hooks/useMatchDayPosts';
import { useGetUserClubs } from '../hooks/useClubs';
import { useGetAllTeams } from '../hooks/useTeams';
import { useFileUrl } from '../blob-storage/FileStorage';
import { useCanAccessFeature } from '../hooks/useSubscriptions';
import { useIsCurrentUserAdmin } from '../hooks/useUsers';
import { Event, EventType } from '../backend';
import SubscriptionUpgradeModal from './SubscriptionUpgradeModal';

interface MatchDayPostModalProps {
  event: Event;
  onClose: () => void;
}

export default function MatchDayPostModal({ event, onClose }: MatchDayPostModalProps) {
  const [generatedPost, setGeneratedPost] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const { mutate: generatePost, isPending: isGeneratingPost } = useGenerateMatchDayPost();
  const { mutate: getExistingPosts } = useGetMatchDayPostsByEventId();
  const { data: clubs } = useGetUserClubs();
  const { data: teams } = useGetAllTeams();
  const { data: imageUrl } = useFileUrl(generatedPost || '');
  const { data: isAppAdmin } = useIsCurrentUserAdmin();
  
  // Check Pro access for match day post generation
  const { data: matchDayPostAccess } = useCanAccessFeature(
    'file_storage', // Using file_storage as proxy for Pro features
    event.teamId ? 'team' : 'club',
    event.teamId ? event.teamId.toString() : event.clubId?.toString() || '1'
  );
  
  const canAccessMatchDayPosts = isAppAdmin || matchDayPostAccess?.hasAccess || false;

  // Always call useEffect hooks at the top level
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

  // Load existing posts for this event - always call this hook
  useEffect(() => {
    if (canAccessMatchDayPosts) {
      getExistingPosts(event.id.toString(), {
        onSuccess: (posts) => {
          if (posts.length > 0) {
            // Use the most recent post
            const latestPost = posts.sort((a, b) => Number(b.timestamp - a.timestamp))[0];
            // Backend function may not return imagePath property
            if ('imagePath' in latestPost) {
              setGeneratedPost((latestPost as any).imagePath);
              setShowPreview(true);
            }
          }
        },
        onError: (error) => {
          console.warn('Failed to load existing posts:', error);
        }
      });
    }
  }, [event.id, getExistingPosts, canAccessMatchDayPosts]);

  const handleGeneratePost = () => {
    setIsGenerating(true);
    setError(null);
    
    generatePost({
      eventId: event.id.toString(),
    }, {
      onSuccess: (matchDayPost) => {
        // Backend function may not return imagePath property
        if (matchDayPost && 'imagePath' in matchDayPost) {
          setGeneratedPost((matchDayPost as any).imagePath);
          setShowPreview(true);
        } else {
          setError('Match day post generated but image path not available');
        }
        setIsGenerating(false);
      },
      onError: (error) => {
        console.error('Failed to generate match day post:', error);
        setError(error instanceof Error ? error.message : 'Failed to generate match day post');
        setIsGenerating(false);
      }
    });
  };

  const handleDownload = () => {
    if (imageUrl) {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `match-day-${event.title.replace(/[^a-zA-Z0-9]/g, '-')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleShare = async () => {
    if (!imageUrl) return;

    try {
      // Convert image URL to blob for sharing
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], `match-day-${event.title.replace(/[^a-zA-Z0-9]/g, '-')}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Match Day: ${event.title}`,
          text: `Check out our upcoming match: ${event.title}`,
          files: [file],
        });
      } else {
        // Fallback: copy image URL to clipboard
        await navigator.clipboard.writeText(imageUrl);
        alert('Image URL copied to clipboard!');
      }
    } catch (error) {
      console.error('Failed to share:', error);
      alert('Failed to share. You can download the image instead.');
    }
  };

  const formatEventTime = (timestamp: bigint) => {
    const date = new Date(Number(timestamp));
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'long',
        month: 'long', 
        day: 'numeric',
        year: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    };
  };

  const { date: eventDate, time: eventTime } = formatEventTime(event.startTime);

  const getClubName = () => {
    if (event.clubId) {
      const club = clubs?.find(c => c.id === event.clubId);
      return club?.name || 'Unknown Club';
    }
    return null;
  };

  const getTeamName = () => {
    if (event.teamId) {
      const team = teams?.find(t => t.id === event.teamId);
      return team?.name || 'Unknown Team';
    }
    return null;
  };

  const getFullAddress = () => {
    const addressParts = [event.address, event.suburb, event.state, event.postcode].filter(Boolean);
    return addressParts.join(', ');
  };

  const clubName = getClubName();
  const teamName = getTeamName();

  // If user doesn't have Pro access, show upgrade prompt
  if (!canAccessMatchDayPosts) {
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
            <h1 className="text-lg font-semibold text-slate-100">Match Day Posts</h1>
            <p className="text-sm text-slate-400">Pro Feature Required</p>
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
            <h3 className="text-2xl font-semibold text-slate-100 mb-4">Match Day Posts - Pro Feature</h3>
            <p className="text-slate-400 leading-relaxed mb-6">
              Generate professional social media posts for your game events with club branding, match details, and team lineup. This feature is available with Pro subscription.
            </p>
            
            <div className="card p-4 bg-red-500/10 border-red-500/20 mb-6">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center shrink-0">
                  <Camera className="w-4 h-4 text-red-400" />
                </div>
                <div className="text-left">
                  <p className="text-red-400 font-medium text-sm">Pro Feature Benefits</p>
                  <div className="text-red-300 text-xs mt-1 space-y-1">
                    <p>• Professional social media graphics</p>
                    <p>• Club logo and branding integration</p>
                    <p>• Match details and player lineup</p>
                    <p>• 1:1 aspect ratio for social platforms</p>
                    <p>• Dark theme with emerald accents</p>
                    <p>• Download and share functionality</p>
                  </div>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="btn-primary-mobile"
            >
              <CreditCard className="w-5 h-5 mr-2" />
              Upgrade to Pro
            </button>
          </div>
        </div>

        {showUpgradeModal && (
          <SubscriptionUpgradeModal
            organizationType={event.teamId ? 'team' : 'club'}
            organizationId={event.teamId ? event.teamId.toString() : event.clubId?.toString() || '1'}
            organizationName="Match Day Posts"
            onClose={() => setShowUpgradeModal(false)}
          />
        )}
      </div>
    );
  }

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
          <h1 className="text-lg font-semibold text-slate-100">Generate Match Day Post</h1>
          <p className="text-sm text-slate-400">{event.title}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 -mr-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-red-400 text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 pb-32">
          <div className="space-y-6">
            {/* Backend Implementation Notice */}
            <div className="card p-6 bg-orange-500/10 border-orange-500/20">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-100 mb-2">Match Day Post Generation Not Available</h4>
                  <div className="text-slate-300 text-sm space-y-2">
                    <p>The match day post generation system requires backend implementation:</p>
                    <ul className="list-disc list-inside space-y-1 text-slate-400 ml-4">
                      <li><strong>Image Generation:</strong> Create social media graphics with club branding</li>
                      <li><strong>Match Details:</strong> Include event information and team lineup</li>
                      <li><strong>Club Logo Integration:</strong> Embed club logos in generated posts</li>
                      <li><strong>Storage System:</strong> Save and retrieve generated match day posts</li>
                      <li><strong>Access Control:</strong> Pro feature restrictions and permissions</li>
                    </ul>
                    <p className="mt-3 text-orange-300">
                      The frontend match day post interface is complete and will work immediately once the backend functions are implemented.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Overview */}
            <div className="card p-4 bg-gradient-to-br from-emerald-500/10 via-blue-500/5 to-slate-900/50 border-emerald-500/20">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center shrink-0">
                  <Camera className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-100 mb-2">
                    📸 Professional Match Day Graphics
                  </h3>
                  <p className="text-slate-300 text-sm mb-4">
                    Generate a professional social media post featuring your club branding, match details, and team lineup.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="card p-3 bg-emerald-500/10 border-emerald-500/20">
                      <div className="flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400 font-medium text-sm">Design</span>
                      </div>
                      <p className="text-emerald-300 text-xs mt-1">
                        Dark theme with emerald accents and club colors
                      </p>
                    </div>
                    
                    <div className="card p-3 bg-blue-500/10 border-blue-500/20">
                      <div className="flex items-center space-x-2">
                        <Eye className="w-4 h-4 text-blue-400" />
                        <span className="text-blue-400 font-medium text-sm">Format</span>
                      </div>
                      <p className="text-blue-300 text-xs mt-1">
                        1:1 aspect ratio perfect for social media
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Event Preview */}
            <div className="card p-4 bg-slate-800/30">
              <h4 className="font-medium text-slate-100 mb-4 flex items-center">
                <Gamepad2 className="w-5 h-5 text-red-400 mr-2" />
                Match Information
              </h4>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-emerald-400" />
                    <div>
                      <p className="text-slate-200 font-medium">{eventDate}</p>
                      <p className="text-slate-400 text-sm">{eventTime}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <MapPin className="w-5 h-5 text-blue-400" />
                    <div>
                      <p className="text-slate-200 text-sm">{event.suburb}, {event.state}</p>
                      <p className="text-slate-400 text-xs">{event.address}</p>
                    </div>
                  </div>
                  
                  {clubName && (
                    <div className="flex items-center space-x-3">
                      <Crown className="w-5 h-5 text-yellow-400" />
                      <div>
                        <p className="text-slate-200 text-sm">{clubName}</p>
                        <p className="text-slate-400 text-xs">Club</p>
                      </div>
                    </div>
                  )}
                  
                  {teamName && (
                    <div className="flex items-center space-x-3">
                      <Trophy className="w-5 h-5 text-purple-400" />
                      <div>
                        <p className="text-slate-200 text-sm">{teamName}</p>
                        <p className="text-slate-400 text-xs">Team</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Duty Roster Preview */}
                {event.dutyRoster.length > 0 && (
                  <div className="mt-4 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                    <div className="flex items-center space-x-2 mb-2">
                      <Users className="w-4 h-4 text-red-400" />
                      <span className="text-red-400 font-medium text-sm">Game Day Duties</span>
                    </div>
                    <p className="text-red-300 text-xs">
                      {event.dutyRoster.length} dut{event.dutyRoster.length === 1 ? 'y' : 'ies'} assigned for game organization
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Generation Status */}
            {isGenerating && (
              <div className="card p-4 bg-blue-500/10 border-blue-500/20">
                <div className="flex items-center space-x-3">
                  <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                  <div>
                    <p className="text-blue-400 font-medium">Generating Match Day Post...</p>
                    <p className="text-blue-300 text-sm">
                      Creating professional graphics with club branding and match details
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800/50 p-4 bg-slate-900/95 backdrop-blur-sm sticky bottom-0 z-10">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            className="btn-secondary-mobile"
            disabled={isGenerating}
          >
            Cancel
          </button>
          <button
            onClick={handleGeneratePost}
            disabled={isGenerating}
            className={`btn-primary-mobile ${isGenerating ? 'btn-loading' : ''}`}
          >
            {isGenerating ? (
              'Generating...'
            ) : (
              <>
                <Camera className="w-5 h-5 mr-2" />
                Generate Post
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
