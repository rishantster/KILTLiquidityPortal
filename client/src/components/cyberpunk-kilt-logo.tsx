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
          <svg className="fingerprint-svg-1" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <path d="M20,50 Q30,30 50,35 Q70,40 80,50 Q70,60 50,65 Q30,70 20,50" 
                  fill="none" stroke="rgba(255, 0, 102, 0.3)" strokeWidth="0.5"/>
            <path d="M25,50 Q32,35 50,38 Q68,42 75,50 Q68,58 50,62 Q32,65 25,50" 
                  fill="none" stroke="rgba(255, 0, 102, 0.25)" strokeWidth="0.4"/>
            <path d="M30,50 Q35,40 50,42 Q65,45 70,50 Q65,55 50,58 Q35,60 30,50" 
                  fill="none" stroke="rgba(255, 0, 102, 0.2)" strokeWidth="0.3"/>
            <path d="M35,50 Q40,45 50,46 Q60,48 65,50 Q60,52 50,54 Q40,55 35,50" 
                  fill="none" stroke="rgba(255, 0, 102, 0.15)" strokeWidth="0.2"/>
          </svg>
        </div>
        <div className="absolute -inset-3 energy-ring-2">
          <svg className="fingerprint-svg-2" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <path d="M15,50 Q25,25 50,30 Q75,35 85,50 Q75,65 50,70 Q25,75 15,50" 
                  fill="none" stroke="rgba(255, 0, 102, 0.2)" strokeWidth="0.4"/>
            <path d="M20,50 Q28,32 50,35 Q72,38 80,50 Q72,62 50,65 Q28,68 20,50" 
                  fill="none" stroke="rgba(255, 0, 102, 0.18)" strokeWidth="0.3"/>
            <path d="M25,50 Q32,38 50,40 Q68,42 75,50 Q68,58 50,60 Q32,62 25,50" 
                  fill="none" stroke="rgba(255, 0, 102, 0.15)" strokeWidth="0.25"/>
            <path d="M30,50 Q36,42 50,44 Q64,46 70,50 Q64,54 50,56 Q36,58 30,50" 
                  fill="none" stroke="rgba(255, 0, 102, 0.12)" strokeWidth="0.2"/>
            <path d="M40,50 Q44,46 50,47 Q56,48 60,50 Q56,52 50,53 Q44,54 40,50" 
                  fill="none" stroke="rgba(255, 0, 102, 0.1)" strokeWidth="0.15"/>
          </svg>
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

        .fingerprint-svg-1 {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          animation: fingerprint-scan-1 6s ease-in-out infinite;
          opacity: 0.8;
          overflow: hidden;
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

        .fingerprint-svg-2 {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          animation: fingerprint-scan-2 8s ease-in-out infinite reverse;
          opacity: 0.6;
          overflow: hidden;
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

        .modern-logo-container:hover .fingerprint-svg-1 {
          animation: fingerprint-scan-1 2s ease-in-out infinite;
        }

        .modern-logo-container:hover .fingerprint-svg-2 {
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