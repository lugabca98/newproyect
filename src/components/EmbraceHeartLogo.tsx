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
        <div className="absolute inset-0 rounded-full bg-rose-500/40 blur-md -z-10 animate-pulse" />
      )}
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md select-none overflow-visible"
      >
        <defs>
          {/* Heart Vibrant Romantic Gradient */}
          <linearGradient id="heartGrad" x1="50" y1="18" x2="50" y2="86" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ff2a6d" />
            <stop offset="45%" stopColor="#e11d48" />
            <stop offset="100%" stopColor="#9f1239" />
          </linearGradient>

          {/* Heart Top Highlight */}
          <linearGradient id="heartShineGrad" x1="30" y1="20" x2="50" y2="45" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          {/* Left Arm Gradient (Warm Soft Coral / Amber Glow) */}
          <linearGradient id="armLeftGrad" x1="12" y1="28" x2="68" y2="58" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffedd5" />
            <stop offset="40%" stopColor="#fed7aa" />
            <stop offset="100%" stopColor="#fca5a5" />
          </linearGradient>

          {/* Right Arm Gradient (Soft Rose Skin Tone) */}
          <linearGradient id="armRightGrad" x1="88" y1="36" x2="32" y2="68" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffe4e6" />
            <stop offset="45%" stopColor="#fecdd3" />
            <stop offset="100%" stopColor="#f472b6" />
          </linearGradient>

          {/* Drop shadow for 3D layered arms embracing the heart */}
          <filter id="hugDepth" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#4c0519" floodOpacity="0.65" />
          </filter>
        </defs>

        {/* 1. CENTRAL HEART (Vibrant red/rose core) */}
        <path
          d="M 50 84 C 50 84 15 62 15 39 C 15 25.5 25.5 17 38 17 C 44.5 17 48 20.5 50 23 C 52 20.5 55.5 17 62 17 C 74.5 17 85 25.5 85 39 C 85 62 50 84 50 84 Z"
          fill="url(#heartGrad)"
          stroke="#ffe4e6"
          strokeWidth="1.2"
          strokeOpacity="0.3"
        />

        {/* Glossy sheen on heart top curve */}
        <path
          d="M 22 36 C 22 26 29 20 37 20 C 42 20 45.5 22.5 48 25 C 44 23 39 22 35 23 C 28 24.5 23 29.5 22 36 Z"
          fill="url(#heartShineGrad)"
        />

        {/* 2. LEFT ARM & HAND (Sweeping from outside-left, embracing across the heart to the right) */}
        <g filter="url(#hugDepth)">
          {/* Arm sleeve/limb wrapping from left side around the upper waist of the heart */}
          <path
            d="M 10 30 C 5 44 10 60 22 62 C 32 63.5 44 58 56 52 C 60 50 63 52 64 55 C 64.8 57.5 62.5 60 58 62 C 43 68 28 71 16 64 C 4 57 -1 38 7 24 C 9 20.5 13 22 13 25 C 13 27 11 28 10 30 Z"
            fill="url(#armLeftGrad)"
            stroke="#fb7185"
            strokeWidth="1"
          />
          {/* Left Hand hugging and resting on the right side of heart */}
          {/* Palm & 4 distinct curved hugging fingers */}
          <path
            d="M 55 52 C 58 50.5 63 51 66 54 C 67.5 55.5 67 58 64 59.5 C 60 61.5 56 60.5 53 58 Z"
            fill="#ffedd5"
          />
          {/* Finger 1 */}
          <path
            d="M 64 52.5 C 68 53.5 70.5 56 69.5 58 C 68.5 60 65.5 59.5 62.5 57.5"
            stroke="#ea580c"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          {/* Finger 2 */}
          <path
            d="M 62 55.5 C 66 56.8 68 59.5 67 61.5 C 66 63 63 62.5 60 60.5"
            stroke="#ea580c"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          {/* Finger 3 */}
          <path
            d="M 59 58.5 C 63 60 64.5 62.5 63.5 64.5 C 62.5 65.5 60 65 57.5 63"
            stroke="#ea580c"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          {/* Thumb tucking on top */}
          <path
            d="M 54 48.5 C 57 48.5 60 50 61 52 C 59.5 53.5 56.5 52.5 53.5 51"
            stroke="#ea580c"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </g>

        {/* 3. RIGHT ARM & HAND (Sweeping from outside-right, embracing across the heart lower-left) */}
        <g filter="url(#hugDepth)">
          {/* Arm sleeve/limb wrapping from right side around the lower front of the heart */}
          <path
            d="M 90 32 C 95 46 90 62 78 65 C 68 67 54 64 42 61 C 37 59.5 35 62 36 65 C 37 68 41 69.5 46 70.5 C 60 73.5 74 74 84 66 C 96 57 101 38 93 24 C 91 20.5 87 22 87 25 C 87 27 89 29 90 32 Z"
            fill="url(#armRightGrad)"
            stroke="#f43f5e"
            strokeWidth="1"
          />
          {/* Right Hand hugging and resting on the left side of heart */}
          <path
            d="M 45 61 C 42 59.5 37 60 34 63 C 32.5 64.5 33 67 36 68.5 C 40 70.5 44 69.5 47 67 Z"
            fill="#ffe4e6"
          />
          {/* Finger 1 */}
          <path
            d="M 36 61.5 C 32 62.5 29.5 65 30.5 67 C 31.5 69 34.5 68.5 37.5 66.5"
            stroke="#be123c"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          {/* Finger 2 */}
          <path
            d="M 38 64.5 C 34 65.8 32 68.5 33 70.5 C 34 72 37 71.5 40 69.5"
            stroke="#be123c"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          {/* Finger 3 */}
          <path
            d="M 41 67.5 C 37 69 35.5 71.5 36.5 73.5 C 37.5 74.5 40 74 42.5 72"
            stroke="#be123c"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          {/* Thumb tucking underneath */}
          <path
            d="M 46 58.5 C 43 58.5 40 60 39 62 C 40.5 63.5 43.5 62.5 46.5 61"
            stroke="#be123c"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </g>

        {/* 4. TENDER HEART WARMTH / SPARKLE ACCENT */}
        <path
          d="M 50 12 Q 50 16 54 16 Q 50 16 50 20 Q 50 16 46 16 Q 50 16 50 12 Z"
          fill="#fbbf24"
        />
      </svg>
    </div>
  );
};

