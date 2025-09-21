import React, { useState, useEffect } from 'react';
import type { UserProfile } from '../backend';
import Header from './Header';
import BottomNavigation from './BottomNavigation';
import HomePage from './pages/HomePage';
import EventsPage from './pages/EventsPage';
import MessagesPage from './pages/MessagesPage';
import ClubsPage from './pages/ClubsPage';
import ProfileModal from './ProfileModal';
import NotificationModal from './NotificationModal';
import { useNavigateToDuty, useNavigateToReward, useNavigateToClubChat, useNavigateToChatThread } from '../hooks/useNotifications';
import { useIsCurrentUserAdmin } from '../hooks/useUsers';

type TabType = 'home' | 'events' | 'messages' | 'clubs';

interface MainAppProps {
  userProfile: UserProfile | null;
}

export default function MainApp({ userProfile }: MainAppProps) {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [openEventId, setOpenEventId] = useState<string | null>(null);
  const [highlightDutyRole, setHighlightDutyRole] = useState<string | null>(null);
  const [highlightRewardId, setHighlightRewardId] = useState<string | null>(null);

  const { mutate: navigateToDuty } = useNavigateToDuty();
  const { mutate: navigateToReward } = useNavigateToReward();
  const { mutate: navigateToClubChat } = useNavigateToClubChat();
  const { mutate: navigateToChatThread } = useNavigateToChatThread();
  const { data: isAppAdmin } = useIsCurrentUserAdmin();

  // Check for message thread navigation
  useEffect(() => {
    const threadIdToOpen = sessionStorage.getItem('openThreadId');
    if (threadIdToOpen && activeTab === 'messages') {
      setSelectedThreadId(threadIdToOpen);
      sessionStorage.removeItem('openThreadId');
    }
  }, [activeTab]);

  // Check for club chat navigation
  useEffect(() => {
    const clubChatIdToOpen = sessionStorage.getItem('openClubChatId');
    if (clubChatIdToOpen && activeTab === 'messages') {
      // Find the club chat thread for this club
      // This would need to be implemented with proper thread lookup
      sessionStorage.removeItem('openClubChatId');
    }
  }, [activeTab]);

  // Check for event/duty navigation
  useEffect(() => {
    const eventIdToOpen = sessionStorage.getItem('openEventId');
    const dutyRoleToHighlight = sessionStorage.getItem('highlightDutyRole');
    
    if (eventIdToOpen && activeTab === 'events') {
      setOpenEventId(eventIdToOpen);
      sessionStorage.removeItem('openEventId');
      
      if (dutyRoleToHighlight) {
        setHighlightDutyRole(dutyRoleToHighlight);
        sessionStorage.removeItem('highlightDutyRole');
        
        // Clear duty highlight after a few seconds
        setTimeout(() => {
          setHighlightDutyRole(null);
        }, 5000);
      }
    }
  }, [activeTab]);

  // Check for reward navigation
  useEffect(() => {
    const rewardIdToHighlight = sessionStorage.getItem('highlightRewardId');
    if (rewardIdToHighlight) {
      setHighlightRewardId(rewardIdToHighlight);
      sessionStorage.removeItem('highlightRewardId');
      
      // Open profile modal to show reward collection
      setShowProfileModal(true);
      
      // Clear reward highlight after a few seconds
      setTimeout(() => {
        setHighlightRewardId(null);
      }, 5000);
    }
  }, []);

  const renderPage = () => {
    switch (activeTab) {
      case 'home':
        return <HomePage userProfile={userProfile} />;
      case 'events':
        return <EventsPage openEventId={openEventId} highlightDutyRole={highlightDutyRole} />;
      case 'messages':
        return <MessagesPage selectedThreadId={selectedThreadId} onThreadSelect={setSelectedThreadId} />;
      case 'clubs':
        return <ClubsPage onMessageThreadNavigation={handleMessageThreadNavigation} />;
      default:
        return <HomePage userProfile={userProfile} />;
    }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  const handleDutyNotificationClick = (eventId: string, dutyRole?: string) => {
    navigateToDuty({
      eventId,
      dutyRole,
      activeTabSetter: setActiveTab
    });
  };

  const handleRewardNotificationClick = (rewardId: string) => {
    navigateToReward({
      rewardId,
      activeTabSetter: () => {
        // Reward navigation opens the profile modal
        setHighlightRewardId(rewardId);
        setShowProfileModal(true);
      }
    });
  };

  const handleClubChatNotificationClick = (clubId: string) => {
    navigateToClubChat({
      clubId,
      activeTabSetter: setActiveTab
    });
  };

  const handleChatThreadNotificationClick = (threadId: string) => {
    console.log('Handling chat thread notification click:', threadId);
    navigateToChatThread({
      threadId,
      activeTabSetter: setActiveTab
    });
  };

  const handleMessageThreadNavigation = (threadId: string) => {
    sessionStorage.setItem('openThreadId', threadId);
    setActiveTab('messages');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Header 
        userProfile={userProfile}
        onProfileClick={() => setShowProfileModal(true)}
        onNotificationClick={() => setShowNotificationModal(true)}
      />
      
      <main className="flex-1 pb-20">
        {renderPage()}
      </main>

      <BottomNavigation 
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {showProfileModal && (
        <ProfileModal 
          userProfile={userProfile}
          onClose={() => setShowProfileModal(false)}
          highlightRewardId={highlightRewardId}
        />
      )}

      {showNotificationModal && (
        <NotificationModal 
          onClose={() => setShowNotificationModal(false)}
          onDutyNotificationClick={handleDutyNotificationClick}
          onRewardNotificationClick={handleRewardNotificationClick}
          onClubChatNotificationClick={handleClubChatNotificationClick}
          onChatThreadNotificationClick={handleChatThreadNotificationClick}
        />
      )}
    </div>
  );
}
