import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { SwipeCard } from './components/SwipeCard';
import { MatchCelebrationModal } from './components/MatchCelebrationModal';
import { ChatView } from './components/ChatView';
import { ProfileView } from './components/ProfileView';
import { AdminPanel } from './components/AdminPanel';
import { AuthModal } from './components/AuthModal';
import { User, Match, SwipeType } from './types';
import { api } from './api';
import { firebaseService } from './firebaseService';
import { 
  Flame, 
  Sparkles, 
  RotateCcw, 
  SlidersHorizontal, 
  Users, 
  ShieldCheck,
  HeartHandshake
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
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('register');
  const [, setAuthChecking] = useState(true);

  // Can rewind state
  const [canRewind, setCanRewind] = useState(false);

  // Initial Load: Check session or present Register screen first
  useEffect(() => {
    initAuth();
  }, []);

  const initAuth = async () => {
    try {
      // Trigger cloud initialization in background
      firebaseService.initializeDatabase().catch(() => {});
      
      const token = api.getToken();
      if (token) {
        const me = await api.getMe();
        setCurrentUser(me.user);
        setAuthModalOpen(false);
      } else {
        // First screen is Register!
        setCurrentUser(null);
        setAuthModalMode('register');
        setAuthModalOpen(true);
      }
    } catch (err) {
      console.warn('Session expired or error:', err);
      api.setToken(null);
      setCurrentUser(null);
      setAuthModalMode('register');
      setAuthModalOpen(true);
    } finally {
      setAuthChecking(false);
    }
  };

  // Real-time listener for current user status (Disconnect instantly if blocked by Admin)
  useEffect(() => {
    if (!currentUser?.id) return;
    const unsub = firebaseService.onAuthChange((fbUser) => {
      if (!fbUser) {
        setCurrentUser(null);
        setAuthModalOpen(true);
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

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setCurrentTab('discover');
    setAuthModalMode('register');
    setAuthModalOpen(true);
  };

  const handleAuthSuccess = (user: User, isAdmin: boolean) => {
    setCurrentUser(user);
    setAuthModalOpen(false);
    if (isAdmin) {
      setCurrentTab('admin');
    } else {
      setCurrentTab('discover');
    }
  };

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

        {/* TAB 4: PROTECTED OWNER ADMIN PANEL */}
        {currentTab === 'admin' && currentUser && (
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
        isOpen={authModalOpen || !currentUser}
        initialMode={authModalMode}
        canClose={!!currentUser}
        onClose={() => {
          if (currentUser) {
            setAuthModalOpen(false);
          }
        }}
        onSuccess={handleAuthSuccess}
      />

    </div>
  );
}
