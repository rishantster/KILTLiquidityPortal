// Unified Wallet Service - Best-in-class wallet infrastructure
export interface WalletConnection {
  address: string;
  chainId: number;
  provider: 'metamask' | 'walletconnect' | 'coinbase' | 'injected';
}

export interface UnifiedWalletConfig {
  supportedChains: number[];
  preferredChain: number;
  rpcUrls: { [chainId: number]: string };
  blockExplorerUrls: { [chainId: number]: string };
}

export class UnifiedWalletService {
  private config: UnifiedWalletConfig;
  private connection: WalletConnection | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  constructor(config: UnifiedWalletConfig) {
    this.config = config;
    this.setupEventListeners();
  }

  // Best practice: Unified connection method with provider detection
  async connect(preferredProvider?: string): Promise<WalletConnection> {
    try {
      // Auto-detect available providers
      const providers = this.detectProviders();
      
      if (providers.length === 0) {
        throw new Error('No Web3 providers detected. Please install a wallet extension.');
      }

      // Use preferred provider if available, otherwise use first available
      const provider = preferredProvider && providers.includes(preferredProvider) 
        ? preferredProvider 
        : providers[0];

      const connection = await this.connectProvider(provider);
      
      // Validate network
      if (!this.config.supportedChains.includes(connection.chainId)) {
        await this.switchNetwork(this.config.preferredChain);
        connection.chainId = this.config.preferredChain;
      }

      this.connection = connection;
      this.emit('connected', connection);
      
      return connection;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  private detectProviders(): string[] {
    const providers: string[] = [];
    
    if (typeof window === 'undefined') return providers;
    
    const ethereum = (window as any).ethereum;
    if (!ethereum) return providers;

    // MetaMask detection
    if (ethereum.isMetaMask || ethereum._metamask) {
      providers.push('metamask');
    }
    
    // Coinbase Wallet detection
    if (ethereum.isCoinbaseWallet || ethereum.selectedProvider?.isCoinbaseWallet) {
      providers.push('coinbase');
    }
    
    // Generic injected provider
    if (ethereum && !ethereum.isMetaMask && !ethereum.isCoinbaseWallet) {
      providers.push('injected');
    }
    
    // WalletConnect is always available as fallback
    providers.push('walletconnect');
    
    return providers;
  }

  private async connectProvider(provider: string): Promise<WalletConnection> {
    const ethereum = (window as any).ethereum;
    
    if (!ethereum && provider !== 'walletconnect') {
      throw new Error(`${provider} provider not found`);
    }

    switch (provider) {
      case 'metamask':
      case 'coinbase':
      case 'injected':
        return await this.connectInjected(ethereum, provider);
      
      case 'walletconnect':
        return await this.connectWalletConnect();
      
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  private async connectInjected(ethereum: any, providerType: string): Promise<WalletConnection> {
    // Request account access with proper permission flow
    let accounts: string[];
    
    try {
      // Try to request fresh permissions (shows account selector)
      await ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }]
      });
    } catch (permissionError) {
      // Permission request failed, continue with regular flow
      console.log('Permission request failed, using regular flow:', permissionError);
    }
    
    accounts = await ethereum.request({
      method: 'eth_requestAccounts',
    });

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts available');
    }

    const chainId = await ethereum.request({ method: 'eth_chainId' });
    
    return {
      address: accounts[0],
      chainId: parseInt(chainId, 16),
      provider: providerType as any
    };
  }

  private async connectWalletConnect(): Promise<WalletConnection> {
    // Implement WalletConnect connection logic
    // This would integrate with the WalletConnect service
    throw new Error('WalletConnect integration pending');
  }

  async switchNetwork(chainId: number): Promise<void> {
    const ethereum = (window as any).ethereum;
    if (!ethereum) throw new Error('No wallet provider available');

    const chainIdHex = `0x${chainId.toString(16)}`;
    
    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      });
    } catch (switchError: any) {
      // Chain not added, add it
      if (switchError.code === 4902) {
        const rpcUrl = this.config.rpcUrls[chainId];
        const explorerUrl = this.config.blockExplorerUrls[chainId];
        
        if (!rpcUrl || !explorerUrl) {
          throw new Error(`Chain ${chainId} not configured`);
        }

        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: chainIdHex,
            chainName: this.getChainName(chainId),
            nativeCurrency: this.getNativeCurrency(chainId),
            rpcUrls: [rpcUrl],
            blockExplorerUrls: [explorerUrl],
          }],
        });
      } else {
        throw switchError;
      }
    }
  }

  disconnect(): void {
    this.connection = null;
    this.emit('disconnected');
  }

  getConnection(): WalletConnection | null {
    return this.connection;
  }

  isConnected(): boolean {
    return this.connection !== null;
  }

  // Event system for wallet state changes
  on(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  off(event: string, listener: Function): void {
    this.listeners.get(event)?.delete(listener);
  }

  private emit(event: string, data?: any): void {
    this.listeners.get(event)?.forEach(listener => listener(data));
  }

  private setupEventListeners(): void {
    if (typeof window === 'undefined') return;
    
    const ethereum = (window as any).ethereum;
    if (!ethereum) return;

    ethereum.on('accountsChanged', (accounts: string[]) => {
      if (accounts.length === 0) {
        this.disconnect();
      } else if (this.connection) {
        this.connection.address = accounts[0];
        this.emit('accountChanged', this.connection);
      }
    });

    ethereum.on('chainChanged', (chainId: string) => {
      if (this.connection) {
        this.connection.chainId = parseInt(chainId, 16);
        this.emit('chainChanged', this.connection);
      }
    });
  }

  private getChainName(chainId: number): string {
    const chains: { [key: number]: string } = {
      1: 'Ethereum Mainnet',
      8453: 'Base Mainnet',
      137: 'Polygon Mainnet',
      42161: 'Arbitrum One',
      10: 'Optimism'
    };
    return chains[chainId] || `Chain ${chainId}`;
  }

  private getNativeCurrency(chainId: number) {
    const currencies: { [key: number]: any } = {
      1: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
      8453: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
      137: { name: 'Polygon', symbol: 'MATIC', decimals: 18 },
      42161: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
      10: { name: 'Ethereum', symbol: 'ETH', decimals: 18 }
    };
    return currencies[chainId] || { name: 'ETH', symbol: 'ETH', decimals: 18 };
  }
}

// Default configuration for Base network
export const defaultWalletConfig: UnifiedWalletConfig = {
  supportedChains: [8453], // Base mainnet only
  preferredChain: 8453,
  rpcUrls: {
    8453: 'https://mainnet.base.org'
  },
  blockExplorerUrls: {
    8453: 'https://basescan.org'
  }
};

// Singleton instance
let unifiedWalletService: UnifiedWalletService | null = null;

export function getUnifiedWalletService(): UnifiedWalletService {
  if (!unifiedWalletService) {
    unifiedWalletService = new UnifiedWalletService(defaultWalletConfig);
  }
  return unifiedWalletService;
}