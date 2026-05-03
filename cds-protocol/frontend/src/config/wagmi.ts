import { getDefaultWallets } from "@rainbow-me/rainbowkit";
import { createConfig, http } from "wagmi";
import { sepolia } from "wagmi/chains";
const chains = [sepolia];

const { connectors } = getDefaultWallets({
  appName: "CDS Protocol",
  projectId: "YOUR_WALLETCONNECT_ID",
  chains,
});

export const wagmiConfig = createConfig({
  autoConnect: true,
  chains,
  connectors,
  transports: {
    [sepolia.id]: http(),
  },
});

export { chains };
