import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Plus, Users, Filter, Trophy, Repeat, Gamepad2, Dumbbell, Coffee, ClipboardList, CalendarDays, List } from 'lucide-react';
import EventCreateModal from '../EventCreateModal';
import EventDetailModal from '../EventDetailModal';
import EventFilterModal from '../EventFilterModal';
import CalendarComponent from '../CalendarComponent';
import { useGetEvents } from '../../hooks/useEvents';
import { useGetUserClubs } from '../../hooks/useClubs';
import { useGetAllTeams } from '../../hooks/useTeams';
import { Event, EventType } from '../../backend';

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

interface EventsPageProps {
  openEventId?: string | null;
  highlightDutyRole?: string | null;
}

export default function EventsPage({ openEventId, highlightDutyRole }: EventsPageProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [filters, setFilters] = useState<EventFilters>({
    clubs: [],
    teams: [],
    eventTypes: [],
    showAllClubs: true,
    showAllTeams: true,
    showAllEventTypes: true,
    dateFilter: 'all',
    customStartDate: '',
    customEndDate: '',
  });

  const { data: allEvents, isLoading } = useGetEvents();
  const { data: clubs } = useGetUserClubs();
  const { data: teams } = useGetAllTeams();

  // Handle navigation from duty notifications
  useEffect(() => {
    if (openEventId && allEvents) {
      const event = allEvents.find(e => e.id.toString() === openEventId);
      if (event) {
        setSelectedEvent(event);
        // Store the duty role to highlight if provided
        if (highlightDutyRole) {
          sessionStorage.setItem('highlightDutyRole', highlightDutyRole);
        }
      }
    }
  }, [openEventId, allEvents, highlightDutyRole]);

  // Apply filters to events including date filtering
  const applyFilters = (events: Event[]) => {
    return events.filter(event => {
      // Club filter
      if (!filters.showAllClubs && filters.clubs.length > 0) {
        const eventClubId = event.clubId?.toString();
        if (!eventClubId || !filters.clubs.includes(eventClubId)) {
          return false;
        }
      }

      // Team filter
      if (!filters.showAllTeams && filters.teams.length > 0) {
        const eventTeamId = event.teamId?.toString();
        if (!eventTeamId || !filters.teams.includes(eventTeamId)) {
          return false;
        }
      }

      // Event type filter
      if (!filters.showAllEventTypes && filters.eventTypes.length > 0) {
        if (!filters.eventTypes.includes(event.eventType)) {
          return false;
        }
      }

      // Date filter
      if (filters.dateFilter !== 'all') {
        const eventDate = new Date(Number(event.startTime));
        const now = new Date();
        
        switch (filters.dateFilter) {
          case 'today':
            if (eventDate.toDateString() !== now.toDateString()) {
              return false;
            }
            break;
          case 'this_week':
            const weekFromNow = new Date();
            weekFromNow.setDate(weekFromNow.getDate() + 7);
            if (eventDate < now || eventDate > weekFromNow) {
              return false;
            }
            break;
          case 'this_month':
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            if (eventDate < startOfMonth || eventDate > endOfMonth) {
              return false;
            }
            break;
          case 'custom_range':
            if (filters.customStartDate && filters.customEndDate) {
              const startDate = new Date(filters.customStartDate);
              const endDate = new Date(filters.customEndDate);
              endDate.setHours(23, 59, 59, 999); // Include the entire end date
              if (eventDate < startDate || eventDate > endDate) {
                return false;
              }
            }
            break;
        }
      }

      return true;
    });
  };

  const formatEventTime = (timestamp: bigint) => {
    const date = new Date(Number(timestamp));
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    };
  };

  const isEventToday = (timestamp: bigint) => {
    const eventDate = new Date(Number(timestamp));
    const today = new Date();
    return eventDate.toDateString() === today.toDateString();
  };

  const isEventUpcoming = (timestamp: bigint) => {
    return Number(timestamp) > Date.now();
  };

  const getEventTypeInfo = (eventType: EventType) => {
    switch (eventType) {
      case EventType.game:
        return {
          label: 'Game',
          icon: Gamepad2,
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/20',
        };
      case EventType.training:
        return {
          label: 'Training',
          icon: Dumbbell,
          color: 'text-blue-500',
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/20',
        };
      case EventType.socialEvent:
        return {
          label: 'Social',
          icon: Coffee,
          color: 'text-purple-500',
          bgColor: 'bg-purple-500/10',
          borderColor: 'border-purple-500/20',
        };
      default:
        return {
          label: 'Event',
          icon: Calendar,
          color: 'text-slate-500',
          bgColor: 'bg-slate-500/10',
          borderColor: 'border-slate-500/20',
        };
    }
  };

  // Get filtered events
  const eventsToDisplay = applyFilters(allEvents || []);

  const todayEvents = eventsToDisplay.filter(event => isEventToday(event.startTime));
  const thisWeekEvents = eventsToDisplay.filter(event => {
    const eventDate = new Date(Number(event.startTime));
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    return eventDate <= weekFromNow && Number(event.startTime) > Date.now();
  });

  const gameEvents = eventsToDisplay.filter(event => event.eventType === EventType.game);
  const trainingEvents = eventsToDisplay.filter(event => event.eventType === EventType.training);
  const socialEvents = eventsToDisplay.filter(event => event.eventType === EventType.socialEvent);

  const getRecurrenceIndicator = (event: Event) => {
    if (!event.recurrenceRule) return null;
    
    return (
      <div className="flex items-center space-x-1">
        <Repeat className="w-3 h-3 text-emerald-400" />
        <span className="text-xs text-emerald-400">Recurring</span>
      </div>
    );
  };

  const hasActiveFilters = !filters.showAllClubs || !filters.showAllTeams || !filters.showAllEventTypes ||
    filters.clubs.length > 0 || filters.teams.length > 0 || filters.eventTypes.length > 0 ||
    filters.dateFilter !== 'all';

  const getFilterSummary = () => {
    const parts: string[] = [];
    
    if (!filters.showAllClubs && filters.clubs.length > 0) {
      parts.push(`${filters.clubs.length} club${filters.clubs.length !== 1 ? 's' : ''}`);
    }
    
    if (!filters.showAllTeams && filters.teams.length > 0) {
      parts.push(`${filters.teams.length} team${filters.teams.length !== 1 ? 's' : ''}`);
    }
    
    if (!filters.showAllEventTypes && filters.eventTypes.length > 0) {
      const typeLabels = filters.eventTypes.map(type => {
        switch (type) {
          case EventType.game: return 'games';
          case EventType.training: return 'training';
          case EventType.socialEvent: return 'social';
          default: return 'events';
        }
      });
      parts.push(typeLabels.join(', '));
    }

    // Add date filter summary
    if (filters.dateFilter !== 'all') {
      switch (filters.dateFilter) {
        case 'today':
          parts.push('today');
          break;
        case 'this_week':
          parts.push('this week');
          break;
        case 'this_month':
          parts.push('this month');
          break;
        case 'custom_range':
          if (filters.customStartDate && filters.customEndDate) {
            const startDate = new Date(filters.customStartDate).toLocaleDateString();
            const endDate = new Date(filters.customEndDate).toLocaleDateString();
            parts.push(`${startDate} - ${endDate}`);
          }
          break;
      }
    }
    
    return parts.join(' • ');
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Events</h1>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFilterModal(true)}
            className={`p-2 rounded-lg transition-colors ${
              hasActiveFilters
                ? 'text-emerald-400 hover:text-emerald-300 bg-emerald-500/10'
                : 'text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600'
            }`}
            title="Filter events"
          >
            <Filter className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white p-3 rounded-full transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="card p-3 bg-emerald-500/10 border-emerald-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400 text-sm font-medium">
                Active Filters: {getFilterSummary()}
              </span>
            </div>
            <button
              onClick={() => setFilters({
                clubs: [],
                teams: [],
                eventTypes: [],
                showAllClubs: true,
                showAllTeams: true,
                showAllEventTypes: true,
                dateFilter: 'all',
                customStartDate: '',
                customEndDate: '',
              })}
              className="text-emerald-300 hover:text-emerald-200 text-sm"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* View Mode Toggle */}
      <div className="flex bg-gray-800 rounded-lg p-1">
        <button
          onClick={() => setViewMode('list')}
          className={`flex items-center space-x-2 flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'list'
              ? 'bg-emerald-500 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <List className="w-4 h-4" />
          <span>List View</span>
        </button>
        <button
          onClick={() => setViewMode('calendar')}
          className={`flex items-center space-x-2 flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'calendar'
              ? 'bg-emerald-500 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>Calendar View</span>
        </button>
      </div>

      {/* Enhanced Stats with Filtered Counts */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center mb-2">
            <Calendar className="w-5 h-5 text-emerald-500 mr-2" />
            <span className="text-white font-semibold text-sm">Today</span>
          </div>
          <p className="text-xl font-bold text-white">{todayEvents.length}</p>
          <p className="text-gray-400 text-xs">
            {hasActiveFilters ? 'Filtered' : 'All events'}
          </p>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center mb-2">
            <Clock className="w-5 h-5 text-blue-500 mr-2" />
            <span className="text-white font-semibold text-sm">This Week</span>
          </div>
          <p className="text-xl font-bold text-white">{thisWeekEvents.length}</p>
          <p className="text-gray-400 text-xs">
            {hasActiveFilters ? 'Filtered' : 'All events'}
          </p>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center mb-2">
            <Gamepad2 className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-white font-semibold text-sm">Games</span>
          </div>
          <p className="text-xl font-bold text-white">{gameEvents.length}</p>
          <p className="text-gray-400 text-xs">
            {hasActiveFilters ? 'Filtered' : 'All games'}
          </p>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center mb-2">
            <Dumbbell className="w-5 h-5 text-blue-500 mr-2" />
            <span className="text-white font-semibold text-sm">Training</span>
          </div>
          <p className="text-xl font-bold text-white">{trainingEvents.length}</p>
          <p className="text-gray-400 text-xs">
            {hasActiveFilters ? 'Filtered' : 'All training'}
          </p>
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <CalendarComponent
          events={eventsToDisplay}
          onEventClick={setSelectedEvent}
          selectedDate={selectedDate || undefined}
          onDateSelect={setSelectedDate}
        />
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-gray-800 rounded-xl p-4 border border-gray-700 animate-pulse">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gray-700 rounded-lg"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-700 rounded w-1/3 mb-2"></div>
                      <div className="h-3 bg-gray-700 rounded w-1/2 mb-2"></div>
                      <div className="h-3 bg-gray-700 rounded w-1/4"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : eventsToDisplay.length === 0 ? (
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  {hasActiveFilters ? 'No Events Match Filters' : 'No Events Yet'}
                </h3>
                <p className="text-gray-400 mb-6">
                  {hasActiveFilters
                    ? 'Try adjusting your filters to see more events, or create a new event.'
                    : 'Create your first event or join clubs to see events here.'
                  }
                </p>
                <div className="space-y-3">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white py-3 px-6 rounded-lg transition-colors"
                  >
                    Create First Event
                  </button>
                  {hasActiveFilters && (
                    <button
                      onClick={() => setShowFilterModal(true)}
                      className="bg-slate-600 hover:bg-slate-500 text-white py-3 px-6 rounded-lg transition-colors"
                    >
                      Adjust Filters
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">
                  Events
                  {hasActiveFilters && (
                    <span className="text-emerald-400 ml-2">
                      ({eventsToDisplay.length} filtered)
                    </span>
                  )}
                </h2>
                {hasActiveFilters && (
                  <button
                    onClick={() => setShowFilterModal(true)}
                    className="text-emerald-400 hover:text-emerald-300 text-sm flex items-center space-x-1"
                  >
                    <Filter className="w-4 h-4" />
                    <span>Filters</span>
                  </button>
                )}
              </div>
              
              {eventsToDisplay.map((event) => {
                const { date, time } = formatEventTime(event.startTime);
                const isUpcoming = isEventUpcoming(event.startTime);
                const eventTypeInfo = getEventTypeInfo(event.eventType);
                
                return (
                  <div
                    key={event.id.toString()}
                    className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden"
                  >
                    <div
                      onClick={() => setSelectedEvent(event)}
                      className="p-4 cursor-pointer hover:bg-gray-750 transition-colors"
                    >
                      <div className="flex items-start space-x-4">
                        <div className={`rounded-lg p-3 flex-shrink-0 ${eventTypeInfo.bgColor}`}>
                          <eventTypeInfo.icon className={`w-6 h-6 ${eventTypeInfo.color}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold text-white">{event.title}</h3>
                            <div className="flex items-center space-x-2">
                              <span className={`text-xs px-2 py-1 rounded-full border ${eventTypeInfo.bgColor} ${eventTypeInfo.borderColor} ${eventTypeInfo.color}`}>
                                {eventTypeInfo.label}
                              </span>
                              <span className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded-full">
                                {event.clubId ? 'Club' : 'Team'}
                              </span>
                              {getRecurrenceIndicator(event)}
                            </div>
                          </div>
                          <p className="text-gray-400 text-sm mb-2">{event.description}</p>
                          <div className="flex items-center text-gray-400 text-sm space-x-4">
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              <span>{date}, {time}</span>
                              {!isUpcoming && (
                                <span className="ml-2 text-red-400 text-xs">(Past Event)</span>
                              )}
                            </div>
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 mr-1" />
                              <span>{event.suburb}, {event.state}</span>
                            </div>
                          </div>
                          
                          {/* Duty Roster Indicator for Game Events */}
                          {event.eventType === EventType.game && event.dutyRoster.length > 0 && (
                            <div className="flex items-center mt-2">
                              <ClipboardList className="w-4 h-4 mr-1 text-red-400" />
                              <span className="text-red-400 text-sm">
                                {event.dutyRoster.length} dut{event.dutyRoster.length === 1 ? 'y' : 'ies'} assigned
                              </span>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-gray-400 text-sm">
                              {event.clubId ? 'Club Event' : 'Team Event'}
                            </span>
                            <div className="flex items-center text-gray-400 text-sm">
                              <Users className="w-4 h-4 mr-1" />
                              <span>0 going</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Event Actions */}
                    <div className="border-t border-gray-700 p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {event.eventType === EventType.game && event.dutyRoster.length > 0 && (
                            <span className="flex items-center space-x-1 text-red-400 text-sm">
                              <ClipboardList className="w-4 h-4" />
                              <span>Duty Roster</span>
                            </span>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent(event);
                          }}
                          className={`text-sm px-3 py-1 rounded-lg transition-colors ${
                            isUpcoming
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-slate-600 hover:bg-slate-500 text-slate-300'
                          }`}
                        >
                          {isUpcoming ? 'View Details' : 'View Past Event'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {showCreateModal && (
        <EventCreateModal onClose={() => setShowCreateModal(false)} />
      )}

      {showFilterModal && (
        <EventFilterModal
          filters={filters}
          onFiltersChange={setFilters}
          onClose={() => setShowFilterModal(false)}
        />
      )}

      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          highlightDutyRole={highlightDutyRole}
        />
      )}
    </div>
  );
}
