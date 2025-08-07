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
        
        {/* Dynamic energy rings */}
        <div className="absolute -inset-2 energy-ring-1"></div>
        <div className="absolute -inset-3 energy-ring-2"></div>
        
        {/* Pulse effect */}
        <div className="absolute inset-0 pulse-effect"></div>
      </div>

      <style>{`
        .modern-logo-container {
          filter: drop-shadow(0 0 15px rgba(219, 70, 139, 0.4));
          overflow: hidden;
        }

        .modern-logo-main {
          animation: modern-float 3s ease-in-out infinite;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .particles-bg {
          background-image: radial-gradient(2px 2px at 20px 30px, rgba(219, 70, 139, 0.4), transparent),
                            radial-gradient(2px 2px at 40px 70px, rgba(219, 70, 139, 0.3), transparent),
                            radial-gradient(1px 1px at 90px 40px, rgba(219, 70, 139, 0.5), transparent),
                            radial-gradient(1px 1px at 130px 80px, rgba(219, 70, 139, 0.3), transparent);
          background-size: 200px 200px;
          animation: modern-particles 15s linear infinite;
          opacity: 0.6;
        }

        .energy-ring-1 {
          border: 2px solid transparent;
          border-radius: 50%;
          background: conic-gradient(from 0deg, transparent, #db468b, transparent, #db468b, transparent) border-box;
          mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
          mask-composite: exclude;
          animation: modern-spin 4s linear infinite;
          opacity: 0.7;
        }

        .energy-ring-2 {
          border: 1px solid transparent;
          border-radius: 50%;
          background: conic-gradient(from 180deg, transparent, #db468b, transparent) border-box;
          mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
          mask-composite: exclude;
          animation: modern-spin-reverse 6s linear infinite;
          opacity: 0.5;
        }

        .pulse-effect {
          background: radial-gradient(circle, rgba(219, 70, 139, 0.1) 0%, transparent 70%);
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
            filter: drop-shadow(0 0 8px rgba(219, 70, 139, 0.3));
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