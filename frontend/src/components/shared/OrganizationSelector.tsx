import React from 'react';
import { Crown, Trophy, Search, CheckCircle } from 'lucide-react';
import { Club, Team } from '../../backend';

interface OrganizationSelectorProps {
  type: 'club' | 'team';
  clubs: Club[];
  teams: Team[];
  selectedClubId: string;
  selectedTeamId: string;
  onClubChange: (clubId: string) => void;
  onTeamChange: (teamId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  disabled?: boolean;
  showSteps?: boolean;
  errors?: {
    clubId?: string;
    teamId?: string;
  };
}

export default function OrganizationSelector({
  type,
  clubs,
  teams,
  selectedClubId,
  selectedTeamId,
  onClubChange,
  onTeamChange,
  searchQuery,
  onSearchChange,
  disabled = false,
  showSteps = false,
  errors = {},
}: OrganizationSelectorProps) {
  const filteredClubs = clubs.filter(club =>
    club.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTeams = selectedClubId
    ? teams.filter(team => 
        team.clubId.toString() === selectedClubId &&
        team.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const getSelectedClubName = () => {
    const selected = clubs.find(club => club.id.toString() === selectedClubId);
    return selected?.name || '';
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          {showSteps && (
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
              selectedClubId ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-slate-300'
            }`}>
              1
            </div>
          )}
          <label className="block text-sm font-medium text-slate-300">
            <Crown className="w-4 h-4 inline mr-2" />
            Select Club *
          </label>
        </div>
        
        <div className="card p-4 max-h-48 overflow-y-auto">
          {filteredClubs.length === 0 ? (
            <div className="text-center py-6">
              <Crown className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">No clubs available</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredClubs.map((club) => (
                <label
                  key={club.id.toString()}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-800/50 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="club"
                    value={club.id.toString()}
                    checked={selectedClubId === club.id.toString()}
                    onChange={(e) => onClubChange(e.target.value)}
                    className="w-4 h-4 text-emerald-500 bg-slate-800 border-slate-600 focus:ring-emerald-500 focus:ring-2"
                    disabled={disabled}
                  />
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                    <span className="text-white text-xs font-semibold">
                      {club.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-slate-200 text-sm font-medium">{club.name}</p>
                    <p className="text-slate-400 text-xs">{club.description}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
        {errors.clubId && <p className="text-red-400 text-sm mt-2">{errors.clubId}</p>}
        
        {showSteps && (
          <div className="card p-3 bg-blue-500/10 border-blue-500/20">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-blue-400" />
              <span className="text-blue-400 text-sm font-medium">Step 1: Club Selection Required</span>
            </div>
            <p className="text-blue-300 text-xs mt-1">
              Select a club to proceed with {type} selection.
            </p>
          </div>
        )}
      </div>

      {type === 'team' && selectedClubId && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            {showSteps && (
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                selectedTeamId ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-slate-300'
              }`}>
                2
              </div>
            )}
            <label className="block text-sm font-medium text-slate-300">
              <Trophy className="w-4 h-4 inline mr-2" />
              Select Team *
            </label>
            <span className="text-slate-400 text-sm">in {getSelectedClubName()}</span>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search teams..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="input-mobile pl-10"
              disabled={disabled}
            />
          </div>
          
          <div className="card p-4 max-h-48 overflow-y-auto">
            {filteredTeams.length === 0 ? (
              <div className="text-center py-6">
                <Trophy className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">
                  {searchQuery ? 'No teams found matching your search.' : `No teams available in ${getSelectedClubName()}.`}
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
                      checked={selectedTeamId === team.id.toString()}
                      onChange={(e) => onTeamChange(e.target.value)}
                      className="w-4 h-4 text-emerald-500 bg-slate-800 border-slate-600 focus:ring-emerald-500 focus:ring-2"
                      disabled={disabled}
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
          
          {showSteps && (
            <div className="card p-3 bg-emerald-500/10 border-emerald-500/20">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 text-sm font-medium">Step 2: Team Selection</span>
              </div>
              <p className="text-emerald-300 text-xs mt-1">
                Select a team from {getSelectedClubName()}.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
