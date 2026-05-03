import React, { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useReadContracts } from "wagmi";
import { useNavigate } from "react-router-dom";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { useCreditEntityRow, useIsStale } from "../hooks/useCreditOracle";
import { useTotalPositions } from "../hooks/useCDSVault";
import { CDS_VAULT_ABI, SEPOLIA_ADDRESSES } from "../config/contracts";
import { formatAddress, formatDate, formatNumber } from "../utils/formatters";

const asNumber = (value: unknown) => Number(value ?? 0);
const toUsdc = (value: unknown) => Number(value ?? 0) / 1_000_000;
const defaultProbabilityFromLambda = (lambdaBps: number) => (1 - Math.exp(-lambdaBps / 10_000)) * 100;
const shortDate = (timestampSeconds: number) =>
  timestampSeconds > 0
    ? new Date(timestampSeconds * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : "No update";

const EntityRisk: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const totalPositions = useTotalPositions();
  const totalOpenPositions = totalPositions.data ? Number(totalPositions.data) : 0;
  const positionIds = Array.from({ length: Math.min(totalOpenPositions, 80) }, (_, index) => BigInt(index + 1));
  const positionReads = useReadContracts({
    contracts: positionIds.map((positionId) => ({
      address: SEPOLIA_ADDRESSES.CDSVault,
      abi: CDS_VAULT_ABI,
      functionName: "getPosition",
      args: [positionId],
    })),
    query: { enabled: positionIds.length > 0 },
  });

  const referenceEntities = Array.from(
    new Set(
      (positionReads.data ?? [])
        .map((result) => {
          const position = result.result as any;
          return position?.referenceEntity ? String(position.referenceEntity) : "";
        })
        .filter(Boolean)
    )
  );
  const [selectedEntityId, setSelectedEntityId] = useState<string>("");
  const liveSelectedEntityId = selectedEntityId || referenceEntities[0] || "";

  const creditRowQuery = useCreditEntityRow(liveSelectedEntityId);
  const staleQuery = useIsStale(liveSelectedEntityId);

  const selectedEntityName = liveSelectedEntityId ? formatAddress(liveSelectedEntityId) : "No reference entity";
  const creditRow = creditRowQuery.data as any;
  const creditScore = asNumber(creditRow?.score ?? creditRow?.[0]);
  const spreadBps = asNumber(creditRow?.spreadBps ?? creditRow?.[1]);
  const lambdaBps = asNumber(creditRow?.lambdaBps ?? creditRow?.[2]);
  const recoveryBps = asNumber(creditRow?.recoveryBps ?? creditRow?.[3]);
  const isDefaultDeclared = Boolean(creditRow?.defaulted_ ?? creditRow?.[4]);
  const updatedAt = asNumber(creditRow?.updatedAt ?? creditRow?.[5]);
  const isStale = staleQuery.data === true;
  const hasOracleData = updatedAt > 0 || creditScore > 0 || spreadBps > 0 || lambdaBps > 0;
  const defaultProbability = defaultProbabilityFromLambda(lambdaBps);
  const activePositionsForEntity = (positionReads.data ?? []).filter((result) => {
    const position = result.result as any;
    return (
      position?.referenceEntity &&
      String(position.referenceEntity).toLowerCase() === liveSelectedEntityId.toLowerCase() &&
      Number(position.state ?? position[9] ?? 0) === 0
    );
  });
  const totalNotionalForEntity = activePositionsForEntity.reduce((sum, result) => {
    const position = result.result as any;
    return sum + toUsdc(position?.notional ?? position?.[3]);
  }, 0);

  const oldestOpenTimestamp = activePositionsForEntity.reduce((oldest, result) => {
    const position = result.result as any;
    const opened = asNumber(position?.openTimestamp ?? position?.[7]);
    if (!opened) return oldest;
    return oldest === 0 ? opened : Math.min(oldest, opened);
  }, 0);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const chartData = [
    { date: oldestOpenTimestamp ? shortDate(oldestOpenTimestamp) : "Open", spread: spreadBps, probability: defaultProbability },
    { date: updatedAt ? shortDate(updatedAt) : "Oracle", spread: spreadBps, probability: defaultProbability },
    { date: shortDate(nowSeconds), spread: spreadBps, probability: defaultProbability },
  ];

  const bgClass = theme === "dark" ? "bg-slate-950" : "bg-slate-50";
  const cardBgClass = theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
  const textClass = theme === "dark" ? "text-white" : "text-slate-900";
  const secondaryTextClass = theme === "dark" ? "text-slate-400" : "text-slate-600";

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "Low":
        return { bg: "bg-green-500/20", text: "text-green-400" };
      case "Medium":
        return { bg: "bg-yellow-500/20", text: "text-yellow-400" };
      case "High":
        return { bg: "bg-orange-500/20", text: "text-orange-400" };
      case "Critical":
        return { bg: "bg-red-500/20", text: "text-red-400" };
      default:
        return { bg: "bg-slate-500/20", text: "text-slate-400" };
    }
  };
  // Derive risk level from on-chain values when available
  const computeRiskLevel = () => {
    if (isDefaultDeclared) return "Critical";
    if (!hasOracleData) return "Unknown";
    if (spreadBps >= 400) return "Critical";
    if (spreadBps >= 250) return "High";
    if (spreadBps >= 150) return "Medium";
    return "Low";
  };

  const riskLevel = computeRiskLevel();
  const riskColor = getRiskColor(riskLevel);
  const status = isDefaultDeclared ? "Default" : isStale ? "Stale" : hasOracleData ? "Healthy" : "Waiting";
  const statusColor = status === "Healthy" ? "text-green-400" : status === "Default" ? "text-red-400" : "text-yellow-400";

  return (
    <div className={`min-h-screen ${bgClass} pt-24 pb-12`}>
      <div className="lg:ml-64 px-4 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-4xl font-bold ${textClass} mb-2`}>Entity Risk Monitor</h1>
          <p className={secondaryTextClass}>Track live oracle credit data for CDS reference entities</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left - Entity List */}
          <div className={`border rounded-xl p-4 ${cardBgClass} h-fit`}>
            <h3 className={`text-lg font-semibold ${textClass} mb-4`}>Entities</h3>
            <div className="space-y-2">
              {referenceEntities.length === 0 && (
                <div className={`px-4 py-3 rounded-lg ${theme === "dark" ? "bg-slate-800" : "bg-slate-100"}`}>
                  <p className={`text-sm ${secondaryTextClass}`}>No CDS reference entities yet.</p>
                </div>
              )}
              {referenceEntities.map((entity) => (
                <button
                  key={entity}
                  onClick={() => setSelectedEntityId(entity)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition ${
                    liveSelectedEntityId === entity
                      ? "bg-blue-600 text-white"
                      : theme === "dark"
                        ? "bg-slate-800 hover:bg-slate-700"
                        : "bg-slate-100 hover:bg-slate-200"
                  } ${liveSelectedEntityId !== entity ? textClass : ""}`}
                >
                  <p className="font-medium text-sm">{formatAddress(entity)}</p>
                  <p className={`text-xs ${liveSelectedEntityId === entity ? "text-blue-100" : secondaryTextClass}`}>
                    Reference entity address
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Right - Details */}
          <div className="lg:col-span-3 space-y-6">
            {/* Selected Entity Header */}
            <div className={`border rounded-xl p-6 ${cardBgClass}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className={`text-2xl font-bold ${textClass} mb-2`}>{selectedEntityName}</h2>
                  <p className={`text-sm ${secondaryTextClass}`}>Credit Risk Analysis</p>
                </div>
                <div className={`px-4 py-2 rounded-lg ${riskColor.bg} ${riskColor.text} font-semibold`}>
                  {riskLevel}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className={`text-xs ${secondaryTextClass} mb-1`}>Credit Score</p>
                  <p className="text-2xl font-bold text-blue-400">{hasOracleData ? creditScore : "—"}</p>
                </div>
                <div>
                  <p className={`text-xs ${secondaryTextClass} mb-1`}>Spread (bps)</p>
                  <p className="text-2xl font-bold text-orange-400">{hasOracleData ? `${spreadBps}` : "—"}</p>
                </div>
                <div>
                  <p className={`text-xs ${secondaryTextClass} mb-1`}>Default Prob.</p>
                  <p className="text-2xl font-bold text-red-400">{hasOracleData ? `${formatNumber(defaultProbability, 2)}%` : "—"}</p>
                </div>
                <div>
                  <p className={`text-xs ${secondaryTextClass} mb-1`}>Status</p>
                  <p className={`text-lg font-bold ${statusColor}`}>
                    {status}
                  </p>
                </div>
              </div>
            </div>

            {/* Spread Chart */}
            <div className={`border rounded-xl p-6 ${cardBgClass}`}>
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className={`text-lg font-semibold ${textClass}`}>Live oracle risk snapshot</h3>
                  <p className={`text-sm ${secondaryTextClass}`}>
                    The contract stores the latest oracle row, not historical candles.
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isStale ? "bg-yellow-500/15 text-yellow-400" : "bg-green-500/15 text-green-400"}`}>
                  {status}
                </span>
              </div>
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorSpread" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={theme === "dark" ? "#334155" : "#e2e8f0"}
                    />
                    <XAxis
                      dataKey="date"
                      stroke={theme === "dark" ? "#94a3b8" : "#64748b"}
                    />
                    <YAxis
                      stroke={theme === "dark" ? "#94a3b8" : "#64748b"}
                      label={{ value: "bps", angle: -90, position: "insideLeft" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: theme === "dark" ? "#1e293b" : "#f8fafc",
                        border: `1px solid ${theme === "dark" ? "#334155" : "#e2e8f0"}`,
                        borderRadius: "8px",
                        color: theme === "dark" ? "#fff" : "#000",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="spread"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorSpread)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* CDS Activity */}
              <div className={`border rounded-xl p-6 ${cardBgClass}`}>
                <h3 className={`text-lg font-semibold ${textClass} mb-4`}>CDS Activity</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className={secondaryTextClass}>Active CDS Positions</p>
                    <p className={`text-2xl font-bold text-blue-400`}>{activePositionsForEntity.length}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className={secondaryTextClass}>Total Notional</p>
                    <p className={`text-lg font-bold ${textClass}`}>${totalNotionalForEntity.toLocaleString()}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className={secondaryTextClass}>Avg Spread</p>
                    <p className={`text-lg font-bold text-orange-400`}>{hasOracleData ? `${spreadBps} bps` : "—"}</p>
                  </div>
                </div>
              </div>

              {/* Pool Info */}
              <div className={`border rounded-xl p-6 ${cardBgClass}`}>
                <h3 className={`text-lg font-semibold ${textClass} mb-4`}>Pool Info</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className={secondaryTextClass}>TVL</p>
                    <p className={`text-lg font-bold ${textClass}`}>${totalNotionalForEntity.toLocaleString()}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className={secondaryTextClass}>Last Updated</p>
                    <p className={`text-sm ${secondaryTextClass}`}>{updatedAt ? formatDate(BigInt(updatedAt)) : "Waiting for oracle"}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className={secondaryTextClass}>Recovery Estimate</p>
                    <p className="text-lg font-bold text-orange-400">{hasOracleData ? `${formatNumber(recoveryBps / 100, 2)}%` : "—"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                type="button"
                disabled={!liveSelectedEntityId}
                onClick={() => navigate(liveSelectedEntityId ? `/cds-market?referenceEntity=${liveSelectedEntityId}` : "/cds-market")}
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 text-white rounded-lg font-medium transition"
              >
                Buy Protection
              </button>
              <button
                type="button"
                disabled={!liveSelectedEntityId}
                onClick={() => navigate(liveSelectedEntityId ? `/oracle-monitor?entity=${liveSelectedEntityId}` : "/oracle-monitor")}
                className={`flex-1 px-6 py-3 border rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                theme === "dark"
                  ? "border-slate-700 text-slate-300 hover:bg-slate-800"
                  : "border-slate-300 text-slate-600 hover:bg-slate-100"
              }`}>
                View Details
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EntityRisk;
