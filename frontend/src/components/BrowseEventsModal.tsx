import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, ArrowLeft, Users, Filter, Search, UserCheck, UserMinus, UserX } from 'lucide-react';
import { useGetEvents } from '../hooks/useEvents';

interface BrowseEventsModalProps {
  onClose: () => void;
}

export default function BrowseEventsModal({ onClose }: BrowseEventsModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'upcoming' | 'today' | 'this_week'>('all');
  
  const { data: events, isLoading } = useGetEvents();

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

  const filteredEvents = (events || []).filter(event => {
    const now = Date.now();
    const eventDate = new Date(Number(event.startTime));
    const today = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    const matchesSearch = !searchQuery || 
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.suburb.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.state.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesTimeFilter = true;
    switch (selectedFilter) {
      case 'upcoming':
        matchesTimeFilter = Number(event.startTime) > now;
        break;
      case 'today':
        matchesTimeFilter = eventDate.toDateString() === today.toDateString();
        break;
      case 'this_week':
        matchesTimeFilter = Number(event.startTime) > now && eventDate <= weekFromNow;
        break;
      default:
        matchesTimeFilter = true;
    }

    return matchesSearch && matchesTimeFilter;
  });

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

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedFilter('all');
  };

  const hasActiveFilters = searchQuery || selectedFilter !== 'all';

  // Format the full address from separate fields
  const getFullAddress = (event: any) => {
    const addressParts = [event.address, event.suburb, event.state, event.postcode].filter(Boolean);
    return addressParts.join(', ');
  };

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
        <h1 className="text-lg font-semibold text-slate-100">Browse Events</h1>
        <button
          onClick={onClose}
          className="p-2 -mr-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 pb-32">
          <div className="space-y-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search events by title, description, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-mobile pl-10"
              />
            </div>

            <div className="flex bg-slate-800 rounded-lg p-1 overflow-x-auto">
              {[
                { id: 'all', label: 'All' },
                { id: 'upcoming', label: 'Upcoming' },
                { id: 'today', label: 'Today' },
                { id: 'this_week', label: 'This Week' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setSelectedFilter(id as any)}
                  className={`py-2 px-4 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                    selectedFilter === id
                      ? 'bg-emerald-500 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-emerald-400 hover:text-emerald-300 text-sm font-medium flex items-center"
              >
                <Filter className="w-4 h-4 mr-1" />
                Clear all filters
              </button>
            )}
          </div>

          <div className="mb-6">
            <p className="text-slate-400 text-sm">
              {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} found
              {searchQuery && ` for "${searchQuery}"`}
            </p>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="card p-6 animate-pulse">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-slate-700 rounded-xl"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-slate-700 rounded w-1/3 mb-2"></div>
                      <div className="h-3 bg-slate-700 rounded w-full mb-2"></div>
                      <div className="h-3 bg-slate-700 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="card p-8 text-center">
              <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Calendar className="w-8 h-8 text-slate-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-100 mb-3">No Events Found</h3>
              <p className="text-slate-400 leading-relaxed mb-6">
                {hasActiveFilters
                  ? 'Try adjusting your search criteria or filters to find more events.'
                  : 'No events are available at the moment. Check back later or create your own event!'
                }
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="btn-primary-mobile"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEvents.map((event) => {
                const { date, time } = formatEventTime(event.startTime);
                const isUpcoming = Number(event.startTime) > Date.now();
                
                return (
                  <div key={event.id.toString()} className="card p-6">
                    <div className="flex items-start space-x-4 mb-4">
                      <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-slate-100 text-lg">{event.title}</h3>
                          <span className="bg-slate-600/50 text-slate-300 text-xs px-2 py-1 rounded-full">
                            {event.clubId ? 'Club' : 'Team'}
                          </span>
                        </div>
                        <p className="text-slate-300 text-sm mb-3 leading-relaxed">{event.description}</p>
                        <div className="space-y-2">
                          <div className="flex items-center text-slate-400 text-sm">
                            <Clock className="w-4 h-4 mr-2" />
                            <span>{date}, {time}</span>
                            {!isUpcoming && (
                              <span className="ml-2 text-red-400 text-xs">(Past Event)</span>
                            )}
                          </div>
                          <div className="flex items-start text-slate-400 text-sm">
                            <MapPin className="w-4 h-4 mr-2 mt-0.5" />
                            <div className="space-y-1">
                              <span>{event.address}</span>
                              <div className="text-xs text-slate-500">
                                {event.suburb}, {event.state} {event.postcode}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-slate-800/50">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center text-slate-400 text-sm">
                          <Users className="w-4 h-4 mr-1" />
                          <span>0 going</span>
                        </div>
                      </div>
                      
                      <button
                        className="bg-emerald-500 hover:bg-emerald-600 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                        disabled={!isUpcoming}
                      >
                        {isUpcoming ? 'View Details' : 'View Past Event'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-slate-800/50 p-4 bg-slate-900/95 backdrop-blur-sm sticky bottom-0 z-10" style={{
        position: 'sticky',
        bottom: '0',
        margin: '0',
        paddingTop: '1rem',
        paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)',
        paddingLeft: 'max(env(safe-area-inset-left), 1rem)',
        paddingRight: 'max(env(safe-area-inset-right), 1rem)'
      }}>
        <button
          onClick={onClose}
          className="w-full btn-primary-mobile"
        >
          Done
        </button>
      </div>
    </div>
  );
}
