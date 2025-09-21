import React, { useEffect } from 'react';
import { X, ArrowLeft, Trophy, Gift, Zap, Target, CheckCircle, Sparkles, Award, Calendar, ClipboardList, Crown, Shield } from 'lucide-react';

interface PointsRewardsInfoModalProps {
  onClose: () => void;
}

export default function PointsRewardsInfoModal({ onClose }: PointsRewardsInfoModalProps) {
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
          <h1 className="text-lg font-semibold text-slate-100">Points & Rewards System</h1>
          <p className="text-sm text-slate-400">How to earn and use your rewards</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 -mr-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-all duration-200 focus-ring touch-target"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 pb-32">
          <div className="space-y-6">
            <div className="card p-6 bg-gradient-to-br from-yellow-500/10 via-orange-500/5 to-slate-900/50 border-yellow-500/20">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center shrink-0">
                  <Target className="w-6 h-6 text-yellow-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-100 mb-3">How to Earn Points</h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                        <Trophy className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-emerald-400 font-medium text-sm">Complete Duties</p>
                        <p className="text-emerald-300 text-xs">
                          Earn exactly 10 points when you complete assigned duties for game events
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-emerald-400 font-bold">+10</span>
                        <p className="text-emerald-300 text-xs">per duty</p>
                      </div>
                    </div>
                    
                    <div className="card p-4 bg-yellow-500/5 border-yellow-500/10">
                      <div className="flex items-center space-x-2 mb-2">
                        <ClipboardList className="w-4 h-4 text-yellow-400" />
                        <span className="text-yellow-400 font-medium text-sm">Duty Completion Process</span>
                      </div>
                      <div className="space-y-2 text-yellow-300 text-xs">
                        <p>• Get assigned duties for game events by team admins</p>
                        <p>• Complete your assigned responsibilities on game day</p>
                        <p>• <strong>Points are awarded automatically when duties are completed</strong></p>
                        <p>• <strong>Duties complete 24 hours after event ends</strong></p>
                        <p>• Receive exactly 10 Ignite points immediately upon completion</p>
                        <p>• Points are awarded only once per completed duty</p>
                        <p>• No other actions in the app award points</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card p-6 bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-slate-900/50 border-purple-500/20">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center shrink-0">
                  <Gift className="w-6 h-6 text-purple-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-100 mb-3">Rewards System</h3>
                  <div className="space-y-4">
                    <div className="card p-4 bg-purple-500/5 border-purple-500/10">
                      <div className="flex items-center space-x-2 mb-2">
                        <Gift className="w-4 h-4 text-purple-400" />
                        <span className="text-purple-400 font-medium text-sm">Automatic Reward Minting</span>
                      </div>
                      <div className="text-purple-300 text-xs space-y-1">
                        <p>🎁 <strong>Rewards are minted automatically when you reach 20 points</strong></p>
                        <p>🍖 <strong>Each reward entitles you to one free sausage sizzle</strong></p>
                        <p>🏆 Rewards are automatically minted and linked to your account</p>
                        <p>🔔 Get notified instantly when you earn a reward</p>
                        <p>💎 Each reward is unique and permanently yours</p>
                        <p>🍖 Present your reward to claim your free sausage sizzle</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="card p-3 bg-emerald-500/10 border-emerald-500/20">
                        <div className="flex items-center space-x-2">
                          <Sparkles className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400 font-medium text-sm">Points Required</span>
                        </div>
                        <p className="text-emerald-300 text-xs mt-1">
                          Exactly 20 points needed for each reward
                        </p>
                      </div>
                      
                      <div className="card p-3 bg-blue-500/10 border-blue-500/20">
                        <div className="flex items-center space-x-2">
                          <Award className="w-4 h-4 text-blue-400" />
                          <span className="text-blue-400 font-medium text-sm">Reward Value</span>
                        </div>
                        <p className="text-blue-300 text-xs mt-1">
                          One free sausage sizzle per reward
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card p-6 bg-gradient-to-br from-emerald-500/10 via-green-500/5 to-slate-900/50 border-emerald-500/20">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center shrink-0">
                  <Sparkles className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-100 mb-3">Automatic Rewards System</h3>
                  <div className="space-y-4">
                    <div className="text-emerald-300 text-sm space-y-2">
                      <p>The rewards system operates completely automatically:</p>
                      <ul className="list-disc list-inside space-y-1 text-slate-400 ml-4">
                        <li><strong>Automatic Tracking:</strong> System monitors your duty completion automatically</li>
                        <li><strong>Point Calculation:</strong> Exactly 10 points awarded per completed duty</li>
                        <li><strong>Reward Minting:</strong> Unique reward automatically created when you reach 20 points</li>
                        <li><strong>Instant Notifications:</strong> Get notified immediately when reward is minted</li>
                        <li><strong>Permanent Ownership:</strong> Rewards are permanently linked to your account</li>
                        <li><strong>No Action Required:</strong> Everything happens automatically - no manual claiming needed</li>
                        <li><strong>Blockchain Security:</strong> All rewards stored securely on the Internet Computer</li>
                      </ul>
                    </div>

                    <div className="card p-4 bg-emerald-500/10 border-emerald-500/20">
                      <div className="flex items-center space-x-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400 font-medium text-sm">Complete Automation</span>
                      </div>
                      <p className="text-emerald-300 text-xs">
                        You don't need to do anything except complete your assigned duties. 
                        The system handles everything else automatically.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card p-6 bg-gradient-to-br from-orange-500/10 via-red-500/5 to-slate-900/50 border-orange-500/20">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center shrink-0">
                  <Award className="w-6 h-6 text-orange-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-100 mb-3">Using Your Rewards</h3>
                  <div className="space-y-4">
                    <div className="text-orange-300 text-sm space-y-2">
                      <p>Each reward you earn can be redeemed for:</p>
                      <ul className="list-disc list-inside space-y-1 text-slate-400 ml-4">
                        <li><strong>Free Sausage Sizzle:</strong> One reward = one free sausage sizzle</li>
                        <li><strong>Present at Events:</strong> Show your reward at club events to claim</li>
                        <li><strong>Permanent Validity:</strong> Rewards never expire and remain in your collection</li>
                        <li><strong>Unique Identification:</strong> Each reward has a unique ID for verification</li>
                        <li><strong>Digital Proof:</strong> Stored securely on blockchain for authenticity</li>
                        <li><strong>Multiple Rewards:</strong> Earn unlimited rewards by completing more duties</li>
                      </ul>
                    </div>

                    <div className="card p-4 bg-orange-500/10 border-orange-500/20">
                      <div className="flex items-center space-x-2 mb-2">
                        <Calendar className="w-4 h-4 text-orange-400" />
                        <span className="text-orange-400 font-medium text-sm">Redemption Process</span>
                      </div>
                      <p className="text-orange-300 text-xs">
                        Present your reward from your profile collection at any club event to claim your free sausage sizzle. 
                        Event organizers can verify the reward's authenticity using the unique ID.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card p-6 bg-blue-500/10 border-blue-500/20">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center shrink-0">
                  <Crown className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-100 mb-2">Pro Feature Access</h4>
                  <div className="text-slate-300 text-sm space-y-2">
                    <p>Points and rewards are Pro features available to:</p>
                    <ul className="list-disc list-inside space-y-1 text-slate-400 ml-4">
                      <li><strong>Pro Club Members:</strong> All members of clubs with Pro subscription</li>
                      <li><strong>App Administrators:</strong> Unrestricted access to all features</li>
                      <li><strong>Club Upgrade:</strong> Club admins can upgrade their entire club to Pro</li>
                      <li><strong>Immediate Access:</strong> All club members get Pro features instantly upon upgrade</li>
                      <li><strong>Club-Wide Benefits:</strong> Pro status applies to all current and future club members</li>
                    </ul>
                    <p className="mt-3 text-blue-300">
                      Contact your club admin to request a Pro upgrade if you want access to points and rewards.
                    </p>
                  </div>
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
          Back to Profile
        </button>
      </div>
    </div>
  );
}
