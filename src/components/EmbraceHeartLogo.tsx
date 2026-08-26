import React from 'react';

interface EmbraceHeartLogoProps {
  className?: string;
  size?: number;
  glow?: boolean;
}

export const EmbraceHeartLogo: React.FC<EmbraceHeartLogoProps> = ({ 
  className = "w-6 h-6", 
  size,
  glow = false 
}) => {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={size ? { width: size, height: size } : undefined}>
      {glow && (
        <div className="absolute inset-0 rounded-full bg-rose-500/30 blur-md -z-10 animate-pulse-subtle" />
      )}
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-sm select-none"
      >
        <defs>
          {/* Heart Vibrant Romantic Gradient */}
          <linearGradient id="heartGradient" x1="20" y1="15" x2="80" y2="85" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ff4365" />
            <stop offset="50%" stopColor="#f43f5e" />
            <stop offset="100%" stopColor="#e11d48" />
          </linearGradient>

          {/* Heart Inner Glow Gradient */}
          <linearGradient id="heartShine" x1="30" y1="20" x2="65" y2="55" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          {/* Left Arm Gradient (Gentle Warm Rose/Coral Skin Tone to Hugging Soft Warmth) */}
          <linearGradient id="leftArmGrad" x1="10" y1="50" x2="70" y2="60" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fed7aa" />
            <stop offset="50%" stopColor="#fecdd3" />
            <stop offset="100%" stopColor="#fda4af" />
          </linearGradient>

          {/* Right Arm Gradient */}
          <linearGradient id="rightArmGrad" x1="90" y1="50" x2="30" y2="70" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="40%" stopColor="#fecdd3" />
            <stop offset="100%" stopColor="#f472b6" />
          </linearGradient>

          {/* Arm Shadow Filter for Depth */}
          <filter id="armShadow" x="-10%" y="-10%" width="130%" height="130%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#881337" floodOpacity="0.45" />
          </filter>
        </defs>

        {/* 1. CENTRAL HEART */}
        <path
          d="M 50 84 C 50 84 18 64 18 41 C 18 28.5 27.5 19 39 19 C 45 19 48.5 22.5 50 25 C 51.5 22.5 55 19 61 19 C 72.5 19 82 28.5 82 41 C 82 64 50 84 50 84 Z"
          fill="url(#heartGradient)"
        />

        {/* Heart Upper Highlight Curve */}
        <path
          d="M 24 38 C 24 29 30 23 38 23 C 43 23 46 25.5 48 28 C 45 26 40 25 36 26 C 29 27.5 24.5 32 24 38 Z"
          fill="url(#heartShine)"
        />

        {/* 2. LEFT ARM & HAND WRAPPING AROUND THE HEART */}
        <g filter="url(#armShadow)">
          {/* Arm wrap body from left shoulder around front */}
          <path
            d="M 12 56 C 8 46 14 31 24 25 C 27 23.2 30 25 30 28.5 C 25 34 20 44 26 53 C 31 60 42 63 56 59 C 60 57.8 63 60.5 62 64.5 C 60.5 68 55 70 47 70 C 32 70 16 68 12 56 Z"
            fill="url(#leftArmGrad)"
          />
          {/* Left hand & fingers resting gently on right side of heart */}
          <path
            d="M 54 58 C 58 57 65 59 67 62 C 68 64 66 66.5 63 67 C 60 67.5 55 67 52 64 Z"
            fill="#fecdd3"
          />
          {/* Finger separation grooves */}
          <path d="M 60 60 C 63 61.5 64.5 63.5 65 65.5" stroke="#fb7185" strokeWidth="1.2" strokeLinecap="round" opacity="0.75" />
          <path d="M 56 61 C 59 62.5 60.5 64.5 61 66.5" stroke="#fb7185" strokeWidth="1.2" strokeLinecap="round" opacity="0.75" />
        </g>

        {/* 3. RIGHT ARM & HAND WRAPPING AROUND THE HEART */}
        <g filter="url(#armShadow)">
          {/* Arm wrap body from right shoulder around lower front */}
          <path
            d="M 88 56 C 92 46 86 31 76 25 C 73 23.2 70 25 70 28.5 C 75 34 80 44 74 53 C 69 61 58 68 44 71 C 40 72 37 69 38 65 C 39.5 61.5 45 60 53 59 C 68 57 84 68 88 56 Z"
            fill="url(#rightArmGrad)"
          />
          {/* Right hand & fingers resting gently on left side of heart */}
          <path
            d="M 46 72 C 41 72 34 69 33 66 C 32 63.5 35 62 38 62 C 42 62 47 64 49 68 Z"
            fill="#fecdd3"
          />
          {/* Finger separation grooves */}
          <path d="M 40 70 C 37 68.5 35.5 66.5 35 64.5" stroke="#e11d48" strokeWidth="1.2" strokeLinecap="round" opacity="0.75" />
          <path d="M 44 69 C 41 67.5 39.5 65.5 39 63.5" stroke="#e11d48" strokeWidth="1.2" strokeLinecap="round" opacity="0.75" />
        </g>

        {/* 4. LITTLE SPARKLE / ACCENT OF LOVE */}
        <path
          d="M 50 14 Q 50 19 55 19 Q 50 19 50 24 Q 50 19 45 19 Q 50 19 50 14 Z"
          fill="#ffd166"
          opacity="0.9"
        />
      </svg>
    </div>
  );
};
