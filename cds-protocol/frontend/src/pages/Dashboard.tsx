import React, { useState } from "react";
import { useTheme } from "../context/ThemeContext";
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
import { SEPOLIA_ADDRESSES } from "../config/contracts";
import { IconImage } from "../components/IconImage";

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
    { name: "Available", symbol: "AVL", value: availableLiquidity, color: "#0f7bff" },
    { name: "Borrowed", symbol: "BRW", value: totalBorrowed, color: "#fbbf24" },
    { name: "CDS Positions", symbol: "CDS", value: totalOpenPositions * 100, color: "#ec4899" },
    { name: "Reserve", symbol: "RSV", value: Math.max(totalSupplied - totalBorrowed - availableLiquidity, 0), color: "#d946ef" },
  ].filter((item) => item.value > 0);
  const allocationTotal = allocationData.reduce((sum, item) => sum + item.value, 0);
  const hasLiveAllocation = allocationTotal > 0;
  const allocationChartData = allocationData.map((item) => ({ ...item, displayValue: item.value }));
  const allocationLegendData = allocationChartData.map((item) => ({
    ...item,
    pct: hasLiveAllocation ? Math.round((item.value / allocationTotal) * 100) : 0,
  }));
  const hasRiskData = protocolTvl > 0 || totalBorrowed > 0 || availableLiquidity > 0;
  const riskBars = [
    { name: "Supplied", value: protocolTvl },
    { name: "Borrowed", value: totalBorrowed },
    { name: "Available", value: availableLiquidity },
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

          <div className={`border rounded-2xl p-7 ${cardBgClass}`}>
            <p className={`text-sm font-semibold ${secondaryTextClass}`}>Capital Mix</p>
            <h2 className={`text-2xl font-black ${textClass} mb-2`}>Pool allocation</h2>
            <p className={`text-xs ${secondaryTextClass}`}>Live split of supplied, borrowed, available, and protected capital</p>
            <div className="relative mx-auto mt-4 h-72 max-w-sm">
              {hasLiveAllocation ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={allocationChartData}
                      dataKey="value"
                      innerRadius={92}
                      outerRadius={111}
                      startAngle={115}
                      endAngle={-245}
                      paddingAngle={7}
                      cornerRadius={12}
                      stroke="transparent"
                    >
                      {allocationChartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: theme === "dark" ? "#0f172a" : "#ffffff",
                        border: `1px solid ${theme === "dark" ? "#1e293b" : "#e2e8f0"}`,
                        borderRadius: 12,
                        color: theme === "dark" ? "#f8fafc" : "#0f172a",
                      }}
                      formatter={(value: any, name: any, props: any) =>
                        `$${formatNumber(Number(props.payload.displayValue ?? value), 2)}`
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className={`h-52 w-52 rounded-full border-[18px] border-dashed ${theme === "dark" ? "border-slate-800" : "border-slate-200"}`} />
                </div>
              )}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className={`text-sm font-black ${textClass}`}>Protocol Capital</p>
                  <p className="mt-1 text-xl font-black text-orange-400">${formatNumber(protocolTvl, 2)}</p>
                  <p className={`text-xs ${secondaryTextClass}`}>{hasLiveAllocation ? `${allocationData.length} active buckets` : "No capital supplied"}</p>
                </div>
              </div>
            </div>
            <div className="mt-2 space-y-3">
              {hasLiveAllocation ? (
                allocationLegendData.map((item) => (
                  <div key={item.name} className="grid grid-cols-[minmax(94px,1fr)_1.2fr_42px] items-center gap-3 text-sm">
                    <span className={`${secondaryTextClass}`}>
                      {item.name} <span style={{ color: item.color }}>({item.symbol})</span>
                    </span>
                    <span className={`h-1.5 rounded-full ${theme === "dark" ? "bg-slate-800" : "bg-slate-200"}`}>
                      <span
                        className="block h-full rounded-full"
                        style={{ width: `${Math.max(item.pct, 2)}%`, backgroundColor: item.color }}
                      />
                    </span>
                    <span className={`${textClass} text-right text-xs font-bold`}>{item.pct}%</span>
                  </div>
                ))
              ) : (
                <div className={`rounded-xl border border-dashed px-4 py-5 text-center text-sm ${theme === "dark" ? "border-slate-800 text-slate-400" : "border-slate-200 text-slate-500"}`}>
                  Supply capital or open positions to populate this allocation.
                </div>
              )}
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
            {hasRiskData ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={riskBars}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#1e293b" : "#e2e8f0"} />
                    <XAxis dataKey="name" stroke={theme === "dark" ? "#94a3b8" : "#64748b"} />
                    <YAxis stroke={theme === "dark" ? "#94a3b8" : "#64748b"} tickFormatter={(value) => `$${formatNumber(value, 0)}`} />
                    <Tooltip formatter={(value: any) => `$${formatNumber(Number(value), 2)}`} />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#f97316" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className={`flex h-56 items-center justify-center rounded-xl border border-dashed text-center text-sm ${theme === "dark" ? "border-slate-800 text-slate-400" : "border-slate-200 text-slate-500"}`}>
                No supplied, borrowed, or available capital yet.
              </div>
            )}
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
