import { createThirdwebClient } from "thirdweb";
import { base } from "thirdweb/chains";

// Get client ID from environment variables with fallback
const clientId = import.meta.env.VITE_THIRDWEB_CLIENT_ID || "your_client_id_here";

// Note: For production, get a free client ID from https://thirdweb.com/dashboard/api-keys
if (!import.meta.env.VITE_THIRDWEB_CLIENT_ID) {
  console.warn("VITE_THIRDWEB_CLIENT_ID not set. Using fallback client ID. Get yours at https://thirdweb.com/dashboard/api-keys");
}

// Create thirdweb client
export const client = createThirdwebClient({
  clientId: clientId,
});

// Configure supported chains
export const supportedChains = [base];

// Configure wallets
export const wallets = [
  "inAppWallet", // Email, social logins, phone
  "io.metamask", // MetaMask
  "com.coinbase.wallet", // Coinbase Wallet
  "me.rainbow", // Rainbow
  "com.trustwallet.app", // Trust Wallet
];

// Thirdweb configuration
export const thirdwebConfig = {
  client,
  chains: supportedChains,
  wallets,
  theme: "dark" as const,
  connectModal: {
    size: "wide" as const,
    showThirdwebBranding: false,
    termsOfServiceUrl: undefined,
    privacyPolicyUrl: undefined,
  },
};