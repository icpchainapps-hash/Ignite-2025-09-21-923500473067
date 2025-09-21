import React, { useState } from 'react';
import { Shield, Users, Building, Trophy, DollarSign, Activity, Settings, Eye, EyeOff, Save, AlertCircle, CheckCircle, TrendingUp, Calendar, UserCheck, CreditCard, Crown, Lock, Unlock } from 'lucide-react';
import { useGetAdminStatistics, useIsStripeConfigured, useSetStripeConfiguration } from '../../hooks/useAdmin';
import { StripeConfiguration } from '../../backend';
import { formatCurrency, formatNumber } from '../../utils/formatters';

export default function AdminPage() {
  const [showStripeConfig, setShowStripeConfig] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [stripeForm, setStripeForm] = useState<StripeConfiguration>({
    secretKey: '',
    allowedCountries: ['US'],
  });
  const [newCountry, setNewCountry] = useState('');

  const { data: statistics, isLoading: statsLoading, error: statsError } = useGetAdminStatistics();
  const { data: isStripeConfigured } = useIsStripeConfigured();
  const { mutate: setStripeConfig, isPending: isSaving, error: saveError } = useSetStripeConfiguration();

  const handleSaveStripeConfig = () => {
    if (!stripeForm.secretKey.trim()) {
      return;
    }

    setStripeConfig(stripeForm, {
      onSuccess: () => {
        setShowStripeConfig(false);
      },
    });
  };

  const addCountry = () => {
    if (newCountry.trim() && !stripeForm.allowedCountries.includes(newCountry.trim().toUpperCase())) {
      setStripeForm(prev => ({
        ...prev,
        allowedCountries: [...prev.allowedCountries, newCountry.trim().toUpperCase()],
      }));
      setNewCountry('');
    }
  };

  const removeCountry = (country: string) => {
    setStripeForm(prev => ({
      ...prev,
      allowedCountries: prev.allowedCountries.filter(c => c !== country),
    }));
  };

  if (statsError) {
    return (
      <div className="p-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white flex items-center">
            <Shield className="w-7 h-7 text-emerald-400 mr-3" />
            Admin Dashboard
          </h1>
        </div>

        <div className="card p-6 bg-red-500/10 border-red-500/20">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <div>
              <h3 className="text-red-400 font-medium">Error Loading Dashboard</h3>
              <p className="text-red-300 text-sm mt-1">
                {statsError instanceof Error ? statsError.message : 'Failed to load admin statistics'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const plans = {
    free: {
      name: 'Free – Core',
      features: [
        'Unlimited teams & events',
        'Basic team chat (1 thread, no media)',
        'Basic text announcements',
        'Player availability & RSVPs',
        'Season calendar view (in-app only)',
        'Blockchain data security',
      ],
      limitations: [
        'No duty assignment/swaps',
        'No file & photo storage',
        'No team social feed',
        'No attendance & duty reporting',
        'Limited chat functionality',
      ],
    },
    pro_team: {
      name: 'Pro (Single Team)',
      price: 10.00,
      period: 'per team/month',
      description: 'Perfect for individual teams or small clubs',
      priceInCents: 1000,
    },
    pro_club: {
      name: 'Pro (Multi-Team Club)',
      price: 150.00,
      period: 'per club/month',
      description: 'Ideal for clubs with multiple teams',
      popular: true,
      priceInCents: 15000,
    },
  };

  const proFeatures = [
    'All Free – Core features',
    'Unlimited announcements',
    'Duty assignments and swap requests',
    'Full chat (threads, attachments, reactions)',
    'File & photo storage',
    'Team social feed (posts, comments, likes)',
    'Attendance & duty reporting',
    'Blockchain data security',
  ];

  return (
    <div className="p-4 space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center">
          <Shield className="w-7 h-7 text-emerald-400 mr-3" />
          Admin Dashboard
        </h1>
        <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-sm font-medium">
          App Admin
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Application Statistics</h2>
        
        {statsLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card p-4 animate-pulse">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-slate-700 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-slate-700 rounded w-1/2 mb-2"></div>
                    <div className="h-6 bg-slate-700 rounded w-1/3"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : statistics ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="card p-4 bg-gradient-to-br from-blue-500/10 to-slate-900/50 border-blue-500/20">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-blue-400 text-sm font-medium">Total Users</p>
                    <p className="text-2xl font-bold text-white">{formatNumber(statistics.totalUsers)}</p>
                  </div>
                </div>
              </div>

              <div className="card p-4 bg-gradient-to-br from-emerald-500/10 to-slate-900/50 border-emerald-500/20">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                    <Building className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-emerald-400 text-sm font-medium">Total Clubs</p>
                    <p className="text-2xl font-bold text-white">{formatNumber(statistics.totalClubs)}</p>
                  </div>
                </div>
              </div>

              <div className="card p-4 bg-gradient-to-br from-purple-500/10 to-slate-900/50 border-purple-500/20">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-purple-400 text-sm font-medium">Total Teams</p>
                    <p className="text-2xl font-bold text-white">{formatNumber(statistics.totalTeams)}</p>
                  </div>
                </div>
              </div>

              <div className="card p-4 bg-gradient-to-br from-yellow-500/10 to-slate-900/50 border-yellow-500/20">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-yellow-400 text-sm font-medium">Revenue</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(statistics.totalFeesCollected)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card p-6 bg-gradient-to-br from-orange-500/10 to-slate-900/50 border-orange-500/20">
              <div className="flex items-center mb-4">
                <Activity className="w-5 h-5 text-orange-400 mr-2" />
                <h3 className="text-lg font-semibold text-orange-400">User Activity</h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <TrendingUp className="w-4 h-4 text-orange-400 mr-1" />
                  </div>
                  <p className="text-2xl font-bold text-white">{formatNumber(statistics.loginStatistics.totalLogins)}</p>
                  <p className="text-orange-400 text-sm">Total Logins</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <UserCheck className="w-4 h-4 text-orange-400 mr-1" />
                  </div>
                  <p className="text-2xl font-bold text-white">{formatNumber(statistics.loginStatistics.activeUsers)}</p>
                  <p className="text-orange-400 text-sm">Active Users</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Calendar className="w-4 h-4 text-orange-400 mr-1" />
                  </div>
                  <p className="text-2xl font-bold text-white">{formatNumber(statistics.loginStatistics.newUsersThisMonth)}</p>
                  <p className="text-orange-400 text-sm">New This Month</p>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>

      <div className="h-px bg-slate-800"></div>

      {/* Subscription Plans Overview */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center">
          <CreditCard className="w-5 h-5 text-slate-400 mr-2" />
          Subscription Plans Overview
        </h2>

        <div className="grid grid-cols-1 gap-4">
          {/* Free Plan */}
          <div className="card p-6 bg-slate-800/30 border-slate-700/50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-slate-600/20 rounded-lg flex items-center justify-center">
                  <Lock className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-200">Free – Core</h3>
                  <p className="text-slate-400 text-sm">Essential features for getting started</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-slate-200">$0</p>
                <p className="text-slate-400 text-sm">Forever</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h5 className="text-slate-300 font-medium text-sm">✅ Included</h5>
                <div className="space-y-1">
                  {plans.free.features.map((feature, index) => (
                    <p key={index} className="text-slate-300 text-xs">• {feature}</p>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <h5 className="text-slate-400 font-medium text-sm">❌ Not Included</h5>
                <div className="space-y-1">
                  {plans.free.limitations.map((limitation, index) => (
                    <p key={index} className="text-slate-400 text-xs">• {limitation}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Pro Plan */}
          <div className="card p-6 bg-emerald-500/10 border-emerald-500/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                  <Unlock className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-200">Pro Plan</h3>
                  <p className="text-slate-400 text-sm">All features unlocked</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-emerald-400">$150</p>
                <p className="text-slate-400 text-sm">per club/month</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="card p-4 bg-emerald-500/5 border-emerald-500/10">
                <h5 className="text-emerald-300 font-medium text-sm mb-2">✅ All Free Features Plus:</h5>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    {proFeatures.slice(0, Math.ceil(proFeatures.length / 2)).map((feature, index) => (
                      <p key={index} className="text-emerald-300 text-xs">• {feature}</p>
                    ))}
                  </div>
                  <div className="space-y-1">
                    {proFeatures.slice(Math.ceil(proFeatures.length / 2)).map((feature, index) => (
                      <p key={index} className="text-emerald-300 text-xs">• {feature}</p>
                    ))}
                  </div>
                </div>
              </div>

              <div className="card p-4 bg-yellow-500/10 border-yellow-500/20">
                <div className="flex items-center space-x-2 mb-2">
                  <Crown className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-400 font-medium text-sm">Club Plan</span>
                </div>
                <p className="text-2xl font-bold text-yellow-400">$150</p>
                <p className="text-yellow-300 text-xs">per club/month</p>
                <p className="text-slate-400 text-xs mt-1">Ideal for multi-team clubs</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="h-px bg-slate-800"></div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center">
            <Settings className="w-5 h-5 text-slate-400 mr-2" />
            Payment Configuration
          </h2>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            isStripeConfigured 
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
              : "bg-red-500/10 text-red-400 border border-red-500/20"
          }`}>
            {isStripeConfigured ? 'Configured' : 'Not Configured'}
          </div>
        </div>

        <div className="card">
          <div className="p-6 border-b border-slate-800/50">
            <div className="flex items-center justify-between">
              <h3 className="text-slate-200 font-semibold">Stripe Payment Settings</h3>
              <button
                onClick={() => setShowStripeConfig(!showStripeConfig)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-600 hover:border-slate-500 py-2 px-4 rounded-lg text-sm transition-colors"
              >
                {showStripeConfig ? 'Hide' : 'Configure'}
              </button>
            </div>
          </div>
          
          {showStripeConfig && (
            <div className="p-6 space-y-4">
              {saveError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <p className="text-red-400 text-sm">
                    {saveError instanceof Error ? saveError.message : 'Failed to save Stripe configuration'}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-300">
                  Stripe Secret Key *
                </label>
                <div className="relative">
                  <input
                    type={showSecretKey ? "text" : "password"}
                    value={stripeForm.secretKey}
                    onChange={(e) => setStripeForm(prev => ({ ...prev, secretKey: e.target.value }))}
                    placeholder="sk_test_..."
                    className="input-mobile pr-12"
                    disabled={isSaving}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecretKey(!showSecretKey)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showSecretKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-300">Allowed Countries</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {stripeForm.allowedCountries.map((country) => (
                    <button
                      key={country}
                      onClick={() => removeCountry(country)}
                      className="bg-slate-700 text-slate-200 hover:bg-slate-600 px-3 py-1 rounded-full text-sm transition-colors"
                    >
                      {country} ×
                    </button>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <input
                    value={newCountry}
                    onChange={(e) => setNewCountry(e.target.value.toUpperCase())}
                    placeholder="US, CA, GB..."
                    className="input-mobile flex-1"
                    maxLength={2}
                    disabled={isSaving}
                  />
                  <button
                    type="button"
                    onClick={addCountry}
                    disabled={!newCountry.trim() || isSaving}
                    className="btn-secondary px-6"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleSaveStripeConfig}
                  disabled={!stripeForm.secretKey.trim() || isSaving}
                  className={`btn-primary ${isSaving ? 'btn-loading' : ''}`}
                >
                  {isSaving ? 'Saving...' : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Configuration
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowStripeConfig(false)}
                  disabled={isSaving}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {!showStripeConfig && isStripeConfigured && (
            <div className="p-6">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <div>
                  <p className="text-slate-200 font-medium">Stripe is configured and ready</p>
                  <p className="text-slate-400 text-sm">
                    Payment processing is enabled for Pro plan subscriptions ($150/club)
                  </p>
                </div>
              </div>
            </div>
          )}

          {!showStripeConfig && !isStripeConfigured && (
            <div className="p-6">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-orange-400" />
                <div>
                  <p className="text-slate-200 font-medium">Stripe configuration required</p>
                  <p className="text-slate-400 text-sm">
                    Configure Stripe to enable Pro plan subscriptions for clubs
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
