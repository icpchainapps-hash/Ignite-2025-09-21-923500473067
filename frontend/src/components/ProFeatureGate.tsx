import React from 'react';
import { Crown, Lock, CreditCard, Shield, Zap, AlertCircle, Unlock } from 'lucide-react';
import { useCanAccessFeature } from '../hooks/useSubscriptions';

interface ProFeatureGateProps {
  feature: 'duty_assignments' | 'file_storage' | 'advanced_chat' | 'social_feed' | 'unlimited_announcements' | 'attendance_reporting';
  organizationType?: 'club' | 'team';
  organizationId?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onUpgradeClick?: () => void;
  showUpgradePrompt?: boolean;
}

function getFeatureDisplayName(feature: string): string {
  switch (feature) {
    case 'duty_assignments': return 'Duty Assignments';
    case 'file_storage': return 'File & Photo Storage';
    case 'advanced_chat': return 'Advanced Chat Features';
    case 'social_feed': return 'Team Social Feed';
    case 'unlimited_announcements': return 'Unlimited Announcements';
    case 'attendance_reporting': return 'Attendance & Duty Reporting';
    default: return 'This feature';
  }
}

export default function ProFeatureGate({
  feature,
  organizationType,
  organizationId,
  children,
  fallback,
  onUpgradeClick,
  showUpgradePrompt = true,
}: ProFeatureGateProps) {
  const { data: featureAccess, isLoading } = useCanAccessFeature(
    feature,
    organizationType,
    organizationId
  );

  // Show loading state while checking access
  if (isLoading) {
    return (
      <div className="card p-4 bg-blue-500/10 border-blue-500/20">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-400 border-t-transparent"></div>
          <span className="text-blue-400 text-sm">Checking feature access...</span>
        </div>
      </div>
    );
  }

  // App admins or users with Pro access can see the feature
  if (featureAccess?.hasAccess) {
    return <>{children}</>;
  }

  // Show custom fallback if provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Show upgrade prompt if enabled
  if (showUpgradePrompt) {
    return (
      <ProUpgradePrompt
        feature={feature}
        reason={featureAccess?.reason}
        onUpgradeClick={onUpgradeClick}
        organizationType={organizationType}
        organizationId={organizationId}
      />
    );
  }

  // Default: hide the feature completely
  return null;
}

interface ProUpgradePromptProps {
  feature: string;
  reason?: string;
  onUpgradeClick?: () => void;
  organizationType?: 'club' | 'team';
  organizationId?: string;
}

function ProUpgradePrompt({ 
  feature, 
  reason, 
  onUpgradeClick,
  organizationType,
  organizationId 
}: ProUpgradePromptProps) {
  const getFeatureInfo = () => {
    switch (feature) {
      case 'duty_assignments':
        return {
          title: 'Duty Assignments',
          description: 'Assign game day responsibilities and enable duty swaps',
          icon: Shield,
          color: 'text-red-400',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/20',
        };
      case 'file_storage':
        return {
          title: 'File & Photo Storage',
          description: 'Upload and organize photos and files in the vault',
          icon: Crown,
          color: 'text-purple-400',
          bgColor: 'bg-purple-500/10',
          borderColor: 'border-purple-500/20',
        };
      case 'advanced_chat':
        return {
          title: 'Advanced Chat Features',
          description: 'Unlimited threads, attachments, and reactions',
          icon: Zap,
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/20',
        };
      case 'social_feed':
        return {
          title: 'Team Social Feed',
          description: 'Posts, comments, and likes for team engagement',
          icon: Crown,
          color: 'text-emerald-400',
          bgColor: 'bg-emerald-500/10',
          borderColor: 'border-emerald-500/20',
        };
      case 'unlimited_announcements':
        return {
          title: 'Unlimited Announcements',
          description: 'Create unlimited announcements with full features',
          icon: Crown,
          color: 'text-orange-400',
          bgColor: 'bg-orange-500/10',
          borderColor: 'border-orange-500/20',
        };
      case 'attendance_reporting':
        return {
          title: 'Attendance & Duty Reporting',
          description: 'Track attendance and duty completion analytics',
          icon: Shield,
          color: 'text-green-400',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/20',
        };
      default:
        return {
          title: 'Pro Feature',
          description: 'This feature requires a Pro subscription',
          icon: Crown,
          color: 'text-slate-400',
          bgColor: 'bg-slate-500/10',
          borderColor: 'border-slate-500/20',
        };
    }
  };

  const featureInfo = getFeatureInfo();
  const Icon = featureInfo.icon;

  return (
    <div className={`card p-6 ${featureInfo.bgColor} ${featureInfo.borderColor}`}>
      <div className="flex items-start space-x-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${featureInfo.bgColor}`}>
          <Lock className={`w-6 h-6 ${featureInfo.color}`} />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className={`text-lg font-semibold ${featureInfo.color}`}>
              {featureInfo.title} - Pro Feature
            </h3>
            <div className="flex items-center space-x-1 bg-yellow-500/10 text-yellow-400 px-2 py-1 rounded-full border border-yellow-500/20">
              <Crown className="w-3 h-3" />
              <span className="text-xs font-medium">Pro Only</span>
            </div>
          </div>
          <p className={`text-sm mb-4 ${featureInfo.color.replace('400', '300')}`}>
            {featureInfo.description}
          </p>
          <p className="text-slate-400 text-sm mb-4">
            {reason || 'This feature requires a Pro subscription to access.'}
          </p>
          
          <div className="card p-3 bg-yellow-500/10 border-yellow-500/20 mb-4">
            <div className="flex items-center space-x-2">
              <Crown className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-400 font-medium text-sm">UPGRADE TO PRO</span>
            </div>
            <p className="text-yellow-300 text-xs mt-1">
              $10/team/month or $150/club/month • Unlock all Pro features instantly
            </p>
          </div>
          
          {onUpgradeClick && (
            <button
              onClick={onUpgradeClick}
              className="btn-primary text-sm"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Upgrade to Pro
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
