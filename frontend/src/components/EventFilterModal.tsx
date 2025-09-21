import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, Filter, Crown, Trophy, Gamepad2, Dumbbell, Coffee, CheckCircle, Users, Calendar, CalendarDays } from 'lucide-react';
import { useGetUserClubs } from '../hooks/useClubs';
import { useGetAllTeams } from '../hooks/useTeams';
import type { EventType } from '../backend';

interface EventFilters {
  clubs: string[];
  teams: string[];
  eventTypes: EventType[];
  showAllClubs: boolean;
  showAllTeams: boolean;
  showAllEventTypes: boolean;
  dateFilter: 'all' | 'today' | 'this_week' | 'this_month' | 'custom_range';
  customStartDate: string;
  customEndDate: string;
}

interface EventFilterModalProps {
  filters: EventFilters;
  onFiltersChange: (filters: EventFilters) => void;
  onClose: () => void;
}

export default function EventFilterModal({ filters, onFiltersChange, onClose }: EventFilterModalProps) {
  const [localFilters, setLocalFilters] = useState<EventFilters>(filters);
  
  const { data: clubs } = useGetUserClubs();
  const { data: teams } = useGetAllTeams();

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

  const eventTypeOptions = [
    {
      value: EventType.game,
      label: 'Games',
      icon: Gamepad2,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
    },
    {
      value: EventType.training,
      label: 'Training',
      icon: Dumbbell,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
    },
    {
      value: EventType.socialEvent,
      label: 'Social Events',
      icon: Coffee,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
    },
  ];

  const dateFilterOptions = [
    { value: 'all', label: 'All Dates', description: 'Show events from all time periods' },
    { value: 'today', label: 'Today', description: 'Events happening today' },
    { value: 'this_week', label: 'This Week', description: 'Events in the next 7 days' },
    { value: 'this_month', label: 'This Month', description: 'Events in the current month' },
    { value: 'custom_range', label: 'Custom Range', description: 'Select specific date range' },
  ];

  const handleClubToggle = (clubId: string) => {
    setLocalFilters(prev => ({
      ...prev,
      clubs: prev.clubs.includes(clubId)
        ? prev.clubs.filter(id => id !== clubId)
        : [...prev.clubs, clubId],
      showAllClubs: false,
    }));
  };

  const handleTeamToggle = (teamId: string) => {
    setLocalFilters(prev => ({
      ...prev,
      teams: prev.teams.includes(teamId)
        ? prev.teams.filter(id => id !== teamId)
        : [...prev.teams, teamId],
      showAllTeams: false,
    }));
  };

  const handleEventTypeToggle = (eventType: EventType) => {
    setLocalFilters(prev => ({
      ...prev,
      eventTypes: prev.eventTypes.includes(eventType)
        ? prev.eventTypes.filter(type => type !== eventType)
        : [...prev.eventTypes, eventType],
      showAllEventTypes: false,
    }));
  };

  const handleShowAllClubs = (showAll: boolean) => {
    setLocalFilters(prev => ({
      ...prev,
      showAllClubs: showAll,
      clubs: showAll ? [] : prev.clubs,
    }));
  };

  const handleShowAllTeams = (showAll: boolean) => {
    setLocalFilters(prev => ({
      ...prev,
      showAllTeams: showAll,
      teams: showAll ? [] : prev.teams,
    }));
  };

  const handleShowAllEventTypes = (showAll: boolean) => {
    setLocalFilters(prev => ({
      ...prev,
      showAllEventTypes: showAll,
      eventTypes: showAll ? [] : prev.eventTypes,
    }));
  };

  const handleDateFilterChange = (dateFilter: EventFilters['dateFilter']) => {
    setLocalFilters(prev => ({
      ...prev,
      dateFilter,
      // Clear custom dates when switching away from custom range
      customStartDate: dateFilter === 'custom_range' ? prev.customStartDate : '',
      customEndDate: dateFilter === 'custom_range' ? prev.customEndDate : '',
    }));
  };

  const handleCustomDateChange = (field: 'customStartDate' | 'customEndDate', value: string) => {
    setLocalFilters(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  const handleClearFilters = () => {
    const clearedFilters: EventFilters = {
      clubs: [],
      teams: [],
      eventTypes: [],
      showAllClubs: true,
      showAllTeams: true,
      showAllEventTypes: true,
      dateFilter: 'all',
      customStartDate: '',
      customEndDate: '',
    };
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
    onClose();
  };

  const hasActiveFilters = !localFilters.showAllClubs || !localFilters.showAllTeams || !localFilters.showAllEventTypes ||
    localFilters.clubs.length > 0 || localFilters.teams.length > 0 || localFilters.eventTypes.length > 0 ||
    localFilters.dateFilter !== 'all';

  const getFilterSummary = () => {
    const parts: string[] = [];
    
    if (localFilters.showAllClubs) {
      parts.push('All Clubs');
    } else if (localFilters.clubs.length > 0) {
      parts.push(`${localFilters.clubs.length} Club${localFilters.clubs.length !== 1 ? 's' : ''}`);
    }
    
    if (localFilters.showAllTeams) {
      parts.push('All Teams');
    } else if (localFilters.teams.length > 0) {
      parts.push(`${localFilters.teams.length} Team${localFilters.teams.length !== 1 ? 's' : ''}`);
    }
    
    if (localFilters.showAllEventTypes) {
      parts.push('All Types');
    } else if (localFilters.eventTypes.length > 0) {
      parts.push(`${localFilters.eventTypes.length} Type${localFilters.eventTypes.length !== 1 ? 's' : ''}`);
    }

    // Add date filter summary
    if (localFilters.dateFilter !== 'all') {
      const dateOption = dateFilterOptions.find(option => option.value === localFilters.dateFilter);
      if (dateOption) {
        if (localFilters.dateFilter === 'custom_range' && localFilters.customStartDate && localFilters.customEndDate) {
          const startDate = new Date(localFilters.customStartDate).toLocaleDateString();
          const endDate = new Date(localFilters.customEndDate).toLocaleDateString();
          parts.push(`${startDate} - ${endDate}`);
        } else {
          parts.push(dateOption.label);
        }
      }
    }
    
    return parts.join(' • ');
  };

  // Validate custom date range
  const isCustomDateRangeValid = () => {
    if (localFilters.dateFilter !== 'custom_range') return true;
    if (!localFilters.customStartDate || !localFilters.customEndDate) return false;
    return new Date(localFilters.customStartDate) <= new Date(localFilters.customEndDate);
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
        <div className="text-center">
          <h1 className="text-lg font-semibold text-slate-100">Filter Events</h1>
          <p className="text-sm text-slate-400">Customize your event view</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 -mr-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 pb-32">
          <div className="space-y-6">
            {/* Filter Summary */}
            {hasActiveFilters && (
              <div className="card p-4 bg-emerald-500/10 border-emerald-500/20">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                    <Filter className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-emerald-400 font-medium">Active Filters</p>
                    <p className="text-emerald-300 text-sm">{getFilterSummary()}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Date Filter */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <CalendarDays className="w-5 h-5 text-orange-400" />
                <h3 className="text-lg font-semibold text-slate-100">Date Range</h3>
              </div>

              <div className="space-y-3">
                {dateFilterOptions.map((option) => {
                  const isSelected = localFilters.dateFilter === option.value;
                  
                  return (
                    <label
                      key={option.value}
                      className={`card p-4 cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? 'bg-orange-500/10 border-orange-500/30 ring-2 ring-orange-500/20'
                          : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        <input
                          type="radio"
                          name="dateFilter"
                          value={option.value}
                          checked={isSelected}
                          onChange={(e) => handleDateFilterChange(e.target.value as EventFilters['dateFilter'])}
                          className="w-4 h-4 text-orange-500 bg-slate-800 border-slate-600 focus:ring-orange-500"
                        />
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isSelected ? 'bg-orange-500/20' : 'bg-slate-700'
                        }`}>
                          <CalendarDays className={`w-5 h-5 ${
                            isSelected ? 'text-orange-400' : 'text-slate-400'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <p className={`font-medium ${
                            isSelected ? 'text-orange-400' : 'text-slate-300'
                          }`}>{option.label}</p>
                          <p className={`text-sm ${
                            isSelected ? 'text-orange-300' : 'text-slate-400'
                          }`}>{option.description}</p>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Custom Date Range Inputs */}
              {localFilters.dateFilter === 'custom_range' && (
                <div className="card p-4 bg-orange-500/10 border-orange-500/20">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <Calendar className="w-4 h-4 text-orange-400" />
                      <span className="text-orange-400 font-medium text-sm">Custom Date Range</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-300">
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={localFilters.customStartDate}
                          onChange={(e) => handleCustomDateChange('customStartDate', e.target.value)}
                          className="input-mobile"
                          max={localFilters.customEndDate || undefined}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-300">
                          End Date
                        </label>
                        <input
                          type="date"
                          value={localFilters.customEndDate}
                          onChange={(e) => handleCustomDateChange('customEndDate', e.target.value)}
                          className="input-mobile"
                          min={localFilters.customStartDate || undefined}
                        />
                      </div>
                    </div>

                    {!isCustomDateRangeValid() && localFilters.customStartDate && localFilters.customEndDate && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <p className="text-red-400 text-sm">End date must be after start date</p>
                      </div>
                    )}

                    {localFilters.customStartDate && localFilters.customEndDate && isCustomDateRangeValid() && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400 text-sm font-medium">
                            Date Range: {new Date(localFilters.customStartDate).toLocaleDateString()} - {new Date(localFilters.customEndDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Clubs Filter */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Crown className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-semibold text-slate-100">Clubs</h3>
              </div>

              {/* Show All Clubs Toggle */}
              <div className="card p-4 bg-blue-500/10 border-blue-500/20">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localFilters.showAllClubs}
                    onChange={(e) => handleShowAllClubs(e.target.checked)}
                    className="w-4 h-4 text-blue-500 bg-slate-800 border-slate-600 focus:ring-blue-500"
                  />
                  <div className="flex items-center space-x-2">
                    <Crown className="w-4 h-4 text-blue-400" />
                    <span className="text-blue-400 font-medium">Show All Clubs</span>
                  </div>
                  <span className="text-blue-300 text-sm">
                    Include events from all {clubs?.length || 0} clubs
                  </span>
                </label>
              </div>

              {/* Specific Club Selection */}
              {!localFilters.showAllClubs && (
                <div className="space-y-3">
                  <div className="card p-4 max-h-48 overflow-y-auto">
                    {!clubs || clubs.length === 0 ? (
                      <div className="text-center py-6">
                        <Crown className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <p className="text-slate-400 text-sm">No clubs available</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {clubs.map((club) => (
                          <label
                            key={club.id.toString()}
                            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-800/50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={localFilters.clubs.includes(club.id.toString())}
                              onChange={() => handleClubToggle(club.id.toString())}
                              className="w-4 h-4 text-blue-500 bg-slate-800 border-slate-600 focus:ring-blue-500"
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

                  {localFilters.clubs.length > 0 && (
                    <div className="card p-3 bg-blue-500/10 border-blue-500/20">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-blue-400" />
                        <span className="text-blue-400 text-sm font-medium">
                          {localFilters.clubs.length} club{localFilters.clubs.length !== 1 ? 's' : ''} selected
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Teams Filter */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Trophy className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-semibold text-slate-100">Teams</h3>
              </div>

              {/* Show All Teams Toggle */}
              <div className="card p-4 bg-emerald-500/10 border-emerald-500/20">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localFilters.showAllTeams}
                    onChange={(e) => handleShowAllTeams(e.target.checked)}
                    className="w-4 h-4 text-emerald-500 bg-slate-800 border-slate-600 focus:ring-emerald-500"
                  />
                  <div className="flex items-center space-x-2">
                    <Trophy className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">Show All Teams</span>
                  </div>
                  <span className="text-emerald-300 text-sm">
                    Include events from all {teams?.length || 0} teams
                  </span>
                </label>
              </div>

              {/* Specific Team Selection */}
              {!localFilters.showAllTeams && (
                <div className="space-y-3">
                  <div className="card p-4 max-h-48 overflow-y-auto">
                    {!teams || teams.length === 0 ? (
                      <div className="text-center py-6">
                        <Trophy className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <p className="text-slate-400 text-sm">No teams available</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {teams.map((team) => {
                          const club = clubs?.find(c => c.id === team.clubId);
                          
                          return (
                            <label
                              key={team.id.toString()}
                              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-800/50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={localFilters.teams.includes(team.id.toString())}
                                onChange={() => handleTeamToggle(team.id.toString())}
                                className="w-4 h-4 text-emerald-500 bg-slate-800 border-slate-600 focus:ring-emerald-500"
                              />
                              <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                                <span className="text-white text-xs font-semibold">
                                  {team.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1">
                                <p className="text-slate-200 text-sm font-medium">{team.name}</p>
                                <p className="text-slate-400 text-xs">
                                  {team.description}
                                  {club && (
                                    <span className="text-blue-400 ml-2">• {club.name}</span>
                                  )}
                                </p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {localFilters.teams.length > 0 && (
                    <div className="card p-3 bg-emerald-500/10 border-emerald-500/20">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400 text-sm font-medium">
                          {localFilters.teams.length} team{localFilters.teams.length !== 1 ? 's' : ''} selected
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Event Types Filter */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-slate-100">Event Types</h3>
              </div>

              {/* Show All Event Types Toggle */}
              <div className="card p-4 bg-purple-500/10 border-purple-500/20">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localFilters.showAllEventTypes}
                    onChange={(e) => handleShowAllEventTypes(e.target.checked)}
                    className="w-4 h-4 text-purple-500 bg-slate-800 border-slate-600 focus:ring-purple-500"
                  />
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-purple-400" />
                    <span className="text-purple-400 font-medium">Show All Event Types</span>
                  </div>
                  <span className="text-purple-300 text-sm">
                    Include all types of events
                  </span>
                </label>
              </div>

              {/* Specific Event Type Selection */}
              {!localFilters.showAllEventTypes && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3">
                    {eventTypeOptions.map((eventType) => {
                      const Icon = eventType.icon;
                      const isSelected = localFilters.eventTypes.includes(eventType.value);
                      
                      return (
                        <label
                          key={eventType.value}
                          className={`card p-4 cursor-pointer transition-all duration-200 ${
                            isSelected
                              ? `${eventType.bgColor} ${eventType.borderColor} ring-2 ring-opacity-50`
                              : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center space-x-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleEventTypeToggle(eventType.value)}
                              className="w-4 h-4 text-emerald-500 bg-slate-800 border-slate-600 focus:ring-emerald-500"
                            />
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              isSelected ? eventType.bgColor : 'bg-slate-700'
                            }`}>
                              <Icon className={`w-5 h-5 ${
                                isSelected ? eventType.color : 'text-slate-400'
                              }`} />
                            </div>
                            <div className="flex-1">
                              <p className={`font-medium ${
                                isSelected ? eventType.color : 'text-slate-300'
                              }`}>{eventType.label}</p>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  {localFilters.eventTypes.length > 0 && (
                    <div className="card p-3 bg-purple-500/10 border-purple-500/20">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-purple-400" />
                        <span className="text-purple-400 text-sm font-medium">
                          {localFilters.eventTypes.length} event type{localFilters.eventTypes.length !== 1 ? 's' : ''} selected
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800/50 p-4 bg-slate-900/95 backdrop-blur-sm sticky bottom-0 z-10">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleClearFilters}
            className="btn-secondary-mobile"
          >
            Clear All
          </button>
          <button
            onClick={handleApplyFilters}
            disabled={localFilters.dateFilter === 'custom_range' && !isCustomDateRangeValid()}
            className="btn-primary-mobile"
          >
            <Filter className="w-5 h-5 mr-2" />
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}
