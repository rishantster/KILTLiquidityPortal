// Official wallet logos as SVG components
import React from 'react';

export const MetaMaskIcon = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M36.0112 3L21.7206 13.7633L24.6007 6.62735L36.0112 3Z" fill="#E17726"/>
    <path d="M4.01416 3L18.1906 13.8761L15.4243 6.62735L4.01416 3Z" fill="#E27625"/>
    <path d="M30.7533 26.8577L26.9317 32.4871L35.2472 34.8124L37.6901 27.0152L30.7533 26.8577Z" fill="#E27625"/>
    <path d="M2.33463 27.0152L4.77729 34.8124L13.0928 32.4871L9.27115 26.8577L2.33463 27.0152Z" fill="#E27625"/>
    <path d="M12.5861 17.4111L10.1783 21.0513L18.4058 21.4189L18.1126 12.4032L12.5861 17.4111Z" fill="#E27625"/>
    <path d="M27.4384 17.4111L21.8237 12.2905L21.7206 21.4189L29.9481 21.0513L27.4384 17.4111Z" fill="#E27625"/>
    <path d="M13.0928 32.4871L17.9378 30.1618L13.7842 27.0717L13.0928 32.4871Z" fill="#D5BFB2"/>
    <path d="M22.087 30.1618L26.9317 32.4871L26.2404 27.0717L22.087 30.1618Z" fill="#D5BFB2"/>
  </svg>
);

export const TrustWalletIcon = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="12" fill="#3375BB"/>
    <path d="M20 8.5C17.5 8.5 15.5 10.5 15.5 13V16.5H13.5C12.1193 16.5 11 17.6193 11 19V29C11 30.3807 12.1193 31.5 13.5 31.5H26.5C27.8807 31.5 29 30.3807 29 29V19C29 17.6193 27.8807 16.5 26.5 16.5H24.5V13C24.5 10.5 22.5 8.5 20 8.5ZM20 10.5C21.3807 10.5 22.5 11.6193 22.5 13V16.5H17.5V13C17.5 11.6193 18.6193 10.5 20 10.5Z" fill="white"/>
  </svg>
);

export const RainbowIcon = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="rainbow-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FF6B6B"/>
        <stop offset="16.66%" stopColor="#FF8E53"/>
        <stop offset="33.33%" stopColor="#FF6B9D"/>
        <stop offset="50%" stopColor="#C44FFF"/>
        <stop offset="66.66%" stopColor="#8B5CF6"/>
        <stop offset="83.33%" stopColor="#06B6D4"/>
        <stop offset="100%" stopColor="#10B981"/>
      </linearGradient>
    </defs>
    <rect width="40" height="40" rx="12" fill="url(#rainbow-gradient)"/>
    <path d="M20 10C13.375 10 8 15.375 8 22H12C12 17.575 15.575 14 20 14C24.425 14 28 17.575 28 22H32C32 15.375 26.625 10 20 10Z" fill="white"/>
    <path d="M20 18C16.6875 18 14 20.6875 14 24H18C18 22.8975 18.8975 22 20 22C21.1025 22 22 22.8975 22 24H26C26 20.6875 23.3125 18 20 18Z" fill="white"/>
    <circle cx="20" cy="28" r="4" fill="white"/>
  </svg>
);

export const CoinbaseIcon = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="12" fill="#0052FF"/>
    <path d="M20 28C24.4183 28 28 24.4183 28 20C28 15.5817 24.4183 12 20 12C15.5817 12 12 15.5817 12 20C12 24.4183 15.5817 28 20 28Z" fill="white"/>
    <path d="M16.5 18.5H23.5V21.5H16.5V18.5Z" fill="#0052FF"/>
  </svg>
);

export const PhantomIcon = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="phantom-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#AB9FF2"/>
        <stop offset="100%" stopColor="#4D2CF7"/>
      </linearGradient>
    </defs>
    <rect width="40" height="40" rx="12" fill="url(#phantom-gradient)"/>
    <path d="M31 8H9C8.45 8 8 8.45 8 9V31C8 31.55 8.45 32 9 32H16.59L20 28.59L23.41 32H31C31.55 32 32 31.55 32 31V9C32 8.45 31.55 8 31 8ZM20 26L14 20H26L20 26Z" fill="white"/>
  </svg>
);

export const BinanceIcon = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="12" fill="#F3BA2F"/>
    <path d="M15.5 17L20 12.5L24.5 17L27 14.5L20 7.5L13 14.5L15.5 17Z" fill="white"/>
    <path d="M8.5 20L11 17.5L13.5 20L11 22.5L8.5 20Z" fill="white"/>
    <path d="M15.5 23L20 27.5L24.5 23L27 25.5L20 32.5L13 25.5L15.5 23Z" fill="white"/>
    <path d="M26.5 20L29 17.5L31.5 20L29 22.5L26.5 20Z" fill="white"/>
    <rect x="17" y="17" width="6" height="6" rx="1" fill="white"/>
  </svg>
);

export const WalletConnectIcon = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="12" fill="#3B99FC"/>
    <path d="M12.5 16C16.5 12 23.5 12 27.5 16L28 16.5C28.25 16.75 28.25 17.25 28 17.5L26.5 19C26.25 19.25 25.75 19.25 25.5 19L24.75 18.25C22.25 15.75 17.75 15.75 15.25 18.25L14.5 19C14.25 19.25 13.75 19.25 13.5 19L12 17.5C11.75 17.25 11.75 16.75 12 16.5L12.5 16ZM31 20.5L32.25 21.75C32.5 22 32.5 22.5 32.25 22.75L26 29C25.75 29.25 25.25 29.25 25 29L20 24C19.9 23.9 19.75 23.9 19.65 24L14.65 29C14.4 29.25 13.9 29.25 13.65 29L7.5 22.75C7.25 22.5 7.25 22 7.5 21.75L8.75 20.5C9 20.25 9.5 20.25 9.75 20.5L14.75 25.5C14.85 25.6 15 25.6 15.1 25.5L20.1 20.5C20.35 20.25 20.85 20.25 21.1 20.5L26.1 25.5C26.2 25.6 26.35 25.6 26.45 25.5L31.45 20.5C31.7 20.25 32.2 20.25 32.45 20.5H31Z" fill="white"/>
  </svg>
);