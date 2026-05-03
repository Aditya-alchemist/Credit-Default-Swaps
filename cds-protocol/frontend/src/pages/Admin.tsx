import React, { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAccount, usePublicClient } from "wagmi";
import { isAddress, parseUnits } from "viem";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { useVaultOwner, usePauseVault, useUnpauseVault } from "../hooks/useCDSVault";
import { useSetCreditData, useMarkDefaulted } from "../hooks/useCreditOracle";
import { useSetPremiumReceiver, usePremiumReceiver } from "../hooks/usePremiumEngine";
import { useMintToken } from "../hooks/useERC20";
import { IconImage } from "../components/IconImage";
import { formatAddress } from "../utils/formatters";
import { extractErrorMessage, getExplorerUrl } from "../utils/txHelpers";
import { useTx } from "../context/TxContext";
import { SEPOLIA_ADDRESSES, SEPOLIA_DEPLOYER } from "../config/contracts";

interface AdminTab {
  name: string;
  icon: React.ComponentProps<typeof IconImage>["name"];
  description: string;
}

const ADMIN_TABS: AdminTab[] = [
  { name: "Faucet", icon: "faucet", description: "Mint test tokens" },
  { name: "Contracts", icon: "contracts", description: "Manage contract addresses" },
  { name: "Credit Events", icon: "alert", description: "Declare defaults" },
  { name: "Oracle", icon: "oracle", description: "Manual oracle push" },
  { name: "Security", icon: "lock", description: "Emergency pause" },
];

const Admin: React.FC = () => {
  const { theme } = useTheme();
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState("Faucet");

  const bgClass = theme === "dark" ? "bg-slate-950" : "bg-slate-50";
  const cardBgClass = theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
  const textClass = theme === "dark" ? "text-white" : "text-slate-900";
  const secondaryTextClass = theme === "dark" ? "text-slate-400" : "text-slate-600";
  const inputBgClass = theme === "dark" ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-300";
  const dangerBgClass = theme === "dark" ? "bg-red-600 hover:bg-red-700" : "bg-red-600 hover:bg-red-700";

  const owner = useVaultOwner();
  const ownerAddress = owner.data ? String(owner.data) : undefined;
  const isOwner = address && ownerAddress ? address.toLowerCase() === ownerAddress.toLowerCase() : false;

  if (!isConnected) {
    return (
      <div className={`min-h-screen ${bgClass} pt-24 pb-12`}>
        <div className="lg:ml-64 px-4 lg:px-8">
          <div className={`border rounded-xl p-8 text-center ${cardBgClass}`}>
            <p className={`text-lg ${secondaryTextClass}`}>Connect your wallet to access admin panel</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className={`min-h-screen ${bgClass} pt-24 pb-12`}>
        <div className="lg:ml-64 px-4 lg:px-8">
          <div className={`border rounded-xl p-8 text-center ${cardBgClass}`}>
            <p className={`text-lg ${secondaryTextClass}`}>Access denied. Owner wallet required.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bgClass} pt-24 pb-12`}>
      <div className="lg:ml-64 px-4 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-4xl font-bold ${textClass} mb-2`}>Admin Panel</h1>
          <p className={secondaryTextClass}>Owner controls for CDS Protocol management</p>
        </div>

        {/* Warning Banner */}
        <div className="mb-8 px-6 py-4 bg-red-500/20 border border-red-500/50 rounded-lg">
          <p className="flex items-center gap-2 text-red-400 font-semibold">
            <IconImage name="alert" className="h-5 w-5" alt="" />
            Owner Only
          </p>
          <p className={`text-sm ${secondaryTextClass} mt-1`}>All actions here affect the entire protocol. Use with caution.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Tab Navigation */}
          <div className={`border rounded-xl p-4 ${cardBgClass} h-fit`}>
            <h3 className={`text-lg font-semibold ${textClass} mb-4`}>Functions</h3>
            <div className="space-y-2">
              {ADMIN_TABS.map((tab) => (
                <button
                  key={tab.name}
                  onClick={() => setActiveTab(tab.name)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition ${
                    activeTab === tab.name
                      ? "bg-blue-600 text-white"
                      : theme === "dark"
                        ? "bg-slate-800 hover:bg-slate-700"
                        : "bg-slate-100 hover:bg-slate-200"
                  } ${activeTab !== tab.name ? textClass : ""}`}
                >
                  <p className="flex items-center gap-2 font-medium text-sm">
                    <IconImage name={tab.icon} className="h-5 w-5" alt="" />
                    {tab.name}
                  </p>
                  <p className={`text-xs ${activeTab === tab.name ? "text-blue-100" : secondaryTextClass}`}>
                    {tab.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Content Panel */}
          <div className="lg:col-span-3">
            {activeTab === "Faucet" && <FaucetTab theme={theme} cardBgClass={cardBgClass} textClass={textClass} secondaryTextClass={secondaryTextClass} inputBgClass={inputBgClass} />}
            {activeTab === "Contracts" && <ContractsTab theme={theme} cardBgClass={cardBgClass} textClass={textClass} secondaryTextClass={secondaryTextClass} inputBgClass={inputBgClass} />}
            {activeTab === "Credit Events" && <CreditEventsTab theme={theme} cardBgClass={cardBgClass} textClass={textClass} secondaryTextClass={secondaryTextClass} inputBgClass={inputBgClass} />}
            {activeTab === "Oracle" && <OracleTab theme={theme} cardBgClass={cardBgClass} textClass={textClass} secondaryTextClass={secondaryTextClass} inputBgClass={inputBgClass} />}
            {activeTab === "Security" && <SecurityTab theme={theme} cardBgClass={cardBgClass} textClass={textClass} secondaryTextClass={secondaryTextClass} dangerBgClass={dangerBgClass} />}
          </div>
        </div>
      </div>
    </div>
  );
};

interface TabProps {
  theme: string;
  cardBgClass: string;
  textClass: string;
  secondaryTextClass: string;
  inputBgClass?: string;
  dangerBgClass?: string;
}

const FaucetTab: React.FC<TabProps> = ({ theme, cardBgClass, textClass, secondaryTextClass, inputBgClass }) => {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { notifyPending, notifySuccess, notifyError } = useTx();
  const [usdcAmount, setUsdcAmount] = useState("1000");
  const [wethAmount, setWethAmount] = useState("1");
  const [recipient, setRecipient] = useState(address ?? "");
  const usdcUnits = usdcAmount ? parseUnits(usdcAmount, 6) : 0n;
  const wethUnits = wethAmount ? parseUnits(wethAmount, 18) : 0n;
  const faucetChart = [
    { label: "USDC", value: Number(usdcAmount || 0) },
    { label: "WETH", value: Number(wethAmount || 0) * 2000 },
    { label: "Vault", value: Number(usdcAmount || 0) * 1.2 },
    { label: "Pool", value: Number(usdcAmount || 0) * 1.6 },
  ];
  const usdcMint = useMintToken(
    recipient && isAddress(recipient) && usdcUnits > 0n
      ? { tokenAddress: SEPOLIA_ADDRESSES.USDC, to: recipient, amount: usdcUnits }
      : undefined
  );
  const wethMint = useMintToken(
    recipient && isAddress(recipient) && wethUnits > 0n
      ? { tokenAddress: SEPOLIA_ADDRESSES.WETH, to: recipient, amount: wethUnits }
      : undefined
  );

  const mintToken = async (symbol: "USDC" | "WETH") => {
    const amount = symbol === "USDC" ? usdcAmount : wethAmount;
    const writer = symbol === "USDC" ? usdcMint.write : wethMint.write;

    try {
      if (!recipient || !isAddress(recipient)) throw new Error("Enter a valid recipient address");
      if (Number(amount) <= 0) throw new Error("Enter an amount greater than zero");

      const id = notifyPending(`Minting ${symbol}`);
      const hash = await writer.writeAsync();
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
      notifySuccess(id, `Minted ${amount} ${symbol} to ${formatAddress(recipient)}`, {
        txHash: hash,
        explorerUrl: getExplorerUrl(hash),
      });
    } catch (err: any) {
      notifyError(Date.now(), extractErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div className={`border rounded-xl p-6 ${cardBgClass}`}>
        <h2 className={`text-2xl font-bold ${textClass} mb-4`}>Token Faucet</h2>
        <p className={`text-sm ${secondaryTextClass} mb-6`}>Mint test tokens for development and testing</p>

        <div className="mb-6">
          <label className={`block text-sm font-medium ${textClass} mb-2`}>Recipient Address</label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="0x..."
            className={`w-full px-4 py-2 rounded-lg border ${inputBgClass} ${textClass} placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* USDC */}
          <div className={`border rounded-lg p-6 ${theme === "dark" ? "border-slate-700" : "border-slate-200"}`}>
            <h3 className={`flex items-center gap-2 text-lg font-semibold ${textClass} mb-4`}>
              <IconImage name="coin" className="h-6 w-6" alt="" />
              USDC
            </h3>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${textClass} mb-2`}>Amount to Mint</label>
                <input
                  type="number"
                  value={usdcAmount}
                  onChange={(e) => setUsdcAmount(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border ${inputBgClass} ${textClass} placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
              <button
                onClick={() => mintToken("USDC")}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition"
              >
                Mint {usdcAmount} USDC
              </button>
            </div>
          </div>

          {/* WETH */}
          <div className={`border rounded-lg p-6 ${theme === "dark" ? "border-slate-700" : "border-slate-200"}`}>
            <h3 className={`flex items-center gap-2 text-lg font-semibold ${textClass} mb-4`}>
              <IconImage name="eth" className="h-6 w-6" alt="" />
              WETH
            </h3>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${textClass} mb-2`}>Amount to Mint</label>
                <input
                  type="number"
                  value={wethAmount}
                  onChange={(e) => setWethAmount(e.target.value)}
                  step="0.1"
                  className={`w-full px-4 py-2 rounded-lg border ${inputBgClass} ${textClass} placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
              <button
                onClick={() => mintToken("WETH")}
                className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition"
              >
                Mint {wethAmount} WETH
              </button>
            </div>
          </div>
        </div>

        <div className={`px-4 py-3 rounded-lg border ${theme === "dark" ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-300"}`}>
          <p className={`text-sm ${secondaryTextClass}`}>Tokens will be minted to the recipient address above.</p>
        </div>

        <div className={`mt-6 rounded-lg border p-5 ${theme === "dark" ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"}`}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className={`text-sm ${secondaryTextClass}`}>Faucet Preview</p>
              <h3 className={`text-lg font-semibold ${textClass}`}>Mint size and collateral scale</h3>
            </div>
            <IconImage name="chart" className="h-8 w-8" alt="" />
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={faucetChart}>
                <defs>
                  <linearGradient id="faucetGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" stroke={theme === "dark" ? "#94a3b8" : "#64748b"} />
                <Tooltip formatter={(value: any) => `${Number(value).toLocaleString()} units`} />
                <Area type="monotone" dataKey="value" stroke="#f97316" strokeWidth={3} fill="url(#faucetGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

const ContractsTab: React.FC<TabProps> = ({ theme, cardBgClass, textClass, secondaryTextClass, inputBgClass }) => {
  const contracts = [
    { name: "CDS Vault", address: SEPOLIA_ADDRESSES.CDSVault, status: "Active" },
    { name: "Lending Pool", address: SEPOLIA_ADDRESSES.LendingPool, status: "Active" },
    { name: "Premium Engine", address: SEPOLIA_ADDRESSES.PremiumEngine, status: "Active" },
    { name: "Settlement Engine", address: SEPOLIA_ADDRESSES.SettlementEngine, status: "Active" },
    { name: "Protocol Owner", address: SEPOLIA_DEPLOYER, status: "Owner" },
  ];

  return (
    <div className="space-y-6">
      <div className={`border rounded-xl p-6 ${cardBgClass}`}>
        <h2 className={`text-2xl font-bold ${textClass} mb-4`}>Contract Management</h2>
        <p className={`text-sm ${secondaryTextClass} mb-6`}>View and manage deployed contract addresses</p>

        <div className="space-y-4 mb-6">
          {contracts.map((contract, idx) => (
            <div key={idx} className={`border rounded-lg p-4 ${theme === "dark" ? "border-slate-700" : "border-slate-200"}`}>
              <div className="flex justify-between items-start mb-2">
                <h3 className={`font-semibold ${textClass}`}>{contract.name}</h3>
                <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded-full font-medium">
                  {contract.status}
                </span>
              </div>
              <p className={`text-sm font-mono ${secondaryTextClass}`}>{contract.address}</p>
              <div className="mt-3 flex gap-2">
                <button className={`text-sm px-3 py-1 rounded border ${
                  theme === "dark"
                    ? "border-slate-700 text-slate-300 hover:bg-slate-800"
                    : "border-slate-300 text-slate-600 hover:bg-slate-100"
                } transition`}>
                  View on Explorer
                </button>
                <button className={`text-sm px-3 py-1 rounded border ${
                  theme === "dark"
                    ? "border-slate-700 text-slate-300 hover:bg-slate-800"
                    : "border-slate-300 text-slate-600 hover:bg-slate-100"
                } transition`}>
                  Edit Address
                </button>
              </div>
            </div>
          ))}
          {/* Current premium receiver (on-chain) */}
          <div className={`border rounded-lg p-4 ${theme === "dark" ? "border-slate-700" : "border-slate-200"}`}>
            <div className="flex justify-between items-start mb-2">
              <h3 className={`font-semibold ${textClass}`}>Premium Receiver</h3>
              <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full font-medium">Live</span>
            </div>
            <PremiumReceiverDisplay />
          </div>
        </div>

        <div className={`border rounded-lg p-6 ${theme === "dark" ? "border-slate-700" : "border-slate-200"}`}>
          <h3 className={`font-semibold ${textClass} mb-4`}>Add New Contract</h3>
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium ${textClass} mb-2`}>Contract Name</label>
              <input placeholder="e.g., New Engine" className={`w-full px-4 py-2 rounded-lg border ${inputBgClass} ${textClass} placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500`} />
            </div>
            <div>
              <label className={`block text-sm font-medium ${textClass} mb-2`}>Address</label>
              <input placeholder="0x..." className={`w-full px-4 py-2 rounded-lg border ${inputBgClass} ${textClass} placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500`} />
            </div>
            <button className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition">
              Add Contract
            </button>
          </div>
        </div>
        <div className={`border rounded-lg p-6 ${theme === "dark" ? "border-slate-700" : "border-slate-200"}`}>
          <h3 className={`font-semibold ${textClass} mb-4`}>Premium Receiver</h3>
          <p className={`text-sm ${secondaryTextClass} mb-4`}>Set the address that receives collected premiums</p>
          <PremiumReceiverForm inputBgClass={inputBgClass} textClass={textClass} secondaryTextClass={secondaryTextClass} />
        </div>
      </div>
    </div>
  );
};

const PremiumReceiverForm: React.FC<{ inputBgClass?: string; textClass: string; secondaryTextClass: string }> = ({ inputBgClass, textClass, secondaryTextClass }) => {
  const [receiver, setReceiver] = useState("");
  const { notifyPending, notifySuccess, notifyError } = useTx();
  const setReceiverHook = useSetPremiumReceiver(receiver);

  return (
    <div className="space-y-3">
      <div>
        <label className={`block text-sm font-medium ${textClass} mb-2`}>Recipient Address</label>
        <input value={receiver} onChange={(e) => setReceiver(e.target.value)} placeholder="0x..." className={`w-full px-4 py-2 rounded-lg border ${inputBgClass} ${textClass}`} />
      </div>
      <div className="flex gap-2">
        <button
          onClick={async () => {
            try {
              const id = notifyPending("Setting premium receiver");
              const tx = await setReceiverHook.write.writeAsync();
              await tx.wait?.();
              notifySuccess(id, "Premium receiver set");
            } catch (err: any) {
              notifyError(Date.now(), String(err?.message ?? err));
            }
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          Set Receiver
        </button>
      </div>
    </div>
  );
};

const PremiumReceiverDisplay: React.FC = () => {
  const premiumReceiver = usePremiumReceiver();
  const addr = premiumReceiver.data ? String(premiumReceiver.data) : "—";
  return <p className={`text-sm font-mono ${"text-slate-400"}`}>{formatAddress(addr)}</p>;
};

const CreditEventsTab: React.FC<TabProps> = ({ theme, cardBgClass, textClass, secondaryTextClass, inputBgClass }) => {
  const { notifyPending, notifySuccess, notifyError } = useTx();
  const { prepare: markPrepare, write: markWrite } = useMarkDefaulted();
  return (
    <div className="space-y-6">
      <div className={`border rounded-xl p-6 ${cardBgClass}`}>
        <h2 className={`text-2xl font-bold ${textClass} mb-4`}>Credit Events</h2>
        <p className={`text-sm ${secondaryTextClass} mb-6`}>Declare defaults and manage credit events</p>

        <div className={`border-l-4 border-red-600 rounded-lg p-6 mb-6 ${theme === "dark" ? "bg-red-500/10 border-red-700" : "bg-red-50"}`}>
          <p className="flex items-center gap-2 text-red-500 font-bold">
            <IconImage name="alert" className="h-5 w-5" alt="" />
            Important
          </p>
          <p className={`text-sm mt-2 ${secondaryTextClass}`}>Declaring a default will trigger settlement for all CDS positions on this reference entity</p>
        </div>

        <div className={`border rounded-lg p-6 ${theme === "dark" ? "border-slate-700" : "border-slate-200"}`}>
          <h3 className={`font-semibold ${textClass} mb-4`}>Declare Default</h3>
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium ${textClass} mb-2`}>Reference Entity</label>
              <select className={`w-full px-4 py-2 rounded-lg border ${inputBgClass} ${textClass} focus:outline-none focus:ring-2 focus:ring-blue-500`}>
                <option>Select entity...</option>
                <option>Aave Protocol</option>
                <option>Compound Protocol</option>
                <option>Uniswap Protocol</option>
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium ${textClass} mb-2`}>Recovery Rate (%)</label>
              <input type="number" placeholder="0" className={`w-full px-4 py-2 rounded-lg border ${inputBgClass} ${textClass} placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500`} />
            </div>
            <div>
              <label className={`block text-sm font-medium ${textClass} mb-2`}>Event Description</label>
              <textarea placeholder="e.g., Protocol smart contract exploit" className={`w-full px-4 py-2 rounded-lg border ${inputBgClass} ${textClass} placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none`} />
            </div>
            <button
              onClick={async () => {
                try {
                  const id = notifyPending("Declaring default");
                  if (!markWrite?.writeAsync) throw new Error("contract not ready");
                  const tx = await markWrite.writeAsync();
                  await tx.wait?.();
                  notifySuccess(id, "Default declared");
                } catch (e: any) {
                  notifyError(Date.now(), String(e?.message ?? e));
                }
              }}
              className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition"
            >
              Declare Default
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const OracleTab: React.FC<TabProps> = ({ theme, cardBgClass, textClass, secondaryTextClass, inputBgClass }) => {
  return (
    <div className="space-y-6">
      <div className={`border rounded-xl p-6 ${cardBgClass}`}>
        <h2 className={`text-2xl font-bold ${textClass} mb-4`}>Oracle Management</h2>
        <p className={`text-sm ${secondaryTextClass} mb-6`}>Manually push credit data to oracle</p>

        <div className={`border rounded-lg p-6 ${theme === "dark" ? "border-slate-700" : "border-slate-200"}`}>
          <h3 className={`font-semibold ${textClass} mb-4`}>Push Credit Data</h3>
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium ${textClass} mb-2`}>Reference Entity</label>
              <input placeholder="e.g., Aave Protocol" className={`w-full px-4 py-2 rounded-lg border ${inputBgClass} ${textClass} placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500`} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={`block text-sm font-medium ${textClass} mb-2`}>Credit Score</label>
                <input type="number" placeholder="850" className={`w-full px-4 py-2 rounded-lg border ${inputBgClass} ${textClass} placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500`} />
              </div>
              <div>
                <label className={`block text-sm font-medium ${textClass} mb-2`}>Spread (bps)</label>
                <input type="number" placeholder="150" className={`w-full px-4 py-2 rounded-lg border ${inputBgClass} ${textClass} placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500`} />
              </div>
              <div>
                <label className={`block text-sm font-medium ${textClass} mb-2`}>Lambda (bps)</label>
                <input type="number" placeholder="100" className={`w-full px-4 py-2 rounded-lg border ${inputBgClass} ${textClass} placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500`} />
              </div>
            </div>
            <button className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition">
              Push Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const SecurityTab: React.FC<TabProps> = ({ theme, cardBgClass, textClass, secondaryTextClass, dangerBgClass }) => {
  const { notifyPending, notifySuccess, notifyError } = useTx();
  const { prepare: pausePrepare, write: pauseWrite } = usePauseVault();
  const { prepare: unpausePrepare, write: unpauseWrite } = useUnpauseVault();
  return (
    <div className="space-y-6">
      <div className={`border rounded-xl p-6 ${cardBgClass}`}>
        <h2 className={`text-2xl font-bold ${textClass} mb-4`}>Security & Emergency</h2>
        <p className={`text-sm ${secondaryTextClass} mb-6`}>Protocol emergency controls</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={`border-l-4 border-orange-600 rounded-lg p-6 ${theme === "dark" ? "bg-orange-500/10" : "bg-orange-50"}`}>
            <h3 className="text-orange-600 font-bold mb-2">Pause Protocol</h3>
            <p className={`text-sm ${secondaryTextClass} mb-4`}>Halt all protocol transactions in emergency</p>
            <button
              onClick={async () => {
                try {
                  const id = notifyPending("Pausing protocol");
                  if (!pauseWrite?.writeAsync) throw new Error("contract not ready");
                  const tx = await pauseWrite.writeAsync();
                  await tx.wait?.();
                  notifySuccess(id, "Protocol paused");
                } catch (e: any) {
                  notifyError(Date.now(), String(e?.message ?? e));
                }
              }}
              className={`w-full px-4 py-2 ${dangerBgClass} text-white rounded-lg font-medium transition`}
            >
              Pause All Operations
            </button>
          </div>

          <div className={`border-l-4 border-green-600 rounded-lg p-6 ${theme === "dark" ? "bg-green-500/10" : "bg-green-50"}`}>
            <h3 className="text-green-600 font-bold mb-2">Resume Protocol</h3>
            <p className={`text-sm ${secondaryTextClass} mb-4`}>Resume normal protocol operations</p>
            <button
              onClick={async () => {
                try {
                  const id = notifyPending("Unpausing protocol");
                  if (!unpauseWrite?.writeAsync) throw new Error("contract not ready");
                  const tx = await unpauseWrite.writeAsync();
                  await tx.wait?.();
                  notifySuccess(id, "Protocol resumed");
                } catch (e: any) {
                  notifyError(Date.now(), String(e?.message ?? e));
                }
              }}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition"
            >
              Resume Operations
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <button className={`w-full px-4 py-3 border rounded-lg font-medium transition ${
            theme === "dark"
              ? "border-slate-700 text-slate-300 hover:bg-slate-800"
              : "border-slate-300 text-slate-600 hover:bg-slate-100"
          }`}>
            Rotate Owner Key
          </button>
          <button className={`w-full px-4 py-3 border rounded-lg font-medium transition ${
            theme === "dark"
              ? "border-slate-700 text-slate-300 hover:bg-slate-800"
              : "border-slate-300 text-slate-600 hover:bg-slate-100"
          }`}>
            Grant Admin Role
          </button>
          <button className={`w-full px-4 py-3 border rounded-lg font-medium transition ${
            theme === "dark"
              ? "border-slate-700 text-slate-300 hover:bg-slate-800"
              : "border-slate-300 text-slate-600 hover:bg-slate-100"
          }`}>
            View Event Logs
          </button>
        </div>
      </div>
    </div>
  );
};

export default Admin;
