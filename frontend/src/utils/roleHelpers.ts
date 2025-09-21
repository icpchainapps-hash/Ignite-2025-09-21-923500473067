import { TeamRole, ClubRole } from '../backend';
import { Shield, Settings, User, Baby, Crown } from 'lucide-react';
import { ROLE_CONFIGS } from './constants';

export const getRoleIcon = (role: string) => {
  const config = ROLE_CONFIGS[role as keyof typeof ROLE_CONFIGS];
  if (!config) return User;
  
  switch (config.icon) {
    case 'Shield': return Shield;
    case 'Settings': return Settings;
    case 'User': return User;
    case 'Baby': return Baby;
    case 'Crown': return Crown;
    default: return User;
  }
};

export const getRoleColor = (role: string): string => {
  const config = ROLE_CONFIGS[role as keyof typeof ROLE_CONFIGS];
  return config ? `${config.bgColor} ${config.color} ${config.borderColor}` : 'bg-slate-500/10 text-slate-400 border-slate-500/20';
};

export const getRoleText = (role: TeamRole | ClubRole): string => {
  switch (role) {
    case 'teamAdmin':
      return 'Team Admin';
    case 'coach':
      return 'Coach';
    case 'player':
      return 'Player';
    case 'parent':
      return 'Parent';
    case 'clubAdmin':
      return 'Club Admin';
    default:
      return role.toString();
  }
};

export const teamRoleToText = (role: TeamRole): string => {
  return getRoleText(role);
};

export const clubRoleToText = (role: ClubRole): string => {
  return getRoleText(role);
};
