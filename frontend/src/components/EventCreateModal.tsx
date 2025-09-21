import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Calendar, Clock, MapPin, Users, FileText, ArrowLeft, Eye, UserCheck, Repeat, Plus, Minus, UserPlus, CheckCircle, AlertCircle, Baby, Trophy, Gamepad2, Dumbbell, Coffee, ClipboardList, Trash2, Crown, Lock } from 'lucide-react';
import { useCreateEvent } from '../hooks/useEvents';
import { useGetUserClubs, useGetClubUniqueMemberCount, useGetTeamMemberCount } from '../hooks/useClubs';
import { useGetAllTeams } from '../hooks/useTeams';
import { useGetCallerChildren } from '../hooks/useChildren';
import { useGetTeamMembersByTeamId } from '../hooks/useQueries';
import { useCanAccessProFeatures } from '../hooks/useSubscriptions';
import { RecurrenceFrequency, RecurrenceRule, EventType, DutyAssignment } from '../backend';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Principal } from '@dfinity/principal';
import MapComponent from './MapComponent';
import ProFeatureGate from './ProFeatureGate';

interface EventCreateModalProps {
  onClose: () => void;
}

export default function EventCreateModal({ onClose }: EventCreateModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    startTime: '',
    endTime: '',
    address: '',
    suburb: '',
    state: '',
    postcode: '',
    notes: '',
    visibility: 'team' as 'club' | 'team',
    clubId: '',
    teamId: '',
    rsvpRequired: true,
    inviteAllMembers: true,
    isRecurring: false,
    recurrenceFrequency: 'weekly' as 'daily' | 'weekly' | 'monthly' | 'custom',
    recurrenceInterval: 1,
    recurrenceEndType: 'date' as 'date' | 'occurrences' | 'never',
    recurrenceEndDate: '',
    recurrenceOccurrences: 10,
    customDays: [] as number[], // For weekly custom patterns (0=Sunday, 1=Monday, etc.)
    eventType: EventType.training,
    dutyRoster: [] as Array<{ role: string; assignee: string }>, // Store as strings for form handling
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [memberCount, setMemberCount] = useState<number>(0);
  const [childrenCount, setChildrenCount] = useState<number>(0);
  const [loadingMemberCount, setLoadingMemberCount] = useState(false);
  
  const { mutate: createEvent, isPending } = useCreateEvent();
  const { data: clubs } = useGetUserClubs();
  const { data: allTeams } = useGetAllTeams();
  const { data: userChildren } = useGetCallerChildren();
  const { mutate: getClubMemberCount } = useGetClubUniqueMemberCount();
  const { mutate: getTeamMemberCount } = useGetTeamMemberCount();
  const { identity } = useInternetIdentity();

  // Check Pro access for duty assignments
  const { canAccess: canAccessDutyFeatures } = useCanAccessProFeatures(
    formData.visibility,
    formData.visibility === 'club' ? formData.clubId : formData.teamId
  );

  // Only fetch team members when we have a valid teamId and need them for duty roster
  const shouldFetchTeamMembers = formData.teamId && formData.eventType === EventType.game && canAccessDutyFeatures;
  const { data: teamMembers, isLoading: teamMembersLoading, error: teamMembersError } = useGetTeamMembersByTeamId(
    shouldFetchTeamMembers ? formData.teamId : undefined
  );

  // Prevent body scroll when modal is open
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

  // All clubs are accessible for event creation (no permission restrictions)
  const accessibleClubs = useMemo(() => {
    return clubs || [];
  }, [clubs]);

  // All teams are accessible for event creation (no permission restrictions)
  const accessibleTeams = useMemo(() => {
    if (!allTeams || !formData.clubId) return [];
    const selectedClubId = BigInt(formData.clubId);
    
    return allTeams.filter(team => team.clubId === selectedClubId);
  }, [allTeams, formData.clubId]);

  // Memoize available members for duty roster with deduplication by name
  const availableMembers = useMemo(() => {
    if (!teamMembers || teamMembersError) return [];
    
    const uniqueMembers = new Map<string, { principal: string; name: string }>();
    
    teamMembers.forEach(member => {
      const displayName = member.name.toLowerCase();
      // Only add if we haven't seen this display name before
      if (!uniqueMembers.has(displayName)) {
        uniqueMembers.set(displayName, {
          principal: member.principal,
          name: member.name,
        });
      }
    });
    
    return Array.from(uniqueMembers.values());
  }, [teamMembers, teamMembersError]);

  // Optimized member count loading with proper error handling
  const loadMemberCount = useCallback(async () => {
    if (!formData.inviteAllMembers) {
      setMemberCount(0);
      setChildrenCount(0);
      setLoadingMemberCount(false);
      return;
    }

    try {
      setLoadingMemberCount(true);
      
      if (formData.visibility === 'club' && formData.clubId) {
        getClubMemberCount(formData.clubId, {
          onSuccess: (count) => {
            setMemberCount(count);
            
            // Calculate children count for club events
            if (userChildren && accessibleTeams.length > 0) {
              const childrenInClub = userChildren.filter(child => 
                child.teamId && accessibleTeams.some(team => team.id === child.teamId)
              );
              setChildrenCount(childrenInClub.length);
            } else {
              setChildrenCount(0);
            }
            
            setLoadingMemberCount(false);
          },
          onError: (error) => {
            console.warn('Failed to get club member count:', error);
            setMemberCount(1); // At minimum, the creator will be invited
            setChildrenCount(0);
            setLoadingMemberCount(false);
          }
        });
      } else if (formData.visibility === 'team' && formData.teamId) {
        getTeamMemberCount(formData.teamId, {
          onSuccess: (count) => {
            setMemberCount(count);
            
            // Calculate children count for team events
            if (userChildren) {
              const childrenInTeam = userChildren.filter(child => 
                child.teamId && child.teamId.toString() === formData.teamId
              );
              setChildrenCount(childrenInTeam.length);
            } else {
              setChildrenCount(0);
            }
            
            setLoadingMemberCount(false);
          },
          onError: (error) => {
            console.warn('Failed to get team member count:', error);
            setMemberCount(1); // At minimum, the creator will be invited
            setChildrenCount(0);
            setLoadingMemberCount(false);
          }
        });
      } else {
        setMemberCount(0);
        setChildrenCount(0);
        setLoadingMemberCount(false);
      }
    } catch (error) {
      console.error('Error in loadMemberCount:', error);
      setMemberCount(0);
      setChildrenCount(0);
      setLoadingMemberCount(false);
    }
  }, [
    formData.inviteAllMembers,
    formData.visibility,
    formData.clubId,
    formData.teamId,
    getClubMemberCount,
    getTeamMemberCount,
    userChildren,
    accessibleTeams
  ]);

  // Debounced member count loading to prevent excessive calls
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadMemberCount();
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [loadMemberCount]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Event title is required';
    }

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required';
    }

    if (!formData.clubId) {
      newErrors.clubId = 'Please select a club first';
    }

    if (formData.visibility === 'team' && !formData.teamId) {
      newErrors.teamId = 'Please select a team';
    }

    // Validate location fields - all are required
    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    if (!formData.suburb.trim()) {
      newErrors.suburb = 'Suburb is required';
    }

    if (!formData.state.trim()) {
      newErrors.state = 'State is required';
    }

    if (!formData.postcode.trim()) {
      newErrors.postcode = 'Postcode is required';
    }

    // Validate that end time is after start time if both are provided
    if (formData.startTime && formData.endTime && formData.date) {
      const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.date}T${formData.endTime}`);
      
      if (endDateTime <= startDateTime) {
        newErrors.endTime = 'End time must be after start time';
      }
    }

    // Validate recurrence settings
    if (formData.isRecurring) {
      if (formData.recurrenceInterval < 1) {
        newErrors.recurrenceInterval = 'Interval must be at least 1';
      }

      if (formData.recurrenceEndType === 'date' && !formData.recurrenceEndDate) {
        newErrors.recurrenceEndDate = 'End date is required';
      }

      if (formData.recurrenceEndType === 'date' && formData.recurrenceEndDate) {
        const endDate = new Date(formData.recurrenceEndDate);
        const startDate = new Date(formData.date);
        if (endDate <= startDate) {
          newErrors.recurrenceEndDate = 'End date must be after start date';
        }
      }

      if (formData.recurrenceEndType === 'occurrences' && formData.recurrenceOccurrences < 1) {
        newErrors.recurrenceOccurrences = 'Number of occurrences must be at least 1';
      }

      if (formData.recurrenceFrequency === 'custom' && formData.customDays.length === 0) {
        newErrors.customDays = 'Please select at least one day for custom recurrence';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
    const endDateTime = formData.endTime 
      ? new Date(`${formData.date}T${formData.endTime}`)
      : new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000); // Default 2 hours

    let recurrenceRule: RecurrenceRule | null = null;
    
    if (formData.isRecurring) {
      let frequency: RecurrenceFrequency;
      switch (formData.recurrenceFrequency) {
        case 'daily':
          frequency = RecurrenceFrequency.daily;
          break;
        case 'weekly':
          frequency = RecurrenceFrequency.weekly;
          break;
        case 'monthly':
          frequency = RecurrenceFrequency.monthly;
          break;
        case 'custom':
          frequency = RecurrenceFrequency.custom;
          break;
        default:
          frequency = RecurrenceFrequency.weekly;
      }

      recurrenceRule = {
        frequency,
        interval: BigInt(formData.recurrenceInterval),
        endDate: formData.recurrenceEndType === 'date' && formData.recurrenceEndDate 
          ? BigInt(new Date(formData.recurrenceEndDate).getTime()) 
          : undefined,
        occurrences: formData.recurrenceEndType === 'occurrences' 
          ? BigInt(formData.recurrenceOccurrences) 
          : undefined,
      };
    }

    // Convert duty roster from form format to backend format (only if Pro access)
    const backendDutyRoster: DutyAssignment[] = canAccessDutyFeatures 
      ? formData.dutyRoster
          .filter(assignment => assignment.role && assignment.assignee) // Only include complete assignments
          .map(assignment => ({
            role: assignment.role,
            assignee: Principal.fromText(assignment.assignee), // Convert string to Principal
          }))
      : []; // Empty duty roster for non-Pro users

    const eventData = {
      title: formData.title.trim(),
      description: formData.notes.trim(),
      address: formData.address.trim(),
      suburb: formData.suburb.trim(),
      state: formData.state.trim(),
      postcode: formData.postcode.trim(),
      startTime: BigInt(startDateTime.getTime()),
      endTime: BigInt(endDateTime.getTime()),
      clubId: formData.visibility === 'club' ? BigInt(formData.clubId) : null,
      teamId: formData.visibility === 'team' && formData.teamId ? BigInt(formData.teamId) : null,
      recurrenceRule,
      eventType: formData.eventType,
      dutyRoster: backendDutyRoster,
    };

    createEvent(eventData, {
      onSuccess: () => {
        onClose();
      },
      onError: (error: unknown) => {
        console.error('Failed to create event:', error);
      }
    });
  };

  const handleInputChange = useCallback((field: keyof typeof formData, value: any) => {
    setFormData(prev => {
      // Handle special cases for dependent field clearing
      if (field === 'clubId') {
        return { 
          ...prev, 
          clubId: value as string,
          teamId: '', // Clear team selection when club changes
          dutyRoster: [] // Clear duty roster when club changes
        };
      } else if (field === 'teamId') {
        return { 
          ...prev, 
          teamId: value as string,
          dutyRoster: [] // Clear duty roster when team changes
        };
      } else {
        return { ...prev, [field]: value };
      }
    });
    
    // Clear errors for the changed field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  const toggleCustomDay = useCallback((dayIndex: number) => {
    const newCustomDays = formData.customDays.includes(dayIndex)
      ? formData.customDays.filter(day => day !== dayIndex)
      : [...formData.customDays, dayIndex].sort();
    handleInputChange('customDays', newCustomDays);
  }, [formData.customDays, handleInputChange]);

  const addDutyAssignment = useCallback(() => {
    const newAssignment = {
      role: '',
      assignee: '',
    };
    handleInputChange('dutyRoster', [...formData.dutyRoster, newAssignment]);
  }, [formData.dutyRoster, handleInputChange]);

  const updateDutyAssignment = useCallback((index: number, field: 'role' | 'assignee', value: string) => {
    const updatedRoster = [...formData.dutyRoster];
    updatedRoster[index] = { ...updatedRoster[index], [field]: value };
    handleInputChange('dutyRoster', updatedRoster);
  }, [formData.dutyRoster, handleInputChange]);

  const removeDutyAssignment = useCallback((index: number) => {
    const updatedRoster = formData.dutyRoster.filter((_, i) => i !== index);
    handleInputChange('dutyRoster', updatedRoster);
  }, [formData.dutyRoster, handleInputChange]);

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const eventTypes = [
    {
      value: EventType.game,
      label: 'Game',
      description: 'Competitive match or tournament',
      icon: Gamepad2,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
    },
    {
      value: EventType.training,
      label: 'Training',
      description: 'Practice session or skill development',
      icon: Dumbbell,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
    },
    {
      value: EventType.socialEvent,
      label: 'Social Event',
      description: 'Team building or social gathering',
      icon: Coffee,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
    },
  ];

  const dutyRoles = [
    'BBQ',
    'Canteen',
    'Oranges',
    'First Aid',
    'Equipment Setup',
    'Referee',
    'Timekeeper',
    'Photography',
    'Team Manager',
    'Water Bottles',
    'Cleanup',
    'Parking',
  ];

  const getRecurrencePreview = () => {
    if (!formData.isRecurring) return '';
    
    let preview = `Repeats every `;
    if (formData.recurrenceInterval > 1) {
      preview += `${formData.recurrenceInterval} `;
    }
    
    switch (formData.recurrenceFrequency) {
      case 'daily':
        preview += formData.recurrenceInterval === 1 ? 'day' : 'days';
        break;
      case 'weekly':
        preview += formData.recurrenceInterval === 1 ? 'week' : 'weeks';
        break;
      case 'monthly':
        preview += formData.recurrenceInterval === 1 ? 'month' : 'months';
        break;
      case 'custom':
        if (formData.customDays.length > 0) {
          const selectedDays = formData.customDays.map(day => dayNames[day]).join(', ');
          preview += `week on ${selectedDays}`;
        }
        break;
    }

    if (formData.recurrenceEndType === 'date' && formData.recurrenceEndDate) {
      preview += ` until ${new Date(formData.recurrenceEndDate).toLocaleDateString()}`;
    } else if (formData.recurrenceEndType === 'occurrences') {
      preview += ` for ${formData.recurrenceOccurrences} occurrence${formData.recurrenceOccurrences !== 1 ? 's' : ''}`;
    }

    return preview;
  };

  const getSelectedClubName = () => {
    const selected = accessibleClubs.find(club => club.id.toString() === formData.clubId);
    return selected?.name || '';
  };

  const getSelectedTeamName = () => {
    const selected = accessibleTeams.find(team => team.id.toString() === formData.teamId);
    return selected?.name || '';
  };

  const getMemberName = (principal: string) => {
    const member = availableMembers.find(m => m.principal === principal);
    return member?.name || 'Unknown Member';
  };

  // Check if duty roster should be shown (only for game events, team scope, and Pro access)
  const shouldShowDutyRoster = formData.eventType === EventType.game && 
                               formData.visibility === 'team' && 
                               formData.teamId && 
                               canAccessDutyFeatures;

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
      {/* Fixed Header */}
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
          disabled={isPending}
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold text-slate-100">New Event</h1>
        <button
          onClick={onClose}
          className="p-2 -mr-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
          disabled={isPending}
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 pb-32">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Event Title */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-300">
                <FileText className="w-4 h-4 inline mr-2" />
                Event Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className={`input-mobile ${errors.title ? 'input-error' : ''}`}
                placeholder="Enter event title"
                disabled={isPending}
                autoFocus
              />
              {errors.title && <p className="text-red-400 text-sm mt-2">{errors.title}</p>}
            </div>

            {/* Event Type */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-300">
                <Trophy className="w-4 h-4 inline mr-2" />
                Event Type *
              </label>
              <div className="space-y-3">
                {eventTypes.map((eventType) => {
                  const Icon = eventType.icon;
                  const isSelected = formData.eventType === eventType.value;
                  
                  return (
                    <label
                      key={eventType.value}
                      className={`card p-4 cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? `${eventType.bgColor} ${eventType.borderColor} ring-2 ring-opacity-50`
                          : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-start space-x-4">
                        <input
                          type="radio"
                          name="eventType"
                          value={eventType.value}
                          checked={isSelected}
                          onChange={(e) => {
                            handleInputChange('eventType', e.target.value as EventType);
                            // Clear duty roster when changing away from game type
                            if (e.target.value !== EventType.game) {
                              handleInputChange('dutyRoster', []);
                            }
                          }}
                          className="mt-1 w-4 h-4 text-emerald-500 bg-slate-800 border-slate-600 focus:ring-emerald-500"
                          disabled={isPending}
                        />
                        <div className="flex items-center space-x-3 flex-1">
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
                            <p className={`text-sm ${
                              isSelected ? eventType.color.replace('500', '300') : 'text-slate-400'
                            }`}>{eventType.description}</p>
                          </div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Step 1: Club Selection - MANDATORY FIRST STEP */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                  formData.clubId ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-slate-300'
                }`}>
                  1
                </div>
                <label className="block text-sm font-medium text-slate-300">
                  <Users className="w-4 h-4 inline mr-2" />
                  Select Club *
                </label>
              </div>
              
              {accessibleClubs.length === 0 ? (
                <div className="card p-4 bg-orange-500/10 border-orange-500/20">
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="w-5 h-5 text-orange-400" />
                    <div>
                      <p className="text-orange-400 font-medium">No Clubs Available</p>
                      <p className="text-orange-300 text-sm">
                        You need to create a club first to create events. All clubs are available for event creation.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <select
                  value={formData.clubId}
                  onChange={(e) => handleInputChange('clubId', e.target.value)}
                  className={`input-mobile ${errors.clubId ? 'input-error' : ''}`}
                  disabled={isPending}
                >
                  <option value="">Choose club first...</option>
                  {accessibleClubs.map((club) => (
                    <option key={club.id.toString()} value={club.id.toString()}>
                      {club.name}
                    </option>
                  ))}
                </select>
              )}
              {errors.clubId && <p className="text-red-400 text-sm mt-2">{errors.clubId}</p>}
              
              <div className="card p-3 bg-blue-500/10 border-blue-500/20">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-blue-400" />
                  <span className="text-blue-400 text-sm font-medium">Step 1: Club Selection Required</span>
                </div>
              </div>
            </div>

            {/* Step 2: Event Scope Selection - Only show after club is selected */}
            {formData.clubId && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                    formData.visibility ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-slate-300'
                  }`}>
                    2
                  </div>
                  <label className="block text-sm font-medium text-slate-300">
                    <Eye className="w-4 h-4 inline mr-2" />
                    Event Scope *
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      handleInputChange('visibility', 'club');
                      handleInputChange('teamId', '');
                    }}
                    className={`btn-mobile ${
                      formData.visibility === 'club'
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                    }`}
                    disabled={isPending}
                  >
                    Entire Club
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleInputChange('visibility', 'team');
                      handleInputChange('teamId', '');
                    }}
                    className={`btn-mobile ${
                      formData.visibility === 'team'
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                    }`}
                    disabled={isPending}
                  >
                    Specific Team
                  </button>
                </div>
                <p className="text-slate-400 text-sm">
                  {formData.visibility === 'club' 
                    ? `All members of ${getSelectedClubName()} will be invited`
                    : 'Select a specific team within the club'
                  }
                </p>
              </div>
            )}

            {/* Step 3: Team Selection - Only show if team visibility is selected and club is chosen */}
            {formData.clubId && formData.visibility === 'team' && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                    formData.teamId ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-slate-300'
                  }`}>
                    3
                  </div>
                  <label className="block text-sm font-medium text-slate-300">
                    <Trophy className="w-4 h-4 inline mr-2" />
                    Select Team *
                  </label>
                  <span className="text-slate-400 text-sm">in {getSelectedClubName()}</span>
                </div>
                
                {accessibleTeams.length === 0 ? (
                  <div className="card p-4 bg-orange-500/10 border-orange-500/20">
                    <div className="flex items-center space-x-3">
                      <AlertCircle className="w-5 h-5 text-orange-400" />
                      <div>
                        <p className="text-orange-400 font-medium">No Teams Available</p>
                        <p className="text-orange-300 text-sm">
                          Create a team in {getSelectedClubName()} first to create team-specific events.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <select
                    value={formData.teamId}
                    onChange={(e) => handleInputChange('teamId', e.target.value)}
                    className={`input-mobile ${errors.teamId ? 'input-error' : ''}`}
                    disabled={isPending}
                  >
                    <option value="">Choose team within {getSelectedClubName()}...</option>
                    {accessibleTeams.map((team) => (
                      <option key={team.id.toString()} value={team.id.toString()}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                )}
                {errors.teamId && <p className="text-red-400 text-sm mt-2">{errors.teamId}</p>}
                
                <div className="card p-3 bg-emerald-500/10 border-emerald-500/20">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 text-sm font-medium">Step 3: Team Selection</span>
                  </div>
                </div>
              </div>
            )}

            {/* Duty Roster for Game Events - Pro Feature Gate */}
            {formData.eventType === EventType.game && formData.visibility === 'team' && formData.teamId && (
              <ProFeatureGate
                feature="duty_assignments"
                organizationType="team"
                organizationId={formData.teamId}
                showUpgradePrompt={true}
              >
                <div className="space-y-4 card p-4 bg-red-500/10 border-red-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-sm font-bold">
                        4
                      </div>
                      <h3 className="text-lg font-semibold text-slate-100 flex items-center">
                        <ClipboardList className="w-5 h-5 text-red-400 mr-2" />
                        Duty Roster
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={addDutyAssignment}
                      className="btn-primary text-sm"
                      disabled={isPending || availableMembers.length === 0}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Duty
                    </button>
                  </div>

                  <div className="card p-3 bg-red-500/5 border-red-500/10">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-red-400" />
                      <span className="text-red-400 text-sm font-medium">Game Event Duty Assignment with Status Tracking</span>
                    </div>
                  </div>

                  {/* Team Members Loading State */}
                  {teamMembersLoading && (
                    <div className="card p-4 bg-blue-500/10 border-blue-500/20">
                      <div className="flex items-center space-x-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-400 border-t-transparent"></div>
                        <div>
                          <p className="text-blue-400 font-medium">Loading Team Members</p>
                          <p className="text-blue-300 text-sm">
                            Fetching team member data for duty assignments...
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Team Members Error State */}
                  {teamMembersError && (
                    <div className="card p-4 bg-orange-500/10 border-orange-500/20">
                      <div className="flex items-center space-x-3">
                        <AlertCircle className="w-5 h-5 text-orange-400" />
                        <div>
                          <p className="text-orange-400 font-medium">Failed to Load Team Members</p>
                          <p className="text-orange-300 text-sm">
                            Unable to load team member data for duty assignments. You can still create the event without duties.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Available Members Check */}
                  {!teamMembersLoading && !teamMembersError && availableMembers.length === 0 && (
                    <div className="card p-4 bg-orange-500/10 border-orange-500/20">
                      <div className="flex items-center space-x-3">
                        <AlertCircle className="w-5 h-5 text-orange-400" />
                        <div>
                          <p className="text-orange-400 font-medium">No Team Members Available</p>
                          <p className="text-orange-300 text-sm">
                            Team member data is not available for duty assignments. You can create the event and assign duties later.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Duty Roster Content */}
                  {!teamMembersLoading && (
                    <>
                      {formData.dutyRoster.length === 0 ? (
                        <div className="text-center py-6">
                          <ClipboardList className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                          <p className="text-slate-400">No duties assigned yet</p>
                          <p className="text-slate-500 text-sm">Add duties to organize game responsibilities</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {formData.dutyRoster.map((assignment, index) => (
                            <div key={index} className="card p-4 bg-slate-800/50">
                              <div className="flex items-center space-x-3">
                                <div className="flex-1 grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-2">
                                      Duty Role
                                    </label>
                                    <select
                                      value={assignment.role}
                                      onChange={(e) => updateDutyAssignment(index, 'role', e.target.value)}
                                      className="input-mobile text-sm"
                                      disabled={isPending}
                                    >
                                      <option value="">Select role...</option>
                                      {dutyRoles.map((role) => (
                                        <option key={role} value={role}>
                                          {role}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-2">
                                      Assigned To
                                    </label>
                                    <select
                                      value={assignment.assignee}
                                      onChange={(e) => updateDutyAssignment(index, 'assignee', e.target.value)}
                                      className="input-mobile text-sm"
                                      disabled={isPending || availableMembers.length === 0}
                                    >
                                      <option value="">Select member...</option>
                                      {availableMembers.map((member) => (
                                        <option key={member.principal} value={member.principal}>
                                          {member.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeDutyAssignment(index)}
                                  className="p-2 text-red-400 hover:text-red-300 rounded-lg hover:bg-slate-800/50 transition-all duration-200"
                                  disabled={isPending}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                              {assignment.role && assignment.assignee && (
                                <div className="mt-3 p-3 bg-red-500/5 rounded-lg border border-red-500/10">
                                  <p className="text-red-300 text-sm">
                                    <strong>{getMemberName(assignment.assignee)}</strong> will be responsible for <strong>{assignment.role}</strong>
                                  </p>
                                  <div className="mt-2 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                                    <div className="flex items-center space-x-2">
                                      <CheckCircle className="w-3 h-3 text-emerald-400" />
                                      <span className="text-emerald-400 text-xs font-medium">
                                        Status: Open (will auto-complete 24h after event)
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </ProFeatureGate>
            )}

            {/* Pro Feature Notice for Game Events without Pro Access */}
            {formData.eventType === EventType.game && formData.visibility === 'team' && formData.teamId && !canAccessDutyFeatures && (
              <div className="card p-4 bg-yellow-500/10 border-yellow-500/20">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                    <Lock className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-yellow-400 font-medium">Duty Roster - Pro Feature</p>
                    <p className="text-yellow-300 text-sm">
                      Duty assignments for game events are available with Pro subscription. 
                      You can still create the game event, but duty roster functionality requires an upgrade.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Date */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-300">
                <Calendar className="w-4 h-4 inline mr-2" />
                Date *
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                className={`input-mobile ${errors.date ? 'input-error' : ''}`}
                disabled={isPending}
                min={new Date().toISOString().split('T')[0]}
              />
              {errors.date && <p className="text-red-400 text-sm mt-2">{errors.date}</p>}
            </div>

            {/* Time Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-300">
                  <Clock className="w-4 h-4 inline mr-2" />
                  Start Time *
                </label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => handleInputChange('startTime', e.target.value)}
                  className={`input-mobile ${errors.startTime ? 'input-error' : ''}`}
                  disabled={isPending}
                />
                {errors.startTime && <p className="text-red-400 text-sm mt-1">{errors.startTime}</p>}
              </div>
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-300">
                  <Clock className="w-4 h-4 inline mr-2" />
                  End Time
                </label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => handleInputChange('endTime', e.target.value)}
                  className={`input-mobile ${errors.endTime ? 'input-error' : ''}`}
                  disabled={isPending}
                />
                {errors.endTime && <p className="text-red-400 text-sm mt-1">{errors.endTime}</p>}
              </div>
            </div>

            {/* Location Fields with Integrated Map */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-300">
                <MapPin className="w-4 h-4 inline mr-2" />
                Event Location *
              </label>
              
              {/* Address */}
              <div className="space-y-3">
                <label className="block text-xs font-medium text-slate-400">
                  Street Address *
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className={`input-mobile ${errors.address ? 'input-error' : ''}`}
                  placeholder="e.g. 123 Main Street"
                  disabled={isPending}
                />
                {errors.address && <p className="text-red-400 text-sm mt-2">{errors.address}</p>}
              </div>

              {/* Suburb and State */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="block text-xs font-medium text-slate-400">
                    Suburb *
                  </label>
                  <input
                    type="text"
                    value={formData.suburb}
                    onChange={(e) => handleInputChange('suburb', e.target.value)}
                    className={`input-mobile ${errors.suburb ? 'input-error' : ''}`}
                    placeholder="e.g. Springfield"
                    disabled={isPending}
                  />
                  {errors.suburb && <p className="text-red-400 text-sm mt-1">{errors.suburb}</p>}
                </div>
                <div className="space-y-3">
                  <label className="block text-xs font-medium text-slate-400">
                    State *
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    className={`input-mobile ${errors.state ? 'input-error' : ''}`}
                    placeholder="e.g. NSW"
                    disabled={isPending}
                  />
                  {errors.state && <p className="text-red-400 text-sm mt-1">{errors.state}</p>}
                </div>
              </div>

              {/* Postcode */}
              <div className="space-y-3">
                <label className="block text-xs font-medium text-slate-400">
                  Postcode *
                </label>
                <input
                  type="text"
                  value={formData.postcode}
                  onChange={(e) => handleInputChange('postcode', e.target.value)}
                  className={`input-mobile ${errors.postcode ? 'input-error' : ''}`}
                  placeholder="e.g. 2000"
                  disabled={isPending}
                />
                {errors.postcode && <p className="text-red-400 text-sm mt-2">{errors.postcode}</p>}
              </div>

              {/* Interactive Map - Always shows when address data is available */}
              {formData.address && formData.suburb && formData.state && formData.postcode && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-300">
                    <MapPin className="w-4 h-4 inline mr-2" />
                    Location Preview
                  </label>
                  
                  <MapComponent
                    address={formData.address}
                    suburb={formData.suburb}
                    state={formData.state}
                    postcode={formData.postcode}
                    height="250px"
                    className="rounded-xl overflow-hidden"
                    showControls={false}
                  />
                </div>
              )}

              {/* Location Preview */}
              {formData.address && formData.suburb && formData.state && formData.postcode && (
                <div className="card p-3 bg-emerald-500/10 border-emerald-500/20">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 text-sm font-medium">Full Address</span>
                  </div>
                  <p className="text-emerald-300 text-sm mt-1">
                    {formData.address}, {formData.suburb}, {formData.state} {formData.postcode}
                  </p>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-300">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="input-mobile min-h-[120px] resize-none"
                placeholder="Event description or notes (optional)"
                disabled={isPending}
              />
            </div>

            {/* Recurring Event Toggle */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-300">
                  <Repeat className="w-4 h-4 inline mr-2" />
                  Recurring Event
                </label>
                <button
                  type="button"
                  onClick={() => handleInputChange('isRecurring', !formData.isRecurring)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-950 ${
                    formData.isRecurring ? 'bg-emerald-500' : 'bg-slate-600'
                  }`}
                  disabled={isPending}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.isRecurring ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <p className="text-slate-400 text-sm">
                {formData.isRecurring 
                  ? 'This event will repeat according to the schedule below' 
                  : 'This is a one-time event'
                }
              </p>
            </div>

            {/* Recurrence Options */}
            {formData.isRecurring && (
              <div className="space-y-6 card p-4 bg-slate-800/30">
                <h3 className="text-lg font-semibold text-slate-100 flex items-center">
                  <Repeat className="w-5 h-5 mr-2" />
                  Recurrence Settings
                </h3>

                {/* Frequency */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-300">
                    Frequency
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'daily', label: 'Daily' },
                      { id: 'weekly', label: 'Weekly' },
                      { id: 'monthly', label: 'Monthly' },
                      { id: 'custom', label: 'Custom' },
                    ].map(({ id, label }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => handleInputChange('recurrenceFrequency', id)}
                        className={`btn-mobile ${
                          formData.recurrenceFrequency === id
                            ? 'bg-emerald-500 text-white border-emerald-500'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                        }`}
                        disabled={isPending}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Interval */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-300">
                    Repeat every
                  </label>
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => handleInputChange('recurrenceInterval', Math.max(1, formData.recurrenceInterval - 1))}
                      className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
                      disabled={isPending || formData.recurrenceInterval <= 1}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      value={formData.recurrenceInterval}
                      onChange={(e) => handleInputChange('recurrenceInterval', Math.max(1, parseInt(e.target.value) || 1))}
                      className="input-mobile text-center w-20"
                      min="1"
                      disabled={isPending}
                    />
                    <button
                      type="button"
                      onClick={() => handleInputChange('recurrenceInterval', formData.recurrenceInterval + 1)}
                      className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
                      disabled={isPending}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <span className="text-slate-300">
                      {formData.recurrenceFrequency === 'daily' && (formData.recurrenceInterval === 1 ? 'day' : 'days')}
                      {formData.recurrenceFrequency === 'weekly' && (formData.recurrenceInterval === 1 ? 'week' : 'weeks')}
                      {formData.recurrenceFrequency === 'monthly' && (formData.recurrenceInterval === 1 ? 'month' : 'months')}
                      {formData.recurrenceFrequency === 'custom' && (formData.recurrenceInterval === 1 ? 'week' : 'weeks')}
                    </span>
                  </div>
                  {errors.recurrenceInterval && <p className="text-red-400 text-sm mt-2">{errors.recurrenceInterval}</p>}
                </div>

                {/* Custom Days Selection */}
                {formData.recurrenceFrequency === 'custom' && (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-slate-300">
                      Select Days
                    </label>
                    <div className="grid grid-cols-7 gap-2">
                      {dayNames.map((day, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => toggleCustomDay(index)}
                          className={`py-2 px-1 text-xs font-medium rounded-lg transition-colors ${
                            formData.customDays.includes(index)
                              ? 'bg-emerald-500 text-white'
                              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          }`}
                          disabled={isPending}
                        >
                          {day.slice(0, 3)}
                        </button>
                      ))}
                    </div>
                    {errors.customDays && <p className="text-red-400 text-sm mt-2">{errors.customDays}</p>}
                  </div>
                )}

                {/* End Condition */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-300">
                    Ends
                  </label>
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'never', label: 'Never' },
                        { id: 'date', label: 'On Date' },
                        { id: 'occurrences', label: 'After' },
                      ].map(({ id, label }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => handleInputChange('recurrenceEndType', id)}
                          className={`btn-mobile ${
                            formData.recurrenceEndType === id
                              ? 'bg-emerald-500 text-white border-emerald-500'
                              : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                          }`}
                          disabled={isPending}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {formData.recurrenceEndType === 'date' && (
                      <div>
                        <input
                          type="date"
                          value={formData.recurrenceEndDate}
                          onChange={(e) => handleInputChange('recurrenceEndDate', e.target.value)}
                          className={`input-mobile ${errors.recurrenceEndDate ? 'input-error' : ''}`}
                          disabled={isPending}
                          min={formData.date}
                        />
                        {errors.recurrenceEndDate && <p className="text-red-400 text-sm mt-2">{errors.recurrenceEndDate}</p>}
                      </div>
                    )}

                    {formData.recurrenceEndType === 'occurrences' && (
                      <div className="flex items-center space-x-3">
                        <input
                          type="number"
                          value={formData.recurrenceOccurrences}
                          onChange={(e) => handleInputChange('recurrenceOccurrences', Math.max(1, parseInt(e.target.value) || 1))}
                          className={`input-mobile w-24 ${errors.recurrenceOccurrences ? 'input-error' : ''}`}
                          min="1"
                          disabled={isPending}
                        />
                        <span className="text-slate-300">occurrences</span>
                        {errors.recurrenceOccurrences && <p className="text-red-400 text-sm mt-2">{errors.recurrenceOccurrences}</p>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Recurrence Preview */}
                {getRecurrencePreview() && (
                  <div className="card p-4 bg-emerald-500/10 border-emerald-500/20">
                    <p className="text-emerald-400 text-sm font-medium">
                      {getRecurrencePreview()}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* RSVP Required Toggle */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-300">
                  <UserCheck className="w-4 h-4 inline mr-2" />
                  RSVP Required
                </label>
                <button
                  type="button"
                  onClick={() => handleInputChange('rsvpRequired', !formData.rsvpRequired)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-950 ${
                    formData.rsvpRequired ? 'bg-emerald-500' : 'bg-slate-600'
                  }`}
                  disabled={isPending}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.rsvpRequired ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <p className="text-slate-400 text-sm">
                {formData.rsvpRequired 
                  ? 'Members will be asked to confirm their attendance' 
                  : 'Members can attend without confirming'
                }
              </p>
            </div>

            {/* Auto-invite Members Toggle */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-300">
                  <UserPlus className="w-4 h-4 inline mr-2" />
                  Auto-invite Members
                </label>
                <button
                  type="button"
                  onClick={() => handleInputChange('inviteAllMembers', !formData.inviteAllMembers)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-950 ${
                    formData.inviteAllMembers ? 'bg-emerald-500' : 'bg-slate-600'
                  }`}
                  disabled={isPending}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.inviteAllMembers ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Fixed Bottom Actions */}
      <div className="border-t border-slate-800/50 p-4 bg-slate-900/95 backdrop-blur-sm sticky bottom-0 z-10" style={{
        position: 'sticky',
        bottom: '0',
        margin: '0',
        paddingTop: '1rem',
        paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)',
        paddingLeft: 'max(env(safe-area-inset-left), 1rem)',
        paddingRight: 'max(env(safe-area-inset-right), 1rem)'
      }}>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary-mobile"
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={
              isPending || 
              !formData.title.trim() || 
              !formData.date || 
              !formData.startTime || 
              !formData.clubId ||
              !formData.address.trim() ||
              !formData.suburb.trim() ||
              !formData.state.trim() ||
              !formData.postcode.trim() ||
              (formData.visibility === 'team' && !formData.teamId)
            }
            className={`btn-primary-mobile ${isPending ? 'btn-loading' : ''}`}
          >
            {isPending ? 'Creating...' : 'Create Event'}
          </button>
        </div>
      </div>
    </div>
  );
}
