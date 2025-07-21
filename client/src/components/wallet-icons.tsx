// Authentic wallet logos - PNG imports with transparent backgrounds
import React from 'react';
import metamaskLogo from '@assets/metamask.png';
import trustwalletLogo from '@assets/trustwallet.png';
import coinbaseLogo from '@assets/coinbase.png';
import rainbowLogo from '@assets/rainbow-logo.png';
import phantomLogo from '@assets/phantom-logo.png';
import walletconnectLogo from '@assets/walletconnect-logo.png';
import binanceLogo from '@assets/binance-logo.png';

interface IconProps {
  className?: string;
}

// Force component refresh - v5.0 Authentic PNG Implementation July 21, 2025

// MetaMask - Authentic PNG Logo
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

// Trust Wallet - Authentic PNG Logo
export function TrustWalletIcon({ className }: IconProps) {
  return (
    <img 
      src={trustwalletLogo} 
      alt="Trust Wallet"
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
}

// Coinbase Wallet - Authentic PNG Logo
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

// Rainbow Wallet - Authentic PNG Logo
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

// Phantom Wallet - Authentic PNG Logo
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

// Binance Wallet - Authentic PNG Logo
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

// WalletConnect - Authentic PNG Logo
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