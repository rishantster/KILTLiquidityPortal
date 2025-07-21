// Real wallet detection and connection service

export interface WalletProvider {
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  isTrust?: boolean;
  isRainbow?: boolean;
  isPhantom?: boolean;
  isBinance?: boolean;
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on?: (event: string, handler: (...args: any[]) => void) => void;
  removeListener?: (event: string, handler: (...args: any[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: any;
    coinbaseWalletExtension?: any;
    trustwallet?: any;
    rainbow?: any;
    phantom?: { ethereum?: any };
    BinanceChain?: any;
  }
}

export interface DetectedWallet {
  name: string;
  provider: WalletProvider | null;
  detected: boolean;
  installed: boolean;
  mobile: boolean;
  deepLink?: string;
  downloadUrl: string;
  description: string;
}

export class WalletDetectionService {
  private static instance: WalletDetectionService;
  
  static getInstance(): WalletDetectionService {
    if (!WalletDetectionService.instance) {
      WalletDetectionService.instance = new WalletDetectionService();
    }
    return WalletDetectionService.instance;
  }

  isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  detectWallets(): DetectedWallet[] {
    const isMobile = this.isMobile();
    
    return [
      {
        name: 'MetaMask',
        provider: this.getMetaMaskProvider(),
        detected: this.isMetaMaskDetected(),
        installed: this.isMetaMaskDetected(),
        mobile: isMobile,
        deepLink: 'https://metamask.app.link/dapp/' + encodeURIComponent(window.location.href),
        downloadUrl: isMobile ? 'https://metamask.app.link/dapp/' + encodeURIComponent(window.location.href) : 'https://metamask.io/download/',
        description: 'Most popular Ethereum wallet'
      },
      {
        name: 'Coinbase Wallet',
        provider: this.getCoinbaseProvider(),
        detected: this.isCoinbaseDetected(),
        installed: this.isCoinbaseDetected(),
        mobile: isMobile,
        deepLink: 'https://go.cb-w.com/dapp?cb_url=' + encodeURIComponent(window.location.href),
        downloadUrl: isMobile ? 'https://go.cb-w.com/dapp?cb_url=' + encodeURIComponent(window.location.href) : 'https://www.coinbase.com/wallet',
        description: 'Self-custody wallet from Coinbase'
      },
      {
        name: 'Trust Wallet',
        provider: this.getTrustProvider(),
        detected: this.isTrustDetected(),
        installed: this.isTrustDetected(),
        mobile: isMobile,
        deepLink: 'https://link.trustwallet.com/open_url?coin_id=60&url=' + encodeURIComponent(window.location.href),
        downloadUrl: isMobile ? 'https://link.trustwallet.com/open_url?coin_id=60&url=' + encodeURIComponent(window.location.href) : 'https://trustwallet.com/',
        description: 'Mobile-first multi-chain wallet'
      },
      {
        name: 'Rainbow',
        provider: this.getRainbowProvider(),
        detected: this.isRainbowDetected(),
        installed: this.isRainbowDetected(),
        mobile: isMobile,
        deepLink: 'https://rnbwapp.com/open?url=' + encodeURIComponent(window.location.href),
        downloadUrl: isMobile ? 'https://rnbwapp.com/open?url=' + encodeURIComponent(window.location.href) : 'https://rainbow.me/',
        description: 'Beautiful wallet with great UX'
      },
      {
        name: 'Phantom',
        provider: this.getPhantomProvider(),
        detected: this.isPhantomDetected(),
        installed: this.isPhantomDetected(),
        mobile: isMobile,
        deepLink: 'https://phantom.app/ul/browse/' + encodeURIComponent(window.location.href),
        downloadUrl: isMobile ? 'https://phantom.app/ul/browse/' + encodeURIComponent(window.location.href) : 'https://phantom.app/',
        description: 'Multi-chain wallet for everyone'
      },
      {
        name: 'Binance Wallet',
        provider: this.getBinanceProvider(),
        detected: this.isBinanceDetected(),
        installed: this.isBinanceDetected(),
        mobile: isMobile,
        deepLink: 'https://app.binance.com/cedefi/wc?uri=' + encodeURIComponent(window.location.href),
        downloadUrl: isMobile ? 'https://app.binance.com/cedefi/wc?uri=' + encodeURIComponent(window.location.href) : 'https://www.binance.com/en/wallet-direct',
        description: 'Exchange-backed wallet'
      }
    ];
  }

  // MetaMask Detection
  private getMetaMaskProvider(): WalletProvider | null {
    if (typeof window !== 'undefined' && window.ethereum?.isMetaMask) {
      return window.ethereum;
    }
    return null;
  }

  private isMetaMaskDetected(): boolean {
    return typeof window !== 'undefined' && !!window.ethereum?.isMetaMask;
  }

  // Coinbase Wallet Detection
  private getCoinbaseProvider(): WalletProvider | null {
    if (typeof window !== 'undefined') {
      // Check for dedicated Coinbase Wallet extension
      if (window.coinbaseWalletExtension) {
        return window.coinbaseWalletExtension;
      }
      // Check for Coinbase Wallet in ethereum provider
      if (window.ethereum?.isCoinbaseWallet) {
        return window.ethereum;
      }
    }
    return null;
  }

  private isCoinbaseDetected(): boolean {
    return typeof window !== 'undefined' && 
      (!!window.coinbaseWalletExtension || !!window.ethereum?.isCoinbaseWallet);
  }

  // Trust Wallet Detection
  private getTrustProvider(): WalletProvider | null {
    if (typeof window !== 'undefined') {
      if (window.trustwallet) {
        return window.trustwallet;
      }
      if (window.ethereum?.isTrust) {
        return window.ethereum;
      }
    }
    return null;
  }

  private isTrustDetected(): boolean {
    return typeof window !== 'undefined' && 
      (!!window.trustwallet || !!window.ethereum?.isTrust);
  }

  // Rainbow Detection
  private getRainbowProvider(): WalletProvider | null {
    if (typeof window !== 'undefined') {
      if (window.rainbow) {
        return window.rainbow;
      }
      if (window.ethereum?.isRainbow) {
        return window.ethereum;
      }
    }
    return null;
  }

  private isRainbowDetected(): boolean {
    return typeof window !== 'undefined' && 
      (!!window.rainbow || !!window.ethereum?.isRainbow);
  }

  // Phantom Detection
  private getPhantomProvider(): WalletProvider | null {
    if (typeof window !== 'undefined') {
      if (window.phantom?.ethereum) {
        return window.phantom.ethereum;
      }
    }
    return null;
  }

  private isPhantomDetected(): boolean {
    return typeof window !== 'undefined' && !!window.phantom?.ethereum;
  }

  // Binance Wallet Detection
  private getBinanceProvider(): WalletProvider | null {
    if (typeof window !== 'undefined' && window.BinanceChain) {
      return window.BinanceChain;
    }
    return null;
  }

  private isBinanceDetected(): boolean {
    return typeof window !== 'undefined' && !!window.BinanceChain;
  }

  // Connect to specific wallet
  async connectWallet(walletName: string): Promise<string[]> {
    const wallets = this.detectWallets();
    const wallet = wallets.find(w => w.name === walletName);
    
    if (!wallet || !wallet.provider) {
      throw new Error(`${walletName} not detected. Please install the ${walletName} extension or app.`);
    }

    try {
      // Request account access
      const accounts = await wallet.provider.request({
        method: 'eth_requestAccounts'
      });

      // Switch to Base network
      await this.switchToBase(wallet.provider);
      
      return accounts;
    } catch (error) {
      console.error(`Failed to connect to ${walletName}:`, error);
      throw error;
    }
  }

  // Switch to Base network for any provider
  async switchToBase(provider: WalletProvider): Promise<void> {
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x2105' }], // Base mainnet
      });
    } catch (error: any) {
      if (error.code === 4902) {
        // Chain not added, add Base mainnet
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x2105',
            chainName: 'Base Mainnet',
            nativeCurrency: {
              name: 'Ethereum',
              symbol: 'ETH',
              decimals: 18,
            },
            rpcUrls: ['https://mainnet.base.org'],
            blockExplorerUrls: ['https://basescan.org'],
          }],
        });
      } else {
        throw error;
      }
    }
  }

  // Mobile deep linking
  openMobileWallet(walletName: string): void {
    const wallets = this.detectWallets();
    const wallet = wallets.find(w => w.name === walletName);
    
    if (!wallet) return;

    if (this.isMobile() && wallet.deepLink) {
      // Try to open the deep link
      window.location.href = wallet.deepLink;
      
      // Fallback to download page after short delay
      setTimeout(() => {
        if (document.visibilityState === 'visible') {
          window.open(wallet.downloadUrl, '_blank');
        }
      }, 2000);
    } else {
      // Desktop - open download page
      window.open(wallet.downloadUrl, '_blank');
    }
  }
}

export const walletDetection = WalletDetectionService.getInstance();