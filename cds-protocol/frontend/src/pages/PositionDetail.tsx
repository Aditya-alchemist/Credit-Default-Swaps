import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import {
  AreaChart,
  Area,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const HISTORY = [
  { date: "Jan", spread: 180, mtm: 0.8 },
  { date: "Feb", spread: 195, mtm: 1.2 },
  { date: "Mar", spread: 210, mtm: 1.8 },
  { date: "Apr", spread: 235, mtm: 2.4 },
  { date: "May", spread: 280, mtm: 2.9 },
  { date: "Jun", spread: 350, mtm: 3.2 },
];

import { useTopUpCollateral, useExpirePosition } from "../hooks/useCDSVault";
import { useCollectPremium } from "../hooks/usePremiumEngine";
import { useTx } from "../context/TxContext";

export default function PositionDetail() {
  const { id } = useParams();
  const { theme } = useTheme();

  const bgClass = theme === "dark" ? "bg-slate-950" : "bg-slate-50";
  const cardBgClass = theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
  const textClass = theme === "dark" ? "text-white" : "text-slate-900";
  const secondaryTextClass = theme === "dark" ? "text-slate-400" : "text-slate-600";

  return (
    <div className={`min-h-screen ${bgClass} pt-24 pb-12`}>
      <div className="lg:ml-64 px-4 lg:px-8 space-y-6">
        <div className={`border rounded-xl p-6 ${cardBgClass}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className={`text-3xl font-bold ${textClass}`}>CDS Position #{id}</h1>
              <p className={secondaryTextClass}>Buyer 0xAlice... vs seller 0xBob... on Compound Protocol</p>
            </div>
            <span className="px-4 py-2 rounded-lg bg-green-500/20 text-green-400 font-semibold">ACTIVE</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
            <Metric label="Buyer" value="0xAlice..." />
            <Metric label="Seller" value="0xBob..." />
            <Metric label="Reference Entity" value="Compound Protocol" />
            <Metric label="Maturity" value="Dec 31 2025" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
            <Metric label="Notional" value="$100.00" highlight />
            <Metric label="Collateral" value="$120.00 (120.0%)" highlight />
            <Metric label="Entry Spread" value="200 bps" highlight />
            <Metric label="Current Spread" value="350 bps" highlight />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className={`xl:col-span-2 border rounded-xl p-6 ${cardBgClass}`}>
            <h2 className={`text-lg font-semibold ${textClass} mb-4`}>Live MtM</h2>
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={HISTORY}>
                  <defs>
                    <linearGradient id="positionMtm" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#334155" : "#e2e8f0"} />
                  <XAxis dataKey="date" stroke={theme === "dark" ? "#94a3b8" : "#64748b"} />
                  <YAxis stroke={theme === "dark" ? "#94a3b8" : "#64748b"} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme === "dark" ? "#1e293b" : "#f8fafc",
                      border: `1px solid ${theme === "dark" ? "#334155" : "#e2e8f0"}`,
                      borderRadius: "8px",
                    }}
                  />
                  <Area type="monotone" dataKey="spread" stroke="#f59e0b" fill="url(#positionMtm)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={`border rounded-xl p-6 ${cardBgClass} space-y-4`}>
            <div>
              <p className={`text-sm ${secondaryTextClass}`}>Current MtM Loss</p>
              <p className="text-3xl font-bold text-orange-400">$3.20</p>
            </div>
            <div>
              <p className={`text-sm ${secondaryTextClass}`}>Effective Exposure</p>
              <p className={`text-2xl font-bold ${textClass}`}>$103.20</p>
            </div>
            <div>
              <p className={`text-sm ${secondaryTextClass}`}>Current Ratio</p>
              <p className="text-2xl font-bold text-yellow-400">116.3% ⚠️</p>
            </div>
            <div>
              <p className={`text-sm ${secondaryTextClass}`}>Next Premium Due</p>
              <p className={`text-lg font-semibold ${textClass}`}>in 45 days</p>
            </div>
          </div>
        </div>

        <PositionActions id={id} />
      </div>
    </div>
  );
}

function Metric({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  const { theme } = useTheme();
  const cardBgClass = theme === "dark" ? "bg-slate-950/50 border-slate-800" : "bg-slate-50 border-slate-200";
  const textClass = theme === "dark" ? "text-white" : "text-slate-900";

  return (
    <div className={`border rounded-lg p-4 ${cardBgClass}`}>
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-2 text-lg font-semibold ${highlight ? textClass : textClass}`}>{value}</p>
    </div>
  );
}

function PositionActions({ id }: { id: string | undefined | null }) {
  const posId = id ? Number(id) : undefined;
  const [topAmount, setTopAmount] = useState(0);
  const { notifyPending, notifySuccess, notifyError } = useTx();
  const { prepare: topUpPrepare, write: topUpWrite } = useTopUpCollateral(posId, topAmount || undefined);
  const { prepare: expirePrepare, write: expireWrite } = useExpirePosition(posId);
  const { prepare: collectPrepare, write: collectWrite } = useCollectPremium(posId);

  return (
    <div className="flex flex-wrap gap-4">
      <button
        onClick={async () => {
          try {
            const id = notifyPending("Collecting premium");
            if (!collectWrite?.writeAsync) throw new Error("collect not ready");
            const tx = await collectWrite.writeAsync();
            await tx.wait?.();
            notifySuccess(id, "Premium collected");
          } catch (e: any) {
            notifyError(Date.now(), String(e?.message ?? e));
          }
        }}
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
      >
        Pay Premium
      </button>

      <div className="flex items-center gap-2">
        <input type="number" value={topAmount} onChange={(e) => setTopAmount(Number(e.target.value))} placeholder="amount" className="px-3 py-2 rounded-lg border" />
        <button
          onClick={async () => {
            try {
              const nid = notifyPending("Topping up collateral");
              if (!topUpWrite?.writeAsync) throw new Error("topup not ready");
              const tx = await topUpWrite.writeAsync();
              await tx.wait?.();
              notifySuccess(nid, "Collateral topped up");
            } catch (e: any) {
              notifyError(Date.now(), String(e?.message ?? e));
            }
          }}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition"
        >
          Top Up Collateral
        </button>
      </div>

      <button
        onClick={async () => {
          try {
            const nid = notifyPending("Expiring position");
            if (!expireWrite?.writeAsync) throw new Error("expire not ready");
            const tx = await expireWrite.writeAsync();
            await tx.wait?.();
            notifySuccess(nid, "Position expired");
          } catch (e: any) {
            notifyError(Date.now(), String(e?.message ?? e));
          }
        }}
        className={`px-6 py-3 border rounded-lg font-medium transition ${theme === "dark" ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-300 text-slate-600 hover:bg-slate-100"}`}
      >
        Exit / Transfer
      </button>
    </div>
  );
}
