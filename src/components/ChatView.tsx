import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  ArrowLeft, 
  CheckCheck, 
  Smile, 
  Image as ImageIcon, 
  Flame, 
  MapPin, 
  Briefcase, 
  CheckCircle2, 
  Sparkles,
  ShieldCheck,
  Search
} from 'lucide-react';
import { Match, Message, User } from '../types';
import { api } from '../api';
import { firebaseService } from '../firebaseService';

interface ChatViewProps {
  currentUser: User;
  initialMatchId?: string | null;
  onSelectMatch?: (matchId: string) => void;
  onBackToDiscover: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  currentUser,
  initialMatchId,
  onBackToDiscover
}) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(initialMatchId || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [partner, setPartner] = useState<User | null>(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load matches and listen in real-time
  useEffect(() => {
    loadMatches();
    const unsub = firebaseService.subscribeMatches(currentUser.id, (realtimeMatches) => {
      if (Array.isArray(realtimeMatches)) {
        setMatches(realtimeMatches);
        setSelectedMatchId(prev => {
          if (!prev && realtimeMatches.length > 0) {
            return realtimeMatches[0].id;
          }
          return prev;
        });
      }
    });
    return () => unsub?.();
  }, [currentUser.id]);

  const loadMatches = async () => {
    try {
      const data = await api.getMatches();
      setMatches(data.matches);
      if (!selectedMatchId && data.matches.length > 0) {
        setSelectedMatchId(data.matches[0].id);
      }
    } catch (err) {
      console.error('Error fetching matches:', err);
    }
  };

  // Update partner whenever selectedMatchId or matches change
  useEffect(() => {
    if (selectedMatchId && matches.length > 0) {
      const currentMatch = matches.find(m => m.id === selectedMatchId);
      if (currentMatch?.partner) {
        setPartner(currentMatch.partner);
      }
    }
  }, [selectedMatchId, matches]);

  // Real-time Firestore messages subscription with polling fallback
  useEffect(() => {
    if (selectedMatchId) {
      loadMessages(selectedMatchId, true);
      const unsub = firebaseService.subscribeMessages(selectedMatchId, currentUser.id, (realtimeMsgs) => {
        if (realtimeMsgs && realtimeMsgs.length > 0) {
          setMessages(realtimeMsgs);
          scrollToBottom();
        }
      });
      return () => unsub?.();
    }
  }, [selectedMatchId]);

  const loadMessages = async (matchId: string, isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const data = await api.getMessages(matchId);
      setMessages(data.messages);
      if (isInitial) {
        scrollToBottom();
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedMatchId) return;

    const textToSend = inputText.trim();
    setInputText('');

    // Optimistic message update
    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      matchId: selectedMatchId,
      senderId: currentUser.id,
      receiverId: partner?.id || 'partner',
      text: textToSend,
      createdAt: new Date().toISOString(),
      read: false
    };

    setMessages(prev => [...prev, optimisticMsg]);
    scrollToBottom();

    try {
      const res = await api.sendMessage(selectedMatchId, textToSend);
      // Replace optimistic message with saved server message
      setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? res.message : m));
      loadMatches(); // refresh match preview
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const filteredMatches = matches.filter(m => 
    m.partner?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.partner?.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeMatch = matches.find(m => m.id === selectedMatchId);

  const quickReactions = ['✨', '🔥', '☕', '🍷', '🍕', '😂', '👋', '😍'];

  return (
    <div className="w-full max-w-4xl mx-auto h-[calc(100vh-5rem)] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row">
      
      {/* LEFT COLUMN: Matches List */}
      <div className={`w-full md:w-80 border-r border-slate-800 flex flex-col bg-slate-950/60 ${selectedMatchId ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Header & Search */}
        <div className="p-4 border-b border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-rose-500 fill-rose-500" />
              <span>Tus Conexiones</span>
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 font-semibold border border-rose-500/30">
              {matches.length} matches
            </span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              id="input-search-matches"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre o lugar..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>

        {/* Matches Horizontal Story Scroller */}
        <div className="p-3 border-b border-slate-800/60 bg-slate-900/40">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-2 block">
            Nuevos Matches
          </span>
          <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
            {matches.map(m => (
              <div
                key={m.id}
                onClick={() => setSelectedMatchId(m.id)}
                className="flex flex-col items-center gap-1 cursor-pointer flex-shrink-0 group"
              >
                <div className={`w-14 h-14 rounded-full p-0.5 transition-transform group-hover:scale-105 ${
                  selectedMatchId === m.id
                    ? 'bg-gradient-to-tr from-rose-500 to-pink-500 shadow-md shadow-rose-500/30'
                    : 'bg-slate-700/60'
                }`}>
                  <img
                    src={m.partner?.photos?.[0] || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                    alt={m.partner?.name || 'Match'}
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                <span className="text-[10px] font-medium text-slate-300 max-w-[56px] truncate text-center">
                  {m.partner?.name ? m.partner.name.split(' ')[0] : 'Match'}
                </span>
              </div>
            ))}

            {matches.length === 0 && (
              <div className="text-center py-2 text-xs text-slate-500 w-full">
                Deslizá en Descubrir para conseguir matches
              </div>
            )}
          </div>
        </div>

        {/* Message Threads List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
          {filteredMatches.map(m => (
            <div
              key={m.id}
              onClick={() => setSelectedMatchId(m.id)}
              className={`p-3.5 flex items-center gap-3 cursor-pointer transition ${
                selectedMatchId === m.id
                  ? 'bg-slate-800/80 border-l-4 border-rose-500'
                  : 'hover:bg-slate-900/80'
              }`}
            >
              <div className="relative">
                <img
                  src={m.partner?.photos?.[0] || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                  alt={m.partner?.name || 'Match'}
                  className="w-12 h-12 rounded-full object-cover border border-slate-700"
                />
                {m.partner?.status === 'active' && (
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-950" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-bold text-white truncate flex items-center gap-1">
                    {m.partner?.name}
                    {m.partner?.verified && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 fill-sky-400 flex-shrink-0" />
                    )}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {m.lastMessageTime 
                      ? new Date(m.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'Nuevo'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 truncate">
                  {m.lastMessage || '¡Conexión reciente! Escribí el primer mensaje.'}
                </p>
              </div>
            </div>
          ))}

          {filteredMatches.length === 0 && (
            <div className="text-center py-10 px-4 text-xs text-slate-500 flex flex-col items-center gap-2">
              <Sparkles className="w-8 h-8 text-slate-700" />
              <span>No se encontraron conversaciones.</span>
              <button
                onClick={onBackToDiscover}
                className="mt-2 text-rose-400 font-bold hover:underline"
              >
                Ir a descubrir perfiles
              </button>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Active Chat Window */}
      <div className={`flex-1 flex flex-col bg-slate-900 ${!selectedMatchId ? 'hidden md:flex' : 'flex'}`}>
        {partner && activeMatch ? (
          <>
            {/* Chat Top Header */}
            <div className="p-3.5 border-b border-slate-800 bg-slate-950/70 backdrop-blur flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  id="btn-chat-back"
                  onClick={() => setSelectedMatchId(null)}
                  className="md:hidden p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="relative">
                  <img
                    src={partner.photos?.[0] || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                    alt={partner.name || 'Match'}
                    className="w-10 h-10 rounded-full object-cover border border-rose-500/40"
                  />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-slate-950" />
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-white">{partner.name}, {partner.age}</h3>
                    {partner.verified && (
                      <CheckCircle2 className="w-4 h-4 text-sky-400 fill-sky-400" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 flex items-center gap-2">
                    <span>{partner.occupation || partner.location}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-600" />
                    <span className="text-emerald-400 font-medium">En línea</span>
                  </p>
                </div>
              </div>

              {/* Safety badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/70 border border-slate-700 text-slate-300 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Conexión Verificada</span>
              </div>
            </div>

            {/* Messages Thread Container */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gradient-to-b from-slate-900/50 to-slate-950/80">
              
              {/* Profile Bio Reminder Card */}
              <div className="max-w-sm mx-auto my-3 p-3.5 rounded-2xl bg-slate-800/40 border border-slate-800 text-center flex flex-col items-center gap-1.5">
                <img
                  src={partner.photos?.[0] || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                  alt={partner.name || 'Match'}
                  className="w-16 h-16 rounded-full object-cover border-2 border-rose-500 shadow-md mb-1"
                />
                <span className="text-xs font-bold text-white">¡Hiciste match con {partner.name}!</span>
                <p className="text-[11px] text-slate-400 leading-snug">{partner.bio}</p>
                <div className="flex flex-wrap justify-center gap-1 mt-1">
                  {(partner.interests || []).map((it, i) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {it}
                    </span>
                  ))}
                </div>
              </div>

              {/* Messages list */}
              {messages.map((msg) => {
                const isMe = msg.senderId === currentUser.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-md ${
                        isMe
                          ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-br-none'
                          : 'bg-slate-800 text-slate-100 border border-slate-700/80 rounded-bl-none'
                      }`}
                    >
                      <p>{msg.text}</p>
                    </div>

                    <div className="flex items-center gap-1 mt-1 px-1 text-[10px] text-slate-500">
                      <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {isMe && (
                        <CheckCheck className="w-3 h-3 text-rose-400" />
                      )}
                    </div>
                  </div>
                );
              })}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Emoji Bar */}
            <div className="px-4 py-1.5 bg-slate-950/40 border-t border-slate-800/60 flex items-center gap-2 overflow-x-auto no-scrollbar">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex-shrink-0">Reacciones:</span>
              {quickReactions.map((emoji, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setInputText(prev => prev + emoji)}
                  className="px-2 py-0.5 rounded-lg hover:bg-slate-800 text-sm transition hover:scale-110"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Input Form Bar */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 bg-slate-950 flex items-center gap-2">
              <input
                id="input-chat-message"
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Escribí un mensaje para ${partner.name.split(' ')[0]}...`}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-full px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition"
              />

              <button
                id="btn-chat-send"
                type="submit"
                disabled={!inputText.trim()}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  inputText.trim()
                    ? 'bg-gradient-to-tr from-rose-500 to-pink-600 text-white shadow-lg shadow-rose-500/30 hover:scale-105'
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500">
            <div className="w-16 h-16 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center mb-3 text-rose-400">
              <Flame className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Seleccioná un match para comenzar a chatear</h3>
            <p className="text-xs text-slate-400 max-w-xs">
              Conectá en vivo con tus conexiones y descubrí intereses compartidos.
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
