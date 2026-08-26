import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { Flame, MessageCircle, Sparkles, Send, ArrowRight } from 'lucide-react';
import { User, Match } from '../types';

interface MatchCelebrationModalProps {
  currentUser: User;
  partner: User;
  match: Match;
  onClose: () => void;
  onOpenChat: (matchId: string, initialMessage?: string) => void;
}

export const MatchCelebrationModal: React.FC<MatchCelebrationModalProps> = ({
  currentUser,
  partner,
  match,
  onClose,
  onOpenChat
}) => {
  const [quickMsg, setQuickMsg] = useState('');

  useEffect(() => {
    // Fire festive match confetti
    const duration = 2.5 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ['#f43f5e', '#ec4899', '#fbbf24', '#38bdf8']
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ['#f43f5e', '#ec4899', '#fbbf24', '#38bdf8']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  const handleSendQuickMessage = (e: React.FormEvent) => {
    e.preventDefault();
    onOpenChat(match.id, quickMsg.trim() || undefined);
  };

  const sampleIcebreakers = [
    `¡Hola ${partner.name.split(' ')[0]}! Me encantó tu foto ✨`,
    `¡Hola! ¿Cuál es tu lugar favorito en ${partner.location.split(',')[0]}?`,
    `¡Hola! Veo que te gusta ${partner.interests[0] || 'la música'} 🙌`
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        className="w-full max-w-md bg-slate-900 border border-rose-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-center flex flex-col items-center"
      >
        {/* Background glow circle */}
        <div className="absolute -top-24 -left-24 w-60 h-60 bg-rose-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-pink-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Match Header Tag */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-rose-500/20 to-pink-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>¡Atracción Mutua!</span>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-pink-400 to-amber-300 tracking-tight font-['Outfit']">
          ¡Es un Match!
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xs">
          A ti y a <strong className="text-white">{partner.name}</strong> se han gustado mutuamente.
        </p>

        {/* Side-by-Side Avatars */}
        <div className="flex items-center justify-center -space-x-6 my-6">
          <motion.div
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-slate-900 shadow-2xl overflow-hidden bg-slate-800"
          >
            <img
              src={currentUser.photos[0]}
              alt={currentUser.name}
              className="w-full h-full object-cover"
            />
          </motion.div>

          {/* Glowing Center Badge */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-rose-600 to-pink-500 text-white flex items-center justify-center z-10 shadow-lg border-2 border-slate-900">
            <Flame className="w-6 h-6 fill-white" />
          </div>

          <motion.div
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-slate-900 shadow-2xl overflow-hidden bg-slate-800"
          >
            <img
              src={partner.photos[0]}
              alt={partner.name}
              className="w-full h-full object-cover"
            />
          </motion.div>
        </div>

        {/* Quick Icebreakers suggestions */}
        <div className="w-full flex flex-col gap-1.5 mb-4 text-left">
          <span className="text-[11px] font-semibold text-slate-400 px-1">Rompehielos sugeridos:</span>
          <div className="flex flex-col gap-1.5">
            {sampleIcebreakers.map((msg, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setQuickMsg(msg)}
                className="text-left text-xs bg-slate-800/70 hover:bg-rose-500/10 hover:border-rose-500/40 border border-slate-700/60 text-slate-300 hover:text-rose-300 px-3 py-2 rounded-xl transition"
              >
                "{msg}"
              </button>
            ))}
          </div>
        </div>

        {/* Direct Message Form */}
        <form onSubmit={handleSendQuickMessage} className="w-full flex gap-2 mb-4">
          <input
            id="input-match-quick-message"
            type="text"
            value={quickMsg}
            onChange={(e) => setQuickMsg(e.target.value)}
            placeholder={`Escribir a ${partner.name.split(' ')[0]}...`}
            className="flex-1 bg-slate-950/80 border border-slate-700 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition"
          />
          <button
            id="btn-match-send-message"
            type="submit"
            className="px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-rose-500/30 transition hover:scale-105"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Enviar</span>
          </button>
        </form>

        {/* Action Buttons */}
        <div className="w-full flex flex-col sm:flex-row items-center gap-2">
          <button
            id="btn-match-open-chat"
            onClick={() => onOpenChat(match.id, quickMsg.trim() || undefined)}
            className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition"
          >
            <MessageCircle className="w-4 h-4 text-rose-400" />
            <span>Abrir Chat Completo</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <button
            id="btn-match-continue-swiping"
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-transparent hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 font-semibold text-xs transition"
          >
            Seguir Deslizando
          </button>
        </div>

      </motion.div>
    </div>
  );
};
