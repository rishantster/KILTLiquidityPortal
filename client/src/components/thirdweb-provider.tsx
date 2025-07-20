import { ThirdwebProvider } from "thirdweb/react";
import { client } from "@/lib/thirdweb";

interface ThirdwebAppProviderProps {
  children: React.ReactNode;
}

export function ThirdwebAppProvider({ children }: ThirdwebAppProviderProps) {
  return (
    <ThirdwebProvider>
      {children}
    </ThirdwebProvider>
  );
}