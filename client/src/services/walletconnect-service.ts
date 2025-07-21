import { Web3Wallet } from '@walletconnect/web3wallet';
import { Core } from '@walletconnect/core';
import type { Web3WalletTypes } from '@walletconnect/web3wallet';

export interface WalletConnectServiceConfig {
  projectId: string;
  metadata: {
    name: string;
    description: string;
    url: string;
    icons: string[];
  };
}

export class WalletConnectService {
  private web3wallet: Web3Wallet | null = null;
  private core: Core | null = null;
  private isInitialized = false;
  private config: WalletConnectServiceConfig;

  constructor(config: WalletConnectServiceConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize Core
      this.core = new Core({
        projectId: this.config.projectId,
      });

      // Initialize Web3Wallet
      this.web3wallet = await Web3Wallet.init({
        core: this.core,
        metadata: this.config.metadata,
      });

      // Set up event listeners
      this.setupEventListeners();
      this.isInitialized = true;
      
      console.log('WalletConnect Web3Wallet initialized');
    } catch (error) {
      console.error('Failed to initialize WalletConnect:', error);
      throw error;
    }
  }

  private setupEventListeners(): void {
    if (!this.web3wallet) return;

    // Session proposal listener
    this.web3wallet.on('session_proposal', async (event: Web3WalletTypes.SessionProposal) => {
      console.log('Session proposal received:', event);
      
      // Auto-approve session proposals from trusted dApps
      const { id, params } = event;
      const { proposer, requiredNamespaces } = params;
      
      try {
        // Check if Base network is supported
        const baseNamespace = requiredNamespaces['eip155'];
        if (baseNamespace && baseNamespace.chains?.includes('eip155:8453')) {
          // Approve session
          const session = await this.web3wallet.approveSession({
            id,
            namespaces: {
              eip155: {
                accounts: [`eip155:8453:${await this.getConnectedAccount()}`],
                methods: baseNamespace.methods || [
                  'eth_sendTransaction',
                  'eth_signTransaction',
                  'eth_sign',
                  'personal_sign',
                  'eth_signTypedData',
                ],
                events: baseNamespace.events || ['chainChanged', 'accountsChanged'],
              },
            },
          });
          console.log('Session approved:', session);
        } else {
          // Reject session if Base network not supported
          await this.web3wallet.rejectSession({
            id,
            reason: {
              code: 5000,
              message: 'Base network not supported',
            },
          });
        }
      } catch (error) {
        console.error('Failed to handle session proposal:', error);
        await this.web3wallet.rejectSession({
          id,
          reason: {
            code: 5000,
            message: 'Failed to process session proposal',
          },
        });
      }
    });

    // Session request listener
    this.web3wallet.on('session_request', async (event: Web3WalletTypes.SessionRequest) => {
      console.log('Session request received:', event);
      
      const { topic, params, id } = event;
      const { request } = params;
      
      try {
        // Handle different request methods
        let result: unknown;
        
        switch (request.method) {
          case 'eth_accounts':
            result = [await this.getConnectedAccount()];
            break;
          case 'eth_chainId':
            result = '0x2105'; // Base mainnet
            break;
          default:
            // Forward other requests to MetaMask
            result = await this.forwardToMetaMask(request);
        }
        
        await this.web3wallet.respondSessionRequest({
          topic,
          response: {
            id,
            result,
            jsonrpc: '2.0',
          },
        });
      } catch (error) {
        console.error('Failed to handle session request:', error);
        await this.web3wallet.respondSessionRequest({
          topic,
          response: {
            id,
            error: {
              code: 5000,
              message: 'Failed to process request',
            },
            jsonrpc: '2.0',
          },
        });
      }
    });

    // Session delete listener
    this.web3wallet.on('session_delete', (event) => {
      console.log('Session deleted:', event);
    });
  }

  private async getConnectedAccount(): Promise<string> {
    const ethereum = (window as any).ethereum;
    if (!ethereum) throw new Error('MetaMask not found');
    
    const accounts = await ethereum.request({ method: 'eth_accounts' });
    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts connected');
    }
    
    return accounts[0];
  }

  private async forwardToMetaMask(request: any): Promise<unknown> {
    const ethereum = (window as any).ethereum;
    if (!ethereum) throw new Error('MetaMask not found');
    
    return await ethereum.request({
      method: request.method,
      params: request.params,
    });
  }

  async pair(uri: string): Promise<void> {
    if (!this.web3wallet) {
      throw new Error('WalletConnect not initialized');
    }
    
    try {
      await this.web3wallet.core.pairing.pair({ uri });
      console.log('WalletConnect pairing initiated');
    } catch (error) {
      console.error('Failed to pair with WalletConnect:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.web3wallet) return;
    
    try {
      // Get all active sessions
      const sessions = this.web3wallet.getActiveSessions();
      
      // Disconnect all sessions
      for (const topic in sessions) {
        await this.web3wallet.disconnectSession({
          topic,
          reason: {
            code: 6000,
            message: 'User disconnected',
          },
        });
      }
      
      console.log('All WalletConnect sessions disconnected');
    } catch (error) {
      console.error('Failed to disconnect WalletConnect sessions:', error);
    }
  }

  getActiveSessions() {
    return this.web3wallet?.getActiveSessions() || {};
  }

  isConnected(): boolean {
    const sessions = this.getActiveSessions();
    return Object.keys(sessions).length > 0;
  }
}

// Singleton instance
let walletConnectService: WalletConnectService | null = null;

export function getWalletConnectService(): WalletConnectService {
  if (!walletConnectService) {
    walletConnectService = new WalletConnectService({
      projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo-project-id',
      metadata: {
        name: 'KILT Liquidity Portal',
        description: 'KILT token liquidity provisioning with treasury rewards',
        url: window.location.origin,
        icons: [`${window.location.origin}/favicon.ico`],
      },
    });
  }
  
  return walletConnectService;
}