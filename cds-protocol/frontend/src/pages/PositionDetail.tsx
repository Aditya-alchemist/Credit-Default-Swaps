import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useAccount, usePublicClient } from "wagmi";
import { parseUnits } from "viem";
import { useTheme } from "../context/ThemeContext";
import { formatAddress, formatBps, formatDate, formatDateTime, formatNumber, formatTimeRemaining, formatUsdc } from "../utils/formatters";
import { useCDSPosition, useTopUpCollateral, useExpirePosition, useIsPositionActive } from "../hooks/useCDSVault";
import { useCollectPremium, useNextPremiumAmount, useNextPremiumDue, useIsPremiumMissed } from "../hooks/usePremiumEngine";
import { useComputeCurrentRatio, useComputeMtM, useIsUnderwater, useMarginCallDeadline } from "../hooks/useMarginEngine";
import { useCreditEntityRow } from "../hooks/useCreditOracle";
import { useApprovalNeeded, useApproveToken } from "../hooks/useERC20";
import { useTx } from "../context/TxContext";
import { SEPOLIA_ADDRESSES } from "../config/contracts";
import { extractErrorMessage, getExplorerUrl } from "../utils/txHelpers";

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

  const expectedPayoutUnits = (notionalUnits * 6000n) / 10000n;
  const expectedSellerSurplusUnits = collateralUnits > expectedPayoutUnits ? collateralUnits - expectedPayoutUnits : 0n;
  const statusLabel = state === 2 ? "DEFAULTED" : state === 3 ? "EXPIRED" : !isActive ? "CLOSED" : isUnderwater || currentRatioBps < 12000 ? "MARGIN CALL" : missedPremium ? "PREMIUM MISSED" : "ACTIVE";
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
          {state === 2 && (
            <div className={`mt-6 rounded-lg border p-4 ${theme === "dark" ? "border-red-500/30 bg-red-500/10" : "border-red-200 bg-red-50"}`}>
              <p className={`text-sm font-semibold ${theme === "dark" ? "text-red-300" : "text-red-700"}`}>
                This CDS is already defaulted and closed. The vault collateral is now $0.00, so there is no seller collateral left to withdraw.
              </p>
              <p className={`mt-2 text-sm ${secondaryTextClass}`}>
                For a 40% recovery assumption, the protection buyer payout is ${formatUsdc(expectedPayoutUnits)} USDC and any remaining collateral is seller surplus.
                In this position the buyer and seller are the same wallet, so the payout and surplus both went to the same address.
              </p>
            </div>
          )}
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

        <PositionActions
          id={id}
          buyer={buyer}
          seller={seller}
          premiumAmount={nextPremiumAmount}
          isActive={isActive}
          state={state}
          maturity={maturity}
          collateralUnits={collateralUnits}
        />
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

function PositionActions({
  id,
  buyer,
  seller,
  premiumAmount,
  isActive,
  state,
  maturity,
  collateralUnits,
}: {
  id: string | undefined | null;
  buyer: string;
  seller: string;
  premiumAmount: bigint;
  isActive: boolean;
  state: number;
  maturity: number;
  collateralUnits: bigint;
}) {
  const posId = id ? Number(id) : undefined;
  const [topAmount, setTopAmount] = useState("");
  const { notifyPending, notifySuccess, notifyError } = useTx();
  const { theme } = useTheme();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const topAmountUnits = topAmount ? parseUnits(topAmount, 6) : 0n;
  const isBuyer = !!address && !!buyer && address.toLowerCase() === buyer.toLowerCase();
  const isSeller = !!address && !!seller && address.toLowerCase() === seller.toLowerCase();
  const canPayPremium = isActive && isBuyer;
  const canTopUp = isActive && isSeller;
  const canExpireForSeller = isActive && isSeller && maturity > 0 && Math.floor(Date.now() / 1000) >= maturity && collateralUnits > 0n;
  const sellerWithdrawLabel = state === 2 || collateralUnits === 0n
    ? "No Seller Collateral Left"
    : state === 3
      ? "Position Already Closed"
      : "Seller Withdraw Collateral";
  const inputClass = theme === "dark"
    ? "border-slate-700 bg-slate-900 text-white placeholder:text-slate-500"
    : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400";
  const { write: topUpWrite } = useTopUpCollateral(posId, topAmountUnits > 0n ? topAmountUnits : undefined);
  const { write: expireWrite } = useExpirePosition(posId);
  const { write: collectWrite } = useCollectPremium(posId);
  const premiumApproval = useApproveToken(
    isBuyer && premiumAmount > 0n
      ? { tokenAddress: SEPOLIA_ADDRESSES.USDC, spender: SEPOLIA_ADDRESSES.PremiumEngine, amount: premiumAmount }
      : undefined
  );
  const topUpApproval = useApproveToken(
    isSeller && topAmountUnits > 0n
      ? { tokenAddress: SEPOLIA_ADDRESSES.USDC, spender: SEPOLIA_ADDRESSES.CDSVault, amount: topAmountUnits }
      : undefined
  );
  const { isNeeded: needsPremiumApproval } = useApprovalNeeded(
    SEPOLIA_ADDRESSES.USDC,
    SEPOLIA_ADDRESSES.PremiumEngine,
    isBuyer && premiumAmount > 0n ? premiumAmount : undefined
  );
  const { isNeeded: needsTopUpApproval } = useApprovalNeeded(
    SEPOLIA_ADDRESSES.USDC,
    SEPOLIA_ADDRESSES.CDSVault,
    isSeller && topAmountUnits > 0n ? topAmountUnits : undefined
  );

  return (
    <div className="flex flex-wrap gap-4">
      <button
        disabled={!canPayPremium}
        onClick={async () => {
          try {
            if (!isActive) throw new Error("This CDS is closed; premiums are no longer payable");
            if (!isBuyer) throw new Error("Only the protection buyer can pay this premium");
            const id = notifyPending(needsPremiumApproval ? "Approving and paying premium" : "Paying premium");
            if (needsPremiumApproval) {
              const approveHash = await premiumApproval.write.writeAsync();
              if (publicClient) await publicClient.waitForTransactionReceipt({ hash: approveHash });
            }
            if (!collectWrite?.writeAsync) throw new Error("collect not ready");
            const hash = await collectWrite.writeAsync();
            if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
            notifySuccess(id, "Premium paid", { txHash: hash, explorerUrl: getExplorerUrl(hash) });
          } catch (e: any) {
            notifyError(Date.now(), extractErrorMessage(e));
          }
        }}
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 text-white rounded-lg font-medium transition"
      >
        {needsPremiumApproval ? "Approve + Pay Premium" : "Pay Premium"}
      </button>

      <div className="flex items-center gap-2">
        <input
          type="number"
          value={topAmount}
          onChange={(e) => setTopAmount(e.target.value)}
          placeholder="USDC amount"
          className={`px-3 py-2 rounded-lg border ${inputClass}`}
        />
        <button
          disabled={!canTopUp || topAmountUnits <= 0n}
          onClick={async () => {
            try {
              if (!isActive) throw new Error("This CDS is closed; collateral can no longer be topped up");
              if (!isSeller) throw new Error("Only the protection seller can top up collateral");
              if (topAmountUnits <= 0n) throw new Error("Enter a top-up amount greater than zero");
              const nid = notifyPending(needsTopUpApproval ? "Approving and topping up collateral" : "Topping up collateral");
              if (needsTopUpApproval) {
                const approveHash = await topUpApproval.write.writeAsync();
                if (publicClient) await publicClient.waitForTransactionReceipt({ hash: approveHash });
              }
              if (!topUpWrite?.writeAsync) throw new Error("topup not ready");
              const hash = await topUpWrite.writeAsync();
              if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
              notifySuccess(nid, "Collateral topped up", { txHash: hash, explorerUrl: getExplorerUrl(hash) });
            } catch (e: any) {
              notifyError(Date.now(), extractErrorMessage(e));
            }
          }}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 text-white rounded-lg font-medium transition"
        >
          {needsTopUpApproval ? "Approve + Top-up" : "Top-up Collateral"}
        </button>
      </div>

      <button
        disabled={!canExpireForSeller}
        onClick={async () => {
          try {
            if (state === 2 || collateralUnits === 0n) throw new Error("This position is defaulted and its collateral has already been paid out");
            if (!isSeller) throw new Error("Only the seller can recover collateral after maturity");
            if (!isActive) throw new Error("This CDS is already closed");
            if (maturity === 0 || Math.floor(Date.now() / 1000) < maturity) throw new Error("Seller collateral can be withdrawn only after maturity");
            const nid = notifyPending("Expiring position");
            if (!expireWrite?.writeAsync) throw new Error("expire not ready");
            const hash = await expireWrite.writeAsync();
            if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
            notifySuccess(nid, "Position expired and collateral returned", { txHash: hash, explorerUrl: getExplorerUrl(hash) });
          } catch (e: any) {
            notifyError(Date.now(), extractErrorMessage(e));
          }
        }}
        className={`px-6 py-3 border rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${theme === "dark" ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-300 text-slate-600 hover:bg-slate-100"}`}
      >
        {sellerWithdrawLabel}
      </button>
    </div>
  );
}
