import React, { useState } from 'react';
import { X, Calendar, Clock, MapPin, Users, Edit, Trash2, UserCheck, UserX, UserMinus, User, ArrowLeft, Repeat, AlertTriangle, RefreshCw, UserPlus, CheckCircle, Loader2, Check, Baby, Crown, ClipboardList, Gamepad2, Dumbbell, Coffee, ArrowRightLeft, XCircle, Camera, Share2, CircleCheck, Circle, Timer, Lock, CreditCard } from 'lucide-react';
import { useRSVPToEvent, useGetEventParticipants, useDeleteEvent, isDutyCompleted, getDutyStatusText, getDutyStatusColor, canDutyBeSwapped, getTimeUntilDutyCompletion } from '../hooks/useEvents';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useGetCallerChildren } from '../hooks/useChildren';
import { useCreateDutySwapRequest, useCancelDutySwapRequest, useGetDutySwapRequests, useAcceptDutySwapRequest } from '../hooks/useNotifications';
import { useUserRoles } from '../hooks/useRoles';
import { useCanAccessFeature } from '../hooks/useSubscriptions';
import { useIsCurrentUserAdmin } from '../hooks/useUsers';
import { Event, EventType } from '../backend';
import MapComponent from './MapComponent';
import MatchDayPostModal from './MatchDayPostModal';
import SubscriptionUpgradeModal from './SubscriptionUpgradeModal';

interface EventDetailModalProps {
  event: Event;
  onClose: () => void;
  highlightDutyRole?: string | null;
}

interface Participant {
  id: string;
  name: string;
  rsvpStatus: 'going' | 'maybe' | 'not_going' | 'not_responded';
  isChild: boolean;
  parentId?: string;
  principal: string;
}

interface DutySwapRequest {
  id: string;
  eventId: string;
  originalAssignee: string;
  requestedRole: string;
  status: 'pending' | 'accepted' | 'cancelled';
  timestamp: number;
  acceptedBy?: string;
}

export default function EventDetailModal({ event, onClose, highlightDutyRole }: EventDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'participants' | 'duties'>('details');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteType, setDeleteType] = useState<'single' | 'series'>('single');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [currentUserRSVP, setCurrentUserRSVP] = useState<'going' | 'maybe' | 'not_going' | 'not_responded'>('not_responded');
  const [rsvpLoading, setRsvpLoading] = useState<string | null>(null);
  const [rsvpSuccess, setRsvpSuccess] = useState<string | null>(null);
  const [showMatchDayPostModal, setShowMatchDayPostModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  const { identity } = useInternetIdentity();
  const { data: userChildren } = useGetCallerChildren();
  const { mutate: rsvpToEvent } = useRSVPToEvent();
  const { mutate: deleteEvent, isPending: isDeleting } = useDeleteEvent();
  const { mutate: getEventParticipants } = useGetEventParticipants();
  const { data: isAppAdmin } = useIsCurrentUserAdmin();
  
  const { data: dutySwapAccess } = useCanAccessFeature(
    'duty_assignments',
    event.teamId ? 'team' : 'club',
    event.teamId ? event.teamId.toString() : event.clubId?.toString() || '1'
  );
  const canAccessDutySwaps = dutySwapAccess?.hasAccess || false;
  
  const { data: matchDayPostAccess } = useCanAccessFeature(
    'file_storage',
    event.teamId ? 'team' : 'club',
    event.teamId ? event.teamId.toString() : event.clubId?.toString() || '1'
  );
  const canAccessMatchDayPosts = isAppAdmin || matchDayPostAccess?.hasAccess || false;
  
  const { mutate: createDutySwapRequest, isPending: isCreatingSwap } = useCreateDutySwapRequest();
  const { mutate: cancelDutySwapRequest, isPending: isCancellingSwap } = useCancelDutySwapRequest();
  const { data: dutySwapRequests, refetch: refetchSwapRequests } = useGetDutySwapRequests();
  const { mutate: acceptDutySwapRequest, isPending: isAcceptingSwap } = useAcceptDutySwapRequest();
  const { canInitiateDutySwap, canAcceptDutySwap, canGenerateMatchDayPost } = useUserRoles();

  const currentUserPrincipal = identity?.getPrincipal().toString();

  const canSeeSwapButton = isAppAdmin || canAccessDutySwaps;

  const canGeneratePost = canGenerateMatchDayPost(event) && canAccessMatchDayPosts;

  React.useEffect(() => {
    const originalBodyStyle = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      width: document.body.style.width,
      height: document.body.style.height,
      top: document.body.style.top,
      left: document.body.style.left,
    };
    
    const originalHtmlStyle = {
      overflow: document.documentElement.style.overflow,
    };

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
      document.documentElement.style.overflow = originalHtmlStyle.overflow;
      document.body.style.overflow = originalBodyStyle.overflow;
      document.body.style.position = originalBodyStyle.position;
      document.body.style.width = originalBodyStyle.width;
      document.body.style.height = originalBodyStyle.height;
      document.body.style.top = originalBodyStyle.top;
      document.body.style.left = originalBodyStyle.left;
    };
  }, []);

  React.useEffect(() => {
    if (highlightDutyRole && event.dutyRoster.length > 0) {
      setActiveTab('duties');
      
      setTimeout(() => {
        sessionStorage.removeItem('highlightDutyRole');
      }, 5000);
    }
  }, [highlightDutyRole, event.dutyRoster]);

  React.useEffect(() => {
    if (activeTab === 'participants' || participants.length === 0) {
      setParticipantsLoading(true);
      getEventParticipants(event.id.toString(), {
        onSuccess: (data) => {
          setParticipants(data);
          setParticipantsLoading(false);
          
          const currentUserParticipant = data.find(p => p.principal === currentUserPrincipal);
          if (currentUserParticipant) {
            setCurrentUserRSVP(currentUserParticipant.rsvpStatus);
          }
        },
        onError: (error) => {
          console.error('Failed to load participants:', error);
          setParticipantsLoading(false);
        }
      });
    }
  }, [activeTab, event.id, getEventParticipants, participants.length, currentUserPrincipal]);

  React.useEffect(() => {
    if (activeTab === 'duties') {
      refetchSwapRequests();
    }
  }, [activeTab, refetchSwapRequests]);

  const formatEventTime = (timestamp: bigint) => {
    const date = new Date(Number(timestamp));
    return {
      fullDate: date.toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric',
        month: 'long', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    };
  };

  const { fullDate: startDate, time: startTime } = formatEventTime(event.startTime);
  const { time: endTime } = formatEventTime(event.endTime);

  const isEventCreator = currentUserPrincipal === event.creator.toString();
  const isRecurringEvent = !!event.recurrenceRule;

  const currentUserParticipant = participants.find(p => p.principal === currentUserPrincipal);

  const userChildrenInEvent = participants.filter(p => 
    p.isChild && p.parentId === currentUserPrincipal
  );

  const participantsByStatus = {
    going: participants.filter(p => p.rsvpStatus === 'going'),
    maybe: participants.filter(p => p.rsvpStatus === 'maybe'),
    not_going: participants.filter(p => p.rsvpStatus === 'not_going'),
    not_responded: participants.filter(p => p.rsvpStatus === 'not_responded'),
  };

  const eventSwapRequests = (dutySwapRequests || []).filter(swap => 
    swap.eventId === event.id.toString() && swap.status === 'pending'
  );

  const userPendingSwaps = eventSwapRequests.filter(swap => 
    swap.originalAssignee === currentUserPrincipal
  );

  const availableSwapRequests = eventSwapRequests.filter(swap => 
    swap.originalAssignee !== currentUserPrincipal && 
    canAcceptDutySwap(event, swap)
  );

  const dutyCompletionInfo = getTimeUntilDutyCompletion(event);

  const handleRSVP = (status: 'going' | 'maybe' | 'not_going', participantId?: string, isChildRSVP: boolean = false) => {
    if (!currentUserPrincipal || rsvpLoading) return;
    
    const targetParticipantId = participantId || currentUserPrincipal;
    const isChild = isChildRSVP || targetParticipantId.startsWith('child_');
    
    setRsvpLoading(targetParticipantId + '_' + status);
    setRsvpSuccess(null);
    
    const targetParticipant = participants.find(p => p.principal === targetParticipantId);
    const previousStatus = targetParticipant?.rsvpStatus || 'not_responded';
    
    if (!isChild) {
      setCurrentUserRSVP(status);
    }
    
    setParticipants(prevParticipants => 
      prevParticipants.map(p => 
        p.principal === targetParticipantId 
          ? { ...p, rsvpStatus: status }
          : p
      )
    );

    rsvpToEvent({
      eventId: event.id.toString(),
      status,
      participantId: targetParticipantId,
      isChild,
      parentPrincipal: isChild ? currentUserPrincipal : undefined,
    }, {
      onSuccess: (result) => {
        setRsvpLoading(null);
        
        setRsvpSuccess(targetParticipantId + '_' + status);
        setTimeout(() => setRsvpSuccess(null), 2000);
      },
      onError: (error) => {
        console.error('RSVP failed:', error);
        setRsvpLoading(null);
        setRsvpSuccess(null);
        
        if (!isChild) {
          setCurrentUserRSVP(previousStatus);
        }
        setParticipants(prevParticipants => 
          prevParticipants.map(p => 
            p.principal === targetParticipantId 
              ? { ...p, rsvpStatus: previousStatus }
              : p
          )
        );
        
        const errorMessage = error instanceof Error ? error.message : 'Failed to update RSVP. Please try again.';
        alert(errorMessage);
      }
    });
  };

  const handleDeleteEvent = () => {
    deleteEvent({
      eventId: event.id.toString(),
    }, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  const handleRefreshParticipants = () => {
    setParticipantsLoading(true);
    getEventParticipants(event.id.toString(), {
      onSuccess: (data) => {
        setParticipants(data);
        setParticipantsLoading(false);
        
        const currentUserParticipant = data.find(p => p.principal === currentUserPrincipal);
        if (currentUserParticipant) {
          setCurrentUserRSVP(currentUserParticipant.rsvpStatus);
        }
      },
      onError: (error) => {
        console.error('Failed to refresh participants:', error);
        setParticipantsLoading(false);
      }
    });
  };

  const handleDutySwapRequest = (dutyRole: string) => {
    if (!currentUserPrincipal || isCreatingSwap) return;

    createDutySwapRequest({
      eventId: event.id.toString(),
      role: dutyRole,
    }, {
      onSuccess: () => {
        refetchSwapRequests();
      },
      onError: (error) => {
        console.error('Failed to create duty swap request:', error);
        alert('Failed to create duty swap request. Please try again.');
      }
    });
  };

  const handleCancelDutySwap = (swapRequestId: string) => {
    if (isCancellingSwap) return;

    cancelDutySwapRequest({
      swapRequestId,
    }, {
      onSuccess: () => {
        refetchSwapRequests();
      },
      onError: (error) => {
        console.error('Failed to cancel duty swap request:', error);
        alert('Failed to cancel duty swap request. Please try again.');
      }
    });
  };

  const handleAcceptDutySwap = (swapRequestId: string) => {
    if (isAcceptingSwap) return;

    acceptDutySwapRequest({
      swapRequestId,
      eventId: event.id.toString(),
    }, {
      onSuccess: () => {
        refetchSwapRequests();
      },
      onError: (error) => {
        console.error('Failed to accept duty swap request:', error);
        alert('Failed to accept duty swap request. Please try again.');
      }
    });
  };

  const handleUpgradeClick = () => {
    setShowUpgradeModal(true);
  };

  const getRSVPIcon = (status: string) => {
    switch (status) {
      case 'going':
        return <UserCheck className="w-4 h-4 text-green-500" />;
      case 'maybe':
        return <UserMinus className="w-4 h-4 text-yellow-500" />;
      case 'not_going':
        return <UserX className="w-4 h-4 text-red-500" />;
      default:
        return <User className="w-4 h-4 text-slate-500" />;
    }
  };

  const getRSVPStatusText = (status: string) => {
    switch (status) {
      case 'going':
        return 'Going';
      case 'maybe':
        return 'Maybe';
      case 'not_going':
        return 'Not Going';
      default:
        return 'Not Responded';
    }
  };

  const getRecurrenceDescription = () => {
    if (!event.recurrenceRule) return null;
    
    const rule = event.recurrenceRule;
    const interval = Number(rule.interval);
    let description = `Repeats every `;
    
    if (interval > 1) {
      description += `${interval} `;
    }
    
    switch (rule.frequency) {
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

    if (rule.endDate) {
      description += ` until ${new Date(Number(rule.endDate)).toLocaleDateString()}`;
    } else if (rule.occurrences) {
      description += ` for ${rule.occurrences} occurrence${Number(rule.occurrences) !== 1 ? 's' : ''}`;
    }

    return description;
  };

  const getEventTypeInfo = () => {
    switch (event.eventType) {
      case EventType.game:
        return {
          label: 'Game',
          description: 'Competitive match or tournament',
          icon: Gamepad2,
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/20',
        };
      case EventType.training:
        return {
          label: 'Training',
          description: 'Practice session or skill development',
          icon: Dumbbell,
          color: 'text-blue-500',
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/20',
        };
      case EventType.socialEvent:
        return {
          label: 'Social Event',
          description: 'Team building or social gathering',
          icon: Coffee,
          color: 'text-purple-500',
          bgColor: 'bg-purple-500/10',
          borderColor: 'border-purple-500/20',
        };
      default:
        return {
          label: 'Event',
          description: 'General event',
          icon: Calendar,
          color: 'text-slate-500',
          bgColor: 'bg-slate-500/10',
          borderColor: 'border-slate-500/20',
        };
    }
  };

  const eventTypeInfo = getEventTypeInfo();

  const getMemberName = (assigneePrincipal: string) => {
    const participant = participants.find(p => p.principal === assigneePrincipal);
    return participant?.name || 'Unknown Member';
  };

  const tabs = [
    { id: 'details' as const, label: 'Details' },
    { id: 'participants' as const, label: `Participants (${participants.length})` },
    ...(event.eventType === EventType.game && event.dutyRoster.length > 0 ? [
      { id: 'duties' as const, label: 'Duty Roster' }
    ] : []),
  ];

  const getRSVPButtonClass = (buttonStatus: 'going' | 'maybe' | 'not_going', participantId?: string) => {
    const targetId = participantId || currentUserPrincipal || '';
    const isSelected = participantId ? 
      participants.find(p => p.principal === participantId)?.rsvpStatus === buttonStatus :
      currentUserRSVP === buttonStatus;
    const isLoading = rsvpLoading === targetId + '_' + buttonStatus;
    const isSuccess = rsvpSuccess === targetId + '_' + buttonStatus;
    const baseClass = "flex items-center justify-center space-x-2 py-3 px-4 rounded-lg transition-all duration-200 font-medium relative disabled:cursor-not-allowed";
    
    if (isLoading) {
      switch (buttonStatus) {
        case 'going':
          return `${baseClass} bg-green-600/50 text-green-200 border-2 border-green-500/50`;
        case 'maybe':
          return `${baseClass} bg-yellow-600/50 text-yellow-200 border-2 border-yellow-500/50`;
        case 'not_going':
          return `${baseClass} bg-red-600/50 text-red-200 border-2 border-red-500/50`;
      }
    }
    
    if (isSuccess) {
      switch (buttonStatus) {
        case 'going':
          return `${baseClass} bg-green-600 text-white shadow-lg scale-105 border-2 border-green-400 ring-2 ring-green-400/50`;
        case 'maybe':
          return `${baseClass} bg-yellow-600 text-white shadow-lg scale-105 border-2 border-yellow-400 ring-2 ring-yellow-400/50`;
        case 'not_going':
          return `${baseClass} bg-red-600 text-white shadow-lg scale-105 border-2 border-red-400 ring-2 ring-red-400/50`;
      }
    }
    
    if (isSelected) {
      switch (buttonStatus) {
        case 'going':
          return `${baseClass} bg-green-600 text-white shadow-lg scale-105 border-2 border-green-500`;
        case 'maybe':
          return `${baseClass} bg-yellow-600 text-white shadow-lg scale-105 border-2 border-yellow-500`;
        case 'not_going':
          return `${baseClass} bg-red-600 text-white shadow-lg scale-105 border-2 border-red-500`;
      }
    } else {
      switch (buttonStatus) {
        case 'going':
          return `${baseClass} bg-green-600/20 text-green-400 border-2 border-green-600/30 hover:bg-green-600/30 hover:border-green-600/50`;
        case 'maybe':
          return `${baseClass} bg-yellow-600/20 text-yellow-400 border-2 border-yellow-600/30 hover:bg-yellow-600/30 hover:border-yellow-600/50`;
        case 'not_going':
          return `${baseClass} bg-red-600/20 text-red-400 border-2 border-red-600/30 hover:bg-red-600/30 hover:border-red-600/50`;
      }
    }
    return baseClass;
  };

  const getRSVPButtonContent = (buttonStatus: 'going' | 'maybe' | 'not_going', participantId?: string) => {
    const targetId = participantId || currentUserPrincipal || '';
    const isSelected = participantId ? 
      participants.find(p => p.principal === participantId)?.rsvpStatus === buttonStatus :
      currentUserRSVP === buttonStatus;
    const isLoading = rsvpLoading === targetId + '_' + buttonStatus;
    const isSuccess = rsvpSuccess === targetId + '_' + buttonStatus;
    
    let icon;
    let text;
    
    switch (buttonStatus) {
      case 'going':
        icon = <UserCheck className="w-5 h-5" />;
        text = 'Going';
        break;
      case 'maybe':
        icon = <UserMinus className="w-5 h-5" />;
        text = 'Maybe';
        break;
      case 'not_going':
        icon = <UserX className="w-5 h-5" />;
        text = 'Not Going';
        break;
    }
    
    return (
      <>
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isSuccess ? (
          <Check className="w-5 h-5" />
        ) : (
          icon
        )}
        <span>{isLoading ? 'Saving...' : isSuccess ? 'Saved!' : text}</span>
        {isSelected && !isLoading && !isSuccess && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center">
            <CheckCircle className="w-2 h-2 text-green-600" />
          </div>
        )}
      </>
    );
  };

  const renderChildRSVPSection = (child: Participant) => {
    const childRSVPLoading = rsvpLoading?.startsWith(child.principal + '_');
    const childRSVPSuccess = rsvpSuccess?.startsWith(child.principal + '_');
    
    return (
      <div key={child.id} className="card p-4 bg-purple-500/10 border-purple-500/20">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
            <Baby className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <p className="text-purple-400 font-medium">{child.name}</p>
            <p className="text-purple-300 text-sm">
              Your child • Current response: {getRSVPStatusText(child.rsvpStatus)}
            </p>
          </div>
        </div>

        {childRSVPLoading && (
          <div className="card p-3 bg-blue-500/10 border-blue-500/20 mb-4">
            <div className="flex items-center space-x-3">
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
              <div>
                <p className="text-blue-400 font-medium">
                  Updating {child.name}'s response...
                </p>
                <p className="text-blue-300 text-sm">
                  Saving RSVP on behalf of your child.
                </p>
              </div>
            </div>
          </div>
        )}

        {childRSVPSuccess && (
          <div className="card p-3 bg-green-500/10 border-green-500/20 mb-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <div>
                <p className="text-green-400 font-medium">
                  {child.name}'s RSVP Updated!
                </p>
                <p className="text-green-300 text-sm">
                  Response saved successfully.
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleRSVP('going', child.principal, true)}
            disabled={!!rsvpLoading}
            className={getRSVPButtonClass('going', child.principal)}
          >
            {getRSVPButtonContent('going', child.principal)}
          </button>
          <button
            onClick={() => handleRSVP('maybe', child.principal, true)}
            disabled={!!rsvpLoading}
            className={getRSVPButtonClass('maybe', child.principal)}
          >
            {getRSVPButtonContent('maybe', child.principal)}
          </button>
          <button
            onClick={() => handleRSVP('not_going', child.principal, true)}
            disabled={!!rsvpLoading}
            className={getRSVPButtonClass('not_going', child.principal)}
          >
            {getRSVPButtonContent('not_going', child.principal)}
          </button>
        </div>
        
        <div className="text-center mt-3">
          <p className="text-purple-300 text-xs">
            {childRSVPLoading 
              ? 'Saving your child\'s response...' 
              : childRSVPSuccess
              ? 'Your child\'s response has been saved'
              : 'Tap any option above to RSVP for your child'
            }
          </p>
        </div>
      </div>
    );
  };

  const getFullAddress = () => {
    const addressParts = [event.address, event.suburb, event.state, event.postcode].filter(Boolean);
    return addressParts.join(', ');
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-950 z-[9999] flex flex-col"
      style={{
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
        zIndex: 9999,
        overflow: 'hidden'
      }}
    >
      <div 
        className="flex items-center justify-between p-4 border-b border-slate-800/50 bg-slate-900/95 backdrop-blur-sm sticky top-0 z-10"
        style={{
          position: 'sticky',
          top: '0',
          margin: '0',
          paddingTop: 'max(env(safe-area-inset-top), 1rem)',
          paddingBottom: '1rem',
          paddingLeft: 'max(env(safe-area-inset-left), 1rem)',
          paddingRight: 'max(env(safe-area-inset-right), 1rem)',
          minHeight: '64px'
        }}
      >
        <button
          onClick={onClose}
          className="p-2 -ml-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="text-center flex-1 min-w-0 px-4">
          <h1 className="text-lg font-semibold text-slate-100 truncate">{event.title}</h1>
          <div className="flex items-center justify-center space-x-2 flex-wrap">
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs border ${eventTypeInfo.bgColor} ${eventTypeInfo.borderColor}`}>
              <eventTypeInfo.icon className={`w-3 h-3 ${eventTypeInfo.color}`} />
              <span className={eventTypeInfo.color}>{eventTypeInfo.label}</span>
            </div>
            {isRecurringEvent && (
              <div className="flex items-center space-x-1">
                <Repeat className="w-3 h-3 text-emerald-400" />
                <span className="text-xs text-emerald-400">Recurring</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {canGeneratePost && (
            <button
              onClick={() => setShowMatchDayPostModal(true)}
              className="p-2 text-emerald-400 hover:text-emerald-300 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
              title="Generate Match Day Post"
            >
              <Share2 className="w-5 h-5" />
            </button>
          )}
          {isEventCreator && (
            <>
              <button className="p-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target">
                <Edit className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 text-slate-400 hover:text-red-400 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="border-b border-slate-800/50 bg-slate-900/95 backdrop-blur-sm">
        <div className="flex p-1 mx-4 overflow-x-auto scrollbar-hide">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`shrink-0 py-3 px-4 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === id
                  ? 'bg-emerald-500 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div 
        className="flex-1 overflow-y-auto"
        style={{
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain'
        }}
      >
        <div 
          className="p-4 pb-32"
          style={{
            paddingLeft: 'max(env(safe-area-inset-left), 1rem)',
            paddingRight: 'max(env(safe-area-inset-right), 1rem)',
            paddingBottom: 'max(8rem, calc(env(safe-area-inset-bottom) + 8rem))'
          }}
        >
          {activeTab === 'details' ? (
            <div className="space-y-6">
              <div className={`card p-4 ${eventTypeInfo.bgColor} ${eventTypeInfo.borderColor}`}>
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${eventTypeInfo.bgColor}`}>
                    <eventTypeInfo.icon className={`w-5 h-5 ${eventTypeInfo.color}`} />
                  </div>
                  <div>
                    <p className={`font-medium ${eventTypeInfo.color}`}>{eventTypeInfo.label}</p>
                    <p className={`text-sm ${eventTypeInfo.color.replace('500', '300')}`}>{eventTypeInfo.description}</p>
                  </div>
                </div>
              </div>

              {event.eventType === EventType.game && canGeneratePost && (
                <div className="card p-4 bg-gradient-to-br from-emerald-500/10 via-blue-500/5 to-slate-900/50 border-emerald-500/20">
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center shrink-0">
                      <Share2 className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-100 mb-2 flex items-center">
                        📸 Match Day Post Generation
                      </h3>
                      <p className="text-slate-300 text-sm mb-4">
                        Create a professional social media post for this game with club branding, match details, and team lineup.
                      </p>
                      
                      <div className="card p-3 bg-emerald-500/10 border-emerald-500/20 mb-4">
                        <div className="flex items-center space-x-2">
                          <Camera className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400 font-medium text-sm">SOCIAL MEDIA READY</span>
                        </div>
                        <p className="text-emerald-300 text-xs">
                          Generated images include club logo, match details, and lineup in a 1:1 format perfect for social sharing
                        </p>
                      </div>
                      
                      <button
                        onClick={() => setShowMatchDayPostModal(true)}
                        className="btn-primary text-sm"
                      >
                        <Share2 className="w-4 h-4 mr-2" />
                        Generate Match Day Post
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center text-slate-300">
                  <Calendar className="w-5 h-5 mr-3 text-emerald-500" />
                  <div>
                    <p className="font-medium">{startDate}</p>
                    <p className="text-sm text-slate-400">{startTime} - {endTime}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start text-slate-300">
                    <MapPin className="w-5 h-5 mr-3 text-emerald-500 mt-0.5" />
                    <div className="space-y-2 flex-1">
                      <div className="space-y-1">
                        <p className="font-medium text-slate-200">Address</p>
                        <p className="text-slate-300">{event.address}</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="font-medium text-slate-200 text-sm">Suburb</p>
                          <p className="text-slate-300 text-sm">{event.suburb}</p>
                        </div>
                        <div>
                          <p className="font-medium text-slate-200 text-sm">State</p>
                          <p className="text-slate-300 text-sm">{event.state}</p>
                        </div>
                      </div>
                      
                      <div>
                        <p className="font-medium text-slate-200 text-sm">Postcode</p>
                        <p className="text-slate-300 text-sm">{event.postcode}</p>
                      </div>
                      
                      <div className="card p-3 bg-emerald-500/10 border-emerald-500/20 mt-3">
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400 text-sm font-medium">Full Address</span>
                        </div>
                        <p className="text-emerald-300 text-sm mt-1">
                          {getFullAddress()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-slate-300">
                      <MapPin className="w-4 h-4 inline mr-2" />
                      Event Location Map
                    </label>
                    
                    <MapComponent
                      address={event.address}
                      suburb={event.suburb}
                      state={event.state}
                      postcode={event.postcode}
                      height="300px"
                      className="rounded-xl overflow-hidden"
                      showControls={false}
                      event={event}
                      readOnly={true}
                    />
                  </div>
                </div>

                <div className="flex items-center text-slate-300">
                  <Users className="w-5 h-5 mr-3 text-emerald-500" />
                  <span>{event.clubId ? 'Club Event' : 'Team Event'}</span>
                </div>

                {isRecurringEvent && (
                  <div className="card p-4 bg-emerald-500/10 border-emerald-500/20">
                    <div className="flex items-center space-x-3 mb-2">
                      <Repeat className="w-5 h-5 text-emerald-400" />
                      <h3 className="font-medium text-emerald-400">Recurring Event</h3>
                    </div>
                    <p className="text-emerald-300 text-sm">
                      {getRecurrenceDescription()}
                    </p>
                  </div>
                )}

                <div className="card p-4 bg-blue-500/10 border-blue-500/20">
                  <div className="flex items-center space-x-3 mb-2">
                    <UserPlus className="w-5 h-5 text-blue-400" />
                    <h3 className="font-medium text-blue-400">
                      {event.clubId ? 'Club-wide Invitations' : 'Team Invitations'}
                    </h3>
                  </div>
                  
                  {event.teamId && userChildrenInEvent.length > 0 && (
                    <div className="mt-3 p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                      <div className="flex items-center space-x-2 mb-2">
                        <Baby className="w-4 h-4 text-purple-400" />
                        <span className="text-purple-400 text-sm font-medium">Children Also Invited</span>
                      </div>
                      <p className="text-purple-300/80 text-xs leading-relaxed">
                        Your {userChildrenInEvent.length === 1 ? 'child' : 'children'} assigned to this team {userChildrenInEvent.length === 1 ? 'has' : 'have'} been automatically invited. 
                        You can RSVP on their behalf below.
                      </p>
                    </div>
                  )}
                  
                  {isEventCreator && (
                    <div className="mt-3 p-3 bg-blue-500/5 rounded-lg border border-blue-500/10">
                      <div className="flex items-center space-x-2 mb-1">
                        <CheckCircle className="w-4 h-4 text-blue-400" />
                        <span className="text-blue-400 text-sm font-medium">You're Invited Too!</span>
                      </div>
                      <p className="text-blue-300/80 text-xs">
                        As the event creator, you are automatically included in the invitation list and can RSVP below.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {event.description && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-100 mb-2">Description</h3>
                  <p className="text-slate-300 leading-relaxed">{event.description}</p>
                </div>
              )}

              <div>
                <h3 className="text-lg font-semibold text-slate-100 mb-4">Your Response</h3>
                {currentUserParticipant ? (
                  <div className="space-y-4">
                    {currentUserRSVP !== 'not_responded' && !rsvpLoading && !rsvpSuccess && (
                      <div className="card p-4 bg-emerald-500/10 border-emerald-500/20">
                        <div className="flex items-center space-x-3">
                          {getRSVPIcon(currentUserRSVP)}
                          <div>
                            <p className="text-emerald-400 font-medium">
                              Your current response: {getRSVPStatusText(currentUserRSVP)}
                            </p>
                            <p className="text-emerald-300 text-sm">
                              You can change your response anytime using the buttons below.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {rsvpLoading && rsvpLoading.startsWith(currentUserPrincipal + '_') && (
                      <div className="card p-4 bg-blue-500/10 border-blue-500/20">
                        <div className="flex items-center space-x-3">
                          <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                          <div>
                            <p className="text-blue-400 font-medium">
                              Updating your response...
                            </p>
                            <p className="text-blue-300 text-sm">
                              Saving your RSVP to the server. This will update immediately for all participants.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {rsvpSuccess && rsvpSuccess.startsWith(currentUserPrincipal + '_') && (
                      <div className="card p-4 bg-green-500/10 border-green-500/20">
                        <div className="flex items-center space-x-3">
                          <CheckCircle className="w-5 h-5 text-green-400" />
                          <div>
                            <p className="text-green-400 font-medium">
                              RSVP Updated Successfully!
                            </p>
                            <p className="text-green-300 text-sm">
                              Your response has been saved and is now visible to all participants.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button
                        onClick={() => handleRSVP('going')}
                        disabled={!!rsvpLoading}
                        className={getRSVPButtonClass('going')}
                      >
                        {getRSVPButtonContent('going')}
                      </button>
                      <button
                        onClick={() => handleRSVP('maybe')}
                        disabled={!!rsvpLoading}
                        className={getRSVPButtonClass('maybe')}
                      >
                        {getRSVPButtonContent('maybe')}
                      </button>
                      <button
                        onClick={() => handleRSVP('not_going')}
                        disabled={!!rsvpLoading}
                        className={getRSVPButtonClass('not_going')}
                      >
                        {getRSVPButtonContent('not_going')}
                      </button>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-slate-400 text-sm">
                        {rsvpLoading && rsvpLoading.startsWith(currentUserPrincipal + '_')
                          ? 'Saving your response to the server...' 
                          : rsvpSuccess && rsvpSuccess.startsWith(currentUserPrincipal + '_')
                          ? 'Your response has been saved and shared with all participants'
                          : 'Tap any option above to update your response instantly'
                        }
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="card p-4 bg-orange-500/10 border-orange-500/20">
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className="w-5 h-5 text-orange-400" />
                      <div>
                        <p className="text-orange-400 font-medium">Not Invited</p>
                        <p className="text-orange-300 text-sm">
                          You are not in the invitation list for this event. Contact the event creator if you believe this is an error.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {userChildrenInEvent.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center">
                    <Baby className="w-5 h-5 text-purple-400 mr-2" />
                    RSVP for Your Children
                  </h3>
                  <div className="space-y-4">
                    {userChildrenInEvent.map(child => renderChildRSVPSection(child))}
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'participants' ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-100">Event Participants</h3>
                <button
                  onClick={handleRefreshParticipants}
                  className="p-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800/50 transition-all duration-200"
                  disabled={participantsLoading}
                  title="Refresh participants"
                >
                  <RefreshCw className={`w-4 h-4 ${participantsLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {isEventCreator && (
                <div className="card p-4 bg-emerald-500/10 border-emerald-500/20">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                      <UserPlus className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-emerald-400 font-medium">Creator Included</p>
                      <p className="text-emerald-300 text-sm">
                        As the event creator, you are automatically included in the invitation list and can RSVP in the Details tab.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {event.teamId && userChildrenInEvent.length > 0 && (
                <div className="card p-4 bg-purple-500/10 border-purple-500/20">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <Baby className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-purple-400 font-medium">Your Children Are Invited</p>
                      <p className="text-purple-300 text-sm">
                        {userChildrenInEvent.length === 1 ? 'Your child' : 'Your children'} assigned to this team {userChildrenInEvent.length === 1 ? 'has' : 'have'} been automatically invited. 
                        You can manage their RSVP responses in the Details tab.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {rsvpLoading && (
                <div className="card p-4 bg-blue-500/10 border-blue-500/20">
                  <div className="flex items-center space-x-3">
                    <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                    <div>
                      <p className="text-blue-400 font-medium">RSVP Update in Progress</p>
                      <p className="text-blue-300 text-sm">
                        Participant lists will update automatically when the RSVP is saved.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="card p-3 text-center bg-green-500/10 border-green-500/20">
                  <div className="flex items-center justify-center mb-1">
                    <UserCheck className="w-4 h-4 text-green-400" />
                  </div>
                  <p className="text-green-400 font-bold text-lg">{participantsByStatus.going.length}</p>
                  <p className="text-green-300 text-xs">Going</p>
                </div>
                <div className="card p-3 text-center bg-yellow-500/10 border-yellow-500/20">
                  <div className="flex items-center justify-center mb-1">
                    <UserMinus className="w-4 h-4 text-yellow-400" />
                  </div>
                  <p className="text-yellow-400 font-bold text-lg">{participantsByStatus.maybe.length}</p>
                  <p className="text-yellow-300 text-xs">Maybe</p>
                </div>
                <div className="card p-3 text-center bg-red-500/10 border-red-500/20">
                  <div className="flex items-center justify-center mb-1">
                    <UserX className="w-4 h-4 text-red-400" />
                  </div>
                  <p className="text-red-400 font-bold text-lg">{participantsByStatus.not_going.length}</p>
                  <p className="text-red-300 text-xs">Not Going</p>
                </div>
                <div className="card p-3 text-center bg-slate-500/10 border-slate-500/20">
                  <div className="flex items-center justify-center mb-1">
                    <User className="w-4 h-4 text-slate-400" />
                  </div>
                  <p className="text-slate-400 font-bold text-lg">{participantsByStatus.not_responded.length}</p>
                  <p className="text-slate-300 text-xs">No Response</p>
                </div>
              </div>

              {participantsLoading && (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="card p-4 animate-pulse">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-slate-700 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-slate-700 rounded w-1/3 mb-2"></div>
                          <div className="h-3 bg-slate-700 rounded w-1/2"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!participantsLoading && (
                <>
                  {Object.entries(participantsByStatus).map(([status, statusParticipants]) => (
                    <div key={status}>
                      <div className="flex items-center mb-3">
                        {getRSVPIcon(status)}
                        <h4 className="text-lg font-semibold text-slate-100 ml-2">
                          {getRSVPStatusText(status)} ({statusParticipants.length})
                        </h4>
                      </div>
                      
                      {statusParticipants.length === 0 ? (
                        <p className="text-slate-400 text-sm ml-6">No participants</p>
                      ) : (
                        <div className="space-y-2 ml-6">
                          {statusParticipants.map((participant) => (
                            <div
                              key={participant.id}
                              className="flex items-center justify-between py-2 px-3 card"
                            >
                              <div className="flex items-center space-x-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                  participant.isChild ? 'bg-purple-500' : 'bg-emerald-500'
                                }`}>
                                  <span className="text-white text-sm font-semibold">
                                    {participant.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <div className="flex items-center space-x-2 flex-wrap">
                                    <p className="text-slate-100 font-medium">{participant.name}</p>
                                    {participant.principal === currentUserPrincipal && (
                                      <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-1 rounded-full border border-emerald-500/20">
                                        You
                                      </span>
                                    )}
                                    {participant.principal === event.creator.toString() && (
                                      <span className="bg-yellow-500/10 text-yellow-400 text-xs px-2 py-1 rounded-full border border-yellow-500/20 flex items-center">
                                        <Crown className="w-3 h-3 mr-1" />
                                        Creator
                                      </span>
                                    )}
                                    {participant.isChild && (
                                      <span className="bg-purple-500/10 text-purple-400 text-xs px-2 py-1 rounded-full border border-purple-500/20 flex items-center">
                                        <Baby className="w-3 h-3 mr-1" />
                                        Child
                                      </span>
                                    )}
                                    {participant.isChild && participant.parentId === currentUserPrincipal && (
                                      <span className="bg-blue-500/10 text-blue-400 text-xs px-2 py-1 rounded-full border border-blue-500/20">
                                        Your Child
                                      </span>
                                    )}
                                    {rsvpLoading && rsvpLoading.startsWith(participant.principal + '_') && (
                                      <span className="bg-blue-500/10 text-blue-400 text-xs px-2 py-1 rounded-full border border-blue-500/20 flex items-center">
                                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                        Updating...
                                      </span>
                                    )}
                                    {rsvpSuccess && rsvpSuccess.startsWith(participant.principal + '_') && (
                                      <span className="bg-green-500/10 text-green-400 text-xs px-2 py-1 rounded-full border border-green-500/20 flex items-center">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Updated!
                                      </span>
                                    )}
                                  </div>
                                  {participant.isChild && participant.parentId && (
                                    <p className="text-slate-400 text-xs">
                                      Parent: {participants.find(p => p.principal === participant.parentId)?.name || 'Unknown'}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {participants.length === 0 && !participantsLoading && (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400">No participants loaded</p>
                      <p className="text-slate-500 text-sm mb-4">
                        {event.clubId 
                          ? 'Club members and their children were automatically invited when this event was created'
                          : 'Team members and their children were automatically invited when this event was created'
                        }
                      </p>
                      <button
                        onClick={handleRefreshParticipants}
                        className="btn-primary text-sm"
                        disabled={participantsLoading}
                      >
                        <RefreshCw className={`w-4 h-4 mr-2 ${participantsLoading ? 'animate-spin' : ''}`} />
                        Load Participants
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : activeTab === 'duties' ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-100 flex items-center">
                  <ClipboardList className="w-5 h-5 text-red-400 mr-2" />
                  Duty Roster
                </h3>
                <div className={`px-3 py-1 rounded-full text-xs border ${eventTypeInfo.bgColor} ${eventTypeInfo.borderColor}`}>
                  <eventTypeInfo.icon className={`w-3 h-3 ${eventTypeInfo.color} inline mr-1`} />
                  <span className={eventTypeInfo.color}>{eventTypeInfo.label}</span>
                </div>
              </div>

              <div className="card p-4 bg-red-500/10 border-red-500/20">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                    <Gamepad2 className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <p className="text-red-400 font-medium">Game Day Responsibilities with Status Tracking</p>
                    <p className="text-red-300 text-sm">
                      Assigned duties help organize game day activities. Duties automatically change to "Completed" 24 hours after the event ends.
                    </p>
                  </div>
                </div>
              </div>

              <div className="card p-4 bg-blue-500/10 border-blue-500/20">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Timer className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-blue-400 font-medium">Automatic Duty Status Management</p>
                    <p className="text-blue-300 text-sm">
                      Track duty completion with automatic status updates based on event timing.
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2 text-blue-300 text-sm">
                  <p>• <span className="text-emerald-400">Open:</span> Duties that are currently active and can be swapped (Pro users only)</p>
                  <p>• <span className="text-slate-400">Completed:</span> Duties that are finished (auto-completed 24h after event)</p>
                  <p>• Only Pro users and app admins can initiate duty swaps</p>
                  <p>• Basic plan users can view their assigned duties but cannot swap them</p>
                  <p>• Status updates automatically in real-time based on event end time</p>
                  
                  {!dutyCompletionInfo.isCompleted && dutyCompletionInfo.timeRemaining && (
                    <div className="card p-3 bg-orange-500/10 border-orange-500/20 mt-3">
                      <div className="flex items-center space-x-2">
                        <Timer className="w-4 h-4 text-orange-400" />
                        <span className="text-orange-400 font-medium text-sm">
                          Auto-completion: {dutyCompletionInfo.timeRemaining}
                        </span>
                      </div>
                      <p className="text-orange-300 text-xs mt-1">
                        All open duties will automatically change to "Completed" status
                      </p>
                    </div>
                  )}
                  
                  {dutyCompletionInfo.isCompleted && (
                    <div className="card p-3 bg-slate-500/10 border-slate-500/20 mt-3">
                      <div className="flex items-center space-x-2">
                        <CircleCheck className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-400 font-medium text-sm">
                          All duties auto-completed (24+ hours after event)
                        </span>
                      </div>
                      <p className="text-slate-300 text-xs mt-1">
                        Duties can no longer be swapped as the event has concluded
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="card p-4 bg-orange-500/10 border-orange-500/20">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                    <ArrowRightLeft className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-orange-400 font-medium">Duty Swap System - Pro Feature</p>
                    <p className="text-orange-300 text-sm">
                      Can't make it to your assigned duty? Duty swapping is available with Pro subscription.
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2 text-orange-300 text-sm">
                  <p>• All users can be assigned duties regardless of plan status</p>
                  <p>• <span className="text-emerald-400">Pro users:</span> Can request duty swaps and accept swap requests</p>
                  <p>• <span className="text-slate-400">Basic users:</span> Can view assigned duties but cannot initiate swaps</p>
                  <p>• <span className="text-red-400">App Admin:</span> Unrestricted access to all duty swap features</p>
                  <p>• Only one member can accept each swap request</p>
                  <p>• When accepted, the duty assignment transfers to the new member</p>
                  <p>• <span className="text-slate-400">Completed duties cannot be swapped</span></p>
                </div>
                
                {!isAppAdmin && !canAccessDutySwaps && (
                  <div className="card p-3 bg-yellow-500/10 border-yellow-500/20 mt-3">
                    <div className="flex items-center space-x-2">
                      <Lock className="w-4 h-4 text-yellow-400" />
                      <span className="text-yellow-400 font-medium text-sm">UPGRADE TO PRO FOR DUTY SWAPS</span>
                    </div>
                    <p className="text-yellow-300 text-xs mt-1">
                      $10/team/month or $150/club/month • Unlock duty swap functionality instantly
                    </p>
                  </div>
                )}
              </div>

              {(isAppAdmin || canAccessDutySwaps) && availableSwapRequests.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-slate-100 flex items-center">
                    <ArrowRightLeft className="w-5 h-5 text-emerald-400 mr-2" />
                    Available Duty Swaps
                  </h4>
                  
                  <div className="card p-4 bg-emerald-500/10 border-emerald-500/20">
                    <div className="flex items-center space-x-3 mb-3">
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                      <div>
                        <p className="text-emerald-400 font-medium">Swap Opportunities</p>
                        <p className="text-emerald-300 text-sm">
                          Other team members are looking to swap their duties. Help them out!
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {availableSwapRequests.map((swapRequest) => (
                      <div key={swapRequest.id} className="card p-4 bg-orange-500/10 border-orange-500/20">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
                              <ArrowRightLeft className="w-6 h-6 text-orange-400" />
                            </div>
                            <div>
                              <h5 className="font-medium text-slate-100">{swapRequest.requestedRole}</h5>
                              <p className="text-slate-400 text-sm">
                                {getMemberName(swapRequest.originalAssignee)} is looking to swap
                              </p>
                              <p className="text-slate-500 text-xs">
                                Requested {new Date(swapRequest.timestamp).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleAcceptDutySwap(swapRequest.id)}
                            disabled={isAcceptingSwap}
                            className={`bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-400 text-white py-2 px-4 rounded-lg transition-colors font-medium flex items-center space-x-2 ${isAcceptingSwap ? 'btn-loading' : ''}`}
                          >
                            {isAcceptingSwap ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <ArrowRightLeft className="w-4 h-4" />
                            )}
                            <span>{isAcceptingSwap ? 'Accepting...' : 'Accept Swap'}</span>
                          </button>
                        </div>
                        
                        <div className="mt-3 p-3 bg-orange-500/5 rounded-lg border border-orange-500/10">
                          <p className="text-orange-300 text-sm">
                            <strong>What happens:</strong> You'll take over the {swapRequest.requestedRole} duty, and {getMemberName(swapRequest.originalAssignee)} will be relieved of this responsibility.
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(isAppAdmin || canAccessDutySwaps) && userPendingSwaps.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-slate-100 flex items-center">
                    <XCircle className="w-5 h-5 text-yellow-400 mr-2" />
                    Your Pending Swaps
                  </h4>
                  
                  <div className="space-y-3">
                    {userPendingSwaps.map((swapRequest) => (
                      <div key={swapRequest.id} className="card p-4 bg-yellow-500/10 border-yellow-500/20">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                              <Clock className="w-6 h-6 text-yellow-400" />
                            </div>
                            <div>
                              <h5 className="font-medium text-slate-100">{swapRequest.requestedRole}</h5>
                              <p className="text-slate-400 text-sm">
                                Swap request pending approval
                              </p>
                              <p className="text-slate-500 text-xs">
                                Requested {new Date(swapRequest.timestamp).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleCancelDutySwap(swapRequest.id)}
                            disabled={isCancellingSwap}
                            className={`bg-red-500 hover:bg-red-600 disabled:bg-red-400 text-white py-2 px-4 rounded-lg transition-colors font-medium flex items-center space-x-2 ${isCancellingSwap ? 'btn-loading' : ''}`}
                          >
                            {isCancellingSwap ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                            <span>{isCancellingSwap ? 'Cancelling...' : 'Cancel'}</span>
                          </button>
                        </div>
                        
                        <div className="mt-3 p-3 bg-yellow-500/5 rounded-lg border border-yellow-500/10">
                          <p className="text-yellow-300 text-sm">
                            Other eligible team members have been notified of your swap request. You'll be notified when someone accepts it.
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {event.dutyRoster.length === 0 ? (
                <div className="text-center py-8">
                  <ClipboardList className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No duties assigned</p>
                  <p className="text-slate-500 text-sm">
                    The event creator can assign duties during event creation or editing.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-slate-100">Assigned Duties</h4>
                    <p className="text-slate-400 text-sm">{event.dutyRoster.length} assignment{event.dutyRoster.length !== 1 ? 's' : ''}</p>
                  </div>
                  
                  <div className="space-y-3">
                    {event.dutyRoster.map((assignment, index) => {
                      const isCurrentUserAssigned = assignment.assignee.toString() === currentUserPrincipal;
                      const dutyCompleted = isDutyCompleted(event, assignment);
                      const canSwap = isCurrentUserAssigned && canInitiateDutySwap(event, assignment) && canDutyBeSwapped(event, assignment);
                      const hasPendingSwap = userPendingSwaps.some(swap => swap.requestedRole === assignment.role);
                      const isHighlighted = highlightDutyRole === assignment.role;
                      const statusColors = getDutyStatusColor(dutyCompleted);
                      const statusText = getDutyStatusText(dutyCompleted);
                      
                      return (
                        <div 
                          key={index} 
                          className={`card p-4 transition-all duration-300 ${
                            isHighlighted ? 'ring-4 ring-emerald-500/50 ring-offset-4 ring-offset-slate-950 bg-emerald-500/10' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between flex-wrap gap-4">
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                                <ClipboardList className="w-6 h-6 text-red-400" />
                              </div>
                              <div>
                                <div className="flex items-center space-x-2 mb-1">
                                  <h5 className="font-medium text-slate-100">{assignment.role}</h5>
                                  <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs border ${statusColors.bg} ${statusColors.border}`}>
                                    {dutyCompleted ? (
                                      <CircleCheck className={`w-3 h-3 ${statusColors.text}`} />
                                    ) : (
                                      <Circle className={`w-3 h-3 ${statusColors.text}`} />
                                    )}
                                    <span className={statusColors.text}>{statusText}</span>
                                  </div>
                                  {!dutyCompleted && dutyCompletionInfo.isCompleted && (
                                    <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs border bg-orange-500/10 text-orange-400 border-orange-500/20">
                                      <Timer className="w-3 h-3" />
                                      <span>Auto-completing...</span>
                                    </div>
                                  )}
                                </div>
                                <p className="text-slate-400 text-sm">
                                  Assigned to: {getMemberName(assignment.assignee.toString())}
                                </p>
                                {isCurrentUserAssigned && (
                                  <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-1 rounded-full border border-emerald-500/20 mt-1 inline-block">
                                    Your Duty
                                  </span>
                                )}
                                {isHighlighted && (
                                  <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2 py-1 rounded-full border border-emerald-500/30 mt-1 inline-block ml-2">
                                    From Notification
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-sm font-semibold">
                                  {getMemberName(assignment.assignee.toString()).charAt(0).toUpperCase()}
                                </span>
                              </div>
                              
                              {canSeeSwapButton && canSwap && !hasPendingSwap && !dutyCompleted && (
                                <button
                                  onClick={() => handleDutySwapRequest(assignment.role)}
                                  disabled={isCreatingSwap}
                                  className={`bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white py-2 px-3 rounded-lg transition-colors font-medium flex items-center space-x-2 text-sm ${isCreatingSwap ? 'btn-loading' : ''}`}
                                >
                                  {isCreatingSwap ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <ArrowRightLeft className="w-4 h-4" />
                                  )}
                                  <span>{isCreatingSwap ? 'Requesting...' : 'Swap'}</span>
                                </button>
                              )}
                              
                              {!canSeeSwapButton && isCurrentUserAssigned && !dutyCompleted && (
                                <div className="bg-red-500/10 text-red-400 py-2 px-3 rounded-lg border border-red-500/20 flex items-center space-x-2 text-sm">
                                  <Lock className="w-4 h-4" />
                                  <span>Pro Required</span>
                                </div>
                              )}
                              
                              {canSeeSwapButton && hasPendingSwap && !dutyCompleted && (
                                <div className="bg-yellow-500/10 text-yellow-400 py-2 px-3 rounded-lg border border-yellow-500/20 flex items-center space-x-2 text-sm">
                                  <Clock className="w-4 h-4" />
                                  <span>Swap Pending</span>
                                </div>
                              )}

                              {dutyCompleted && (
                                <div className="bg-slate-500/10 text-slate-400 py-2 px-3 rounded-lg border border-slate-500/20 flex items-center space-x-2 text-sm">
                                  <CircleCheck className="w-4 h-4" />
                                  <span>Completed</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="mt-3 p-3 bg-slate-500/10 rounded-lg border border-slate-500/20">
                            <div className="flex items-center space-x-2">
                              <Timer className="w-4 h-4 text-slate-400" />
                              <p className="text-slate-400 text-sm font-medium">
                                Status: {statusText}
                                {!dutyCompleted && dutyCompletionInfo.isCompleted && (
                                  <span className="text-orange-400 ml-2">(Auto-completing...)</span>
                                )}
                              </p>
                            </div>
                            <p className="text-slate-300 text-xs mt-1">
                              {dutyCompleted 
                                ? 'This duty has been completed (automatically marked 24+ hours after event end)'
                                : 'This duty is currently open and can be swapped if needed (Pro feature)'
                              }
                            </p>
                            
                            {!dutyCompleted && !dutyCompletionInfo.isCompleted && dutyCompletionInfo.timeRemaining && (
                              <p className="text-orange-300 text-xs mt-1">
                                Will auto-complete in: {dutyCompletionInfo.timeRemaining}
                              </p>
                            )}
                          </div>
                          
                          {isCurrentUserAssigned && (
                            <div className="mt-3 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                              <div className="flex items-center space-x-2">
                                <CheckCircle className="w-4 h-4 text-emerald-400" />
                                <p className="text-emerald-400 text-sm font-medium">
                                  This is your assigned duty for the game
                                </p>
                              </div>
                              <p className="text-emerald-300 text-xs mt-1">
                                Make sure to arrive early and coordinate with other duty holders.
                                {canSeeSwapButton && canSwap && !hasPendingSwap && !dutyCompleted && ' You can request a swap if needed.'}
                                {!canSeeSwapButton && !dutyCompleted && ' Duty swapping requires Pro subscription.'}
                                {dutyCompleted && ' This duty has been completed.'}
                              </p>
                            </div>
                          )}
                          
                          {canSeeSwapButton && hasPendingSwap && isCurrentUserAssigned && !dutyCompleted && (
                            <div className="mt-3 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                              <div className="flex items-center space-x-2">
                                <Clock className="w-4 h-4 text-yellow-400" />
                                <p className="text-yellow-400 text-sm font-medium">
                                  Swap Request Active
                                </p>
                              </div>
                              <p className="text-yellow-300 text-xs mt-1">
                                Your swap request is pending. Other eligible team members have been notified and can accept your request.
                              </p>
                            </div>
                          )}

                          {!canSeeSwapButton && isCurrentUserAssigned && !dutyCompleted && (
                            <div className="mt-3 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                              <div className="flex items-center space-x-2">
                                <Lock className="w-4 h-4 text-red-400" />
                                <p className="text-red-400 text-sm font-medium">
                                  Duty Swap - Pro Feature Required
                                </p>
                              </div>
                              <p className="text-red-300 text-xs mt-1">
                                You can view your assigned duty, but swapping requires Pro subscription. 
                                Upgrade to Pro to request duty swaps with other team members.
                              </p>
                              <button
                                onClick={handleUpgradeClick}
                                className="mt-2 text-yellow-400 hover:text-yellow-300 text-xs font-medium flex items-center space-x-1"
                              >
                                <CreditCard className="w-3 h-3" />
                                <span>Upgrade to Pro</span>
                              </button>
                            </div>
                          )}

                          {isHighlighted && (
                            <div className="mt-3 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                              <div className="flex items-center space-x-2">
                                <CheckCircle className="w-4 h-4 text-emerald-400" />
                                <p className="text-emerald-400 text-sm font-medium">
                                  Navigated from duty notification
                                </p>
                              </div>
                              <p className="text-emerald-300 text-xs mt-1">
                                This duty was highlighted because you clicked on a duty assignment notification.
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {event.dutyRoster.some(assignment => assignment.assignee.toString() === currentUserPrincipal) && (
                    <div className="card p-4 bg-emerald-500/10 border-emerald-500/20">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                          <UserCheck className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-emerald-400 font-medium">Your Game Day Duties</p>
                          <div className="text-emerald-300 text-sm mt-1">
                            {event.dutyRoster
                              .filter(assignment => assignment.assignee.toString() === currentUserPrincipal)
                              .map((assignment, index) => {
                                const dutyCompleted = isDutyCompleted(event, assignment);
                                const statusText = getDutyStatusText(dutyCompleted);
                                const statusColors = getDutyStatusColor(dutyCompleted);
                                return (
                                  <div key={index} className="flex items-center space-x-2">
                                    <span>• {assignment.role}</span>
                                    <span className={`text-xs px-2 py-1 rounded-full border ${statusColors.bg} ${statusColors.border} ${statusColors.text}`}>
                                      {statusText}
                                    </span>
                                    {!dutyCompleted && dutyCompletionInfo.isCompleted && (
                                      <span className="text-xs px-2 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                                        Auto-completing...
                                      </span>
                                    )}
                                  </div>
                                );
                              })
                            }
                          </div>
                          {!canSeeSwapButton && (
                            <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                              <div className="flex items-center space-x-2">
                                <Lock className="w-3 h-3 text-red-400" />
                                <span className="text-red-400 text-xs font-medium">
                                  Duty swapping requires Pro subscription
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="card p-4 bg-blue-500/10 border-blue-500/20">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-blue-400 font-medium">Coordination</p>
                        <p className="text-blue-300 text-sm">
                          Contact other duty holders through team chat to coordinate your responsibilities.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-black/75 flex items-center justify-center p-4 z-10">
          <div className="bg-slate-800 rounded-xl p-6 max-w-sm w-full max-h-[90vh] overflow-y-auto">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-100 mb-2">Delete Event</h3>
              
              {isRecurringEvent ? (
                <div className="space-y-4">
                  <div className="card p-3 bg-orange-500/10 border-orange-500/20">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-orange-400" />
                      <span className="text-orange-400 font-medium text-sm">Recurring Event</span>
                    </div>
                    <p className="text-orange-300 text-xs">
                      This is a recurring event. Choose what to delete:
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <label className="flex items-start space-x-3 p-3 rounded-lg border border-slate-600 hover:border-slate-500 cursor-pointer">
                      <input
                        type="radio"
                        name="deleteType"
                        value="single"
                        checked={deleteType === 'single'}
                        onChange={(e) => setDeleteType(e.target.value as 'single' | 'series')}
                        className="mt-1 w-4 h-4 text-emerald-500 bg-slate-800 border-slate-600 focus:ring-emerald-500"
                      />
                      <div>
                        <p className="text-slate-200 font-medium text-sm">This occurrence only</p>
                        <p className="text-slate-400 text-xs">Delete just this single event instance</p>
                      </div>
                    </label>
                    
                    <label className="flex items-start space-x-3 p-3 rounded-lg border border-slate-600 hover:border-slate-500 cursor-pointer">
                      <input
                        type="radio"
                        name="deleteType"
                        value="series"
                        checked={deleteType === 'series'}
                        onChange={(e) => setDeleteType(e.target.value as 'single' | 'series')}
                        className="mt-1 w-4 h-4 text-emerald-500 bg-slate-800 border-slate-600 focus:ring-emerald-500"
                      />
                      <div>
                        <p className="text-slate-200 font-medium text-sm">Entire series</p>
                        <p className="text-slate-400 text-xs">Delete all occurrences of this recurring event</p>
                      </div>
                    </label>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 mb-6">
                  Are you sure you want to delete this event? This action cannot be undone and will remove all participant data.
                </p>
              )}
              
              <div className="grid grid-cols-2 gap-3 mt-6">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="btn-secondary"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteEvent}
                  disabled={isDeleting}
                  className={`bg-red-500 hover:bg-red-600 disabled:bg-red-400 text-white py-2 px-4 rounded-lg transition-colors font-medium ${isDeleting ? 'btn-loading' : ''}`}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showMatchDayPostModal && canAccessMatchDayPosts && (
        <MatchDayPostModal
          event={event}
          onClose={() => setShowMatchDayPostModal(false)}
        />
      )}

      {showUpgradeModal && (
        <SubscriptionUpgradeModal
          organizationType={event.teamId ? 'team' : 'club'}
          organizationId={event.teamId ? event.teamId.toString() : event.clubId?.toString() || '1'}
          organizationName="Match Day Post Features"
          onClose={() => setShowUpgradeModal(false)}
        />
      )}
    </div>
  );
}
