import React from 'react';
import { Home, Calendar, MessageCircle, Users } from 'lucide-react';
import { useIsCurrentUserAdmin } from '../hooks/useUsers';

type TabType = 'home' | 'events' | 'messages' | 'clubs';

interface BottomNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export default function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  const { data: isAppAdmin } = useIsCurrentUserAdmin();

  const tabs = [
    { id: 'home' as TabType, label: 'Home', icon: Home },
    { id: 'events' as TabType, label: 'Events', icon: Calendar },
    { id: 'messages' as TabType, label: 'Messages', icon: MessageCircle },
    { id: 'clubs' as TabType, label: 'Clubs', icon: Users },
  ];

  const handleTabClick = (tabId: TabType) => {
    onTabChange(tabId);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass-effect border-t border-slate-800/50 z-40">
      <div className="flex max-w-7xl mx-auto">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => handleTabClick(id)}
            className={`flex-1 py-3 px-2 flex flex-col items-center justify-center transition-all duration-200 relative ${
              activeTab === id
                ? 'text-emerald-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <div className="relative">
              <Icon className={`w-5 h-5 mb-1 transition-transform duration-200 ${
                activeTab === id ? 'scale-110' : ''
              }`} />
            </div>
            <span className="text-xs font-medium">{label}</span>
            {activeTab === id && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-400 rounded-full"></div>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}
