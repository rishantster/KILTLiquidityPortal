import React from 'react';
import kiltLogoCyberpunk from '@assets/image_1754557998606.png';

interface CyberpunkKiltLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function CyberpunkKiltLogo({ size = 'md', className = '' }: CyberpunkKiltLogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32'
  };

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      <div className="cyberpunk-logo-container relative w-full h-full">
        {/* Main logo */}
        <img 
          src={kiltLogoCyberpunk}
          alt="KILT"
          className="w-full h-full object-cover rounded-full cyberpunk-logo-main"
        />
        
        {/* Glitch effect overlay */}
        <div className="absolute inset-0 cyberpunk-glitch-overlay rounded-full"></div>
        
        {/* Data stream effects */}
        <div className="absolute -inset-2 cyberpunk-data-stream opacity-30"></div>
        
        {/* Neon glow ring */}
        <div className="absolute -inset-1 cyberpunk-neon-ring rounded-full"></div>
      </div>

      <style>{`
        .cyberpunk-logo-container {
          filter: drop-shadow(0 0 10px rgba(255, 0, 102, 0.5));
        }

        .cyberpunk-logo-main {
          animation: cyberpunk-flicker 3s infinite linear;
          position: relative;
          z-index: 2;
        }

        .cyberpunk-glitch-overlay {
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 0, 102, 0.1) 25%,
            transparent 50%,
            rgba(0, 255, 255, 0.1) 75%,
            transparent 100%
          );
          animation: cyberpunk-glitch-scan 2.5s infinite ease-in-out;
          z-index: 3;
        }

        .cyberpunk-data-stream {
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(255, 0, 102, 0.1) 2px,
            rgba(255, 0, 102, 0.1) 4px
          );
          animation: cyberpunk-data-flow 4s infinite linear;
          z-index: 1;
        }

        .cyberpunk-neon-ring {
          border: 2px solid transparent;
          background: linear-gradient(45deg, #ff0066, #00ffff, #ff0066) border-box;
          mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
          mask-composite: exclude;
          animation: cyberpunk-ring-pulse 2s infinite ease-in-out;
          z-index: 1;
        }

        @keyframes cyberpunk-flicker {
          0% { opacity: 1; }
          95% { opacity: 1; }
          96% { opacity: 0.8; }
          97% { opacity: 1; }
          98% { opacity: 0.9; }
          99% { opacity: 1; }
          100% { opacity: 1; }
        }

        @keyframes cyberpunk-glitch-scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        @keyframes cyberpunk-data-flow {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }

        @keyframes cyberpunk-ring-pulse {
          0% { 
            transform: scale(1);
            box-shadow: 0 0 10px rgba(255, 0, 102, 0.5), inset 0 0 10px rgba(255, 0, 102, 0.2);
          }
          50% { 
            transform: scale(1.05);
            box-shadow: 0 0 20px rgba(255, 0, 102, 0.8), inset 0 0 20px rgba(255, 0, 102, 0.3);
          }
          100% { 
            transform: scale(1);
            box-shadow: 0 0 10px rgba(255, 0, 102, 0.5), inset 0 0 10px rgba(255, 0, 102, 0.2);
          }
        }

        /* Enhanced cyberpunk effects on hover */
        .cyberpunk-logo-container:hover .cyberpunk-logo-main {
          animation: cyberpunk-intense-flicker 0.5s infinite;
        }

        .cyberpunk-logo-container:hover .cyberpunk-glitch-overlay {
          animation: cyberpunk-fast-scan 0.8s infinite ease-in-out;
        }

        @keyframes cyberpunk-intense-flicker {
          0% { opacity: 1; filter: hue-rotate(0deg); }
          20% { opacity: 0.8; filter: hue-rotate(90deg); }
          40% { opacity: 1; filter: hue-rotate(180deg); }
          60% { opacity: 0.9; filter: hue-rotate(270deg); }
          80% { opacity: 1; filter: hue-rotate(360deg); }
          100% { opacity: 1; filter: hue-rotate(0deg); }
        }

        @keyframes cyberpunk-fast-scan {
          0% { transform: translateX(-100%) scaleX(2); opacity: 0.5; }
          50% { opacity: 1; }
          100% { transform: translateX(100%) scaleX(2); opacity: 0.5; }
        }

        /* Mobile optimization */
        @media (max-width: 768px) {
          .cyberpunk-logo-container {
            filter: drop-shadow(0 0 5px rgba(255, 0, 102, 0.3));
          }
          
          .cyberpunk-neon-ring {
            border-width: 1px;
          }
        }
      `}</style>
    </div>
  );
}

export default CyberpunkKiltLogo;