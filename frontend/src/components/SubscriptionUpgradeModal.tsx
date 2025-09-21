import React, { useState, useEffect } from 'react';
import { X, Crown, Check, CreditCard, ArrowLeft, AlertCircle, CheckCircle, Zap, Users, Calendar, Camera, Shield, MessageCircle, ClipboardList, FileText, TrendingUp, Lock, Unlock, Gift, Sparkles, Tag } from 'lucide-react';
import { useCreateCheckoutSession } from '../hooks/useStripe';
import { useUpgradeClubToProPlan, useIsClubAdmin } from '../hooks/useSubscriptions';
import { useGetUserClubs } from '../hooks/useClubs';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useIsCurrentUserAdmin } from '../hooks/useUsers';
import { ShoppingItem } from '../backend';

interface SubscriptionUpgradeModalProps {
  organizationType: 'club' | 'team';
  organizationId: string;
  organizationName: string;
  onClose: () => void;
}

export default function SubscriptionUpgradeModal({ 
  organizationType,
  organizationId, 
  organizationName, 
  onClose 
}: SubscriptionUpgradeModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [discountApplied, setDiscountApplied] = useState(false);
  const [discountError, setDiscountError] = useState<string>('');
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);
  
  const { mutate: createCheckoutSession, isPending, error } = useCreateCheckoutSession();
  const { mutate: upgradeClubToProPlan, isPending: isUpgrading } = useUpgradeClubToProPlan();
  const { data: isClubAdmin } = useIsClubAdmin();
  const { data: userClubs } = useGetUserClubs();
  const { data: isAppAdmin } = useIsCurrentUserAdmin();
  const { identity } = useInternetIdentity();

  const currentUserPrincipal = identity?.getPrincipal().toString();
  
  // Find the club for this upgrade (could be from organizationId or need to find parent club)
  let targetClubId = organizationId;
  let targetClubName = organizationName;
  
  if (organizationType === 'team') {
    // For team-level requests, we need to find the parent club
    // This is a simplified approach - in a real app you'd get this from the team data
    const club = userClubs?.find(c => c.creator.toString() === currentUserPrincipal);
    if (club) {
      targetClubId = club.id.toString();
      targetClubName = club.name;
    }
  } else {
    // For club-level requests, use the provided organizationId
    const club = userClubs?.find(c => c.id.toString() === organizationId);
    if (club) {
      targetClubName = club.name;
    }
  }
  
  const club = userClubs?.find(c => c.id.toString() === targetClubId);
  const isUserClubAdmin = club && club.creator.toString() === currentUserPrincipal;

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

  const clubPlan = {
    name: 'Pro Club',
    price: 150.00,
    period: 'per club/month',
    description: 'Unlock Pro features for all club members',
    features: [
      'All Free features for entire club',
      'Club-level messaging and announcements',
      'Unlimited announcements for all members',
      'Duty assignments and swap requests',
      'Full chat (threads, attachments, reactions)',
      'File & photo storage for all members',
      'Team social feed for all teams',
      'Attendance & duty reporting',
      'Match day post generation',
      'Vault access for all club members',
      'Blockchain data security',
    ],
    priceInCents: 15000, // $150.00
  };

  const validateDiscountCode = (code: string): boolean => {
    return code.trim().toUpperCase() === 'IGNITE4FREE';
  };

  const handleDiscountCodeApply = () => {
    setDiscountError('');
    
    if (!discountCode.trim()) {
      setDiscountError('Please enter a discount code');
      return;
    }

    if (validateDiscountCode(discountCode)) {
      setDiscountApplied(true);
      setDiscountError('');
      setShowDiscountInput(false);
    } else {
      setDiscountError('Invalid discount code. Please check and try again.');
    }
  };

  const handleFreeUpgrade = () => {
    setIsProcessing(true);
    
    upgradeClubToProPlan({
      clubId: targetClubId,
      discountCode: discountCode.trim()
    }, {
      onSuccess: () => {
        setUpgradeSuccess(true);
        setIsProcessing(false);
        
        // Show success message for a few seconds then close
        setTimeout(() => {
          onClose();
        }, 3000);
      },
      onError: (error) => {
        console.error('Free club upgrade failed:', error);
        setIsProcessing(false);
        setDiscountError(error instanceof Error ? error.message : 'Failed to process free upgrade');
      }
    });
  };

  const handlePaidUpgrade = async () => {
    setIsProcessing(true);
    
    const shoppingItems: ShoppingItem[] = [
      {
        productName: clubPlan.name,
        productDescription: `${clubPlan.description} for ${targetClubName}`,
        priceInCents: BigInt(clubPlan.priceInCents),
        quantity: BigInt(1),
        currency: 'USD',
      },
    ];

    createCheckoutSession(shoppingItems, {
      onSuccess: (session) => {
        // Redirect to Stripe checkout
        window.location.href = session.url;
      },
      onError: (error) => {
        console.error('Failed to create checkout session:', error);
        setIsProcessing(false);
      },
    });
  };

  const handleUpgrade = () => {
    if (discountApplied) {
      handleFreeUpgrade();
    } else {
      handlePaidUpgrade();
    }
  };

  const getEffectivePrice = () => {
    if (discountApplied) return 0;
    return clubPlan.price;
  };

  const getEffectivePeriod = () => {
    if (discountApplied) return 'Free Forever';
    return clubPlan.period;
  };

  // If user is not a club admin and not app admin, show access denied
  if (!isUserClubAdmin && !isAppAdmin) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-800/50 bg-slate-900/95 backdrop-blur-sm sticky top-0 z-10">
          <button
            onClick={onClose}
            className="p-2 -ml-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-semibold text-slate-100">Upgrade to Pro</h1>
            <p className="text-sm text-slate-400">{organizationName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="card p-8 text-center max-w-md">
            <div className="w-20 h-20 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Lock className="w-10 h-10 text-red-400" />
            </div>
            <h3 className="text-2xl font-semibold text-slate-100 mb-4">Club Admin Access Required</h3>
            <p className="text-slate-400 leading-relaxed mb-6">
              Only club administrators can upgrade their club to Pro status. Pro upgrades are managed exclusively at the club level and affect all club members.
            </p>
            
            <div className="card p-4 bg-red-500/10 border-red-500/20 mb-6">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center shrink-0">
                  <Crown className="w-4 h-4 text-red-400" />
                </div>
                <div className="text-left">
                  <p className="text-red-400 font-medium text-sm">Club-Level Pro Access Only</p>
                  <div className="text-red-300 text-xs mt-1 space-y-1">
                    <p>• Only club admins can upgrade clubs to Pro</p>
                    <p>• Pro status applies to all club members automatically</p>
                    <p>• All club members get Pro features instantly</p>
                    <p>• No individual or team-level upgrades available</p>
                    <p>• Individual upgrades have been removed</p>
                    <p>• Contact your club admin to request an upgrade</p>
                  </div>
                </div>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="btn-primary-mobile"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-slate-800/50 bg-slate-900/95 backdrop-blur-sm sticky top-0 z-10">
        <button
          onClick={onClose}
          className="p-2 -ml-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
          disabled={isPending || isProcessing || isUpgrading}
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-semibold text-slate-100">Upgrade Club to Pro</h1>
          <p className="text-sm text-slate-400">{targetClubName}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 -mr-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
          disabled={isPending || isProcessing || isUpgrading}
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Success Message */}
      {upgradeSuccess && (
        <div className="mx-4 mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <div className="flex items-start space-x-3">
            <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
            <div className="flex-1">
              <p className="text-emerald-400 font-medium text-sm mb-2">🎉 Club Upgraded Successfully!</p>
              <p className="text-emerald-400 text-sm leading-relaxed">
                Congratulations! {targetClubName} has been upgraded to Pro status. All club members now have access to Pro features including the Media tab, club messaging, and advanced functionality.
              </p>
              <p className="text-emerald-300 text-xs mt-2">
                Closing automatically... Pro features are now active for all club members!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <div className="flex-1">
            <p className="text-red-400 text-sm font-medium">
              {error instanceof Error ? error.message : 'Failed to process club upgrade'}
            </p>
          </div>
        </div>
      )}

      {/* Processing Message */}
      {(isProcessing || isUpgrading) && (
        <div className="mx-4 mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex items-start space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-400 border-t-transparent shrink-0" />
            <div className="flex-1">
              <p className="text-blue-400 font-medium text-sm mb-2">
                {discountApplied ? 'Processing Free Club Upgrade...' : 'Processing Payment...'}
              </p>
              <p className="text-blue-400 text-sm leading-relaxed">
                {discountApplied 
                  ? 'Activating Pro features for all club members. Media tab and all Pro features will unlock immediately for everyone in the club.'
                  : 'Redirecting to secure payment processing. Please wait...'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 pb-32">
          {/* Club Admin Notice */}
          <div className="card p-4 bg-emerald-500/10 border-emerald-500/20 mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <Crown className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-slate-200 font-medium">Club Admin Upgrade Authority</p>
                <p className="text-slate-400 text-sm">
                  You're upgrading the entire club to Pro status. All club members will receive Pro features automatically.
                </p>
              </div>
            </div>
          </div>

          {/* Club-Level Only Notice */}
          <div className="card p-4 bg-blue-500/10 border-blue-500/20 mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-slate-200 font-medium">Club-Level Pro Access Only</p>
                <p className="text-slate-400 text-sm">
                  Pro features are managed exclusively at the club level. Individual team upgrades are not available. 
                  When you upgrade your club, all teams and members get Pro access automatically.
                </p>
              </div>
            </div>
          </div>

          {/* Discount Code Section */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100">Club Pro Upgrade</h2>
              {!discountApplied && (
                <button
                  onClick={() => setShowDiscountInput(!showDiscountInput)}
                  className="text-emerald-400 hover:text-emerald-300 text-sm font-medium flex items-center space-x-1"
                >
                  <Tag className="w-4 h-4" />
                  <span>Have a discount code?</span>
                </button>
              )}
            </div>

            {/* Discount Code Applied Success */}
            {discountApplied && (
              <div className="card p-6 bg-gradient-to-br from-emerald-500/10 via-green-500/5 to-slate-900/50 border-emerald-500/20">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center shrink-0">
                    <Gift className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-100 mb-2 flex items-center">
                      🎁 Discount Code Applied Successfully!
                    </h3>
                    <p className="text-emerald-300 text-sm mb-4">
                      Congratulations! You've applied a valid discount code. Your club Pro upgrade is now completely free!
                    </p>
                    
                    <div className="card p-4 bg-emerald-500/10 border-emerald-500/20 mb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Sparkles className="w-5 h-5 text-emerald-400" />
                          <div>
                            <p className="text-emerald-400 font-medium">Free Club Pro Upgrade</p>
                            <p className="text-emerald-300 text-sm">All Pro features unlocked for entire club at no cost</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold line-through text-slate-500">
                            ${clubPlan.price}
                          </p>
                          <p className="text-xl font-bold text-emerald-400">FREE</p>
                          <p className="text-emerald-300 text-sm">Forever</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="card p-3 bg-green-500/10 border-green-500/20">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-green-400 font-medium text-sm">Valid Discount Code Applied</span>
                      </div>
                      <p className="text-green-300 text-xs mt-1">
                        100% discount applied - no payment required for club Pro features
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Discount Code Input */}
            {showDiscountInput && !discountApplied && (
              <div className="card p-6 bg-purple-500/10 border-purple-500/20">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center shrink-0">
                    <Tag className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-100 mb-3">Enter Discount Code</h3>
                    
                    <div className="space-y-4">
                      <div className="flex space-x-3">
                        <input
                          type="text"
                          value={discountCode}
                          onChange={(e) => {
                            setDiscountCode(e.target.value);
                            setDiscountError('');
                          }}
                          placeholder="Enter your discount code"
                          className={`input-mobile flex-1 ${discountError ? 'input-error' : ''}`}
                          disabled={isProcessing || isUpgrading}
                          autoFocus
                        />
                        <button
                          onClick={handleDiscountCodeApply}
                          disabled={!discountCode.trim() || isProcessing || isUpgrading}
                          className="btn-primary text-sm px-6"
                        >
                          Apply
                        </button>
                      </div>
                      
                      {discountError && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center space-x-2">
                          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                          <p className="text-red-400 text-sm">{discountError}</p>
                        </div>
                      )}
                      
                      <div className="card p-3 bg-emerald-500/10 border-emerald-500/20">
                        <div className="flex items-center space-x-2">
                          <Gift className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400 font-medium text-sm">Discount Available</span>
                        </div>
                        <p className="text-emerald-300 text-xs mt-1">
                          Enter a valid discount code to upgrade your club to Pro at no cost with all features unlocked
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Club Pro Plan */}
          <div className="space-y-4 mb-6">
            <h2 className="text-lg font-semibold text-slate-100">
              {discountApplied ? 'Your Free Club Pro Plan' : 'Club Pro Plan'}
            </h2>
            
            <div className="card p-6 bg-emerald-500/10 border-emerald-500/30 ring-2 ring-emerald-500/20">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-200 flex items-center">
                    {clubPlan.name}
                    <Crown className="w-5 h-5 text-emerald-500 ml-2" />
                  </h3>
                  <p className="text-slate-400 text-sm">{clubPlan.description}</p>
                </div>
                <div className="text-right">
                  {discountApplied ? (
                    <div>
                      <p className="text-lg font-bold text-slate-500 line-through">${clubPlan.price}</p>
                      <p className="text-2xl font-bold text-emerald-400">FREE</p>
                      <p className="text-emerald-300 text-sm">Forever</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-2xl font-bold text-emerald-400">${clubPlan.price}</p>
                      <p className="text-slate-400 text-sm">{clubPlan.period}</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-2 mb-4">
                {clubPlan.features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span className="text-slate-200 text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="card p-3 bg-emerald-500/10 border-emerald-500/20">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 text-sm font-medium">Club-Wide Pro Access</span>
                </div>
                <p className="text-emerald-300 text-xs mt-1">
                  All members of {targetClubName} will receive Pro features instantly
                </p>
              </div>

              {discountApplied && (
                <div className="mt-3 card p-3 bg-gradient-to-r from-emerald-500/10 to-green-500/10 border-emerald-500/20">
                  <div className="flex items-center space-x-2">
                    <Gift className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 font-medium text-sm">FREE WITH DISCOUNT CODE</span>
                  </div>
                  <p className="text-emerald-300 text-xs mt-1">
                    All Pro features unlocked permanently for entire club at no cost
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Club-Wide Feature Unlock Notice */}
          {discountApplied && (
            <div className="card p-6 bg-gradient-to-br from-purple-500/10 via-blue-500/5 to-slate-900/50 border-purple-500/20 mb-6">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center shrink-0">
                  <Unlock className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-100 mb-2 flex items-center">
                    🚀 Immediate Club-Wide Pro Feature Unlock
                  </h3>
                  <p className="text-purple-300 text-sm mb-4">
                    When you complete the upgrade, all Pro features will be unlocked immediately for every member of {targetClubName}:
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="card p-3 bg-purple-500/10 border-purple-500/20">
                      <div className="flex items-center space-x-2">
                        <Camera className="w-4 h-4 text-purple-400" />
                        <span className="text-purple-400 font-medium text-sm">Media Tab</span>
                      </div>
                      <p className="text-purple-300 text-xs mt-1">
                        Photo & file storage unlocked for all members
                      </p>
                    </div>
                    
                    <div className="card p-3 bg-blue-500/10 border-blue-500/20">
                      <div className="flex items-center space-x-2">
                        <MessageCircle className="w-4 h-4 text-blue-400" />
                        <span className="text-blue-400 font-medium text-sm">Club Chat</span>
                      </div>
                      <p className="text-blue-300 text-xs mt-1">
                        Advanced messaging available instantly
                      </p>
                    </div>
                  </div>
                  
                  <div className="card p-3 bg-emerald-500/10 border-emerald-500/20">
                    <div className="flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400 font-medium text-sm">REAL-TIME UI UPDATES FOR ALL MEMBERS</span>
                    </div>
                    <p className="text-emerald-300 text-xs mt-1">
                      All Pro feature locks and upgrade prompts will disappear immediately for all club members after upgrade completion
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Club Admin Authority Notice */}
          <div className="card p-6 bg-blue-500/10 border-blue-500/20 mb-6">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center shrink-0">
                <Crown className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h4 className="font-medium text-slate-100 mb-2">Exclusive Club Admin Authority</h4>
                <div className="text-slate-300 text-sm space-y-2">
                  <p>As a club administrator, you have exclusive authority to:</p>
                  <ul className="list-disc list-inside space-y-1 text-slate-400 ml-4">
                    <li><strong>Upgrade Entire Club:</strong> Pro status applies to all current and future club members</li>
                    <li><strong>Immediate Access:</strong> All club members get Pro features instantly upon upgrade</li>
                    <li><strong>No Individual Upgrades:</strong> Pro access is managed exclusively at the club level</li>
                    <li><strong>No Team Upgrades:</strong> Individual team upgrades have been removed</li>
                    <li><strong>Cancel Anytime:</strong> You can cancel the club's Pro subscription at any time</li>
                    <li><strong>Member Benefits:</strong> All team members automatically become Pro users</li>
                    <li><strong>Feature Control:</strong> Manage Pro features for the entire club organization</li>
                    <li><strong>Exclusive Access:</strong> Only club admins can perform upgrades</li>
                  </ul>
                  <p className="mt-3 text-blue-300">
                    {discountApplied 
                      ? 'Your club upgrade will be processed for free with immediate feature unlock for all members.'
                      : 'Upgrade your club to Pro to unlock advanced features for all members instantly.'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Club-Based Pro Features */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-slate-100">Club Pro Features</h3>
            
            <div className="card p-6 bg-emerald-500/10 border-emerald-500/30">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                    <Unlock className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-slate-200">Pro Club Features</h4>
                    <p className="text-slate-400 text-sm">
                      {discountApplied ? 'Free for all club members' : 'Unlock for all club members'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-emerald-400">
                    {discountApplied ? 'FREE' : `$${getEffectivePrice()}`}
                  </p>
                  <p className="text-slate-400 text-sm">{getEffectivePeriod()}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h5 className="text-emerald-300 font-medium text-sm">✅ All Free Features</h5>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span className="text-emerald-300 text-xs">Unlimited teams & events</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span className="text-emerald-300 text-xs">Basic team chat</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span className="text-emerald-300 text-xs">Team announcements</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span className="text-emerald-300 text-xs">Player availability & RSVPs</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span className="text-emerald-300 text-xs">Season calendar view</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h5 className="text-emerald-300 font-medium text-sm">🚀 Plus Pro Features</h5>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span className="text-emerald-300 text-xs">Club-level messaging</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span className="text-emerald-300 text-xs">Club announcements</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span className="text-emerald-300 text-xs">Duty assignments & swaps</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span className="text-emerald-300 text-xs">File & photo storage</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span className="text-emerald-300 text-xs">Match day post generation</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Club-Wide Benefits */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-100">Club-Wide Benefits</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="card p-4 bg-gradient-to-br from-blue-500/10 to-slate-900/50 border-blue-500/20">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-slate-200 font-medium">All Members</p>
                      <p className="text-slate-400 text-sm">Get Pro Access</p>
                    </div>
                  </div>
                </div>

                <div className="card p-4 bg-gradient-to-br from-emerald-500/10 to-slate-900/50 border-emerald-500/20">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                      <Zap className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-slate-200 font-medium">Instant Unlock</p>
                      <p className="text-slate-400 text-sm">Immediate Access</p>
                    </div>
                  </div>
                </div>

                <div className="card p-4 bg-gradient-to-br from-purple-500/10 to-slate-900/50 border-purple-500/20">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <Camera className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-slate-200 font-medium">Media Access</p>
                      <p className="text-slate-400 text-sm">Photos & Files</p>
                    </div>
                  </div>
                </div>

                <div className="card p-4 bg-gradient-to-br from-orange-500/10 to-slate-900/50 border-orange-500/20">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-orange-400" />
                    </div>
                    <div>
                      <p className="text-slate-200 font-medium">Club Chat</p>
                      <p className="text-slate-400 text-sm">Advanced Features</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Discount Code Information */}
            <div className="card p-6 bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-slate-900/50 border-purple-500/20">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center shrink-0">
                  <Gift className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-100 mb-2">Free Club Pro Upgrade Available</h4>
                  <div className="text-slate-300 text-sm space-y-2">
                    <p>Special offer for club administrators:</p>
                    <ul className="list-disc list-inside space-y-1 text-slate-400 ml-4">
                      <li><strong>Discount Code:</strong> Use a valid discount code to unlock Pro features for your entire club at no cost</li>
                      <li><strong>Permanent Access:</strong> Free Pro features forever for all club members, not a trial</li>
                      <li><strong>All Features:</strong> Complete Pro functionality for every member of your club</li>
                      <li><strong>No Payment:</strong> No credit card required when using a valid discount code</li>
                      <li><strong>Immediate Activation:</strong> Pro features are unlocked instantly for all club members</li>
                      <li><strong>Real-Time Updates:</strong> Media tab and all Pro features unlock immediately for everyone</li>
                      <li><strong>Club Authority:</strong> Only club admins can apply discount codes and upgrade clubs</li>
                    </ul>
                    <p className="mt-3 text-purple-300">
                      {discountApplied 
                        ? 'Discount code successfully applied! Your club upgrade will be processed for free with immediate feature unlock for all members.'
                        : 'Enter a valid discount code above to upgrade your club to Pro at no cost with instant feature access for all members.'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Security Notice */}
            {!discountApplied && (
              <div className="card p-4 bg-green-500/10 border-green-500/20">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-slate-200 font-medium">Secure Payment Processing</p>
                    <p className="text-slate-400 text-sm">
                      Payments are processed securely through Stripe. Your billing information is encrypted and protected. Cancel anytime with no penalties.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Blockchain Security Notice */}
            <div className="card p-4 bg-purple-500/10 border-purple-500/20">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-slate-200 font-medium">Blockchain Data Security</p>
                  <p className="text-slate-400 text-sm">
                    All plans include blockchain-based data security on the Internet Computer. Your club's data is decentralized, tamper-proof, and always available.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800/50 p-4 bg-slate-900/95 backdrop-blur-sm sticky bottom-0 z-10">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary-mobile"
            disabled={isPending || isProcessing || isUpgrading}
          >
            Cancel
          </button>
          <button
            onClick={handleUpgrade}
            disabled={isPending || isProcessing || isUpgrading}
            className={`btn-primary-mobile ${(isPending || isProcessing || isUpgrading) ? 'btn-loading' : ''}`}
          >
            {(isPending || isProcessing || isUpgrading) ? (
              discountApplied ? 'Activating Club Pro...' : 'Processing...'
            ) : discountApplied ? (
              <>
                <Gift className="w-5 h-5 mr-2" />
                Activate Club Pro - FREE
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5 mr-2" />
                Upgrade Club to Pro - ${getEffectivePrice()}/month
              </>
            )}
          </button>
        </div>
        
        {/* Discount Code Prompt */}
        {!discountApplied && !showDiscountInput && (
          <div className="text-center mt-3">
            <button
              onClick={() => setShowDiscountInput(true)}
              className="text-purple-400 hover:text-purple-300 text-sm font-medium flex items-center space-x-1 mx-auto"
            >
              <Tag className="w-3 h-3" />
              <span>Have a discount code? Click here</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
