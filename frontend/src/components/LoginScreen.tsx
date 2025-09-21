import React from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Users, Zap, Calendar, MessageCircle, Camera } from 'lucide-react';

export default function LoginScreen() {
  const { login, isLoggingIn } = useInternetIdentity();

  return (
    <div className="min-h-screen gradient-bg flex flex-col items-center justify-center px-6">
      <div className="text-center mb-12 max-w-md">
        <div className="flex items-center justify-center mb-8">
          <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-4 rounded-2xl shadow-2xl">
            <Zap className="w-12 h-12 text-white" />
          </div>
        </div>
        
        <h1 className="text-4xl font-bold text-gradient mb-4">Ignite</h1>
        <p className="text-slate-400 text-lg mb-8 leading-relaxed">
          The complete sports club management platform for teams, events, and community building.
        </p>
        
        <div className="grid grid-cols-2 gap-4 mb-12">
          <div className="card p-4 text-center">
            <Users className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-slate-300 text-sm font-medium">Manage Teams</p>
          </div>
          <div className="card p-4 text-center">
            <Calendar className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <p className="text-slate-300 text-sm font-medium">Schedule Events</p>
          </div>
          <div className="card p-4 text-center">
            <MessageCircle className="w-8 h-8 text-purple-400 mx-auto mb-2" />
            <p className="text-slate-300 text-sm font-medium">Team Chat</p>
          </div>
          <div className="card p-4 text-center">
            <Camera className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
            <p className="text-slate-300 text-sm font-medium">Share Photos</p>
          </div>
        </div>
      </div>

      <button
        onClick={login}
        disabled={isLoggingIn}
        className={`w-full max-w-sm btn-primary py-4 px-8 text-lg font-semibold shadow-xl ${
          isLoggingIn ? 'btn-loading' : ''
        }`}
      >
        {isLoggingIn ? 'Connecting...' : 'Get Started'}
      </button>

      <footer className="mt-16 text-center">
        <p className="text-slate-500 text-sm">
          © 2025. Built with ❤️ using{' '}
          <a href="https://caffeine.ai" className="text-emerald-400 hover:text-emerald-300 transition-colors">
            caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}
