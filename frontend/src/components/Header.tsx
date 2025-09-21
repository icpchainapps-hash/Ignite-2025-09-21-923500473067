import React from 'react';
import { Bell, User, Zap } from 'lucide-react';
import { UserProfile } from '../backend';
import { useGetNotifications } from '../hooks/useNotifications';
import { useInternetIdentity } from '../hooks/useInternetIdentity';

interface HeaderProps {
  userProfile: UserProfile | null;
  onProfileClick: () => void;
  onNotificationClick: () => void;
}

export default function Header({ userProfile, onProfileClick, onNotificationClick }: HeaderProps) {
  const { data: notifications } = useGetNotifications();
  const { identity } = useInternetIdentity();
  
  const unreadCount = notifications?.filter(n => !n.read).length || 0;
  const showNotificationBadge = !!identity && unreadCount > 0;

  const handleNotificationClick = () => {
    onNotificationClick();
  };

  return (
    <header className="glass-effect border-b border-slate-800/50 px-4 py-3 sticky top-0 z-40">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-2 rounded-xl shadow-lg">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gradient">Ignite</h1>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button 
            onClick={handleNotificationClick}
            className="relative p-2.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded-xl transition-all duration-200 focus-ring"
          >
            <Bell className="w-5 h-5" />
            {showNotificationBadge && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium shadow-lg animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          
          <button 
            onClick={onProfileClick}
            className="flex items-center space-x-2 p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded-xl transition-all duration-200 focus-ring"
          >
            {userProfile?.profilePicture ? (
              <img
                src={userProfile.profilePicture}
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover shadow-lg"
              />
            ) : (
              <div className="avatar-sm bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg">
                {userProfile?.name ? (
                  <span className="text-white text-sm font-semibold">
                    {userProfile.name.charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <User className="w-4 h-4 text-white" />
                )}
              </div>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
