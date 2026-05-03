import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { formatAddress, formatBps, formatDate, formatDateTime, formatNumber, formatTimeRemaining, formatUsdc } from "../utils/formatters";
import { useCDSPosition, useTopUpCollateral, useExpirePosition, useIsPositionActive } from "../hooks/useCDSVault";
import { useCollectPremium, useNextPremiumAmount, useNextPremiumDue, useIsPremiumMissed } from "../hooks/usePremiumEngine";
import { useComputeCurrentRatio, useComputeMtM, useIsUnderwater, useMarginCallDeadline } from "../hooks/useMarginEngine";
import { useCreditEntityRow } from "../hooks/useCreditOracle";
import { useTx } from "../context/TxContext";

export default function PositionDetail() {
  const { id } = useParams();
  const { theme } = useTheme();
  const positionId = id ? Number(id) : undefined;
  const positionQuery = useCDSPosition(positionId);
  const position = positionQuery.data as any;
  const referenceEntity = String(position?.referenceEntity ?? position?.[2] ?? "");
  const oracleQuery = useCreditEntityRow(referenceEntity || undefined);
  const mtmQuery = useComputeMtM(positionId);
  const ratioQuery = useComputeCurrentRatio(positionId);
  const underwaterQuery = useIsUnderwater(positionId);
  const deadlineQuery = useMarginCallDeadline(positionId);
  const premiumDueQuery = useNextPremiumDue(positionId);
  const premiumAmountQuery = useNextPremiumAmount(positionId);
  const premiumMissedQuery = useIsPremiumMissed(positionId);
  const activeQuery = useIsPositionActive(positionId);

  const buyer = String(position?.buyer ?? position?.[0] ?? "");
  const seller = String(position?.seller ?? position?.[1] ?? "");
  const notionalUnits = BigInt(position?.notional ?? position?.[3] ?? 0);
  const collateralUnits = BigInt(position?.collateral ?? position?.[5] ?? 0);
  const entrySpreadBps = Number(position?.spreadBps ?? position?.[4] ?? 0);
  const maturity = Number(position?.maturity ?? position?.[6] ?? 0);
  const openTimestamp = Number(position?.openTimestamp ?? position?.[7] ?? 0);
  const lastPremiumPaid = Number(position?.lastPremiumPaid ?? position?.[8] ?? 0);
  const state = Number(position?.state ?? position?.[9] ?? 0);

  const creditRow = oracleQuery.data as any;
  const currentSpreadBps = Number(creditRow?.spreadBps ?? creditRow?.[1] ?? entrySpreadBps);
  const creditScore = Number(creditRow?.score ?? creditRow?.[0] ?? 0);
  const oracleUpdatedAt = Number(creditRow?.updatedAt ?? creditRow?.[5] ?? 0);

  const mtmLossRaw = BigInt(mtmQuery.data ?? 0n);
  const currentRatioBps = Number(ratioQuery.data ?? 0) || (notionalUnits > 0n ? Number((collateralUnits * 10000n) / notionalUnits) : 0);
  const currentRatioPercent = currentRatioBps / 100;
  const nextPremiumDue = Number(premiumDueQuery.data ?? 0);
  const nextPremiumAmount = BigInt(premiumAmountQuery.data ?? 0n);
  const marginDeadline = Number(deadlineQuery.data ?? 0);
  const isUnderwater = Boolean(underwaterQuery.data);
  const isActive = Boolean(activeQuery.data);
  const missedPremium = Boolean(premiumMissedQuery.data);

  const effectiveExposure = Number(formatUsdc(notionalUnits)) + Number(formatUsdc(mtmLossRaw));
  const nextPremiumCountdown = nextPremiumDue > 0 ? formatTimeRemaining(Math.max(0, nextPremiumDue - Math.floor(Date.now() / 1000))) : "Unavailable";
  const marginCountdown = marginDeadline > 0 ? formatTimeRemaining(Math.max(0, marginDeadline - Math.floor(Date.now() / 1000))) : "Unavailable";

  const statusLabel = !isActive || state === 2 ? "DEFAULTED" : state === 3 ? "EXPIRED" : isUnderwater || currentRatioBps < 12000 ? "MARGIN CALL" : missedPremium ? "PREMIUM MISSED" : "ACTIVE";
  const statusClass = statusLabel === "ACTIVE"
    ? "bg-green-500/20 text-green-400"
    : statusLabel === "MARGIN CALL"
      ? "bg-yellow-500/20 text-yellow-400"
      : "bg-red-500/20 text-red-400";

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
              <h1 className={`text-3xl font-bold ${textClass}`}>CDS Position #{id ?? "-"}</h1>
              <p className={secondaryTextClass}>
                Buyer {buyer ? formatAddress(buyer) : "—"} vs seller {seller ? formatAddress(seller) : "—"} on {referenceEntity ? formatAddress(referenceEntity) : "the vault"}
              </p>
            </div>
            <span className={`px-4 py-2 rounded-lg font-semibold ${statusClass}`}>{statusLabel}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
            <Metric label="Buyer" value={buyer ? formatAddress(buyer) : "—"} />
            <Metric label="Seller" value={seller ? formatAddress(seller) : "—"} />
            <Metric label="Reference Entity" value={referenceEntity ? formatAddress(referenceEntity) : "—"} />
            <Metric label="Maturity" value={maturity ? formatDate(maturity) : "—"} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
            <Metric label="Notional" value={`$${formatUsdc(notionalUnits)} USDC`} highlight />
            <Metric label="Collateral" value={`$${formatUsdc(collateralUnits)} (${formatNumber(currentRatioPercent, 1)}%)`} highlight />
            <Metric label="Entry Spread" value={formatBps(entrySpreadBps)} highlight />
            <Metric label="Current Spread" value={formatBps(currentSpreadBps)} highlight />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className={`xl:col-span-2 border rounded-xl p-6 ${cardBgClass}`}>
            <h2 className={`text-lg font-semibold ${textClass} mb-4`}>Live MtM</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Metric label="Open Timestamp" value={openTimestamp ? formatDateTime(openTimestamp) : "—"} />
              <Metric label="Last Premium Paid" value={lastPremiumPaid ? formatDateTime(lastPremiumPaid) : "Never"} />
              <Metric label="Oracle Score" value={oracleUpdatedAt ? String(creditScore) : "Waiting"} />
              <Metric label="Oracle Updated" value={oracleUpdatedAt ? formatDateTime(oracleUpdatedAt) : "Waiting for oracle"} />
            </div>
          </div>

          <div className={`border rounded-xl p-6 ${cardBgClass} space-y-4`}>
            <div>
              <p className={`text-sm ${secondaryTextClass}`}>Current MtM Loss</p>
              <p className="text-3xl font-bold text-orange-400">${formatUsdc(mtmLossRaw)}</p>
            </div>
            <div>
              <p className={`text-sm ${secondaryTextClass}`}>Effective Exposure</p>
              <p className={`text-2xl font-bold ${textClass}`}>${formatNumber(effectiveExposure, 2)}</p>
            </div>
            <div>
              <p className={`text-sm ${secondaryTextClass}`}>Current Ratio</p>
              <p className="text-2xl font-bold text-yellow-400">{formatNumber(currentRatioPercent, 1)}% {isUnderwater ? "⚠️" : ""}</p>
            </div>
            <div>
              <p className={`text-sm ${secondaryTextClass}`}>Next Premium Due</p>
              <p className={`text-lg font-semibold ${textClass}`}>{nextPremiumDue ? `in ${nextPremiumCountdown}` : "Unavailable"}</p>
            </div>
            <div>
              <p className={`text-sm ${secondaryTextClass}`}>Next Premium Amount</p>
              <p className={`text-lg font-semibold ${textClass}`}>${formatUsdc(nextPremiumAmount)}</p>
            </div>
            <div>
              <p className={`text-sm ${secondaryTextClass}`}>Margin Deadline</p>
              <p className={`text-lg font-semibold ${textClass}`}>{marginDeadline ? (marginCountdown === "Expired" ? "Expired" : `in ${marginCountdown}`) : "No deadline"}</p>
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
  const { theme } = useTheme();
  const { write: topUpWrite } = useTopUpCollateral(posId, topAmount || undefined);
  const { write: expireWrite } = useExpirePosition(posId);
  const { write: collectWrite } = useCollectPremium(posId);

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
          Top-up Collateral
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
