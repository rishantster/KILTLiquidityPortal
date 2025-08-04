import '@rainbow-me/rainbowkit/styles.css';
import {
  RainbowKitProvider,
  darkTheme,
} from '@rainbow-me/rainbowkit';
import { ReactNode } from 'react';

interface RainbowWalletProviderProps {
  children: ReactNode;
}

export function RainbowWalletProvider({ children }: RainbowWalletProviderProps) {
  return (
    <RainbowKitProvider
      theme={darkTheme({
        accentColor: '#10b981', // Emerald-500 to match KILT theme
        accentColorForeground: 'white',
        borderRadius: 'medium',
        fontStack: 'system',
        overlayBlur: 'small',
      })}
      modalSize="compact"
    >
      {children}
    </RainbowKitProvider>
  );
}