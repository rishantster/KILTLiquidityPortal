import '@rainbow-me/rainbowkit/styles.css';
import '@/styles/rainbowkit-custom.css';
import {
  RainbowKitProvider,
  darkTheme,
  Theme,
} from '@rainbow-me/rainbowkit';
import { ReactNode } from 'react';

// Custom theme matching KILT app design
const kiltTheme: Theme = darkTheme({
  accentColor: '#ff0066', // KILT pink accent
  accentColorForeground: 'white',
  borderRadius: 'large',
  fontStack: 'system',
  overlayBlur: 'small',
});

// Override specific modal styles to match KILT design
kiltTheme.colors.modalBackground = '#000000'; // Black background like your modals
kiltTheme.colors.modalBorder = 'rgba(128, 128, 128, 0.5)'; // Gray-800 border
kiltTheme.colors.modalText = '#ffffff'; // White text
kiltTheme.colors.modalTextSecondary = 'rgba(255, 255, 255, 0.7)'; // Gray text
kiltTheme.colors.profileForeground = '#000000'; // Black foreground
kiltTheme.colors.selectedOptionBorder = '#ff0066'; // KILT pink for selected options
kiltTheme.colors.standby = 'rgba(255, 255, 255, 0.1)'; // Subtle hover state

// Custom modal styles
kiltTheme.shadows = {
  ...kiltTheme.shadows,
  dialog: '0 25px 50px -12px rgba(0, 0, 0, 0.8)', // Strong shadow like your modals
  profileDetailsAction: '0 4px 12px rgba(0, 0, 0, 0.4)',
  selectedOption: '0 0 0 1px #ff0066', // KILT pink glow
  selectedWallet: '0 0 0 1px #ff0066',
  walletLogo: '0 2px 16px rgba(0, 0, 0, 0.4)',
};

// Font configuration to match Inter font
kiltTheme.fonts = {
  body: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

// Border radius to match your design
kiltTheme.radii = {
  actionButton: '12px', // Rounded-lg like your buttons
  connectButton: '12px',
  menuButton: '12px',
  modal: '16px', // Rounded-xl like your modals  
  modalMobile: '16px',
};

interface RainbowWalletProviderProps {
  children: ReactNode;
}

export function RainbowWalletProvider({ children }: RainbowWalletProviderProps) {
  return (
    <RainbowKitProvider
      theme={kiltTheme}
      modalSize="compact"
      showRecentTransactions={true}
    >
      {children}
    </RainbowKitProvider>
  );
}