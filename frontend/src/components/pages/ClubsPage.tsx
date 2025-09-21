import React, { useState } from 'react';
import { Users, Plus, Crown, Shield, Settings, MessageCircle, Calendar, Camera, Megaphone, Search, CheckCircle, CreditCard, Loader2, RefreshCw } from 'lucide-react';
import { useGetUserClubs } from '../../hooks/useClubs';
import { useGetAllTeams } from '../../hooks/useTeams';
import { useGetClubUniqueMemberCount } from '../../hooks/useClubs';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { useFileUrl } from '../../blob-storage/FileStorage';
import { Club, Team } from '../../backend';
import ClubCreateModal from '../ClubCreateModal';
import ClubDetailModal from '../ClubDetailModal';
import TeamCreateModal from '../TeamCreateModal';
import SubscriptionUpgradeModal from '../SubscriptionUpgradeModal';

interface ClubWithRole extends Club {
  memberCount: number;
  teamCount: number;
  userRole: 'club_admin' | 'team_admin' | 'coach' | 'player' | 'parent' | 'basic_user';
  sport?: string;
  createdAt: number;
  subscriptionPlan: 'basic' | 'plus';
}

interface ClubsPageProps {
  onMessageThreadNavigation?: (threadId: string) => void;
}

export default function ClubsPage({ onMessageThreadNavigation }: ClubsPageProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTeamCreateModal, setShowTeamCreateModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedClub, setSelectedClub] = useState<ClubWithRole | null>(null);
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [upgradeClubId, setUpgradeClubId] = useState<string>('');
  const [upgradeClubName, setUpgradeClubName] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  
  const { data: userClubs, isLoading, refetch: refetchClubs, isRefetching } = useGetUserClubs();
  const { data: allTeams, refetch: refetchTeams } = useGetAllTeams();
  const { mutate: getUniqueMemberCount } = useGetClubUniqueMemberCount();
  const { identity } = useInternetIdentity();

  // Transform backend clubs to include role information and team counts
  const transformedClubs: ClubWithRole[] = (userClubs || []).map(club => {
    const clubTeams = (allTeams || []).filter((team: Team) => team.clubId === club.id);
    const currentUserPrincipal = identity?.getPrincipal().toString();
    
    // Check if current user is the creator of this club (club_admin)
    const isClubCreator = club.creator.toString() === currentUserPrincipal;
    
    // Use backend's unique member count when available, fallback to calculation
    const memberCount = 1; // Will be updated by individual club cards
    
    return {
      ...club,
      memberCount,
      teamCount: clubTeams.length,
      userRole: isClubCreator ? 'club_admin' : 'basic_user',
      sport: undefined,
      createdAt: Date.now(), // Default timestamp - will be updated when backend provides this
      subscriptionPlan: 'basic', // All clubs start with basic plan
    };
  });

  const ownedClubs = transformedClubs.filter(club => club.userRole === 'club_admin');
  const memberClubs = transformedClubs.filter(club => club.userRole !== 'club_admin');

  const handleCreateSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
    
    // Force immediate refresh of clubs and teams data
    refetchClubs();
    refetchTeams();
  };

  const handleClubDeleted = () => {
    setSelectedClub(null);
    setSuccessMessage('Club deleted successfully');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleUpgradeClick = (clubId: string, clubName: string) => {
    setUpgradeClubId(clubId);
    setUpgradeClubName(clubName);
    setShowUpgradeModal(true);
  };

  const handleRefreshData = () => {
    refetchClubs();
    refetchTeams();
  };

  const handleMessageThreadNavigation = (threadId: string) => {
    if (onMessageThreadNavigation) {
      onMessageThreadNavigation(threadId);
    }
    setSelectedClub(null); // Close the club detail modal
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'club_admin':
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'team_admin':
        return <Shield className="w-4 h-4 text-blue-500" />;
      case 'coach':
        return <Settings className="w-4 h-4 text-green-500" />;
      default:
        return <Users className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'club_admin':
        return 'Admin';
      case 'team_admin':
        return 'Team Admin';
      case 'coach':
        return 'Coach';
      case 'player':
        return 'Player';
      case 'parent':
        return 'Parent';
      default:
        return 'Member';
    }
  };

  // Any authenticated user can create teams in any club
  const canCreateTeamInClub = (club: ClubWithRole) => {
    return true;
  };

  // Check if user can upgrade a club
  const canUpgradeClub = (club: ClubWithRole) => {
    const currentUserPrincipal = identity?.getPrincipal().toString();
    return club.creator.toString() === currentUserPrincipal && club.subscriptionPlan === 'basic';
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h1 className="text-2xl font-bold text-white">Clubs</h1>
          {isRefetching && (
            <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRefreshData}
            className="p-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800/50 transition-colors"
            disabled={isRefetching}
            title="Refresh clubs and teams"
          >
            <RefreshCw className={`w-5 h-5 ${isRefetching ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white p-3 rounded-full transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-emerald-400 text-sm font-medium">{successMessage}</p>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search clubs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center mb-3">
            <Crown className="w-6 h-6 text-yellow-500 mr-2" />
            <span className="text-white font-semibold">My Clubs</span>
          </div>
          <p className="text-2xl font-bold text-white mb-1">{ownedClubs.length}</p>
          <p className="text-gray-400 text-sm">Owned</p>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center mb-3">
            <Shield className="w-6 h-6 text-blue-500 mr-2" />
            <span className="text-white font-semibold">Member</span>
          </div>
          <p className="text-2xl font-bold text-white mb-1">{memberClubs.length}</p>
          <p className="text-gray-400 text-sm">Joined</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-xl p-4 border border-gray-700 animate-pulse">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-700 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-700 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : transformedClubs.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Clubs Yet</h3>
            <p className="text-gray-400 mb-6">
              Create your first club to get started with team management.
            </p>
            
            <button 
              onClick={() => setShowCreateModal(true)}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 px-6 rounded-lg transition-colors"
            >
              Create Your First Club
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Owned Clubs */}
          {ownedClubs.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">My Clubs</h2>
              {ownedClubs.map((club) => (
                <ClubCard 
                  key={club.id.toString()} 
                  club={club} 
                  onSelect={setSelectedClub}
                  onCreateTeam={(clubId) => {
                    setSelectedClubId(clubId);
                    setShowTeamCreateModal(true);
                  }}
                  onUpgrade={handleUpgradeClick}
                  onSuccess={handleCreateSuccess}
                  canCreateTeam={canCreateTeamInClub(club)}
                  canUpgrade={canUpgradeClub(club)}
                />
              ))}
            </div>
          )}

          {/* Member Clubs */}
          {memberClubs.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Member Clubs</h2>
              {memberClubs.map((club) => (
                <ClubCard 
                  key={club.id.toString()} 
                  club={club} 
                  onSelect={setSelectedClub}
                  onCreateTeam={(clubId) => {
                    setSelectedClubId(clubId);
                    setShowTeamCreateModal(true);
                  }}
                  onUpgrade={handleUpgradeClick}
                  onSuccess={handleCreateSuccess}
                  canCreateTeam={canCreateTeamInClub(club)}
                  canUpgrade={canUpgradeClub(club)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <ClubCreateModal onClose={() => setShowCreateModal(false)} />
      )}

      {showTeamCreateModal && (
        <TeamCreateModal 
          clubId={selectedClubId}
          onClose={() => {
            setShowTeamCreateModal(false);
            setSelectedClubId('');
          }} 
        />
      )}

      {showUpgradeModal && (
        <SubscriptionUpgradeModal
          organizationType="club"
          organizationId={upgradeClubId}
          organizationName={upgradeClubName}
          onClose={() => {
            setShowUpgradeModal(false);
            setUpgradeClubId('');
            setUpgradeClubName('');
          }}
        />
      )}

      {selectedClub && (
        <ClubDetailModal
          club={selectedClub}
          onClose={() => setSelectedClub(null)}
          onDeleted={handleClubDeleted}
          onMessageThreadClick={handleMessageThreadNavigation}
        />
      )}
    </div>
  );
}

interface ClubCardProps {
  club: ClubWithRole;
  onSelect: (club: ClubWithRole) => void;
  onCreateTeam: (clubId: string) => void;
  onUpgrade: (clubId: string, clubName: string) => void;
  onSuccess: (message: string) => void;
  canCreateTeam: boolean;
  canUpgrade: boolean;
}

function ClubCard({ club, onSelect, onCreateTeam, onUpgrade, onSuccess, canCreateTeam, canUpgrade }: ClubCardProps) {
  const [actualMemberCount, setActualMemberCount] = useState<number>(club.memberCount);
  const [loadingMemberCount, setLoadingMemberCount] = useState(false);
  const { mutate: getUniqueMemberCount } = useGetClubUniqueMemberCount();
  const { data: logoUrl } = useFileUrl(club.logo || '');

  // Load actual member count when component mounts
  React.useEffect(() => {
    setLoadingMemberCount(true);
    getUniqueMemberCount(club.id.toString(), {
      onSuccess: (count) => {
        setActualMemberCount(count);
        setLoadingMemberCount(false);
      },
      onError: (error) => {
        console.warn('Failed to get unique member count for club:', club.id.toString(), error);
        setLoadingMemberCount(false);
        // Keep the fallback count
      }
    });
  }, [club.id, getUniqueMemberCount]);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'club_admin':
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'team_admin':
        return <Shield className="w-4 h-4 text-blue-500" />;
      case 'coach':
        return <Settings className="w-4 h-4 text-green-500" />;
      default:
        return <Users className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'club_admin':
        return 'Admin';
      case 'team_admin':
        return 'Team Admin';
      case 'coach':
        return 'Coach';
      case 'player':
        return 'Player';
      case 'parent':
        return 'Parent';
      default:
        return 'Member';
    }
  };

  const handleCreateTeam = () => {
    onCreateTeam(club.id.toString());
  };

  const handleUpgrade = () => {
    onUpgrade(club.id.toString(), club.name);
  };

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      <div 
        onClick={() => onSelect(club)}
        className="p-4 cursor-pointer hover:bg-gray-750 transition-colors"
      >
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 overflow-hidden">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt={`${club.name} logo`} 
                className="w-12 h-12 object-cover"
              />
            ) : (
              <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-white">{club.name}</h3>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1 bg-gray-700 px-2 py-1 rounded-full">
                  {getRoleIcon(club.userRole)}
                  <span className="text-xs text-gray-300">{getRoleText(club.userRole)}</span>
                </div>
                {club.subscriptionPlan === 'plus' && (
                  <div className="flex items-center space-x-1 bg-yellow-500/10 text-yellow-400 px-2 py-1 rounded-full border border-yellow-500/20">
                    <Crown className="w-3 h-3" />
                    <span className="text-xs font-medium">Plus</span>
                  </div>
                )}
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-2">{club.description}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <p className="text-gray-400 text-sm">
                  {loadingMemberCount ? (
                    <span className="flex items-center space-x-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Loading...</span>
                    </span>
                  ) : (
                    `${actualMemberCount} member${actualMemberCount !== 1 ? 's' : ''}`
                  )}
                  {' • '}
                  {club.teamCount} team{club.teamCount !== 1 ? 's' : ''}
                </p>
              </div>
              {club.sport && (
                <span className="bg-emerald-500 text-white text-xs px-2 py-1 rounded-full">
                  {club.sport}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="border-t border-gray-700 p-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {/* Empty space where other actions used to be */}
          </div>
          <div className="flex items-center space-x-2">
            {canUpgrade && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleUpgrade();
                }}
                className="flex items-center space-x-1 text-yellow-500 hover:text-yellow-400 text-sm font-medium"
              >
                <CreditCard className="w-4 h-4" />
                <span>Upgrade</span>
              </button>
            )}
            {canCreateTeam && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleCreateTeam();
                }}
                className="text-emerald-500 hover:text-emerald-400 text-sm font-medium"
                title="Create team in this club"
              >
                + Team
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
