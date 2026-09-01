import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { SwipeCard } from './components/SwipeCard';
import { MatchCelebrationModal } from './components/MatchCelebrationModal';
import { ChatView } from './components/ChatView';
import { ProfileView } from './components/ProfileView';
import { AdminPanel } from './components/AdminPanel';
import { AuthModal } from './components/AuthModal';
import { User, Match, SwipeType, Gender, UserPreferences } from './types';
import { api } from './api';
import { firebaseService } from './firebaseService';
import { 
  Flame, 
  Sparkles, 
  RotateCcw, 
  SlidersHorizontal, 
  Users, 
  ShieldCheck,
  HeartHandshake,
  Filter
} from 'lucide-react';

export function App() {
  const [currentTab, setCurrentTab] = useState<'discover' | 'matches' | 'profile' | 'admin'>('discover');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [feedProfiles, setFeedProfiles] = useState<User[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [unreadMatchesCount, setUnreadMatchesCount] = useState(0);

  // Match Celebration Modal state
  const [celebrationMatch, setCelebrationMatch] = useState<{ match: Match; partner: User } | null>(null);

  // Chat focus state
  const [activeChatMatchId, setActiveChatMatchId] = useState<string | null>(null);

  // Auth modal state: starts open with 'register' mode if not logged in
  const [authModalOpen, setAuthModalOpen] = useState(true);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | 'forgot-password' | 'enter-new-password'>('register');
  const [, setAuthChecking] = useState(true);

  // Can rewind state
  const [canRewind, setCanRewind] = useState(false);

  const isUserAdmin = (user: User | null): boolean => {
    if (!user) return false;
    const email = (user.email || '').toLowerCase().trim();
    return email === 'lugabca98@gmail.com' || user.id === 'admin-owner';
  };

  // Initial Load: Check session or present Register screen first
  useEffect(() => {
    initAuth();
  }, []);

  const initAuth = async () => {
    try {
      // Trigger cloud initialization in background
      firebaseService.initializeDatabase().catch(() => {});
      
      // Check if arriving with a reset password or verify email link
      const searchParams = new URLSearchParams(window.location.search);
      const urlMode = searchParams.get('mode');
      if (urlMode === 'reset-password' || urlMode === 'resetPassword') {
        setCurrentUser(null);
        setAuthModalMode('enter-new-password');
        setAuthModalOpen(true);
        return;
      } else if (urlMode === 'verify-email' || urlMode === 'verifyEmail') {
        setCurrentUser(null);
        setAuthModalOpen(true);
        return;
      }

      const token = api.getToken();
      if (token) {
        const me = await api.getMe();
        if (!me.user.emailVerified) {
          api.setToken(null);
          setCurrentUser(null);
          setAuthModalMode('login');
          setAuthModalOpen(true);
          return;
        }
        setCurrentUser(me.user);
        setAuthModalOpen(false);
        if (me.isAdmin && isUserAdmin(me.user)) {
          setCurrentTab('admin');
        } else {
          setCurrentTab('discover');
        }
      } else {
        // First screen is Register!
        setCurrentUser(null);
        setAuthModalMode('register');
        setAuthModalOpen(true);
      }
    } catch (err) {
      console.warn('Session expired or unverified:', err);
      api.setToken(null);
      setCurrentUser(null);
      setAuthModalMode('register');
      setAuthModalOpen(true);
    } finally {
      setAuthChecking(false);
    }
  };

  // Active Security Guard: Immediately eject non-administrators from the admin tab
  useEffect(() => {
    if (currentTab === 'admin' && (!currentUser || !isUserAdmin(currentUser))) {
      setCurrentTab('discover');
    }
  }, [currentTab, currentUser]);

  // Real-time listener for current user status (Disconnect instantly if blocked by Admin)
  useEffect(() => {
    if (!currentUser?.id) return;
    const unsub = firebaseService.onUserDocChange(currentUser.id, (updatedUser) => {
      if (updatedUser && updatedUser.status === 'blocked') {
        api.setToken(null);
        setCurrentUser(null);
        setAuthModalMode('login');
        setAuthModalOpen(true);
      } else if (updatedUser) {
        setCurrentUser(prev => prev ? { ...prev, ...updatedUser } : updatedUser);
      }
    });

    return () => unsub();
  }, [currentUser?.id]);

  // Reload feed whenever current user changes or preferences change
  useEffect(() => {
    if (currentUser) {
      if (currentUser.status === 'blocked') {
        handleLogout();
        return;
      }
      loadFeed();
      loadUnreadMatches();
    }
  }, [currentUser?.id, currentUser?.preferences, currentUser?.status]);

  const loadFeed = async () => {
    setFeedLoading(true);
    try {
      const data = await api.getFeed();
      setFeedProfiles(data.profiles);
    } catch (err) {
      console.error('Error loading feed:', err);
    } finally {
      setFeedLoading(false);
    }
  };

  const loadUnreadMatches = async () => {
    try {
      const data = await api.getMatches();
      const unread = data.matches.filter(m => m.unreadCount > 0).length;
      setUnreadMatchesCount(unread);
    } catch (err) {
      console.error('Error loading matches count:', err);
    }
  };

  // Swipe Action Handler
  const handleSwipe = async (type: SwipeType) => {
    if (feedProfiles.length === 0 || !currentUser) return;

    const currentProfile = feedProfiles[0];
    
    // Remove from local feed immediately for snappy UI
    setFeedProfiles(prev => prev.slice(1));
    setCanRewind(true);

    try {
      const res = await api.swipe(currentProfile.id, type);

      if (res.isMatch && res.match && res.partner) {
        // Trigger Match Celebration Modal
        setCelebrationMatch({
          match: res.match,
          partner: res.partner
        });
        loadUnreadMatches();
      }
    } catch (err) {
      console.error('Swipe failed:', err);
    }
  };

  const handleRewind = async () => {
    try {
      const res = await api.rewind();
      if (res.success && res.restoredUser) {
        const user = res.restoredUser;
        setFeedProfiles(prev => [user, ...prev]);
        setCanRewind(false);
      }
    } catch (err: any) {
      console.warn('Rewind error:', err.message);
    }
  };

  const handleOpenChatFromMatch = (matchId: string, initialMessage?: string) => {
    setCelebrationMatch(null);
    setActiveChatMatchId(matchId);
    setCurrentTab('matches');

    if (initialMessage) {
      setTimeout(async () => {
        try {
          await api.sendMessage(matchId, initialMessage);
        } catch (e) {
          console.error('Initial message failed:', e);
        }
      }, 300);
    }
  };

  const handleQuickFilterChange = async (newInterestedIn: Gender[]) => {
    if (!currentUser) return;
    const updatedPreferences: UserPreferences = {
      ...(currentUser.preferences || { minAge: 18, maxAge: 99, maxDistanceKm: 50 }),
      interestedIn: newInterestedIn
    };
    
    // Optimistically update currentUser state
    const updatedUser: User = {
      ...currentUser,
      preferences: updatedPreferences
    };
    setCurrentUser(updatedUser);
    
    // Save to database / local store
    try {
      await api.updateProfile({ preferences: updatedPreferences });
    } catch (err) {
      console.warn('Error saving preference filter:', err);
    }
    
    // Reload candidates feed immediately
    setFeedLoading(true);
    try {
      const data = await api.getFeed();
      setFeedProfiles(data.profiles);
    } catch (err) {
      console.error('Error reloading feed after filter change:', err);
    } finally {
      setFeedLoading(false);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setCurrentTab('discover');
    setAuthModalMode('register');
    setAuthModalOpen(true);
  };

  const handleAuthSuccess = (user: User, isAdmin: boolean) => {
    if (!user.emailVerified) {
      setAuthModalMode('login');
      setAuthModalOpen(true);
      return;
    }
    const isOwner = isAdmin || isUserAdmin(user);
    setCurrentUser(user);
    setAuthModalOpen(false);
    if (isOwner) {
      setCurrentTab('admin');
    } else {
      setCurrentTab('discover');
    }
  };

  const isOnlyWomen = currentUser?.preferences?.interestedIn?.length === 1 && currentUser.preferences.interestedIn[0] === 'female';
  const isOnlyMen = currentUser?.preferences?.interestedIn?.length === 1 && currentUser.preferences.interestedIn[0] === 'male';
  const isOnlyNonBinary = currentUser?.preferences?.interestedIn?.length === 1 && currentUser.preferences.interestedIn[0] === 'non-binary';
  const isAllGenders = !isOnlyWomen && !isOnlyMen && !isOnlyNonBinary;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* Top Main Navigation Bar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentUser={currentUser}
        unreadMatchesCount={unreadMatchesCount}
        onLogout={handleLogout}
        onOpenAuth={() => {
          setAuthModalMode('register');
          setAuthModalOpen(true);
        }}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-5 flex flex-col items-center justify-start">
        
        {/* TAB 1: DISCOVER / SWIPE CARDS */}
        {currentTab === 'discover' && (
          <div className="w-full flex flex-col items-center">
            
            {/* Quick Gender Preference Selector Bar (Match Tab) */}
            {currentUser && (
              <div className="w-full max-w-sm mb-4 bg-slate-900/90 border border-slate-800/80 backdrop-blur rounded-2xl p-3 shadow-xl flex flex-col gap-2.5">
                <div className="flex items-center justify-between px-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                    <Filter className="w-3.5 h-3.5 text-rose-400" />
                    <span>Tu preferencia en Match:</span>
                  </div>
                  <span className="text-[10px] font-bold text-rose-300 bg-rose-500/15 px-2.5 py-0.5 rounded-full border border-rose-500/30">
                    {isOnlyWomen
                      ? '♀ Solo Mujeres'
                      : isOnlyMen
                      ? '♂ Solo Hombres'
                      : isOnlyNonBinary
                      ? '⚧ Solo No Binario'
                      : '✨ Todos los géneros'}
                  </span>
                </div>

                {/* Preference Toggle Buttons */}
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    id="filter-women-btn"
                    onClick={() => handleQuickFilterChange(['female'])}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 border ${
                      isOnlyWomen
                        ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white border-pink-400/80 shadow-lg shadow-pink-500/25 ring-2 ring-pink-500/40 scale-[1.02]'
                        : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <span>♀</span>
                    <span>Solo Mujeres</span>
                  </button>

                  <button
                    type="button"
                    id="filter-men-btn"
                    onClick={() => handleQuickFilterChange(['male'])}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 border ${
                      isOnlyMen
                        ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white border-sky-400/80 shadow-lg shadow-sky-500/25 ring-2 ring-sky-500/40 scale-[1.02]'
                        : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <span>♂</span>
                    <span>Solo Hombres</span>
                  </button>

                  <button
                    type="button"
                    id="filter-all-btn"
                    onClick={() => handleQuickFilterChange(['female', 'male', 'non-binary', 'other'])}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 border ${
                      isAllGenders
                        ? 'bg-gradient-to-r from-purple-600 to-rose-600 text-white border-purple-400/80 shadow-lg shadow-purple-500/25 ring-2 ring-purple-500/40 scale-[1.02]'
                        : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <span>✨</span>
                    <span>Todos</span>
                  </button>
                </div>
              </div>
            )}
            
            {feedLoading ? (
              <div className="w-full max-w-sm h-[520px] rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col items-center justify-center gap-3 animate-pulse">
                <Flame className="w-10 h-10 text-rose-500/60" />
                <span className="text-xs font-semibold text-slate-400">Buscando personas cerca de ti...</span>
              </div>
            ) : feedProfiles.length > 0 ? (
              <div className="w-full">
                <SwipeCard
                  key={feedProfiles[0].id}
                  profile={feedProfiles[0]}
                  onSwipe={handleSwipe}
                  onRewind={handleRewind}
                  canRewind={canRewind}
                />
              </div>
            ) : (
              /* Out of Candidates Empty State */
              <div className="w-full max-w-sm h-[520px] rounded-3xl bg-slate-900 border border-slate-800 p-8 flex flex-col items-center justify-center text-center gap-4 shadow-2xl">
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-rose-500/20 to-pink-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <HeartHandshake className="w-10 h-10" />
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white mb-1">¡Viste todos los perfiles disponibles!</h3>
                  <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                    Prueba ampliando tu rango de edad o distancia en los ajustes de tu perfil, o recarga para ver nuevos miembros.
                  </p>
                </div>

                <div className="flex flex-col w-full gap-2 pt-2">
                  <button
                    id="btn-reload-feed"
                    onClick={loadFeed}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold text-xs shadow-lg shadow-rose-500/30 transition hover:scale-105 flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Recargar Candidatos</span>
                  </button>

                  <button
                    id="btn-go-to-profile-preferences"
                    onClick={() => setCurrentTab('profile')}
                    className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition flex items-center justify-center gap-2"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span>Ajustar Preferencias</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* TAB 2: MATCHES & REAL-TIME CHAT */}
        {currentTab === 'matches' && currentUser && (
          <ChatView
            currentUser={currentUser}
            initialMatchId={activeChatMatchId}
            onBackToDiscover={() => setCurrentTab('discover')}
          />
        )}

        {/* TAB 3: USER'S PROFILE & PREFERENCES */}
        {currentTab === 'profile' && currentUser && (
          <ProfileView
            currentUser={currentUser}
            onUpdateUser={(updated) => setCurrentUser(updated)}
            onLogout={handleLogout}
          />
        )}

        {/* TAB 4: PROTECTED OWNER ADMIN PANEL - Strictly for lugabca98@gmail.com */}
        {currentTab === 'admin' && currentUser && isUserAdmin(currentUser) && (
          <AdminPanel
            currentAdminUser={currentUser}
            onLogoutAdmin={handleLogout}
            onCloseAdmin={() => setCurrentTab('discover')}
          />
        )}

      </main>

      {/* MATCH CELEBRATION MODAL */}
      {celebrationMatch && currentUser && (
        <MatchCelebrationModal
          currentUser={currentUser}
          partner={celebrationMatch.partner}
          match={celebrationMatch.match}
          onClose={() => setCelebrationMatch(null)}
          onOpenChat={handleOpenChatFromMatch}
        />
      )}

      {/* AUTHENTICATION MODAL (REGISTER / LOGIN / OWNER) */}
      <AuthModal
        isOpen={authModalOpen || !currentUser || !currentUser.emailVerified}
        initialMode={authModalMode}
        canClose={!!currentUser && !!currentUser.emailVerified}
        onClose={() => {
          if (currentUser && currentUser.emailVerified) {
            setAuthModalOpen(false);
          }
        }}
        onSuccess={handleAuthSuccess}
      />

    </div>
  );
}
