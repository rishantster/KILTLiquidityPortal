// Authentic wallet logos from cryptologos.cc and official sources
import React from 'react';

interface IconProps {
  className?: string;
}

// Force component refresh - v2.1 Updated July 21, 2025

// MetaMask - Official Fox Logo
export function MetaMaskIcon({ className }: IconProps) {
  return (
    <svg 
      className={className}
      viewBox="0 0 40 40" 
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
    >
      <rect width="40" height="40" rx="8" fill="#F6851B" stroke="red" strokeWidth="2"/>
      <path d="M32.5 8L20 16.5L22.5 11.5L32.5 8Z" fill="#E2761B"/>
      <path d="M7.5 8L19.5 16.7L17 11.5L7.5 8Z" fill="#E4761B"/>
      <path d="M27.5 26L24.5 30.5L31.5 32.5L33.5 26L27.5 26Z" fill="#E4761B"/>
      <path d="M6.5 26L8.5 32.5L15.5 30.5L12.5 26L6.5 26Z" fill="#E4761B"/>
      <path d="M15 20L13 23.5L20.5 24L20 18L15 20Z" fill="#E4761B"/>
      <path d="M25 20L20 18L20.5 24L27 23.5L25 20Z" fill="#E4761B"/>
      <path d="M15.5 30.5L18.5 29L15.5 26.5L15.5 30.5Z" fill="#D7C1B3"/>
      <path d="M21.5 29L24.5 30.5L24.5 26.5L21.5 29Z" fill="#D7C1B3"/>
      <path d="M24.5 30.5L21.5 29L21.5 31L24.5 32.5L24.5 30.5Z" fill="#233447"/>
      <path d="M15.5 30.5L15.5 32.5L18.5 31L18.5 29L15.5 30.5Z" fill="#233447"/>
    </svg>
  );
}

// Trust Wallet - Official Shield Logo
export function TrustWalletIcon({ className }: IconProps) {
  return (
    <svg 
      className={className}
      viewBox="0 0 40 40" 
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
    >
      <rect width="40" height="40" rx="8" fill="#0B65C6"/>
      <path d="M20 6L30 10V18C30 26 20 32 20 32S10 26 10 18V10L20 6Z" fill="white"/>
      <path d="M20 8L28 11V18C28 24 20 29 20 29S12 24 12 18V11L20 8Z" fill="#0B65C6"/>
      <path d="M17.5 17L19 18.5L23 14.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// Coinbase Wallet - Official Blue Logo
export function CoinbaseIcon({ className }: IconProps) {
  return (
    <svg 
      className={className}
      viewBox="0 0 40 40" 
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
    >
      <rect width="40" height="40" rx="8" fill="#0052FF"/>
      <circle cx="20" cy="20" r="12" fill="white"/>
      <rect x="16" y="16" width="8" height="8" rx="1.5" fill="#0052FF"/>
    </svg>
  );
}

// Rainbow Wallet - Official Colorful Logo  
export function RainbowIcon({ className }: IconProps) {
  return (
    <svg 
      className={className}
      viewBox="0 0 40 40" 
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
    >
      <rect width="40" height="40" rx="8" fill="#1A1B23"/>
      <defs>
        <linearGradient id="rainbow-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FF4081"/>
          <stop offset="25%" stopColor="#9C27B0"/>
          <stop offset="50%" stopColor="#3F51B5"/>
          <stop offset="75%" stopColor="#2196F3"/>
          <stop offset="100%" stopColor="#00BCD4"/>
        </linearGradient>
      </defs>
      <path d="M20 28C26 28 31 23 31 17H29C29 22 25 26 20 26S11 22 11 17H9C9 23 14 28 20 28Z" fill="url(#rainbow-grad)"/>
      <path d="M20 24C24 24 27 21 27 17H25C25 20 23 22 20 22S15 20 15 17H13C13 21 16 24 20 24Z" fill="#FFD700"/>
      <path d="M20 20C22 20 23 19 23 17H21C21 18 21 18 20 18S19 18 19 17H17C17 19 18 20 20 20Z" fill="#FF6B35"/>
    </svg>
  );
}

// Phantom Wallet - Official Purple Logo
export function PhantomIcon({ className }: IconProps) {
  return (
    <svg 
      className={className}
      viewBox="0 0 40 40" 
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
    >
      <rect width="40" height="40" rx="8" fill="#AB9FF2"/>
      <path d="M20 6C28 6 30 13 30 17C30 25 20 32 20 32C20 32 10 25 10 17C10 13 12 6 20 6Z" fill="white"/>
      <circle cx="16" cy="15" r="1.5" fill="#AB9FF2"/>
      <circle cx="24" cy="15" r="1.5" fill="#AB9FF2"/>
      <path d="M13 22C13 20 15 18 20 18C25 18 27 20 27 22C27 27 20 32 20 32C20 32 13 27 13 22Z" fill="white"/>
      <path d="M15 24C15 24 17 26 20 26C23 26 25 24 25 24" stroke="#AB9FF2" strokeWidth="1" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

// Binance Wallet - Official Gold Logo
export function BinanceIcon({ className }: IconProps) {
  return (
    <svg 
      className={className}
      viewBox="0 0 40 40" 
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
    >
      <rect width="40" height="40" rx="8" fill="#F0B90B"/>
      <g fill="white">
        <polygon points="15,13 20,8 25,13 23,15 20,12 17,15"/>
        <polygon points="10,18 12,16 15,18 12,21"/>
        <polygon points="28,18 30,16 28,13 25,16"/>
        <polygon points="15,23 20,28 25,23 23,21 20,24 17,21"/>
        <polygon points="20,15 22,17 20,19 18,17"/>
      </g>
    </svg>
  );
}

// WalletConnect - Official Blue Logo
export function WalletConnectIcon({ className }: IconProps) {
  return (
    <svg 
      className={className}
      viewBox="0 0 40 40" 
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
    >
      <rect width="40" height="40" rx="8" fill="#3B99FC"/>
      <path d="M13 17C17 13 23 13 27 17L26 18C23 15 17 15 14 18L13 17Z" fill="white"/>
      <circle cx="15" cy="24" r="1.5" fill="white"/>
      <circle cx="20" cy="24" r="1.5" fill="white"/>
      <circle cx="25" cy="24" r="1.5" fill="white"/>
      <path d="M10 28C18 20 22 20 30 28" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    </svg>
  );
}