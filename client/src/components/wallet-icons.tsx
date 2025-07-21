// Authentic wallet logos from cryptologos.cc and official sources
import React from 'react';

interface IconProps {
  className?: string;
}

// MetaMask - Official Fox Logo (based on cryptologos.cc)
export function MetaMaskIcon({ className }: IconProps) {
  return (
    <div className={`${className} flex items-center justify-center`}>
      <img 
        src="https://cryptologos.cc/logos/metamask-mask-logo.png" 
        alt="MetaMask"
        className="w-full h-full object-contain"
        onError={(e) => {
          // Fallback SVG if external image fails
          e.currentTarget.style.display = 'none';
          e.currentTarget.nextElementSibling.style.display = 'block';
        }}
      />
      <svg 
        className="w-full h-full hidden" 
        viewBox="0 0 64 64" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="64" height="64" rx="12" fill="#F6851B"/>
        <path d="M50.5 16L32 28L35.5 20.5L50.5 16Z" fill="#E2761B"/>
        <path d="M13.5 16L31.5 28.2L28 20.5L13.5 16Z" fill="#E4761B"/>
        <path d="M43 40L38.5 47.5L49.5 50.5L52.5 40L43 40Z" fill="#E4761B"/>
        <path d="M11.5 40L14.5 50.5L25.5 47.5L21 40L11.5 40Z" fill="#E4761B"/>
        <path d="M25 32L22 36.5L32.5 37L32 29L25 32Z" fill="#E4761B"/>
        <path d="M39 32L32 29L32.5 37L42 36.5L39 32Z" fill="#E4761B"/>
        <path d="M25.5 47.5L30.5 45L26 40.5L25.5 47.5Z" fill="#D7C1B3"/>
        <path d="M33.5 45L38.5 47.5L38 40.5L33.5 45Z" fill="#D7C1B3"/>
      </svg>
    </div>
  );
}

// Trust Wallet - Official Shield Logo
export function TrustWalletIcon({ className }: IconProps) {
  return (
    <div className={`${className} flex items-center justify-center`}>
      <img 
        src="https://cryptologos.cc/logos/trust-wallet-token-twt-logo.png" 
        alt="Trust Wallet"
        className="w-full h-full object-contain"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          e.currentTarget.nextElementSibling.style.display = 'block';
        }}
      />
      <svg className="w-full h-full hidden" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <rect width="64" height="64" rx="12" fill="#3375BB"/>
        <path d="M32 8L48 16V28C48 42 32 54 32 54S16 42 16 28V16L32 8Z" fill="white"/>
        <path d="M32 12L44 18V28C44 38 32 48 32 48S20 38 20 28V18L32 12Z" fill="#3375BB"/>
        <path d="M28 26L30 28L36 22" stroke="white" strokeWidth="2" fill="none"/>
      </svg>
    </div>
  );
}

// Coinbase Wallet - Official Blue Logo
export function CoinbaseIcon({ className }: IconProps) {
  return (
    <div className={`${className} flex items-center justify-center`}>
      <img 
        src="https://cryptologos.cc/logos/coinbase-coin-logo.png" 
        alt="Coinbase Wallet"
        className="w-full h-full object-contain"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          e.currentTarget.nextElementSibling.style.display = 'block';
        }}
      />
      <svg className="w-full h-full hidden" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <rect width="64" height="64" rx="12" fill="#0052FF"/>
        <circle cx="32" cy="32" r="18" fill="white"/>
        <rect x="26" y="26" width="12" height="12" rx="2" fill="#0052FF"/>
      </svg>
    </div>
  );
}

// Rainbow Wallet - Official Colorful Logo
export function RainbowIcon({ className }: IconProps) {
  return (
    <div className={`${className} flex items-center justify-center`}>
      <img 
        src="https://cryptologos.cc/logos/rainbow-token-rbt-logo.png" 
        alt="Rainbow"
        className="w-full h-full object-contain"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          e.currentTarget.nextElementSibling.style.display = 'block';
        }}
      />
      <svg className="w-full h-full hidden" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <rect width="64" height="64" rx="12" fill="#1A1B23"/>
        <defs>
          <linearGradient id="rainbow1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FF4081"/>
            <stop offset="33%" stopColor="#9C27B0"/>
            <stop offset="67%" stopColor="#3F51B5"/>
            <stop offset="100%" stopColor="#2196F3"/>
          </linearGradient>
        </defs>
        <path d="M32 44C42 44 50 36 50 26H46C46 34 40 40 32 40S18 34 18 26H14C14 36 22 44 32 44Z" fill="url(#rainbow1)"/>
        <path d="M32 36C38 36 42 32 42 26H38C38 30 35 34 32 34S26 30 26 26H22C22 32 26 36 32 36Z" fill="#FFC107"/>
      </svg>
    </div>
  );
}

// Phantom Wallet - Official Purple Logo
export function PhantomIcon({ className }: IconProps) {
  return (
    <div className={`${className} flex items-center justify-center`}>
      <img 
        src="https://cryptologos.cc/logos/phantom-ftm-logo.png" 
        alt="Phantom"
        className="w-full h-full object-contain"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          e.currentTarget.nextElementSibling.style.display = 'block';
        }}
      />
      <svg className="w-full h-full hidden" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <rect width="64" height="64" rx="12" fill="#AB9FF2"/>
        <path d="M32 8C44 8 48 20 48 26C48 38 32 48 32 48C32 48 16 38 16 26C16 20 20 8 32 8Z" fill="white"/>
        <circle cx="26" cy="24" r="2" fill="#AB9FF2"/>
        <circle cx="38" cy="24" r="2" fill="#AB9FF2"/>
        <path d="M20 36C20 32 24 28 32 28C40 28 44 32 44 36C44 44 32 50 32 50C32 50 20 44 20 36Z" fill="white"/>
      </svg>
    </div>
  );
}

// Binance Wallet - Official Gold Logo
export function BinanceIcon({ className }: IconProps) {
  return (
    <div className={`${className} flex items-center justify-center`}>
      <img 
        src="https://cryptologos.cc/logos/bnb-bnb-logo.png" 
        alt="Binance Wallet"
        className="w-full h-full object-contain"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          e.currentTarget.nextElementSibling.style.display = 'block';
        }}
      />
      <svg className="w-full h-full hidden" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <rect width="64" height="64" rx="12" fill="#F0B90B"/>
        <g fill="white">
          <path d="M24 20L32 12L40 20L36 24L32 20L28 24Z"/>
          <path d="M16 28L20 24L24 28L20 32Z"/>
          <path d="M44 28L48 24L44 20L40 24Z"/>
          <path d="M24 36L32 44L40 36L36 32L32 36L28 32Z"/>
        </g>
      </svg>
    </div>
  );
}

// WalletConnect - Official Blue Logo
export function WalletConnectIcon({ className }: IconProps) {
  return (
    <div className={`${className} flex items-center justify-center`}>
      <img 
        src="https://cryptologos.cc/logos/walletconnect-wct-logo.png" 
        alt="WalletConnect"
        className="w-full h-full object-contain"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          e.currentTarget.nextElementSibling.style.display = 'block';
        }}
      />
      <svg className="w-full h-full hidden" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <rect width="64" height="64" rx="12" fill="#3B99FC"/>
        <path d="M20 26C26 20 38 20 44 26L42 28C37 23 27 23 22 28L20 26Z" fill="white"/>
        <circle cx="24" cy="36" r="2" fill="white"/>
        <circle cx="32" cy="36" r="2" fill="white"/>
        <circle cx="40" cy="36" r="2" fill="white"/>
        <path d="M16 42C28 30 36 30 48 42" stroke="white" strokeWidth="2" fill="none"/>
      </svg>
    </div>
  );
}