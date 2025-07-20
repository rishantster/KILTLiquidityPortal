import { ConnectButton } from "thirdweb/react";
import { createWallet, inAppWallet } from "thirdweb/wallets";
import { client } from "@/lib/thirdweb";

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
  return (
    <ConnectButton
      client={client}
      wallets={wallets}
      theme="dark"
      connectModal={{
        size: "wide",
        showThirdwebBranding: false,
        title: "Connect your wallet",
        titleIcon: "",
      }}
      connectButton={{
        label: "Connect Wallet",
        style: {
          background: "linear-gradient(to right, rgba(255, 0, 102, 0.2), rgba(168, 85, 247, 0.2))",
          backdropFilter: "blur(8px)",
          border: "0",
          borderRadius: "8px",
          color: "white",
          fontSize: "14px",
          fontWeight: "500",
          padding: "12px 24px",
          transition: "all 0.2s ease",
          cursor: "pointer",
          minWidth: "140px",
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