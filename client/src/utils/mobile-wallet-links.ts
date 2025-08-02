// Mobile Wallet Deep Link Utilities
export interface WalletDeepLink {
  name: string;
  id: string;
  deepLink: (url: string) => string;
  installLink: string;
  icon: string;
  description: string;
  isAvailable: () => boolean;
}

export const MOBILE_WALLET_LINKS: WalletDeepLink[] = [
  {
    name: 'MetaMask',
    id: 'metaMask',
    deepLink: (url: string) => `https://metamask.app.link/dapp/${url.replace('https://', '')}`,
    installLink: 'https://metamask.io/download/',
    icon: '🦊',
    description: 'Most popular Ethereum wallet',
    isAvailable: () => typeof window !== 'undefined' && !!window.ethereum?.isMetaMask
  },
  {
    name: 'Coinbase Wallet',
    id: 'coinbaseWallet',
    deepLink: (url: string) => `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(url)}`,
    installLink: 'https://wallet.coinbase.com/',
    icon: '🔵',
    description: 'Easy-to-use wallet by Coinbase',
    isAvailable: () => typeof window !== 'undefined' && !!window.ethereum?.isCoinbaseWallet
  },
  {
    name: 'Trust Wallet',
    id: 'trust',
    deepLink: (url: string) => `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(url)}`,
    installLink: 'https://trustwallet.com/',
    icon: '🛡️',
    description: 'Secure multi-coin wallet',
    isAvailable: () => typeof window !== 'undefined' && !!window.ethereum?.isTrust
  },
  {
    name: 'Binance Wallet',
    id: 'binance',
    deepLink: (url: string) => `bnc://app.binance.com/cedefi/eth-dapp?url=${encodeURIComponent(url)}`,
    installLink: 'https://www.binance.com/en/web3wallet',
    icon: '🟡',
    description: 'Binance Web3 Wallet',
    isAvailable: () => typeof window !== 'undefined' && !!window.ethereum?.isBinance
  },
  {
    name: 'WalletConnect',
    id: 'walletConnect',
    deepLink: (url: string) => `wc://`,
    installLink: 'https://walletconnect.com/',
    icon: '🔗',
    description: 'Connect 200+ wallets',
    isAvailable: () => true // Always available as it's a protocol
  }
];

export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function openMobileWallet(walletId: string, currentUrl?: string): boolean {
  const url = currentUrl || window.location.href;
  const wallet = MOBILE_WALLET_LINKS.find(w => w.id === walletId);
  
  if (!wallet) {
    console.warn(`Wallet ${walletId} not found`);
    return false;
  }

  try {
    if (isMobileDevice()) {
      // Try deep link first
      const deepLinkUrl = wallet.deepLink(url);
      window.location.href = deepLinkUrl;
      
      // Fallback to install page after a short delay if deep link fails
      setTimeout(() => {
        if (document.visibilityState === 'visible') {
          window.open(wallet.installLink, '_blank');
        }
      }, 2000);
      
      return true;
    } else {
      // Desktop: open install page
      window.open(wallet.installLink, '_blank');
      return false;
    }
  } catch (error) {
    console.error(`Failed to open wallet ${walletId}:`, error);
    window.open(wallet.installLink, '_blank');
    return false;
  }
}

export function getAvailableWallets(): WalletDeepLink[] {
  return MOBILE_WALLET_LINKS.filter(wallet => wallet.isAvailable());
}

export function getRecommendedWallets(): WalletDeepLink[] {
  // Always prioritize WalletConnect first for mobile devices
  const walletConnect = MOBILE_WALLET_LINKS.find(w => w.id === 'walletConnect');
  const metaMask = MOBILE_WALLET_LINKS.find(w => w.id === 'metaMask');
  const coinbase = MOBILE_WALLET_LINKS.find(w => w.id === 'coinbaseWallet');
  const trust = MOBILE_WALLET_LINKS.find(w => w.id === 'trust');
  
  const recommended = [];
  if (walletConnect) recommended.push(walletConnect);
  if (metaMask) recommended.push(metaMask);
  if (coinbase) recommended.push(coinbase);
  if (trust) recommended.push(trust);
  
  return recommended;
}