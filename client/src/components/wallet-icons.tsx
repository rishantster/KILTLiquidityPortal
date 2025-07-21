// Authentic wallet logos - PNG imports with transparent backgrounds
import React from 'react';
import metamaskLogo from '@assets/metamask-logo.png';
import trustWalletLogo from '@assets/trust-wallet-logo.png';
import coinbaseLogo from '@assets/coinbase-logo.png';
import rainbowLogo from '@assets/rainbow-wallet-logo.png';
import phantomLogo from '@assets/phantom-wallet-logo.png';
import walletconnectLogo from '@assets/walletconnect-logo.png';
import binanceLogo from '@assets/binance-wallet-logo.png';

interface IconProps {
  className?: string;
}

// Force component refresh - v3.0 PNG Implementation July 21, 2025

// MetaMask - Official PNG Logo
export function MetaMaskIcon({ className }: IconProps) {
  return (
    <img 
      src={metamaskLogo} 
      alt="MetaMask"
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
}

// Trust Wallet - Official PNG Logo
export function TrustWalletIcon({ className }: IconProps) {
  return (
    <img 
      src={trustWalletLogo} 
      alt="Trust Wallet"
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
}

// Coinbase Wallet - Official PNG Logo
export function CoinbaseIcon({ className }: IconProps) {
  return (
    <img 
      src={coinbaseLogo} 
      alt="Coinbase Wallet"
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
}

// Rainbow Wallet - Official PNG Logo
export function RainbowIcon({ className }: IconProps) {
  return (
    <img 
      src={rainbowLogo} 
      alt="Rainbow Wallet"
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
}

// Phantom Wallet - Official PNG Logo
export function PhantomIcon({ className }: IconProps) {
  return (
    <img 
      src={phantomLogo} 
      alt="Phantom Wallet"
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
}

// Binance Wallet - Official PNG Logo
export function BinanceIcon({ className }: IconProps) {
  return (
    <img 
      src={binanceLogo} 
      alt="Binance Wallet"
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
}

// WalletConnect - Official PNG Logo
export function WalletConnectIcon({ className }: IconProps) {
  return (
    <img 
      src={walletconnectLogo} 
      alt="WalletConnect"
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
}