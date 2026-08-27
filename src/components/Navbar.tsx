import React from 'react';
import { Flame, MessageCircle, User as UserIcon, ShieldAlert, Sparkles, LogOut } from 'lucide-react';
import { User } from '../types';
import { EmbraceHeartLogo } from './EmbraceHeartLogo';

interface NavbarProps {
  currentTab: 'discover' | 'matches' | 'profile' | 'admin';
  setCurrentTab: (tab: 'discover' | 'matches' | 'profile' | 'admin') => void;
  currentUser: User | null;
  unreadMatchesCount: number;
  onLogout: () => void;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  currentUser,
  unreadMatchesCount,
  onLogout,
  onOpenAuth
}) => {
  const isAdmin = currentUser?.role === 'admin' || currentUser?.email?.toLowerCase() === 'lugabca98@gmail.com';

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div 
          onClick={() => setCurrentTab('discover')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 via-pink-500 to-amber-400 p-0.5 shadow-lg shadow-rose-500/25 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center p-1">
              <EmbraceHeartLogo className="w-6 h-6" glow={true} />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl tracking-tight text-white">Vulnerable</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                PRO
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs (Mobile-Friendly Pill Style) */}
        <nav className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-full border border-slate-800">
          <button
            id="nav-tab-discover"
            onClick={() => setCurrentTab('discover')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              currentTab === 'discover'
                ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md shadow-rose-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span className="hidden sm:inline">Descubrir</span>
          </button>

          <button
            id="nav-tab-matches"
            onClick={() => setCurrentTab('matches')}
            className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              currentTab === 'matches'
                ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md shadow-rose-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Matches</span>
            {unreadMatchesCount > 0 && (
              <span className="min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadMatchesCount}
              </span>
            )}
          </button>

          <button
            id="nav-tab-profile"
            onClick={() => {
              if (!currentUser) {
                onOpenAuth();
              } else {
                setCurrentTab('profile');
              }
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              currentTab === 'profile'
                ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md shadow-rose-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Mi Perfil</span>
          </button>

          {/* Admin Panel Tab Button - ONLY visible to authenticated Administrators */}
          {isAdmin && (
            <button
              id="nav-tab-admin"
              onClick={() => setCurrentTab('admin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                currentTab === 'admin'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/25'
                  : 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/30'
              }`}
              title="Panel de Administración"
            >
              <ShieldAlert className="w-4 h-4" />
              <span className="hidden md:inline">Admin</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </button>
          )}
        </nav>

        {/* User Account / Auth Actions */}
        <div className="flex items-center gap-2">
          {currentUser ? (
            <div className="flex items-center gap-2">
              <div 
                onClick={() => setCurrentTab(isAdmin ? 'admin' : 'profile')}
                className="flex items-center gap-2 cursor-pointer p-1 pr-2 rounded-full hover:bg-slate-800/60 transition-colors"
                title={isAdmin ? "Panel de Administración" : "Mi Perfil"}
              >
                {isAdmin ? (
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 border-2 border-amber-500/50 flex items-center justify-center text-amber-400">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                ) : (
                  <img
                    src={currentUser.photos[0] || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                    alt={currentUser.name}
                    className="w-8 h-8 rounded-full object-cover border-2 border-rose-500/50"
                  />
                )}
                <div className="hidden sm:flex flex-col">
                  <span className="text-xs font-semibold text-slate-200 max-w-[90px] truncate leading-tight">
                    {currentUser.name.split(' ')[0]}
                  </span>
                  {isAdmin && (
                    <span className="text-[9px] font-bold text-amber-400 leading-none">Admin</span>
                  )}
                </div>
              </div>
              
              <button
                id="btn-logout"
                onClick={onLogout}
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-full transition-colors"
                title="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              id="btn-open-login"
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30 transition-all hover:scale-105"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ingresar</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
