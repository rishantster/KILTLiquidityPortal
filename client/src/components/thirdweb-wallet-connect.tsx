import { ConnectButton } from "thirdweb/react";
import { createWallet, inAppWallet } from "thirdweb/wallets";
import { client } from "@/lib/thirdweb";
import { useLocation } from "wouter";

// Configure wallets with Thirdweb
const wallets = [
  inAppWallet({
    auth: {
      options: [
        "email",
        "google", 
        "apple",
        "facebook",
        "phone",
      ],
    },
  }),
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("me.rainbow"),
  createWallet("com.trustwallet.app"),
];

export function ThirdwebWalletConnect() {
  const [, setLocation] = useLocation();

  return (
    <ConnectButton
      client={client}
      wallets={wallets}
      theme="dark"
      onConnect={(wallet) => {
        console.log('Wallet connected via Thirdweb, navigating to dashboard');
        setLocation('/dashboard');
      }}
      connectModal={{
        size: "wide",
        showThirdwebBranding: false,
        title: "Connect to KILT Portal",
        titleIcon: "",
        className: "cyberpunk-wallet-modal",
      }}
      connectButton={{
        label: "Connect Wallet",
        style: {
          background: "rgba(255, 0, 102, 0.2)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255, 0, 102, 0.4)",
          borderRadius: "8px",
          color: "white",
          fontSize: "14px",
          fontWeight: "500",
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
          padding: "12px 24px",
          transition: "all 0.2s ease",
          cursor: "pointer",
          minWidth: "140px",
          textAlign: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        },
      }}
      detailsButton={{
        style: {
          background: "rgba(255, 255, 255, 0.05)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "8px",
          color: "white",
          fontSize: "14px",
          padding: "8px 16px",
        },
      }}
    />
  );
}