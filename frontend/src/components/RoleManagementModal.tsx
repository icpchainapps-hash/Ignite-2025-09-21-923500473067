import React, { useState, useEffect } from 'react';
import { X, Shield, Users, Crown, Settings, User, Plus, Trash2, ArrowLeft, CheckCircle, AlertCircle, Lock, MessageCircle } from 'lucide-react';
import { useGetUserClubs } from '../hooks/useClubs';
import { useGetAllTeams } from '../hooks/useTeams';
import { useIsCurrentUserAdmin } from '../hooks/useUsers';
import { useUserRoles } from '../hooks/useRoles';
import { useInternetIdentity } from '../hooks/useInternetIdentity';

interface RoleManagementModalProps {
  onClose: () => void;
}

export default function RoleManagementModal({ onClose }: RoleManagementModalProps) {
  const [successMessage, setSuccessMessage] = useState<string>('');

  const { data: clubs } = useGetUserClubs();
  const { data: teams } = useGetAllTeams();
  const { identity } = useInternetIdentity();
  const { userRoles } = useUserRoles();
  const { data: isAdmin } = useIsCurrentUserAdmin();

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

  const roleDefinitions = {
    app_admin: {
      name: 'App Admin',
      description: 'Full administrative access to the entire application',
      icon: Crown,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
    },
    club_admin: {
      name: 'Club Admin',
      description: 'Full administrative access to club management, teams, and settings',
      icon: Crown,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/20',
    },
    team_admin: {
      name: 'Team Admin',
      description: 'Manage team roster, events, and team-specific settings',
      icon: Shield,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
    },
    coach: {
      name: 'Coach',
      description: 'Manage lineups, training sessions, and player development',
      icon: Settings,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20',
    },
    player: {
      name: 'Player',
      description: 'Active team member participating in games and training',
      icon: User,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
    },
    parent: {
      name: 'Parent',
      description: 'Guardian of a player with access to child-related information',
      icon: Users,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20',
    },
  };

  const automaticRoles = userRoles.filter(role => role.isAutomatic);

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-slate-800/50 bg-slate-900/95 backdrop-blur-sm sticky top-0 z-10">
        <button
          onClick={onClose}
          className="p-2 -ml-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold text-slate-100">Manage Roles</h1>
        <button
          onClick={onClose}
          className="p-2 -mr-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {successMessage && (
        <div className="mx-4 mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <p className="text-emerald-400 text-sm font-medium">{successMessage}</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 pb-32">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="card p-4">
              <div className="flex items-center mb-2">
                <Shield className="w-5 h-5 text-emerald-500 mr-2" />
                <span className="text-slate-100 font-medium">Total Roles</span>
              </div>
              <p className="text-2xl font-bold text-slate-100">{userRoles.length}</p>
            </div>
            <div className="card p-4">
              <div className="flex items-center mb-2">
                <Lock className="w-5 h-5 text-blue-500 mr-2" />
                <span className="text-slate-100 font-medium">Automatic</span>
              </div>
              <p className="text-2xl font-bold text-slate-100">{automaticRoles.length}</p>
            </div>
          </div>

          {/* Automatic Roles */}
          {automaticRoles.length > 0 && (
            <div className="space-y-4 mb-6">
              <h3 className="text-lg font-semibold text-slate-100 flex items-center">
                <Lock className="w-5 h-5 text-blue-400 mr-2" />
                Automatic Role Assignments
              </h3>
              <div className="card p-4 bg-blue-500/10 border-blue-500/20">
                <div className="flex items-start space-x-3 mb-4">
                  <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-blue-400 font-medium">Automatically Assigned</p>
                    <p className="text-blue-300 text-xs mt-1">
                      These roles are automatically assigned based on your actions (creating clubs/teams) and cannot be removed manually.
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {automaticRoles.map((role) => {
                    const roleDef = roleDefinitions[role.role];
                    const Icon = roleDef.icon;
                    
                    return (
                      <div
                        key={role.id}
                        className={`p-4 rounded-lg border ${roleDef.bgColor} ${roleDef.borderColor}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${roleDef.bgColor}`}>
                              <Icon className={`w-5 h-5 ${roleDef.color}`} />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h5 className={`font-medium ${roleDef.color}`}>{roleDef.name}</h5>
                                <Lock className="w-3 h-3 text-slate-500" />
                              </div>
                              <p className="text-slate-400 text-sm">{role.organizationName}</p>
                              <p className="text-slate-500 text-xs mt-1">
                                Automatically assigned • {role.scope === 'global' ? 'Global' : role.scope}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Info Section */}
          <div className="mt-8 card p-6 bg-blue-500/10 border-blue-500/20">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h4 className="font-medium text-slate-100 mb-2">About Role Management</h4>
                <div className="text-slate-300 text-sm space-y-2">
                  <p>Role assignment is controlled by admin approval:</p>
                  <ul className="list-disc list-inside space-y-1 text-slate-400 ml-4">
                    <li><strong>Admins:</strong> Can assign roles directly</li>
                    <li><strong>Users:</strong> Must request role access from admins</li>
                    <li><strong>Club Level:</strong> Only Club Admin role can be assigned</li>
                    <li><strong>Team Level:</strong> Team Admin, Coach, Player, and Parent roles can be assigned</li>
                    <li><strong>App Admin:</strong> Full control over the entire application (automatic only)</li>
                  </ul>
                  <p className="mt-3">
                    Automatic roles are assigned when you create clubs or teams and cannot be removed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800/50 p-4 bg-slate-900/95 backdrop-blur-sm sticky bottom-0 z-10">
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
