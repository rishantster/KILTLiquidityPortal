/**
 * Wallet Account Switching Test Utilities
 * 
 * This file provides utilities to test and demonstrate how the app responds
 * to wallet account changes initiated by the user in their wallet extension.
 */

export interface WalletAccountSwitchEvent {
  previousAddress: string | null;
  newAddress: string | null;
  timestamp: number;
  eventType: 'accountsChanged' | 'disconnect' | 'connect';
}

export class WalletAccountSwitchingTest {
  private static instance: WalletAccountSwitchingTest;
  private listeners: ((event: WalletAccountSwitchEvent) => void)[] = [];
  private isListening = false;

  static getInstance(): WalletAccountSwitchingTest {
    if (!WalletAccountSwitchingTest.instance) {
      WalletAccountSwitchingTest.instance = new WalletAccountSwitchingTest();
    }
    return WalletAccountSwitchingTest.instance;
  }

  /**
   * Start monitoring wallet account changes
   */
  startMonitoring(): void {
    if (this.isListening) return;
    
    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      console.warn('No Ethereum wallet detected');
      return;
    }

    this.isListening = true;
    
    ethereum.on('accountsChanged', this.handleAccountsChanged.bind(this));
    ethereum.on('chainChanged', this.handleChainChanged.bind(this));
    
    console.log('🔍 Wallet account switching monitoring started');
  }

  /**
   * Stop monitoring wallet account changes
   */
  stopMonitoring(): void {
    if (!this.isListening) return;
    
    const ethereum = (window as any).ethereum;
    if (ethereum?.removeListener) {
      ethereum.removeListener('accountsChanged', this.handleAccountsChanged.bind(this));
      ethereum.removeListener('chainChanged', this.handleChainChanged.bind(this));
    }
    
    this.isListening = false;
    console.log('🔍 Wallet account switching monitoring stopped');
  }

  /**
   * Add a listener for account switch events
   */
  addListener(callback: (event: WalletAccountSwitchEvent) => void): void {
    this.listeners.push(callback);
  }

  /**
   * Remove a specific listener
   */
  removeListener(callback: (event: WalletAccountSwitchEvent) => void): void {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  /**
   * Handle accounts changed event from wallet
   */
  private handleAccountsChanged(accounts: string[]): void {
    const currentAddress = accounts.length > 0 ? accounts[0] : null;
    const previousAddress = this.getCurrentAddress();
    
    let eventType: WalletAccountSwitchEvent['eventType'];
    
    if (!previousAddress && currentAddress) {
      eventType = 'connect';
    } else if (previousAddress && !currentAddress) {
      eventType = 'disconnect';
    } else {
      eventType = 'accountsChanged';
    }
    
    const event: WalletAccountSwitchEvent = {
      previousAddress,
      newAddress: currentAddress,
      timestamp: Date.now(),
      eventType
    };
    
    // Notify all listeners
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in wallet account switch listener:', error);
      }
    });
    
    console.log('🔄 Account switch detected:', {
      from: previousAddress,
      to: currentAddress,
      type: eventType
    });
  }

  /**
   * Handle chain changed event from wallet
   */
  private handleChainChanged(chainId: string): void {
    console.log('🔗 Chain changed to:', chainId);
  }

  /**
   * Get current wallet address
   */
  private getCurrentAddress(): string | null {
    const ethereum = (window as any).ethereum;
    if (!ethereum) return null;
    
    try {
      const accounts = ethereum.selectedAddress;
      return accounts || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Simulate account switch for testing (development only)
   */
  simulateAccountSwitch(newAddress: string): void {
    if (process.env.NODE_ENV !== 'development') {
      console.warn('Account switch simulation only available in development mode');
      return;
    }
    
    console.log('🧪 Simulating account switch to:', newAddress);
    this.handleAccountsChanged([newAddress]);
  }

  /**
   * Get current monitoring status
   */
  getMonitoringStatus(): {
    isListening: boolean;
    listenerCount: number;
    walletDetected: boolean;
  } {
    return {
      isListening: this.isListening,
      listenerCount: this.listeners.length,
      walletDetected: !!(window as any).ethereum
    };
  }
}

/**
 * Hook to easily access wallet account switching functionality
 */
export const useWalletAccountSwitching = () => {
  const switchingTest = WalletAccountSwitchingTest.getInstance();
  
  return {
    startMonitoring: () => switchingTest.startMonitoring(),
    stopMonitoring: () => switchingTest.stopMonitoring(),
    addListener: (callback: (event: WalletAccountSwitchEvent) => void) => 
      switchingTest.addListener(callback),
    removeListener: (callback: (event: WalletAccountSwitchEvent) => void) => 
      switchingTest.removeListener(callback),
    getStatus: () => switchingTest.getMonitoringStatus(),
    simulate: (address: string) => switchingTest.simulateAccountSwitch(address)
  };
};