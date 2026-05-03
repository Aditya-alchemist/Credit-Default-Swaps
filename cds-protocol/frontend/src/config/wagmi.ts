import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { sepolia } from "wagmi/chains";

const walletConnectProjectId =
  import.meta.env.VITE_WALLETCONNECT_ID || "YOUR_WALLETCONNECT_ID";
const sepoliaRpcUrl = import.meta.env.VITE_SEPOLIA_RPC || undefined;

export const wagmiConfig = getDefaultConfig({
  appName: "CDS Protocol",
  projectId: walletConnectProjectId,
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(sepoliaRpcUrl),
  },
});
