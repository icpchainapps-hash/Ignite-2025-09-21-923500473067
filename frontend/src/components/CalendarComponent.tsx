import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, Gamepad2, Dumbbell, Coffee, Trophy, Crown, Users, Repeat } from 'lucide-react';
import type { Event, EventType } from '../backend';

interface CalendarComponentProps {
  events: Event[];
  onEventClick: (event: Event) => void;
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  events: Event[];
}

export default function CalendarComponent({ events, onEventClick, selectedDate, onDateSelect }: CalendarComponentProps) {
  const [currentDate, setCurrentDate] = useState(selectedDate || new Date());
  
  const today = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const isSameDay = (date1: Date, date2: Date) => {
    try {
      if (!date1 || !date2) return false;
      return date1.getFullYear() === date2.getFullYear() &&
             date1.getMonth() === date2.getMonth() &&
             date1.getDate() === date2.getDate();
    } catch (error) {
      console.error('Error comparing dates:', error);
      return false;
    }
  };

  const getEventsForDate = (date: Date, events: Event[]) => {
    try {
      if (!date || !events || !Array.isArray(events)) return [];
      
      return events.filter(event => {
        try {
          if (!event || !event.startTime) return false;
          const eventDate = new Date(Number(event.startTime));
          return isSameDay(eventDate, date);
        } catch (error) {
          console.error('Error processing event for date:', error, event);
          return false;
        }
      });
    } catch (error) {
      console.error('Error filtering events for date:', error);
      return [];
    }
  };

  const calendarDays = useMemo(() => {
    try {
      const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
      const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
      const firstDayOfWeek = firstDayOfMonth.getDay();
      const daysInMonth = lastDayOfMonth.getDate();
      
      const days: CalendarDay[] = [];
      
      const prevMonth = new Date(currentYear, currentMonth - 1, 0);
      for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        const date = new Date(currentYear, currentMonth - 1, prevMonth.getDate() - i);
        days.push({
          date,
          isCurrentMonth: false,
          isToday: isSameDay(date, today),
          isSelected: selectedDate ? isSameDay(date, selectedDate) : false,
          events: getEventsForDate(date, events || []),
        });
      }
      
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, currentMonth, day);
        days.push({
          date,
          isCurrentMonth: true,
          isToday: isSameDay(date, today),
          isSelected: selectedDate ? isSameDay(date, selectedDate) : false,
          events: getEventsForDate(date, events || []),
        });
      }
      
      const remainingDays = 42 - days.length;
      for (let day = 1; day <= remainingDays; day++) {
        const date = new Date(currentYear, currentMonth + 1, day);
        days.push({
          date,
          isCurrentMonth: false,
          isToday: isSameDay(date, today),
          isSelected: selectedDate ? isSameDay(date, selectedDate) : false,
          events: getEventsForDate(date, events || []),
        });
      }
      
      return days;
    } catch (error) {
      console.error('Error generating calendar days:', error);
      const fallbackDays: CalendarDay[] = [];
      const today = new Date();
      
      for (let day = 1; day <= 31; day++) {
        try {
          const date = new Date(currentYear, currentMonth, day);
          if (date.getMonth() === currentMonth) {
            fallbackDays.push({
              date,
              isCurrentMonth: true,
              isToday: isSameDay(date, today),
              isSelected: false,
              events: [],
            });
          }
        } catch (dayError) {
          console.error('Error creating fallback day:', dayError);
        }
      }
      
      return fallbackDays;
    }
  }, [currentYear, currentMonth, events, selectedDate]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    try {
      const newDate = new Date(currentDate);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      setCurrentDate(newDate);
    } catch (error) {
      console.error('Error navigating month:', error);
    }
  };

  const goToToday = () => {
    try {
      const today = new Date();
      setCurrentDate(today);
      if (onDateSelect) {
        onDateSelect(today);
      }
    } catch (error) {
      console.error('Error going to today:', error);
    }
  };

  const handleDayClick = (day: CalendarDay) => {
    try {
      if (onDateSelect && day.date) {
        onDateSelect(day.date);
      }
    } catch (error) {
      console.error('Error handling day click:', error);
    }
  };

  const getEventTypeInfo = (eventType: EventType) => {
    try {
      switch (eventType) {
        case EventType.game:
          return {
            icon: Gamepad2,
            color: 'text-red-400',
            bgColor: 'bg-red-500/20',
          };
        case EventType.training:
          return {
            icon: Dumbbell,
            color: 'text-blue-400',
            bgColor: 'bg-blue-500/20',
          };
        case EventType.socialEvent:
          return {
            icon: Coffee,
            color: 'text-purple-400',
            bgColor: 'bg-purple-500/20',
          };
        default:
          return {
            icon: CalendarIcon,
            color: 'text-slate-400',
            bgColor: 'bg-slate-500/20',
          };
      }
    } catch (error) {
      console.error('Error getting event type info:', error);
      return {
        icon: CalendarIcon,
        color: 'text-slate-400',
        bgColor: 'bg-slate-500/20',
      };
    }
  };

  const formatEventTime = (timestamp: bigint) => {
    try {
      if (!timestamp) return 'Unknown time';
      const date = new Date(Number(timestamp));
      if (isNaN(date.getTime())) return 'Invalid time';
      
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } catch (error) {
      console.error('Error formatting event time:', error);
      return 'Unknown time';
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (!calendarDays || calendarDays.length === 0) {
    return (
      <div className="space-y-4">
        <div className="card p-6 bg-red-500/10 border-red-500/20">
          <div className="text-center">
            <CalendarIcon className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-slate-100 mb-2">Calendar Error</h3>
            <p className="text-red-300 text-sm mb-4">
              Unable to generate calendar view. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary text-sm"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-slate-100">
            {monthNames[currentMonth] || 'Unknown Month'} {currentYear}
          </h3>
          <button
            onClick={goToToday}
            className="text-emerald-400 hover:text-emerald-300 text-sm font-medium"
          >
            Today
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800/50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800/50 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map((day) => (
            <div key={day} className="text-center text-slate-400 text-sm font-medium py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            if (!day || !day.date) {
              return (
                <div key={index} className="p-2 min-h-[80px] rounded-lg bg-slate-800/30">
                  <div className="text-sm text-slate-600">--</div>
                </div>
              );
            }

            return (
              <button
                key={index}
                onClick={() => handleDayClick(day)}
                className={`relative p-2 min-h-[80px] rounded-lg transition-all duration-200 text-left ${
                  day.isCurrentMonth
                    ? day.isSelected
                      ? 'bg-emerald-500/20 border-2 border-emerald-500/50'
                      : day.isToday
                      ? 'bg-blue-500/20 border-2 border-blue-500/50'
                      : 'hover:bg-slate-800/50 border-2 border-transparent'
                    : 'text-slate-600 hover:bg-slate-800/30 border-2 border-transparent'
                }`}
              >
                <div className={`text-sm font-medium mb-1 ${
                  day.isCurrentMonth
                    ? day.isToday
                      ? 'text-blue-400'
                      : day.isSelected
                      ? 'text-emerald-400'
                      : 'text-slate-200'
                    : 'text-slate-600'
                }`}>
                  {day.date.getDate()}
                </div>
                
                {day.events && day.events.length > 0 && (
                  <div className="space-y-1">
                    {day.events.slice(0, 2).map((event) => {
                      try {
                        const eventTypeInfo = getEventTypeInfo(event.eventType);
                        const Icon = eventTypeInfo.icon;
                        
                        return (
                          <div
                            key={event.id.toString()}
                            onClick={(e) => {
                              e.stopPropagation();
                              onEventClick(event);
                            }}
                            className={`text-xs p-1 rounded ${eventTypeInfo.bgColor} ${eventTypeInfo.color} truncate hover:bg-opacity-80 transition-colors cursor-pointer`}
                            title={`${event.title} - ${formatEventTime(event.startTime)}`}
                          >
                            <div className="flex items-center space-x-1">
                              <Icon className="w-3 h-3 shrink-0" />
                              <span className="truncate">{event.title || 'Untitled Event'}</span>
                            </div>
                          </div>
                        );
                      } catch (eventError) {
                        console.error('Error rendering event:', eventError, event);
                        return (
                          <div
                            key={event.id?.toString() || index}
                            className="text-xs p-1 rounded bg-slate-500/20 text-slate-400 truncate"
                          >
                            Event Error
                          </div>
                        );
                      }
                    })}
                    
                    {day.events.length > 2 && (
                      <div className="text-xs text-slate-400 text-center">
                        +{day.events.length - 2} more
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="space-y-3">
          <h4 className="text-lg font-semibold text-slate-100">
            Events on {selectedDate.toLocaleDateString('en-US', { 
              weekday: 'long',
              month: 'long', 
              day: 'numeric',
              year: 'numeric'
            })}
          </h4>
          
          {getEventsForDate(selectedDate, events || []).length === 0 ? (
            <div className="card p-6 text-center">
              <CalendarIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No events on this date</p>
            </div>
          ) : (
            <div className="space-y-3">
              {getEventsForDate(selectedDate, events || []).map((event) => {
                try {
                  const eventTypeInfo = getEventTypeInfo(event.eventType);
                  const Icon = eventTypeInfo.icon;
                  
                  return (
                    <div
                      key={event.id.toString()}
                      onClick={() => onEventClick(event)}
                      className="card p-4 hover:bg-slate-800/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start space-x-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${eventTypeInfo.bgColor}`}>
                          <Icon className={`w-5 h-5 ${eventTypeInfo.color}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h5 className="font-semibold text-slate-100">{event.title || 'Untitled Event'}</h5>
                            <div className="flex items-center space-x-2">
                              <span className={`text-xs px-2 py-1 rounded-full ${eventTypeInfo.bgColor} ${eventTypeInfo.color}`}>
                                {event.eventType === EventType.game ? 'Game' : 
                                 event.eventType === EventType.training ? 'Training' : 'Social'}
                              </span>
                              {event.recurrenceRule && (
                                <div className="flex items-center space-x-1">
                                  <Repeat className="w-3 h-3 text-emerald-400" />
                                  <span className="text-xs text-emerald-400">Recurring</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="text-slate-300 text-sm mb-2">{event.description || 'No description'}</p>
                          <div className="flex items-center space-x-4 text-slate-400 text-sm">
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span>{formatEventTime(event.startTime)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <MapPin className="w-4 h-4" />
                              <span>{event.suburb || 'Unknown'}, {event.state || 'Unknown'}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              {event.clubId ? (
                                <>
                                  <Crown className="w-4 h-4" />
                                  <span>Club</span>
                                </>
                              ) : (
                                <>
                                  <Trophy className="w-4 h-4" />
                                  <span>Team</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                } catch (eventError) {
                  console.error('Error rendering selected date event:', eventError, event);
                  return (
                    <div key={event.id?.toString() || 'error'} className="card p-4 bg-red-500/10 border-red-500/20">
                      <p className="text-red-400 text-sm">Error displaying event</p>
                    </div>
                  );
                }
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
