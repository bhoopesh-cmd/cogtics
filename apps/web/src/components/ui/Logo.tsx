import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  color?: string;
}

const Logo: React.FC<LogoProps> = ({ className = "", size = 40, color = "white" }) => {
  // Adjust font size based on logo icon size for visual balance
  const fontSize = Math.max(16, size * 0.55); 

  return (
    <div className={`inline-flex flex-row items-center gap-3 ${className}`}>
      {/* Icon Container */}
      <div style={{ width: size, height: size, flexShrink: 0 }} className="relative z-10">
        {/* Glow effect behind logo */}
        <div className="absolute inset-0 bg-[#ff6500] blur-xl opacity-20 rounded-full"></div>
        
        {/* C Symbol */}
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10"
        >
          <defs>
            {/* Outer circle */}
            <circle id="outer" cx="100" cy="100" r="92" />
            {/* Inner circle - offset 2px to the right for asymmetric tension */}
            <circle id="inner" cx="70" cy="100" r="68" />
            
            {/* Rectangle to cut the C opening */}
            <rect id="opening" x="100" y="0" width="100" height="200" />
            
            {/* Micro diagonal cut for upper terminal */}
            <rect 
              id="microCut" 
              x="165" 
              y="35" 
              width="8" 
              height="30" 
              transform="rotate(-12 169 50)"
            />
            
            {/* Slight flattening shape at opening */}
            <path 
              id="flatten"
              d="M 98 45 L 102 45 L 102 55 L 98 55 Z
                 M 98 145 L 102 145 L 102 155 L 98 155 Z"
            />
            
            {/* Clip path combining all operations */}
            <clipPath id="cShape">
              <use href="#outer" />
            </clipPath>
            
            <mask id="cMask">
              <rect width="200" height="200" fill="white" />
              <use href="#opening" fill="black" />
              <use href="#inner" fill="black" />
              <use href="#microCut" fill="black" />
            </mask>
          </defs>
          
          {/* Apply the C shape */}
          <rect 
            width="200" 
            height="200" 
            fill={color} 
            clipPath="url(#cShape)" 
            mask="url(#cMask)"
          />
        </svg>
      </div>
      
      {/* Wordmark - Side layout */}
      <div 
        className="select-none flex flex-col justify-center relative z-10"
        style={{ 
          height: size,
        }}
      >
        <span 
            style={{
                fontSize: fontSize,
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                fontWeight: 700,
                letterSpacing: '-0.04em',
                color: color,
                lineHeight: 1,
            }}
            className="inline-block relative tracking-tighter"
        >
          cogt<span className="relative inline-block text-white">
            <span className="opacity-0">i</span>
            <span 
              className="absolute inset-0 flex items-start justify-center text-[#ff6500]"
              style={{ transform: 'scale(0.9)', transformOrigin: 'center bottom' }}
            >
              i
            </span>
          </span>cs
        </span>
      </div>
    </div>
  );
};

export default Logo;

