import { createContext, useContext, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useI18n } from "@/i18n";

type Ctx = {
  address: string | null;
  connect: () => void;
  disconnect: () => void;
};

const WalletCtx = createContext<Ctx | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const { t } = useI18n();
  const connect = () => {
    setAddress("GBTK…7QXA");
    toast.success(t("Billetera Stellar conectada correctamente"), { description: "Freighter · Testnet · 1,240.50 USDC" });
  };
  const disconnect = () => {
    setAddress(null);
    toast(t("Billetera desconectada"));
  };
  return (
    <WalletCtx.Provider value={{ address, connect, disconnect }}>{children}</WalletCtx.Provider>
  );
}

export function useWallet() {
  const c = useContext(WalletCtx);
  if (!c) throw new Error("useWallet outside provider");
  return c;
}
