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
      <div className="clean-logo-container relative w-full h-full">
        {/* Main logo with subtle glow */}
        <img 
          src={kiltLogoCyberpunk}
          alt="KILT"
          className="w-full h-full object-cover rounded-full clean-logo-main"
        />
        
        {/* Subtle rotating ring */}
        <div className="absolute -inset-1 clean-rotating-ring rounded-full"></div>
      </div>

      <style>{`
        .clean-logo-container {
          filter: drop-shadow(0 0 8px rgba(255, 0, 102, 0.3));
        }

        .clean-logo-main {
          position: relative;
          z-index: 2;
          transition: all 0.3s ease;
        }

        .clean-rotating-ring {
          border: 1px solid transparent;
          background: linear-gradient(45deg, transparent, #ff0066, transparent, #ff0066) border-box;
          mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
          mask-composite: exclude;
          animation: clean-rotate 8s infinite linear;
          opacity: 0.6;
          z-index: 1;
        }

        @keyframes clean-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Subtle hover effect */
        .clean-logo-container:hover .clean-logo-main {
          transform: scale(1.05);
          filter: brightness(1.1);
        }

        .clean-logo-container:hover .clean-rotating-ring {
          opacity: 1;
          animation: clean-rotate 2s infinite linear;
        }

        /* Mobile optimization */
        @media (max-width: 768px) {
          .clean-logo-container {
            filter: drop-shadow(0 0 4px rgba(255, 0, 102, 0.2));
          }
          
          .clean-rotating-ring {
            border-width: 0.5px;
          }
        }
      `}</style>
    </div>
  );
}

export default CyberpunkKiltLogo;