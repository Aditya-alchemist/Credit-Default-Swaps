import React, { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useReadContract } from "wagmi";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatUnits } from "viem";
import { formatAddress, formatNumber } from "../utils/formatters";
import { usePoolStats, useTotalPositions } from "../hooks/useLendingPool";
import { useVaultOwner } from "../hooks/useCDSVault";
import { usePremiumReceiver } from "../hooks/usePremiumEngine";
import { SEPOLIA_ADDRESSES, CDS_VAULT_ABI } from "../config/contracts";
import { IconImage } from "../components/IconImage";

interface PromotionalCardProps {
  title: string;
  description: string;
  bgGradient: string;
}

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
}

const Dashboard: React.FC = () => {
  const { theme } = useTheme();
  const [selectedPeriod, setSelectedPeriod] = useState("Live");
  const totalPositions = useTotalPositions();
  const poolStats = usePoolStats();
  const vaultOwner = useVaultOwner();
  const premiumReceiver = usePremiumReceiver();

  const totalSupplied = poolStats.totalSupplied.data ? Number(formatUnits(BigInt(poolStats.totalSupplied.data as any), 6)) : 0;
  const totalBorrowed = poolStats.totalBorrowed.data ? Number(formatUnits(BigInt(poolStats.totalBorrowed.data as any), 6)) : 0;
  const availableLiquidity = poolStats.availableLiquidity.data ? Number(formatUnits(BigInt(poolStats.availableLiquidity.data as any), 6)) : 0;
  const utilizationBps = poolStats.utilizationRate.data ? Number(poolStats.utilizationRate.data) : 0;
  const totalOpenPositions = totalPositions.data ? Math.max(0, Number(totalPositions.data) - 1) : 0;
  const protocolTvl = totalSupplied;
  const ownerAddress = vaultOwner.data ? String(vaultOwner.data) : SEPOLIA_ADDRESSES.CDSVault;
  const receiverAddress = premiumReceiver.data ? String(premiumReceiver.data) : SEPOLIA_ADDRESSES.CDSVault;

  const bgClass = theme === "dark" 
    ? "bg-slate-950" 
    : "bg-slate-50";
  
  const cardBgClass = theme === "dark" 
    ? "bg-slate-900 border-slate-800" 
    : "bg-white border-slate-200";

  const textClass = theme === "dark" 
    ? "text-white" 
    : "text-slate-900";

  const secondaryTextClass = theme === "dark" 
    ? "text-slate-400" 
    : "text-slate-600";

  const contractRows = [
    { label: "CDS Vault", address: SEPOLIA_ADDRESSES.CDSVault, value: `${totalOpenPositions} positions` },
    { label: "Lending Pool", address: SEPOLIA_ADDRESSES.LendingPool, value: `${formatNumber(totalBorrowed)} borrowed` },
    { label: "Premium Receiver", address: receiverAddress, value: "live payout target" },
    { label: "Vault Owner", address: ownerAddress, value: "owner-controlled" },
  ];
  const exposureData = [
    { label: "Supplied", value: totalSupplied, color: "#f97316" },
    { label: "Borrowed", value: totalBorrowed, color: "#2563eb" },
    { label: "Available", value: availableLiquidity, color: "#22c55e" },
  ];
  const allocationData = [
    { name: "Available", value: availableLiquidity, color: "#2563eb" },
    { name: "Borrowed", value: totalBorrowed, color: "#f97316" },
    { name: "CDS Positions", value: totalOpenPositions * 100, color: "#ec4899" },
  ].filter((item) => item.value > 0);
  const allocationChartData = allocationData.length
    ? allocationData
    : [{ name: "No capital", value: 1, color: "#64748b" }];
  const riskBars = [
    { name: "Collateral", value: 120 },
    { name: "Health", value: Math.max(100, utilizationBps / 80) },
    { name: "Liquidity", value: Math.max(20, 100 - utilizationBps / 100) },
  ];

  return (
    <div className={`min-h-screen ${bgClass} pt-24 pb-12`}>
      <div className="lg:ml-64 px-4 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className={`text-4xl font-bold ${textClass} mb-2`}>CDS Protocol</h1>
          <p className={secondaryTextClass}>Monitor protection, credit risk, and protocol exposure</p>
        </div>

        {/* Protocol Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <StatCard title="Total TVL" value={`$${formatNumber(protocolTvl)}`} subtitle="Live onchain supplied capital" />
          <StatCard title="Open CDS Positions" value={String(totalOpenPositions)} subtitle="Positions tracked in the vault" />
          <StatCard title="Available Liquidity" value={`$${formatNumber(availableLiquidity)}`} subtitle="USDC ready for lending" />
          <StatCard title="Utilization" value={`${formatNumber(utilizationBps / 100, 1)}%`} subtitle="Borrowed versus supplied" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
          <InsightCard
            title="Protection markets"
            subtitle="Track collateral, open protection, and settlement readiness from one command surface."
            icon="shield"
            accent="from-blue-500/20 via-sky-400/10 to-orange-400/20"
          />
          <InsightCard
            title="Capital efficiency"
            subtitle="Deposits, lending liquidity, and CDS coverage now sit in the same operational workflow."
            icon="chart"
            accent="from-orange-500/20 via-amber-400/10 to-pink-500/20"
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
          <div className={`xl:col-span-2 border rounded-xl p-6 ${cardBgClass}`}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className={`text-sm font-medium ${secondaryTextClass}`}>Protocol Exposure</p>
                <h2 className={`text-2xl font-bold ${textClass}`}>Live liquidity snapshot</h2>
              </div>
              <div className="flex gap-2 text-xs">
                {["1D", "7D", "1M", "ALL"].map((period) => (
                  <button
                    key={period}
                    onClick={() => setSelectedPeriod(period)}
                    className={`rounded-md px-3 py-1 font-semibold transition ${
                      selectedPeriod === period
                        ? "bg-orange-500 text-white"
                        : theme === "dark"
                          ? "bg-slate-800 text-slate-400"
                          : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={exposureData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#1e293b" : "#e2e8f0"} />
                  <XAxis dataKey="label" stroke={theme === "dark" ? "#94a3b8" : "#64748b"} />
                  <YAxis stroke={theme === "dark" ? "#94a3b8" : "#64748b"} tickFormatter={(value) => `$${formatNumber(value, 0)}`} />
                  <Tooltip formatter={(value: any) => `$${formatNumber(Number(value), 2)}`} />
                  <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                    {exposureData.map((entry) => (
                      <Cell key={entry.label} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={`border rounded-xl p-6 ${cardBgClass}`}>
            <p className={`text-sm font-medium ${secondaryTextClass}`}>Capital Mix</p>
            <h2 className={`text-2xl font-bold ${textClass} mb-4`}>Pool allocation</h2>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={allocationChartData} dataKey="value" innerRadius={72} outerRadius={96} paddingAngle={5}>
                    {allocationChartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `$${formatNumber(Number(value), 2)}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {(allocationData.length ? allocationData : [{ name: "No live balances", value: 0, color: "#64748b" }]).map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <span className={`flex items-center gap-2 ${secondaryTextClass}`}>
                    <span className="h-2 w-8 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.name}
                  </span>
                  <span className={textClass}>{formatNumber(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className={`border rounded-xl p-6 ${cardBgClass}`}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className={`text-sm font-medium ${secondaryTextClass} mb-2`}>Protocol Snapshot</p>
                <h2 className={`text-4xl font-bold ${textClass}`}>Live contracts</h2>
                <p className={`text-sm ${secondaryTextClass} mt-1`}>All values below come directly from deployed contracts</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-semibold ${theme === "dark" ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                {selectedPeriod}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border px-4 py-3 border-slate-200 dark:border-slate-800">
                <div>
                  <p className={`text-sm ${secondaryTextClass}`}>Vault owner</p>
                  <p className={`font-mono text-sm ${textClass}`}>{formatAddress(ownerAddress)}</p>
                </div>
                <span className={`text-sm ${secondaryTextClass}`}>Controls pause and recovery</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border px-4 py-3 border-slate-200 dark:border-slate-800">
                <div>
                  <p className={`text-sm ${secondaryTextClass}`}>Premium receiver</p>
                  <p className={`font-mono text-sm ${textClass}`}>{formatAddress(receiverAddress)}</p>
                </div>
                <span className={`text-sm ${secondaryTextClass}`}>Receives collected premiums</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border px-4 py-3 border-slate-200 dark:border-slate-800">
                <div>
                  <p className={`text-sm ${secondaryTextClass}`}>Vault collateral escrow</p>
                  <p className={`text-sm ${textClass}`}>{formatNumber(totalBorrowed)} USDC locked against active lending</p>
                </div>
                <span className={`text-sm ${secondaryTextClass}`}>Borrowed from the pool</span>
              </div>
            </div>
          </div>

          <div className={`border rounded-xl p-6 ${cardBgClass}`}>
            <h3 className={`text-lg font-semibold ${textClass} mb-4`}>Deployed Contracts</h3>
            <div className="space-y-4">
              {contractRows.map((row) => (
                <div key={row.label} className={`border rounded-lg p-4 ${theme === "dark" ? "border-slate-800" : "border-slate-200"}`}>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className={`font-semibold ${textClass}`}>{row.label}</p>
                      <p className={`font-mono text-sm ${secondaryTextClass}`}>{formatAddress(row.address)}</p>
                    </div>
                    <span className={`text-xs ${secondaryTextClass}`}>{row.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`border rounded-xl p-6 ${cardBgClass}`}>
            <h3 className={`text-lg font-semibold ${textClass} mb-4`}>Risk Bands</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskBars}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#1e293b" : "#e2e8f0"} />
                  <XAxis dataKey="name" stroke={theme === "dark" ? "#94a3b8" : "#64748b"} />
                  <YAxis stroke={theme === "dark" ? "#94a3b8" : "#64748b"} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#f97316" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const InsightCard: React.FC<{
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof IconImage>["name"];
  accent: string;
}> = ({ title, subtitle, icon, accent }) => {
  const { theme } = useTheme();
  const textClass = theme === "dark" ? "text-white" : "text-slate-900";
  const secondaryTextClass = theme === "dark" ? "text-slate-400" : "text-slate-600";

  return (
    <div className={`relative overflow-hidden rounded-xl border p-6 ${theme === "dark" ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"}`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${accent}`} />
      <div className="relative flex items-center gap-5">
        <div className="rounded-2xl bg-white/70 p-4 shadow-sm">
          <IconImage name={icon} className="h-16 w-16" alt="" />
        </div>
        <div>
          <h3 className={`text-2xl font-bold ${textClass}`}>{title}</h3>
          <p className={`mt-2 max-w-xl text-sm ${secondaryTextClass}`}>{subtitle}</p>
        </div>
      </div>
    </div>
  );
};

const PromotionalCard: React.FC<PromotionalCardProps> = ({
  title,
  description,
  bgGradient,
}) => {
  return (
    <div
      className={`rounded-xl p-6 text-white overflow-hidden relative ${bgGradient} bg-gradient-to-br`}
    >
      <div className="relative z-10">
        <h3 className="text-xl font-bold mb-4">{title}</h3>
        <a href="#" className="text-sm font-medium hover:underline flex items-center gap-1">
          {description} →
        </a>
      </div>
      {/* Decorative circles */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-20 -mr-16 -mt-16">
        <div className="w-full h-full rounded-full border-8 border-white"></div>
      </div>
      <div className="absolute bottom-0 left-1/2 w-32 h-32 opacity-20 -mb-16 -ml-16">
        <div className="w-full h-full rounded-full border-8 border-white"></div>
      </div>
    </div>
  );
};

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle }) => {
  const { theme } = useTheme();
  const cardBgClass = theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
  const textClass = theme === "dark" ? "text-white" : "text-slate-900";
  const secondaryTextClass = theme === "dark" ? "text-slate-400" : "text-slate-600";

  return (
    <div className={`border rounded-xl p-6 ${cardBgClass}`}>
      <p className={`text-sm font-medium ${secondaryTextClass} mb-2`}>{title}</p>
      <p className={`text-3xl font-bold ${textClass}`}>{value}</p>
      <p className={`text-xs mt-2 ${secondaryTextClass}`}>{subtitle}</p>
    </div>
  );
};

export default Dashboard;
