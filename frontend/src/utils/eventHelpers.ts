import { Event, EventType, DutyAssignment } from '../backend';
import { Gamepad2, Dumbbell, Coffee, Calendar } from 'lucide-react';
import { EVENT_TYPE_CONFIGS } from './constants';

export const getEventTypeInfo = (eventType: EventType) => {
  const config = EVENT_TYPE_CONFIGS[eventType];
  if (!config) {
    return {
      label: 'Event',
      description: 'General event',
      icon: Calendar,
      color: 'text-slate-500',
      bgColor: 'bg-slate-500/10',
      borderColor: 'border-slate-500/20',
    };
  }

  let icon;
  switch (config.icon) {
    case 'Gamepad2': icon = Gamepad2; break;
    case 'Dumbbell': icon = Dumbbell; break;
    case 'Coffee': icon = Coffee; break;
    default: icon = Calendar;
  }

  return { ...config, icon };
};

export const isEventToday = (timestamp: bigint): boolean => {
  const eventDate = new Date(Number(timestamp));
  const today = new Date();
  return eventDate.toDateString() === today.toDateString();
};

export const isEventUpcoming = (timestamp: bigint): boolean => {
  return Number(timestamp) > Date.now();
};

export const isDutyCompleted = (event: Event, duty: DutyAssignment): boolean => {
  const currentTime = Date.now();
  const eventEndTime = Number(event.endTime);
  const twentyFourHoursAfterEvent = eventEndTime + (24 * 60 * 60 * 1000);
  
  return currentTime > twentyFourHoursAfterEvent;
};

export const getDutyStatusText = (isCompleted: boolean): string => {
  return isCompleted ? 'Completed' : 'Open';
};

export const getDutyStatusColor = (isCompleted: boolean): {
  text: string;
  bg: string;
  border: string;
} => {
  if (isCompleted) {
    return {
      text: 'text-slate-400',
      bg: 'bg-slate-500/10',
      border: 'border-slate-500/20',
    };
  } else {
    return {
      text: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
    };
  }
};

export const canDutyBeSwapped = (event: Event, duty: DutyAssignment): boolean => {
  return !isDutyCompleted(event, duty);
};

export const getTimeUntilDutyCompletion = (event: Event): {
  isCompleted: boolean;
  timeRemaining?: string;
} => {
  const currentTime = Date.now();
  const eventEndTime = Number(event.endTime);
  const twentyFourHoursAfterEvent = eventEndTime + (24 * 60 * 60 * 1000);
  
  if (currentTime > twentyFourHoursAfterEvent) {
    return { isCompleted: true };
  }
  
  const timeRemaining = twentyFourHoursAfterEvent - currentTime;
  const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
  const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hoursRemaining > 0) {
    return {
      isCompleted: false,
      timeRemaining: `${hoursRemaining}h ${minutesRemaining}m until auto-completion`
    };
  } else {
    return {
      isCompleted: false,
      timeRemaining: `${minutesRemaining}m until auto-completion`
    };
  }
};

export const getRecurrenceDescription = (recurrenceRule: any): string | null => {
  if (!recurrenceRule) return null;
  
  const interval = Number(recurrenceRule.interval);
  let description = `Repeats every `;
  
  if (interval > 1) {
    description += `${interval} `;
  }
  
  switch (recurrenceRule.frequency) {
    case 'daily':
      description += interval === 1 ? 'day' : 'days';
      break;
    case 'weekly':
      description += interval === 1 ? 'week' : 'weeks';
      break;
    case 'monthly':
      description += interval === 1 ? 'month' : 'months';
      break;
    case 'custom':
      description += interval === 1 ? 'week' : 'weeks';
      break;
  }

  if (recurrenceRule.endDate) {
    description += ` until ${new Date(Number(recurrenceRule.endDate)).toLocaleDateString()}`;
  } else if (recurrenceRule.occurrences) {
    description += ` for ${recurrenceRule.occurrences} occurrence${Number(recurrenceRule.occurrences) !== 1 ? 's' : ''}`;
  }

  return description;
};

export const wouldDutyAwardPoints = (event: Event, duty: DutyAssignment, userPrincipal: string): boolean => {
  const isAssignedToUser = duty.assignee.toString() === userPrincipal;
  const isCompleted = isDutyCompleted(event, duty);
  
  return isAssignedToUser && isCompleted;
};

export const calculatePotentialPointsFromDuties = (events: Event[], userPrincipal: string): number => {
  let totalPotentialPoints = 0;
  
  for (const event of events) {
    for (const duty of event.dutyRoster) {
      if (wouldDutyAwardPoints(event, duty, userPrincipal)) {
        totalPotentialPoints += 10;
      }
    }
  }
  
  return totalPotentialPoints;
};
