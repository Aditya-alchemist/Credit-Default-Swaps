import React, { useMemo, useState } from "react";
import { useReadContracts } from "wagmi";
import {
  Area,
  AreaChart,
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
import { useTheme } from "../context/ThemeContext";
import { IconImage } from "../components/IconImage";
import { useTotalPositions } from "../hooks/useCDSVault";
import { useCheckAndFlag, useLiquidatePosition } from "../hooks/useMarginEngine";
import { useTx } from "../context/TxContext";
import { CDS_VAULT_ABI, MARGIN_ENGINE_ABI, SEPOLIA_ADDRESSES } from "../config/contracts";
import { formatAddress, formatDateTime, formatNumber, formatTimeRemaining } from "../utils/formatters";

type MarginStatus = "Safe" | "Warning" | "Critical";

type LiveMarginPosition = {
  id: number;
  buyer: string;
  seller: string;
  referenceEntity: string;
  notional: number;
  collateral: number;
  spreadBps: number;
  state: number;
  ratioBps: number;
  mtm: number;
  underwater: boolean;
  deadline: number;
  status: MarginStatus;
};

const toUsdc = (value: unknown) => Number(value ?? 0) / 1_000_000;
const asNumber = (value: unknown) => Number(value ?? 0);
const ratioPercent = (ratioBps: number) => ratioBps / 100;
const stateLabel = (state: number) => state === 0 ? "Active" : state === 1 ? "Margin Call" : state === 2 ? "Defaulted" : "Expired";

const MarginDashboard: React.FC = () => {
  const { theme } = useTheme();
  const { notifyPending, notifySuccess, notifyError } = useTx();
  const totalPositions = useTotalPositions();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const checkAndFlag = useCheckAndFlag(selectedId ?? undefined);
  const liquidate = useLiquidatePosition(selectedId ?? undefined);

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

  const ratioReads = useReadContracts({
    contracts: positionIds.map((positionId) => ({
      address: SEPOLIA_ADDRESSES.MarginEngine,
      abi: MARGIN_ENGINE_ABI,
      functionName: "computeCurrentRatio",
      args: [positionId],
    })),
    query: { enabled: positionIds.length > 0 },
  });

  const mtmReads = useReadContracts({
    contracts: positionIds.map((positionId) => ({
      address: SEPOLIA_ADDRESSES.MarginEngine,
      abi: MARGIN_ENGINE_ABI,
      functionName: "computeMtM",
      args: [positionId],
    })),
    query: { enabled: positionIds.length > 0 },
  });

  const underwaterReads = useReadContracts({
    contracts: positionIds.map((positionId) => ({
      address: SEPOLIA_ADDRESSES.MarginEngine,
      abi: MARGIN_ENGINE_ABI,
      functionName: "isUnderwater",
      args: [positionId],
    })),
    query: { enabled: positionIds.length > 0 },
  });

  const deadlineReads = useReadContracts({
    contracts: positionIds.map((positionId) => ({
      address: SEPOLIA_ADDRESSES.MarginEngine,
      abi: MARGIN_ENGINE_ABI,
      functionName: "getMarginCallDeadline",
      args: [positionId],
    })),
    query: { enabled: positionIds.length > 0 },
  });

  const positions = useMemo<LiveMarginPosition[]>(() => {
    return (positionReads.data ?? [])
      .map((result, index) => {
        const item = result.result as any;
        if (!item) return null;

        const notional = toUsdc(item.notional ?? item[3]);
        const collateral = toUsdc(item.collateral ?? item[5]);
        const fallbackRatioBps = notional > 0 ? (collateral / notional) * 10_000 : 0;
        const ratioBps = asNumber(ratioReads.data?.[index]?.result) || fallbackRatioBps;
        const deadline = asNumber(deadlineReads.data?.[index]?.result);
        const underwater = Boolean(underwaterReads.data?.[index]?.result);
        const state = asNumber(item.state ?? item[9]);
        const isCritical = deadline > 0 && Date.now() / 1000 > deadline;
        const status: MarginStatus = isCritical || (underwater && ratioBps < 10_500) ? "Critical" : underwater || state === 1 ? "Warning" : "Safe";

        return {
          id: Number(positionIds[index]),
          buyer: String(item.buyer ?? item[0] ?? ""),
          seller: String(item.seller ?? item[1] ?? ""),
          referenceEntity: String(item.referenceEntity ?? item[2] ?? ""),
          notional,
          collateral,
          spreadBps: asNumber(item.spreadBps ?? item[4]),
          state,
          ratioBps,
          mtm: toUsdc(mtmReads.data?.[index]?.result),
          underwater,
          deadline,
          status,
        };
      })
      .filter((item): item is LiveMarginPosition => !!item && item.state <= 1);
  }, [deadlineReads.data, mtmReads.data, positionReads.data, positionIds, ratioReads.data, underwaterReads.data]);

  const selectedPosition = positions.find((position) => position.id === selectedId) ?? positions[0] ?? null;
  const criticalCount = positions.filter((position) => position.status === "Critical").length;
  const warningCount = positions.filter((position) => position.status === "Warning").length;
  const safeCount = positions.filter((position) => position.status === "Safe").length;
  const totalCollateral = positions.reduce((sum, position) => sum + position.collateral, 0);
  const totalMtm = positions.reduce((sum, position) => sum + position.mtm, 0);

  const riskBars = [
    { name: "Critical", value: criticalCount, color: "#ef4444" },
    { name: "Warning", value: warningCount, color: "#f59e0b" },
    { name: "Safe", value: safeCount, color: "#22c55e" },
  ];

  const ratioData = positions.map((position) => ({
    name: `#${position.id}`,
    ratio: ratioPercent(position.ratioBps),
    required: 120,
  }));

  const collateralMix = [
    { name: "Collateral", value: totalCollateral, color: "#2563eb" },
    { name: "MTM exposure", value: totalMtm, color: "#f97316" },
  ].filter((item) => item.value > 0);

  const bgClass = theme === "dark" ? "bg-slate-950" : "bg-slate-50";
  const cardBgClass = theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
  const textClass = theme === "dark" ? "text-white" : "text-slate-900";
  const secondaryTextClass = theme === "dark" ? "text-slate-400" : "text-slate-600";
  const gridStroke = theme === "dark" ? "#1e293b" : "#e2e8f0";
  const axisStroke = theme === "dark" ? "#94a3b8" : "#64748b";

  const statusClasses = (status: MarginStatus) => {
    if (status === "Critical") return "border-red-500/50 bg-red-500/10 text-red-400";
    if (status === "Warning") return "border-yellow-500/50 bg-yellow-500/10 text-yellow-400";
    return "border-green-500/50 bg-green-500/10 text-green-400";
  };

  const runCheck = async () => {
    if (!selectedPosition) return;
    const id = notifyPending(`Checking margin #${selectedPosition.id}`);
    try {
      await checkAndFlag.write.writeAsync();
      notifySuccess(id, `Margin #${selectedPosition.id} checked`);
    } catch (error) {
      notifyError(id, error instanceof Error ? error.message : "Margin check failed");
    }
  };

  const runLiquidate = async () => {
    if (!selectedPosition) return;
    const id = notifyPending(`Liquidating #${selectedPosition.id}`);
    try {
      await liquidate.write.writeAsync();
      notifySuccess(id, `Position #${selectedPosition.id} liquidated`);
    } catch (error) {
      notifyError(id, error instanceof Error ? error.message : "Liquidation failed");
    }
  };

  return (
    <div className={`min-h-screen ${bgClass} pt-24 pb-12`}>
      <div className="lg:ml-64 px-4 lg:px-8">
        <div className="mb-8">
          <h1 className={`text-4xl font-bold ${textClass} mb-2`}>Margin Dashboard</h1>
          <p className={secondaryTextClass}>Live collateral ratios, margin calls, and liquidation readiness</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard title="Critical Positions" value={criticalCount} subtitle="Past deadline or deeply underwater" icon="alert" tone="red" />
          <StatCard title="Warning Positions" value={warningCount} subtitle="Below 120% maintenance ratio" icon="alert" tone="yellow" />
          <StatCard title="Safe Positions" value={safeCount} subtitle="At or above maintenance ratio" icon="shield" tone="green" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
          <div className={`xl:col-span-2 border rounded-xl p-6 ${cardBgClass}`}>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className={`text-sm ${secondaryTextClass}`}>Collateral Health</p>
                <h2 className={`text-2xl font-bold ${textClass}`}>Position ratio map</h2>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${theme === "dark" ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                Required 120%
              </span>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ratioData.length ? ratioData : [{ name: "No active CDS", ratio: 0, required: 120 }]}>
                  <defs>
                    <linearGradient id="ratioGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="name" stroke={axisStroke} />
                  <YAxis stroke={axisStroke} tickFormatter={(value) => `${formatNumber(Number(value), 0)}%`} />
                  <Tooltip formatter={(value: any) => `${formatNumber(Number(value), 2)}%`} />
                  <Area type="monotone" dataKey="ratio" stroke="#22c55e" strokeWidth={3} fill="url(#ratioGradient)" />
                  <Area type="monotone" dataKey="required" stroke="#f59e0b" strokeDasharray="6 6" fill="transparent" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={`border rounded-xl p-6 ${cardBgClass}`}>
            <p className={`text-sm ${secondaryTextClass}`}>Risk Buckets</p>
            <h2 className={`text-2xl font-bold ${textClass} mb-5`}>Margin mix</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskBars}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="name" stroke={axisStroke} />
                  <YAxis allowDecimals={false} stroke={axisStroke} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {riskBars.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className={`border rounded-xl p-6 ${cardBgClass}`}>
            <h3 className={`text-lg font-semibold ${textClass} mb-4`}>Positions</h3>
            <div className="space-y-3">
              {positions.length === 0 && (
                <p className={`rounded-lg border px-4 py-5 text-sm ${secondaryTextClass} ${theme === "dark" ? "border-slate-800" : "border-slate-200"}`}>
                  No active CDS margin positions yet.
                </p>
              )}
              {positions.map((position) => (
                <button
                  key={position.id}
                  onClick={() => setSelectedId(position.id)}
                  className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                    selectedPosition?.id === position.id
                      ? "border-blue-500 bg-blue-600 text-white"
                      : theme === "dark"
                        ? "border-slate-800 hover:border-slate-700 hover:bg-slate-800"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="font-semibold">CDS #{position.id}</p>
                    <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusClasses(position.status)}`}>
                      {position.status}
                    </span>
                  </div>
                  <p className={`text-xs ${selectedPosition?.id === position.id ? "text-blue-100" : secondaryTextClass}`}>
                    {formatAddress(position.referenceEntity)} · {formatNumber(ratioPercent(position.ratioBps), 2)}%
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className={`xl:col-span-2 border rounded-xl p-6 ${cardBgClass}`}>
            {selectedPosition ? (
              <div className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className={`text-2xl font-bold ${textClass}`}>CDS #{selectedPosition.id}</h2>
                    <p className={secondaryTextClass}>Reference {formatAddress(selectedPosition.referenceEntity)}</p>
                  </div>
                  <span className={`rounded-lg border px-4 py-2 text-sm font-semibold ${statusClasses(selectedPosition.status)}`}>
                    {selectedPosition.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Detail label="Collateral Ratio" value={`${formatNumber(ratioPercent(selectedPosition.ratioBps), 2)}%`} />
                  <Detail label="Maintenance" value="120.00%" />
                  <Detail label="Notional" value={`$${formatNumber(selectedPosition.notional)}`} />
                  <Detail label="Collateral" value={`$${formatNumber(selectedPosition.collateral)}`} />
                  <Detail label="Spread" value={`${formatNumber(selectedPosition.spreadBps / 100, 2)}%`} />
                  <Detail label="MTM Exposure" value={`$${formatNumber(selectedPosition.mtm)}`} />
                  <Detail label="State" value={stateLabel(selectedPosition.state)} />
                  <Detail
                    label="Deadline"
                    value={selectedPosition.deadline > 0 ? formatTimeRemaining(selectedPosition.deadline - Math.floor(Date.now() / 1000)) : "No active call"}
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className={`rounded-xl border p-5 ${theme === "dark" ? "border-slate-800" : "border-slate-200"}`}>
                    <h3 className={`mb-4 text-lg font-semibold ${textClass}`}>Exposure split</h3>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={collateralMix.length ? collateralMix : [{ name: "Empty", value: 1, color: "#64748b" }]} dataKey="value" innerRadius={58} outerRadius={84} paddingAngle={4}>
                            {(collateralMix.length ? collateralMix : [{ name: "Empty", value: 1, color: "#64748b" }]).map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: any) => `$${formatNumber(Number(value), 2)}`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className={`rounded-xl border p-5 ${theme === "dark" ? "border-slate-800" : "border-slate-200"}`}>
                    <h3 className={`mb-4 text-lg font-semibold ${textClass}`}>Counterparties</h3>
                    <div className="space-y-4">
                      <Detail label="Buyer" value={formatAddress(selectedPosition.buyer)} />
                      <Detail label="Seller" value={formatAddress(selectedPosition.seller)} />
                      <Detail label="Last checked" value={formatDateTime(Math.floor(Date.now() / 1000))} />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button onClick={runCheck} className="flex-1 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700">
                    Check Margin
                  </button>
                  <button
                    onClick={runLiquidate}
                    disabled={selectedPosition.deadline === 0 || selectedPosition.deadline > Date.now() / 1000}
                    className="flex-1 rounded-lg bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Liquidate After Deadline
                  </button>
                </div>
              </div>
            ) : (
              <p className={`text-sm ${secondaryTextClass}`}>Open a CDS position to see live margin data.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{
  title: string;
  value: number;
  subtitle: string;
  icon: React.ComponentProps<typeof IconImage>["name"];
  tone: "red" | "yellow" | "green";
}> = ({ title, value, subtitle, icon, tone }) => {
  const { theme } = useTheme();
  const cardBgClass = theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
  const secondaryTextClass = theme === "dark" ? "text-slate-400" : "text-slate-600";
  const toneClass = tone === "red" ? "text-red-400 border-red-500" : tone === "yellow" ? "text-yellow-400 border-yellow-500" : "text-green-400 border-green-500";

  return (
    <div className={`border-l-4 rounded-lg p-6 ${cardBgClass} ${toneClass}`}>
      <div className="mb-3 flex items-center gap-3">
        <IconImage name={icon} className="h-7 w-7" alt="" />
        <p className={`text-sm font-medium ${secondaryTextClass}`}>{title}</p>
      </div>
      <p className={`mb-1 text-4xl font-bold ${toneClass}`}>{value}</p>
      <p className={`text-xs ${secondaryTextClass}`}>{subtitle}</p>
    </div>
  );
};

const Detail: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  const { theme } = useTheme();
  const textClass = theme === "dark" ? "text-white" : "text-slate-900";
  const secondaryTextClass = theme === "dark" ? "text-slate-400" : "text-slate-600";

  return (
    <div>
      <p className={`text-xs ${secondaryTextClass}`}>{label}</p>
      <p className={`mt-1 text-sm font-semibold ${textClass}`}>{value}</p>
    </div>
  );
};

export default MarginDashboard;
