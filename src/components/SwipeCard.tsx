import React, { useState } from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';
import { 
  Heart, 
  X, 
  Star, 
  RotateCcw, 
  MapPin, 
  Briefcase, 
  CheckCircle2, 
  Info, 
  ChevronLeft, 
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { User, SwipeType } from '../types';

interface SwipeCardProps {
  profile: User;
  onSwipe: (type: SwipeType) => void;
  onRewind?: () => void;
  canRewind?: boolean;
}

export const SwipeCard: React.FC<SwipeCardProps> = ({
  profile,
  onSwipe,
  onRewind,
  canRewind = false
}) => {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [showFullBio, setShowFullBio] = useState(false);

  // Motion values for drag gestures
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-250, 0, 250], [-18, 0, 18]);
  
  // Opacity indicators for Like and Nope stamps
  const likeOpacity = useTransform(x, [20, 120], [0, 1]);
  const nopeOpacity = useTransform(x, [-20, -120], [0, 1]);
  const superlikeOpacity = useTransform(y, [-20, -100], [0, 1]);

  const handleDragEnd = (_: any, info: any) => {
    const threshold = 100;
    const velocity = info.velocity.x;
    const verticalOffset = info.offset.y;

    if (verticalOffset < -120) {
      onSwipe('superlike');
    } else if (info.offset.x > threshold || velocity > 400) {
      onSwipe('like');
    } else if (info.offset.x < -threshold || velocity < -400) {
      onSwipe('pass');
    }
  };

  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (photoIndex < (profile.photos.length || 1) - 1) {
      setPhotoIndex(prev => prev + 1);
    } else {
      setPhotoIndex(0);
    }
  };

  const prevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (photoIndex > 0) {
      setPhotoIndex(prev => prev - 1);
    }
  };

  const photos = profile.photos && profile.photos.length > 0
    ? profile.photos
    : ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80'];

  return (
    <div className="relative w-full max-w-sm mx-auto flex flex-col items-center select-none">
      
      {/* Interactive Card Container */}
      <motion.div
        style={{ x, y, rotate }}
        drag
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.8}
        onDragEnd={handleDragEnd}
        className="relative w-full h-[540px] rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl tinder-card-shadow cursor-grab active:cursor-grabbing"
      >
        {/* Photo Image */}
        <img
          src={photos[photoIndex]}
          alt={profile.name}
          className="w-full h-full object-cover pointer-events-none"
        />

        {/* Visual Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-slate-950/60 to-transparent pointer-events-none" />

        {/* Photo Navigation Indicators (Instagram/Tinder Story style) */}
        {photos.length > 1 && (
          <div className="absolute top-3 inset-x-3 flex gap-1.5 z-20">
            {photos.map((_, idx) => (
              <div
                key={idx}
                className={`h-1 flex-1 rounded-full transition-all duration-200 ${
                  idx === photoIndex ? 'bg-white shadow' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        )}

        {/* Left/Right Tap Zones for photo flip */}
        <div className="absolute inset-y-12 inset-x-0 flex z-10">
          <div 
            onClick={prevPhoto}
            className="w-1/2 h-full flex items-center justify-start pl-2 opacity-0 hover:opacity-100 transition-opacity"
          >
            {photoIndex > 0 && (
              <button 
                type="button" 
                className="w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center backdrop-blur"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
          </div>
          <div 
            onClick={nextPhoto}
            className="w-1/2 h-full flex items-center justify-end pr-2 opacity-0 hover:opacity-100 transition-opacity"
          >
            <button 
              type="button" 
              className="w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center backdrop-blur"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dynamic Swipe Stamps Overlays */}
        <motion.div
          style={{ opacity: likeOpacity }}
          className="absolute top-10 left-6 border-4 border-emerald-400 text-emerald-400 font-extrabold text-2xl uppercase tracking-widest px-4 py-1.5 rounded-xl rotate-[-20deg] shadow-lg pointer-events-none z-30 bg-emerald-950/40 backdrop-blur-sm"
        >
          LIKE ❤️
        </motion.div>

        <motion.div
          style={{ opacity: nopeOpacity }}
          className="absolute top-10 right-6 border-4 border-rose-500 text-rose-500 font-extrabold text-2xl uppercase tracking-widest px-4 py-1.5 rounded-xl rotate-[20deg] shadow-lg pointer-events-none z-30 bg-rose-950/40 backdrop-blur-sm"
        >
          PASAR ✕
        </motion.div>

        <motion.div
          style={{ opacity: superlikeOpacity }}
          className="absolute top-20 inset-x-0 mx-auto w-max border-4 border-amber-400 text-amber-400 font-extrabold text-2xl uppercase tracking-widest px-6 py-2 rounded-xl shadow-lg pointer-events-none z-30 bg-amber-950/60 backdrop-blur-sm"
        >
          SUPER LIKE ⭐
        </motion.div>

        {/* Profile Details (Bottom Sheet Overlay) */}
        <div className="absolute inset-x-0 bottom-0 p-5 flex flex-col gap-2 z-20">
          <div className="flex items-baseline justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-white tracking-tight">
                {profile.name}
              </h2>
              <span className="text-2xl font-bold text-slate-300">
                {profile.age}
              </span>
              {profile.verified && (
                <span title="Perfil Verificado">
                  <CheckCircle2 className="w-5 h-5 text-sky-400 fill-sky-400" />
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowFullBio(!showFullBio);
              }}
              className="p-1.5 rounded-full bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition"
              title="Más información"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>

          {/* Neurodivergence & Location */}
          <div className="flex flex-wrap items-center gap-y-1.5 gap-x-3 text-xs text-slate-300">
            {profile.occupation && (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-medium">
                <Sparkles className="w-3 h-3 text-rose-400" />
                <span>{profile.occupation}</span>
              </div>
            )}
            <div className="flex items-center gap-1 text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-rose-400" />
              <span>{profile.location} {profile.distanceKm ? `(a ${profile.distanceKm} km)` : ''}</span>
            </div>
          </div>

          {/* Bio snippet or expanded */}
          <p className={`text-xs text-slate-200 leading-relaxed ${showFullBio ? '' : 'line-clamp-2'}`}>
            {profile.bio}
          </p>

          {/* Interest Chips */}
          {profile.interests && profile.interests.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {profile.interests.slice(0, showFullBio ? 8 : 4).map((interest, i) => (
                <span
                  key={i}
                  className="px-2.5 py-0.5 rounded-full bg-slate-800/80 backdrop-blur border border-slate-700 text-[11px] font-medium text-slate-300"
                >
                  {interest}
                </span>
              ))}
              {!showFullBio && profile.interests.length > 4 && (
                <span className="px-2 py-0.5 rounded-full bg-slate-800/50 text-[10px] text-slate-400">
                  +{profile.interests.length - 4}
                </span>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Action Control Buttons (Tinder Style) */}
      <div className="w-full flex items-center justify-center gap-3.5 mt-5">
        
        {/* Rewind */}
        <button
          id="btn-swipe-rewind"
          disabled={!canRewind}
          onClick={onRewind}
          className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all ${
            canRewind 
              ? 'bg-slate-900 border-amber-500/40 text-amber-400 hover:scale-110 hover:bg-amber-500/10 shadow-lg shadow-amber-500/10'
              : 'bg-slate-950/60 border-slate-800 text-slate-700 cursor-not-allowed'
          }`}
          title="Deshacer último swipe"
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        {/* Pass (NOPE) */}
        <button
          id="btn-swipe-pass"
          onClick={() => onSwipe('pass')}
          className="w-14 h-14 rounded-full bg-slate-900 border border-rose-500/40 text-rose-500 flex items-center justify-center hover:scale-110 hover:bg-rose-500/10 transition-all shadow-xl shadow-rose-500/15"
          title="Pasar"
        >
          <X className="w-7 h-7 stroke-[2.5]" />
        </button>

        {/* Super Like */}
        <button
          id="btn-swipe-superlike"
          onClick={() => onSwipe('superlike')}
          className="w-12 h-12 rounded-full bg-slate-900 border border-sky-400/40 text-sky-400 flex items-center justify-center hover:scale-110 hover:bg-sky-400/10 transition-all shadow-lg shadow-sky-400/15"
          title="Super Like"
        >
          <Star className="w-6 h-6 fill-sky-400/20 stroke-[2]" />
        </button>

        {/* Like */}
        <button
          id="btn-swipe-like"
          onClick={() => onSwipe('like')}
          className="w-14 h-14 rounded-full bg-gradient-to-tr from-rose-600 to-pink-500 text-white flex items-center justify-center hover:scale-110 transition-all shadow-xl shadow-rose-500/30"
          title="Me Gusta"
        >
          <Heart className="w-7 h-7 fill-white stroke-[2]" />
        </button>

        {/* Fast spark/boost badge */}
        <div className="w-12 h-12 rounded-full bg-slate-900 border border-purple-500/40 text-purple-400 flex items-center justify-center hover:scale-110 hover:bg-purple-500/10 transition-all shadow-lg shadow-purple-500/10 cursor-pointer"
             onClick={() => onSwipe('like')}
             title="Conexión Rápida">
          <Sparkles className="w-5 h-5" />
        </div>

      </div>

    </div>
  );
};
