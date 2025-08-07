import React from 'react';
import kiltLogo from '@assets/KILT_400x400_transparent_1754560178965.png';

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
      <div className="modern-logo-container relative w-full h-full">
        {/* Animated background particles */}
        <div className="absolute inset-0 particles-bg"></div>
        
        {/* Main logo with modern effects */}
        <img 
          src={kiltLogo}
          alt="KILT"
          className="w-full h-full object-contain modern-logo-main relative z-10"
        />
        
        {/* Dynamic energy rings with fingerprint patterns */}
        <div className="absolute -inset-2 energy-ring-1">
          <div className="fingerprint-pattern-1"></div>
        </div>
        <div className="absolute -inset-3 energy-ring-2">
          <div className="fingerprint-pattern-2"></div>
        </div>
        
        {/* Pulse effect */}
        <div className="absolute inset-0 pulse-effect"></div>
      </div>

      <style>{`
        .modern-logo-container {
          filter: drop-shadow(0 0 15px rgba(255, 0, 102, 0.4));
          overflow: hidden;
        }

        .modern-logo-main {
          animation: modern-float 3s ease-in-out infinite;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .particles-bg {
          background-image: radial-gradient(2px 2px at 20px 30px, rgba(255, 0, 102, 0.4), transparent),
                            radial-gradient(2px 2px at 40px 70px, rgba(255, 0, 102, 0.3), transparent),
                            radial-gradient(1px 1px at 90px 40px, rgba(255, 0, 102, 0.5), transparent),
                            radial-gradient(1px 1px at 130px 80px, rgba(255, 0, 102, 0.3), transparent);
          background-size: 200px 200px;
          animation: modern-particles 15s linear infinite;
          opacity: 0.6;
        }

        .energy-ring-1 {
          border: 2px solid transparent;
          border-radius: 50%;
          background: conic-gradient(from 0deg, transparent, #ff0066, transparent, #ff0066, transparent) border-box;
          mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
          mask-composite: exclude;
          animation: modern-spin 4s linear infinite;
          opacity: 0.7;
          position: relative;
        }

        .fingerprint-pattern-1 {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background-image: 
            /* Outer whorl */
            conic-gradient(from 0deg at 50% 50%, 
              transparent 0deg, rgba(255, 0, 102, 0.1) 10deg, transparent 20deg,
              transparent 30deg, rgba(255, 0, 102, 0.08) 40deg, transparent 50deg,
              transparent 60deg, rgba(255, 0, 102, 0.1) 70deg, transparent 80deg,
              transparent 90deg, rgba(255, 0, 102, 0.06) 100deg, transparent 110deg,
              transparent 120deg, rgba(255, 0, 102, 0.08) 130deg, transparent 140deg,
              transparent 150deg, rgba(255, 0, 102, 0.1) 160deg, transparent 170deg,
              transparent 180deg, rgba(255, 0, 102, 0.07) 190deg, transparent 200deg,
              transparent 210deg, rgba(255, 0, 102, 0.09) 220deg, transparent 230deg,
              transparent 240deg, rgba(255, 0, 102, 0.06) 250deg, transparent 260deg,
              transparent 270deg, rgba(255, 0, 102, 0.08) 280deg, transparent 290deg,
              transparent 300deg, rgba(255, 0, 102, 0.1) 310deg, transparent 320deg,
              transparent 330deg, rgba(255, 0, 102, 0.05) 340deg, transparent 350deg
            ),
            /* Inner ridge pattern */
            radial-gradient(ellipse 80% 60% at 45% 55%, 
              transparent 25%, rgba(255, 0, 102, 0.06) 26%, transparent 28%,
              transparent 35%, rgba(255, 0, 102, 0.04) 36%, transparent 38%,
              transparent 45%, rgba(255, 0, 102, 0.05) 46%, transparent 48%,
              transparent 55%, rgba(255, 0, 102, 0.03) 56%, transparent 58%
            );
          animation: fingerprint-scan-1 6s ease-in-out infinite;
          opacity: 0.8;
          mask: radial-gradient(circle at center, black 0%, black 85%, transparent 100%);
        }

        .energy-ring-2 {
          border: 1px solid transparent;
          border-radius: 50%;
          background: conic-gradient(from 180deg, transparent, #ff0066, transparent) border-box;
          mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
          mask-composite: exclude;
          animation: modern-spin-reverse 6s linear infinite;
          opacity: 0.5;
          position: relative;
        }

        .fingerprint-pattern-2 {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background-image: 
            /* Spiral fingerprint ridges */
            conic-gradient(from 45deg at 60% 40%, 
              transparent 0deg, rgba(255, 0, 102, 0.05) 15deg, transparent 30deg,
              transparent 45deg, rgba(255, 0, 102, 0.04) 60deg, transparent 75deg,
              transparent 90deg, rgba(255, 0, 102, 0.06) 105deg, transparent 120deg,
              transparent 135deg, rgba(255, 0, 102, 0.03) 150deg, transparent 165deg,
              transparent 180deg, rgba(255, 0, 102, 0.05) 195deg, transparent 210deg,
              transparent 225deg, rgba(255, 0, 102, 0.04) 240deg, transparent 255deg,
              transparent 270deg, rgba(255, 0, 102, 0.06) 285deg, transparent 300deg,
              transparent 315deg, rgba(255, 0, 102, 0.03) 330deg, transparent 345deg
            ),
            /* Arc patterns like real fingerprints */
            radial-gradient(ellipse 70% 40% at 30% 70%, 
              transparent 20%, rgba(255, 0, 102, 0.04) 21%, transparent 23%,
              transparent 30%, rgba(255, 0, 102, 0.03) 31%, transparent 33%,
              transparent 40%, rgba(255, 0, 102, 0.05) 41%, transparent 43%
            ),
            radial-gradient(ellipse 60% 50% at 70% 30%, 
              transparent 25%, rgba(255, 0, 102, 0.03) 26%, transparent 28%,
              transparent 35%, rgba(255, 0, 102, 0.04) 36%, transparent 38%
            );
          animation: fingerprint-scan-2 8s ease-in-out infinite reverse;
          opacity: 0.6;
          mask: radial-gradient(circle at center, black 0%, black 90%, transparent 100%);
        }

        .pulse-effect {
          background: radial-gradient(circle, rgba(255, 0, 102, 0.1) 0%, transparent 70%);
          animation: modern-pulse 2s ease-in-out infinite;
          border-radius: 50%;
        }

        @keyframes modern-float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-8px) rotate(1deg); }
          66% { transform: translateY(-4px) rotate(-1deg); }
        }

        @keyframes modern-particles {
          0% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(30px, -30px) rotate(120deg); }
          66% { transform: translate(-20px, 20px) rotate(240deg); }
          100% { transform: translate(0, 0) rotate(360deg); }
        }

        @keyframes modern-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes modern-spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }

        @keyframes modern-pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 0.8; }
        }

        @keyframes fingerprint-scan-1 {
          0% { 
            transform: scale(0.95) rotate(0deg);
            opacity: 0.4;
          }
          25% { 
            transform: scale(1.05) rotate(90deg);
            opacity: 0.8;
          }
          50% { 
            transform: scale(0.98) rotate(180deg);
            opacity: 0.6;
          }
          75% { 
            transform: scale(1.02) rotate(270deg);
            opacity: 0.7;
          }
          100% { 
            transform: scale(0.95) rotate(360deg);
            opacity: 0.4;
          }
        }

        @keyframes fingerprint-scan-2 {
          0% { 
            transform: scale(1.08) rotate(0deg);
            opacity: 0.3;
          }
          30% { 
            transform: scale(0.92) rotate(-108deg);
            opacity: 0.6;
          }
          60% { 
            transform: scale(1.05) rotate(-216deg);
            opacity: 0.5;
          }
          100% { 
            transform: scale(1.08) rotate(-360deg);
            opacity: 0.3;
          }
        }

        /* Enhanced hover effects */
        .modern-logo-container:hover .modern-logo-main {
          transform: scale(1.1) rotate(5deg);
          filter: brightness(1.2) saturate(1.3);
        }

        .modern-logo-container:hover .energy-ring-1 {
          animation: modern-spin 1s linear infinite;
          opacity: 1;
        }

        .modern-logo-container:hover .energy-ring-2 {
          animation: modern-spin-reverse 1.5s linear infinite;
          opacity: 0.8;
        }

        .modern-logo-container:hover .fingerprint-pattern-1 {
          animation: fingerprint-scan-1 2s ease-in-out infinite;
        }

        .modern-logo-container:hover .fingerprint-pattern-2 {
          animation: fingerprint-scan-2 3s ease-in-out infinite reverse;
        }

        .modern-logo-container:hover .particles-bg {
          animation: modern-particles 5s linear infinite;
          opacity: 1;
        }

        .modern-logo-container:hover .pulse-effect {
          animation: modern-pulse 0.8s ease-in-out infinite;
        }

        /* Mobile optimization */
        @media (max-width: 768px) {
          .modern-logo-container {
            filter: drop-shadow(0 0 8px rgba(255, 0, 102, 0.3));
          }
          
          .energy-ring-1, .energy-ring-2 {
            border-width: 1px;
          }

          @keyframes modern-float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-4px); }
          }
        }
      `}</style>
    </div>
  );
}

export default CyberpunkKiltLogo;