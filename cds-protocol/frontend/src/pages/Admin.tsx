import React, { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAccount } from "wagmi";
import { useVaultOwner, usePauseVault, useUnpauseVault } from "../hooks/useCDSVault";
import { useSetCreditData, useMarkDefaulted } from "../hooks/useCreditOracle";
import { useTx } from "../context/TxContext";

interface AdminTab {
  name: string;
  icon: string;
  description: string;
}

const ADMIN_TABS: AdminTab[] = [
  { name: "Faucet", icon: "🚰", description: "Mint test tokens" },
  { name: "Contracts", icon: "📋", description: "Manage contract addresses" },
  { name: "Credit Events", icon: "🚨", description: "Declare defaults" },
  { name: "Oracle", icon: "🔮", description: "Manual oracle push" },
  { name: "Security", icon: "🔒", description: "Emergency pause" },
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
            <p className={`text-lg ${secondaryTextClass}`}>⛔ Access denied. Owner wallet required.</p>
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
          <p className="text-red-400 font-semibold">⚠️ Owner Only</p>
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
                  <p className="font-medium text-sm">{tab.icon} {tab.name}</p>
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
  const [usdcAmount, setUsdcAmount] = useState("1000");
  const [wethAmount, setWethAmount] = useState("1");

  return (
    <div className="space-y-6">
      <div className={`border rounded-xl p-6 ${cardBgClass}`}>
        <h2 className={`text-2xl font-bold ${textClass} mb-4`}>Token Faucet</h2>
        <p className={`text-sm ${secondaryTextClass} mb-6`}>Mint test tokens for development and testing</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* USDC */}
          <div className={`border rounded-lg p-6 ${theme === "dark" ? "border-slate-700" : "border-slate-200"}`}>
            <h3 className={`text-lg font-semibold ${textClass} mb-4`}>💵 USDC</h3>
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
              <button className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition">
                Mint {usdcAmount} USDC
              </button>
            </div>
          </div>

          {/* WETH */}
          <div className={`border rounded-lg p-6 ${theme === "dark" ? "border-slate-700" : "border-slate-200"}`}>
            <h3 className={`text-lg font-semibold ${textClass} mb-4`}>⟠ WETH</h3>
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
              <button className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition">
                Mint {wethAmount} WETH
              </button>
            </div>
          </div>
        </div>

        <div className={`px-4 py-3 rounded-lg border ${theme === "dark" ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-300"}`}>
          <p className={`text-sm ${secondaryTextClass}`}>✅ Tokens will be minted to your connected wallet</p>
        </div>
      </div>
    </div>
  );
};

const ContractsTab: React.FC<TabProps> = ({ theme, cardBgClass, textClass, secondaryTextClass, inputBgClass }) => {
  const contracts = [
    { name: "CDS Vault", address: "0x1234...5678", status: "Active" },
    { name: "Lending Pool", address: "0x8765...4321", status: "Active" },
    { name: "Premium Engine", address: "0xabcd...efgh", status: "Active" },
    { name: "Settlement Engine", address: "0xijkl...mnop", status: "Active" },
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
      </div>
    </div>
  );
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
          <p className="text-red-500 font-bold">⚠️ Important</p>
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
              🚨 Declare Default
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
            <h3 className="text-orange-600 font-bold mb-2">⏸️ Pause Protocol</h3>
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
            <h3 className="text-green-600 font-bold mb-2">▶️ Resume Protocol</h3>
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
            🔑 Rotate Owner Key
          </button>
          <button className={`w-full px-4 py-3 border rounded-lg font-medium transition ${
            theme === "dark"
              ? "border-slate-700 text-slate-300 hover:bg-slate-800"
              : "border-slate-300 text-slate-600 hover:bg-slate-100"
          }`}>
            🛡️ Grant Admin Role
          </button>
          <button className={`w-full px-4 py-3 border rounded-lg font-medium transition ${
            theme === "dark"
              ? "border-slate-700 text-slate-300 hover:bg-slate-800"
              : "border-slate-300 text-slate-600 hover:bg-slate-100"
          }`}>
            📜 View Event Logs
          </button>
        </div>
      </div>
    </div>
  );
};

export default Admin;
