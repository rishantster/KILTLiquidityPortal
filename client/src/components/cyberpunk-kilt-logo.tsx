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
            radial-gradient(ellipse at center, transparent 20%, rgba(255, 0, 102, 0.1) 21%, rgba(255, 0, 102, 0.1) 22%, transparent 23%),
            radial-gradient(ellipse at center, transparent 35%, rgba(255, 0, 102, 0.08) 36%, rgba(255, 0, 102, 0.08) 37%, transparent 38%),
            radial-gradient(ellipse at center, transparent 50%, rgba(255, 0, 102, 0.06) 51%, rgba(255, 0, 102, 0.06) 52%, transparent 53%),
            radial-gradient(ellipse at center, transparent 65%, rgba(255, 0, 102, 0.04) 66%, rgba(255, 0, 102, 0.04) 67%, transparent 68%);
          animation: fingerprint-scan-1 6s ease-in-out infinite;
          opacity: 0.8;
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
            repeating-conic-gradient(from 0deg, transparent 0deg, rgba(255, 0, 102, 0.03) 2deg, transparent 4deg),
            radial-gradient(ellipse at 30% 30%, transparent 25%, rgba(255, 0, 102, 0.05) 26%, rgba(255, 0, 102, 0.05) 28%, transparent 29%),
            radial-gradient(ellipse at 70% 70%, transparent 40%, rgba(255, 0, 102, 0.04) 41%, rgba(255, 0, 102, 0.04) 43%, transparent 44%);
          animation: fingerprint-scan-2 8s ease-in-out infinite reverse;
          opacity: 0.6;
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
            transform: scale(0.8) rotate(0deg);
            opacity: 0.3;
          }
          25% { 
            transform: scale(1) rotate(90deg);
            opacity: 0.8;
          }
          50% { 
            transform: scale(1.1) rotate(180deg);
            opacity: 0.6;
          }
          75% { 
            transform: scale(0.9) rotate(270deg);
            opacity: 0.8;
          }
          100% { 
            transform: scale(0.8) rotate(360deg);
            opacity: 0.3;
          }
        }

        @keyframes fingerprint-scan-2 {
          0% { 
            transform: scale(1.2) rotate(0deg);
            opacity: 0.2;
          }
          30% { 
            transform: scale(0.9) rotate(-120deg);
            opacity: 0.6;
          }
          60% { 
            transform: scale(1.1) rotate(-240deg);
            opacity: 0.4;
          }
          100% { 
            transform: scale(1.2) rotate(-360deg);
            opacity: 0.2;
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