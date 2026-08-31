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
    <div 
      className={`relative inline-flex items-center justify-center ${className}`} 
      style={size ? { width: size, height: size } : undefined}
    >
      {glow && (
        <div className="absolute inset-0 rounded-full bg-rose-500/35 blur-md -z-10 animate-pulse" />
      )}
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md select-none overflow-visible"
      >
        <defs>
          {/* Vibrant Heart Gradient */}
          <linearGradient id="logoHeartGrad" x1="50" y1="16" x2="50" y2="84" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ff2a6d" />
            <stop offset="45%" stopColor="#e11d48" />
            <stop offset="100%" stopColor="#881337" />
          </linearGradient>

          {/* Heart Top Highlight */}
          <linearGradient id="logoHeartShine" x1="30" y1="18" x2="50" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          {/* Buzo / Hoodie Fabric Gradient - Cozy Indigo/Violet */}
          <linearGradient id="buzoGradLeft" x1="6" y1="36" x2="36" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="60%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>

          <linearGradient id="buzoGradRight" x1="94" y1="36" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="60%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>

          {/* Ribbed Cuff Gradient */}
          <linearGradient id="cuffGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a5b4fc" />
            <stop offset="100%" stopColor="#4338ca" />
          </linearGradient>

          {/* Skin Hands Gradient */}
          <linearGradient id="handSkinGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fed7aa" />
            <stop offset="50%" stopColor="#ffedd5" />
            <stop offset="100%" stopColor="#fecdd3" />
          </linearGradient>

          {/* Drop shadow for 3D arm hug depth */}
          <filter id="hugDepthShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#31101e" floodOpacity="0.75" />
          </filter>
        </defs>

        {/* =========================================================
            LAYER 1: HOODIE BEHIND THE HEART (HOOD, STRINGS & SHOULDERS)
           ========================================================= */}
        <g>
          {/* Cozy Hoodie Hood behind top cleft */}
          <path
            d="M 33 26 C 37 13 63 13 67 26 C 60 20 40 20 33 26 Z"
            fill="#4338ca"
            stroke="#818cf8"
            strokeWidth="0.9"
          />
          {/* Inner hood opening */}
          <path
            d="M 40 23 C 46 18.5 54 18.5 60 23 Z"
            fill="#312e81"
          />
          {/* Left Drawstring */}
          <path
            d="M 45 22 Q 44 29 43 35"
            stroke="#e0e7ff"
            strokeWidth="1.1"
            strokeLinecap="round"
          />
          <circle cx="43" cy="35.5" r="1.2" fill="#c7d2fe" />

          {/* Right Drawstring */}
          <path
            d="M 55 22 Q 56 29 57 35"
            stroke="#e0e7ff"
            strokeWidth="1.1"
            strokeLinecap="round"
          />
          <circle cx="57" cy="35.5" r="1.2" fill="#c7d2fe" />

          {/* Upper Left Shoulder/Sleeve behind heart */}
          <path
            d="M 33 25 C 20 22 7 32 6 48 C 6 54 9 59 13 63 L 18 56 C 14 52 12 46 13 40 C 14 32 22 28 33 29 Z"
            fill="url(#buzoGradLeft)"
            stroke="#818cf8"
            strokeWidth="0.8"
          />

          {/* Upper Right Shoulder/Sleeve behind heart */}
          <path
            d="M 67 25 C 80 22 93 32 94 48 C 94 54 91 59 87 63 L 82 56 C 86 52 88 46 87 40 C 86 32 78 28 67 29 Z"
            fill="url(#buzoGradRight)"
            stroke="#818cf8"
            strokeWidth="0.8"
          />
        </g>

        {/* =========================================================
            LAYER 2: CENTRAL HEART (SITS IN FRONT OF SHOULDERS)
           ========================================================= */}
        <path
          d="M 50 84 C 50 84 15 62 15 39 C 15 25 25.5 17 38 17 C 44 17 48 20.5 50 24 C 52 20.5 56 17 62 17 C 74.5 17 85 25 85 39 C 85 62 50 84 50 84 Z"
          fill="url(#logoHeartGrad)"
          stroke="#ffe4e6"
          strokeWidth="1.2"
          strokeOpacity="0.35"
        />

        {/* Heart Top Glossy Curved Sheen */}
        <path
          d="M 22 36 C 22 26 29 20 37 20 C 42 20 45.5 22.5 48 25 C 44 23 39 22 35 23 C 28 24.5 23 29.5 22 36 Z"
          fill="url(#logoHeartShine)"
        />

        {/* =========================================================
            LAYER 3: HARMONIOUS FOREARMS, CUFFS & HANDS (FRONT OF HEART)
           ========================================================= */}

        {/* --- UNIFIED LEFT ARM FOREARM (PERFECT CONTINUATION OF ELBOW) --- */}
        <g filter="url(#hugDepthShadow)">
          {/* Continuous Forearm - perfectly joins outer elbow (6, 48) to (13, 63) and wraps to cuff */}
          <path
            d="M 6 48 C 6 56 11 65 24 65 C 28 65 31 61 32 57 L 27 54 C 18 54 13 49 13 41 L 6 48 Z"
            fill="url(#buzoGradLeft)"
            stroke="#818cf8"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />

          {/* Elbow natural fabric crease */}
          <path
            d="M 6 48 Q 11 51 14 47"
            stroke="#3730a3"
            strokeWidth="1.2"
            strokeLinecap="round"
          />

          {/* Left Ribbed Cuff (Puño del buzo) */}
          <path
            d="M 27 59 L 32 52 L 35 54 L 30 61 Z"
            fill="url(#cuffGrad)"
            stroke="#e0e7ff"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
          {/* Cuff ribbing lines */}
          <line x1="28.5" y1="58.5" x2="33.5" y2="51.5" stroke="#312e81" strokeWidth="0.7" />
          <line x1="29.5" y1="59.5" x2="34.5" y2="52.5" stroke="#312e81" strokeWidth="0.7" />

          {/* Left Palm & Fingers naturally emerging from cuff */}
          <g>
            {/* Palm */}
            <ellipse
              cx="36"
              cy="53"
              rx="4"
              ry="3.5"
              transform="rotate(15 36 53)"
              fill="url(#handSkinGrad)"
              stroke="#f43f5e"
              strokeWidth="0.6"
            />

            {/* Thumb */}
            <path
              d="M 34 49 C 35.5 46.5 37.5 45 39 45.5 C 40.5 46 40 48.5 38 50 C 36.5 51 35 50.5 34 49 Z"
              fill="url(#handSkinGrad)"
              stroke="#e11d48"
              strokeWidth="0.7"
              strokeLinejoin="round"
            />

            {/* Index Finger */}
            <path
              d="M 37.5 49.5 C 40.5 48 44 48 46 49 C 47.2 50 46.5 51.8 44.5 52.2 C 42 52.5 39.5 52 37.5 51.5 Z"
              fill="url(#handSkinGrad)"
              stroke="#e11d48"
              strokeWidth="0.7"
              strokeLinejoin="round"
            />

            {/* Middle Finger */}
            <path
              d="M 37.5 53 C 41 52.5 45 52.5 47 54 C 48 55 47.5 57 45.5 57.5 C 42.5 58 39.5 56.5 37 55 Z"
              fill="url(#handSkinGrad)"
              stroke="#e11d48"
              strokeWidth="0.7"
              strokeLinejoin="round"
            />

            {/* Ring Finger */}
            <path
              d="M 36.5 56.5 C 39.5 56.5 43 57 44.5 58.5 C 45.5 59.5 45 61.2 43 61.8 C 40.5 62 37.5 60.5 36 58.5 Z"
              fill="url(#handSkinGrad)"
              stroke="#e11d48"
              strokeWidth="0.7"
              strokeLinejoin="round"
            />

            {/* Pinky Finger */}
            <path
              d="M 34.5 59.5 C 37 60.5 40 61.5 41.5 63 C 42.2 64 41.5 65.2 39.5 65.2 C 37.5 65.2 35 63.5 34 61.5 Z"
              fill="url(#handSkinGrad)"
              stroke="#e11d48"
              strokeWidth="0.7"
              strokeLinejoin="round"
            />
          </g>
        </g>

        {/* --- UNIFIED RIGHT ARM FOREARM (PERFECT CONTINUATION OF ELBOW) --- */}
        <g filter="url(#hugDepthShadow)">
          {/* Continuous Forearm - perfectly joins outer elbow (94, 48) to (87, 63) and wraps to cuff */}
          <path
            d="M 94 48 C 94 56 89 65 76 65 C 72 65 69 61 68 57 L 73 54 C 82 54 87 49 87 41 L 94 48 Z"
            fill="url(#buzoGradRight)"
            stroke="#818cf8"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />

          {/* Elbow natural fabric crease */}
          <path
            d="M 94 48 Q 89 51 86 47"
            stroke="#3730a3"
            strokeWidth="1.2"
            strokeLinecap="round"
          />

          {/* Right Ribbed Cuff (Puño del buzo) */}
          <path
            d="M 73 59 L 68 52 L 65 54 L 70 61 Z"
            fill="url(#cuffGrad)"
            stroke="#e0e7ff"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
          {/* Cuff ribbing lines */}
          <line x1="71.5" y1="58.5" x2="66.5" y2="51.5" stroke="#312e81" strokeWidth="0.7" />
          <line x1="70.5" y1="59.5" x2="65.5" y2="52.5" stroke="#312e81" strokeWidth="0.7" />

          {/* Right Palm & Fingers naturally emerging from cuff */}
          <g>
            {/* Palm */}
            <ellipse
              cx="64"
              cy="53"
              rx="4"
              ry="3.5"
              transform="rotate(-15 64 53)"
              fill="url(#handSkinGrad)"
              stroke="#f43f5e"
              strokeWidth="0.6"
            />

            {/* Thumb */}
            <path
              d="M 66 49 C 64.5 46.5 62.5 45 61 45.5 C 59.5 46 60 48.5 62 50 C 63.5 51 65 50.5 66 49 Z"
              fill="url(#handSkinGrad)"
              stroke="#e11d48"
              strokeWidth="0.7"
              strokeLinejoin="round"
            />

            {/* Index Finger */}
            <path
              d="M 62.5 49.5 C 59.5 48 56 48 54 49 C 52.8 50 53.5 51.8 55.5 52.2 C 58 52.5 60.5 52 62.5 51.5 Z"
              fill="url(#handSkinGrad)"
              stroke="#e11d48"
              strokeWidth="0.7"
              strokeLinejoin="round"
            />

            {/* Middle Finger */}
            <path
              d="M 62.5 53 C 59 52.5 55 52.5 53 54 C 52 55 52.5 57 54.5 57.5 C 57.5 58 60.5 56.5 63 55 Z"
              fill="url(#handSkinGrad)"
              stroke="#e11d48"
              strokeWidth="0.7"
              strokeLinejoin="round"
            />

            {/* Ring Finger */}
            <path
              d="M 63.5 56.5 C 60.5 56.5 57 57 55.5 58.5 C 54.5 59.5 55 61.2 57 61.8 C 59.5 62 62.5 60.5 64 58.5 Z"
              fill="url(#handSkinGrad)"
              stroke="#e11d48"
              strokeWidth="0.7"
              strokeLinejoin="round"
            />

            {/* Pinky Finger */}
            <path
              d="M 65.5 59.5 C 63 60.5 60 61.5 58.5 63 C 57.8 64 58.5 65.2 60.5 65.2 C 62.5 65.2 65 63.5 66 61.5 Z"
              fill="url(#handSkinGrad)"
              stroke="#e11d48"
              strokeWidth="0.7"
              strokeLinejoin="round"
            />
          </g>
        </g>

        {/* Small warm sparkle atop the heart */}
        <path
          d="M 50 10 Q 50 14 53 14 Q 50 14 50 18 Q 50 14 47 14 Q 50 14 50 10 Z"
          fill="#fbbf24"
        />
      </svg>
    </div>
  );
};

export const BrandLogo = EmbraceHeartLogo;

