import React, { useState, useEffect } from 'react';
import { X, Shield, Users, Crown, Settings, User, Plus, Trash2, ArrowLeft, CheckCircle, AlertCircle, Lock, MessageCircle, Edit, Baby } from 'lucide-react';
import { useManageTeamRoles } from '../hooks/useUserManagement';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import type { TeamRole } from '../backend';
import { Principal } from '@dfinity/principal';

interface TeamMemberRoleManagementModalProps {
  member: any;
  memberName: string;
  teamId: string;
  teamName: string;
  onClose: () => void;
  onRolesUpdated: () => void;
}

export default function TeamMemberRoleManagementModal({ 
  member, 
  memberName, 
  teamId, 
  teamName, 
  onClose, 
  onRolesUpdated 
}: TeamMemberRoleManagementModalProps) {
  const [selectedRoles, setSelectedRoles] = useState<TeamRole[]>([]);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const { mutate: manageTeamRoles, isPending } = useManageTeamRoles();
  const { identity } = useInternetIdentity();

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

  // Initialize selected roles based on member's current roles
  useEffect(() => {
    if (member.roles) {
      const currentRoles: TeamRole[] = [];
      for (const role of member.roles) {
        switch (role) {
          case 'Team Admin':
            currentRoles.push(TeamRole.teamAdmin);
            break;
          case 'Coach':
            currentRoles.push(TeamRole.coach);
            break;
          case 'Player':
            currentRoles.push(TeamRole.player);
            break;
          case 'Parent':
            currentRoles.push(TeamRole.parent);
            break;
        }
      }
      setSelectedRoles(currentRoles);
    }
  }, [member.roles]);

  const roleOptions = [
    {
      value: TeamRole.player,
      name: 'Player',
      description: 'Active team member participating in games and training',
      icon: User,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
    },
    {
      value: TeamRole.parent,
      name: 'Parent',
      description: 'Guardian of a player with access to child-related information',
      icon: Baby,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20',
    },
    {
      value: TeamRole.coach,
      name: 'Coach',
      description: 'Manage lineups, training sessions, and player development',
      icon: Settings,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20',
    },
    {
      value: TeamRole.teamAdmin,
      name: 'Team Admin',
      description: 'Manage team roster, events, and team-specific settings',
      icon: Shield,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
    },
  ];

  const handleRoleToggle = (role: TeamRole) => {
    setSelectedRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const hasChanges = () => {
    const currentRoleValues = member.roles?.map((role: string) => {
      switch (role) {
        case 'Team Admin': return TeamRole.teamAdmin;
        case 'Coach': return TeamRole.coach;
        case 'Player': return TeamRole.player;
        case 'Parent': return TeamRole.parent;
        default: return null;
      }
    }).filter(Boolean) || [];

    if (currentRoleValues.length !== selectedRoles.length) return true;
    
    return !currentRoleValues.every((role: TeamRole) => selectedRoles.includes(role));
  };

  const handleSaveRoles = () => {
    if (!teamId || !member.principal) return;

    try {
      const memberPrincipal = Principal.fromText(member.principal);
      
      manageTeamRoles({
        teamId,
        userPrincipal: memberPrincipal,
        roles: selectedRoles,
      }, {
        onSuccess: () => {
          const roleNames = selectedRoles.map(role => {
            const roleOption = roleOptions.find(r => r.value === role);
            return roleOption?.name || role.toString();
          }).join(', ');
          
          setSuccessMessage(`Roles updated successfully for ${memberName}: ${roleNames || 'No roles'}`);
          setTimeout(() => {
            onRolesUpdated();
          }, 1500);
        },
        onError: (error) => {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to update roles');
          setTimeout(() => setErrorMessage(''), 5000);
        }
      });
    } catch (error) {
      console.error('Invalid principal for role management:', error);
      setErrorMessage('Invalid user principal');
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Team Admin':
        return <Shield className="w-3 h-3 text-blue-400" />;
      case 'Coach':
        return <Settings className="w-3 h-3 text-green-400" />;
      case 'Player':
        return <User className="w-3 h-3 text-purple-400" />;
      case 'Parent':
        return <Baby className="w-3 h-3 text-orange-400" />;
      case 'Child':
        return <Baby className="w-3 h-3 text-purple-400" />;
      default:
        return <User className="w-3 h-3 text-slate-400" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Team Admin':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Coach':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'Player':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'Parent':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'Child':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-slate-800/50 bg-slate-900/95 backdrop-blur-sm sticky top-0 z-10">
        <button
          onClick={onClose}
          className="p-2 -ml-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
          disabled={isPending}
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-semibold text-slate-100">Manage Roles</h1>
          <p className="text-sm text-slate-400">{memberName} in {teamName}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 -mr-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
          disabled={isPending}
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mx-4 mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-emerald-400 text-sm font-medium">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-red-400 text-sm font-medium">{errorMessage}</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 pb-32">
          <div className="space-y-6">
            {/* Member Info */}
            <div className="card p-4 bg-blue-500/10 border-blue-500/20">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold">
                    {memberName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-slate-100 font-medium text-lg">{memberName}</h3>
                  <p className="text-slate-400 text-sm">Managing roles for {teamName}</p>
                </div>
              </div>
            </div>

            {/* Current Roles Display */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-slate-100">Current Roles</h3>
              <div className="card p-4">
                {member.roles && member.roles.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {member.roles.map((role: string, index: number) => (
                      <span
                        key={index}
                        className={`text-xs px-2 py-1 rounded-full border flex items-center ${getRoleColor(role)}`}
                      >
                        {getRoleIcon(role)}
                        <span className="ml-1">{role}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">No roles assigned</p>
                )}
              </div>
            </div>

            {/* Role Selection */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-100">Select Roles</h3>
              <p className="text-slate-400 text-sm">
                Choose which roles {memberName} should have for {teamName}. You can select multiple roles.
              </p>
              
              <div className="space-y-3">
                {roleOptions.map((roleOption) => {
                  const Icon = roleOption.icon;
                  const isSelected = selectedRoles.includes(roleOption.value);
                  
                  return (
                    <label
                      key={roleOption.value}
                      className={`card p-4 cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? `${roleOption.bgColor} ${roleOption.borderColor} ring-2 ring-opacity-50`
                          : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-start space-x-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleRoleToggle(roleOption.value)}
                          className="mt-1 w-4 h-4 text-emerald-500 bg-slate-800 border-slate-600 focus:ring-emerald-500"
                          disabled={isPending}
                        />
                        <div className="flex items-center space-x-3 flex-1">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            isSelected ? roleOption.bgColor : 'bg-slate-700'
                          }`}>
                            <Icon className={`w-5 h-5 ${
                              isSelected ? roleOption.color : 'text-slate-400'
                            }`} />
                          </div>
                          <div className="flex-1">
                            <p className={`font-medium ${
                              isSelected ? roleOption.color : 'text-slate-300'
                            }`}>{roleOption.name}</p>
                            <p className={`text-sm ${
                              isSelected ? roleOption.color.replace('500', '300') : 'text-slate-400'
                            }`}>{roleOption.description}</p>
                          </div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Role Management Preview */}
            {hasChanges() && (
              <div className="card p-4 bg-emerald-500/10 border-emerald-500/20">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                    <Edit className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-emerald-400 font-medium">Role Changes Preview</p>
                    <p className="text-emerald-300 text-sm">
                      {selectedRoles.length === 0 
                        ? `${memberName} will be removed from ${teamName} (no roles selected)`
                        : `${memberName} will have ${selectedRoles.length} role${selectedRoles.length !== 1 ? 's' : ''} in ${teamName}`
                      }
                    </p>
                  </div>
                </div>
                
                {selectedRoles.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedRoles.map((role) => {
                      const roleOption = roleOptions.find(r => r.value === role);
                      if (!roleOption) return null;
                      
                      return (
                        <span
                          key={role}
                          className={`text-xs px-2 py-1 rounded-full border flex items-center ${roleOption.bgColor} ${roleOption.borderColor} ${roleOption.color}`}
                        >
                          <roleOption.icon className="w-3 h-3 mr-1" />
                          {roleOption.name}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Info Section */}
            <div className="card p-6 bg-blue-500/10 border-blue-500/20">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-100 mb-2">About Role Management</h4>
                  <div className="text-slate-300 text-sm space-y-2">
                    <p>Role management allows you to:</p>
                    <ul className="list-disc list-inside space-y-1 text-slate-400 ml-4">
                      <li><strong>Add Roles:</strong> Select additional roles for the team member</li>
                      <li><strong>Remove Roles:</strong> Unselect roles to remove them from the member</li>
                      <li><strong>Multiple Roles:</strong> Members can have multiple roles simultaneously</li>
                      <li><strong>Complete Removal:</strong> Removing all roles will remove the member from the team</li>
                      <li><strong>Real-time Updates:</strong> Changes are applied immediately and reflected in the UI</li>
                    </ul>
                    <p className="mt-3">
                      Changes are saved when you click "Update Roles" and take effect immediately.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800/50 p-4 bg-slate-900/95 backdrop-blur-sm sticky bottom-0 z-10">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            className="btn-secondary-mobile"
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            onClick={handleSaveRoles}
            disabled={isPending || !hasChanges()}
            className={`btn-primary-mobile ${isPending ? 'btn-loading' : ''}`}
          >
            {isPending ? 'Updating Roles...' : 'Update Roles'}
          </button>
        </div>
      </div>
    </div>
  );
}
