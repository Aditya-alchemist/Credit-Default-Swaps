import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useReadContracts } from "wagmi";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "../context/ThemeContext";
import { IconImage } from "../components/IconImage";
import { useTotalPositions } from "../hooks/useCDSVault";
import { CDS_VAULT_ABI, CREDIT_ORACLE_ABI, SEPOLIA_ADDRESSES } from "../config/contracts";
import { formatAddress, formatDateTime, formatNumber } from "../utils/formatters";

type BackendHealth = "checking" | "healthy" | "offline";

type OracleEntity = {
  address: string;
  positions: number;
  notional: number;
  score: number;
  spreadBps: number;
  lambdaBps: number;
  recoveryBps: number;
  defaulted: boolean;
  updatedAt: number;
  stale: boolean;
};

const toUsdc = (value: unknown) => Number(value ?? 0) / 1_000_000;
const asNumber = (value: unknown) => Number(value ?? 0);
const defaultProbability = (lambdaBps: number) => (1 - Math.exp(-lambdaBps / 10_000)) * 100;

const OracleMonitor: React.FC = () => {
  const { theme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const [backendHealth, setBackendHealth] = useState<BackendHealth>("checking");
  const totalPositions = useTotalPositions();
  const totalOpenPositions = totalPositions.data ? Number(totalPositions.data) : 0;
  const positionIds = Array.from({ length: Math.min(totalOpenPositions, 80) }, (_, index) => BigInt(index + 1));

  useEffect(() => {
    let cancelled = false;
    fetch("http://127.0.0.1:8000/health")
      .then((response) => {
        if (!cancelled) setBackendHealth(response.ok ? "healthy" : "offline");
      })
      .catch(() => {
        if (!cancelled) setBackendHealth("offline");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const positionReads = useReadContracts({
    contracts: positionIds.map((positionId) => ({
      address: SEPOLIA_ADDRESSES.CDSVault,
      abi: CDS_VAULT_ABI,
      functionName: "getPosition",
      args: [positionId],
    })),
    query: { enabled: positionIds.length > 0, refetchInterval: 30_000 },
  });

  const entityStats = useMemo(() => {
    const stats = new Map<string, { positions: number; notional: number }>();
    (positionReads.data ?? []).forEach((result) => {
      const position = result.result as any;
      const reference = String(position?.referenceEntity ?? position?.[2] ?? "");
      if (!reference) return;
      const current = stats.get(reference.toLowerCase()) ?? { positions: 0, notional: 0 };
      stats.set(reference.toLowerCase(), {
        positions: current.positions + 1,
        notional: current.notional + toUsdc(position?.notional ?? position?.[3]),
      });
    });
    return Array.from(stats.entries()).map(([key, value]) => ({
      address: (positionReads.data ?? [])
        .map((result) => {
          const position = result.result as any;
          return String(position?.referenceEntity ?? position?.[2] ?? "");
        })
        .find((address) => address.toLowerCase() === key) ?? key,
      ...value,
    }));
  }, [positionReads.data]);

  const selectedAddress = searchParams.get("entity") || entityStats[0]?.address || "";

  const creditReads = useReadContracts({
    contracts: entityStats.flatMap((entity) => [
      {
        address: SEPOLIA_ADDRESSES.CreditOracle,
        abi: CREDIT_ORACLE_ABI,
        functionName: "creditByEntity",
        args: [entity.address],
      },
      {
        address: SEPOLIA_ADDRESSES.CreditOracle,
        abi: CREDIT_ORACLE_ABI,
        functionName: "isStale",
        args: [entity.address],
      },
    ]),
    query: { enabled: entityStats.length > 0, refetchInterval: 30_000 },
  });

  const entities: OracleEntity[] = entityStats.map((entity, index) => {
    const row = creditReads.data?.[index * 2]?.result as any;
    const stale = Boolean(creditReads.data?.[index * 2 + 1]?.result);
    return {
      ...entity,
      score: asNumber(row?.score ?? row?.[0]),
      spreadBps: asNumber(row?.spreadBps ?? row?.[1]),
      lambdaBps: asNumber(row?.lambdaBps ?? row?.[2]),
      recoveryBps: asNumber(row?.recoveryBps ?? row?.[3]),
      defaulted: Boolean(row?.defaulted_ ?? row?.[4]),
      updatedAt: asNumber(row?.updatedAt ?? row?.[5]),
      stale,
    };
  });

  const selectedEntity = entities.find((entity) => entity.address.toLowerCase() === selectedAddress.toLowerCase()) ?? entities[0];
  const chartData = entities.map((entity) => ({
    name: formatAddress(entity.address),
    spread: entity.spreadBps,
    score: entity.score,
    probability: defaultProbability(entity.lambdaBps),
    stale: entity.stale,
  }));

  const bgClass = theme === "dark" ? "bg-slate-950" : "bg-slate-50";
  const cardBgClass = theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
  const textClass = theme === "dark" ? "text-white" : "text-slate-900";
  const secondaryTextClass = theme === "dark" ? "text-slate-400" : "text-slate-600";
  const gridStroke = theme === "dark" ? "#1e293b" : "#e2e8f0";
  const axisStroke = theme === "dark" ? "#94a3b8" : "#64748b";

  const backendLabel = backendHealth === "checking" ? "Checking" : backendHealth === "healthy" ? "Healthy" : "Offline";
  const backendClass = backendHealth === "healthy" ? "text-green-400 bg-green-500/10" : backendHealth === "offline" ? "text-red-400 bg-red-500/10" : "text-yellow-400 bg-yellow-500/10";

  return (
    <div className={`min-h-screen ${bgClass} pt-24 pb-12`}>
      <div className="lg:ml-64 px-4 lg:px-8">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className={`text-4xl font-bold ${textClass} mb-2`}>Oracle Monitor</h1>
            <p className={secondaryTextClass}>Live CreditOracle freshness, scores, spreads, and updater visibility</p>
          </div>
          <div className={`rounded-full px-4 py-2 text-sm font-semibold ${backendClass}`}>
            API {backendLabel}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-8">
          <Metric title="Tracked Entities" value={String(entities.length)} subtitle={`${totalOpenPositions} CDS positions scanned`} icon="chart" />
          <Metric title="Oracle Contract" value={formatAddress(SEPOLIA_ADDRESSES.CreditOracle)} subtitle="CreditOracle on Sepolia" icon="oracle" />
          <Metric title="Bot Signal" value={backendLabel} subtitle="Backend health endpoint" icon="admin" />
          <Metric
            title="Stale Entities"
            value={String(entities.filter((entity) => entity.stale).length)}
            subtitle="Oracle rows outside freshness window"
            icon="alert"
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className={`border rounded-xl p-6 ${cardBgClass}`}>
            <h2 className={`mb-4 text-lg font-semibold ${textClass}`}>Reference Entities</h2>
            <div className="space-y-3">
              {entities.length === 0 && (
                <p className={`rounded-lg border px-4 py-5 text-sm ${secondaryTextClass} ${theme === "dark" ? "border-slate-800" : "border-slate-200"}`}>
                  No CDS reference entities found yet.
                </p>
              )}
              {entities.map((entity) => (
                <button
                  key={entity.address}
                  onClick={() => setSearchParams({ entity: entity.address })}
                  className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                    selectedEntity?.address.toLowerCase() === entity.address.toLowerCase()
                      ? "border-blue-500 bg-blue-600 text-white"
                      : theme === "dark"
                        ? "border-slate-800 hover:border-slate-700 hover:bg-slate-800"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="font-semibold">{formatAddress(entity.address)}</p>
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${entity.stale ? "bg-yellow-500/15 text-yellow-300" : "bg-green-500/15 text-green-300"}`}>
                      {entity.stale ? "Stale" : "Fresh"}
                    </span>
                  </div>
                  <p className={`text-xs ${selectedEntity?.address.toLowerCase() === entity.address.toLowerCase() ? "text-blue-100" : secondaryTextClass}`}>
                    {entity.positions} position{entity.positions === 1 ? "" : "s"} · ${formatNumber(entity.notional)}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="xl:col-span-2 space-y-8">
            <div className={`border rounded-xl p-6 ${cardBgClass}`}>
              {selectedEntity ? (
                <>
                  <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className={`text-2xl font-bold ${textClass}`}>{formatAddress(selectedEntity.address)}</h2>
                      <p className={secondaryTextClass}>Full address {selectedEntity.address}</p>
                    </div>
                    <span className={`rounded-lg px-4 py-2 text-sm font-semibold ${selectedEntity.defaulted ? "bg-red-500/10 text-red-400" : selectedEntity.stale ? "bg-yellow-500/10 text-yellow-400" : "bg-green-500/10 text-green-400"}`}>
                      {selectedEntity.defaulted ? "Defaulted" : selectedEntity.stale ? "Stale" : "Fresh"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Detail label="Credit Score" value={selectedEntity.updatedAt ? String(selectedEntity.score) : "-"} />
                    <Detail label="Spread" value={selectedEntity.updatedAt ? `${selectedEntity.spreadBps} bps` : "-"} />
                    <Detail label="Default Probability" value={selectedEntity.updatedAt ? `${formatNumber(defaultProbability(selectedEntity.lambdaBps), 2)}%` : "-"} />
                    <Detail label="Recovery" value={selectedEntity.updatedAt ? `${formatNumber(selectedEntity.recoveryBps / 100, 2)}%` : "-"} />
                    <Detail label="Last Update" value={selectedEntity.updatedAt ? formatDateTime(selectedEntity.updatedAt) : "Never"} />
                    <Detail label="Notional Watched" value={`$${formatNumber(selectedEntity.notional)}`} />
                    <Detail label="Positions Watched" value={String(selectedEntity.positions)} />
                    <Detail label="Contract Freshness" value={selectedEntity.stale ? "Needs update" : "Inside window"} />
                  </div>
                </>
              ) : (
                <p className={`text-sm ${secondaryTextClass}`}>Open a CDS position to start monitoring an oracle reference entity.</p>
              )}
            </div>

            <div className={`border rounded-xl p-6 ${cardBgClass}`}>
              <div className="mb-5">
                <p className={`text-sm ${secondaryTextClass}`}>Live Oracle Rows</p>
                <h2 className={`text-2xl font-bold ${textClass}`}>Spread and default probability</h2>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.length ? chartData : [{ name: "No entities", spread: 0, probability: 0 }]}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                    <XAxis dataKey="name" stroke={axisStroke} />
                    <YAxis stroke={axisStroke} />
                    <Tooltip formatter={(value: any, name: string) => name === "probability" ? `${formatNumber(Number(value), 2)}%` : `${formatNumber(Number(value), 0)} bps`} />
                    <Bar dataKey="spread" radius={[8, 8, 0, 0]}>
                      {(chartData.length ? chartData : [{ name: "No entities", stale: true }]).map((entry: any) => (
                        <Cell key={entry.name} fill={entry.stale ? "#f59e0b" : "#2563eb"} />
                      ))}
                    </Bar>
                    <Bar dataKey="probability" radius={[8, 8, 0, 0]} fill="#ec4899" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Metric: React.FC<{
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentProps<typeof IconImage>["name"];
}> = ({ title, value, subtitle, icon }) => {
  const { theme } = useTheme();
  const cardBgClass = theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
  const textClass = theme === "dark" ? "text-white" : "text-slate-900";
  const secondaryTextClass = theme === "dark" ? "text-slate-400" : "text-slate-600";

  return (
    <div className={`border rounded-xl p-5 ${cardBgClass}`}>
      <div className="mb-4 flex items-center justify-between">
        <p className={`text-sm ${secondaryTextClass}`}>{title}</p>
        <IconImage name={icon} className="h-7 w-7" alt="" />
      </div>
      <p className={`text-2xl font-bold ${textClass}`}>{value}</p>
      <p className={`mt-2 text-xs ${secondaryTextClass}`}>{subtitle}</p>
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

export default OracleMonitor;
