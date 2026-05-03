import React, { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAccount, usePublicClient } from "wagmi";
import { useWriteContract } from "wagmi";
import { useReadContracts } from "wagmi";
import { formatUnits, isAddress, parseUnits } from "viem";
import { useNavigate } from "react-router-dom";
import { formatAddress, formatUsdc, formatBps, formatNumber } from "../utils/formatters";
import { useOpenCDS, useTotalPositions } from "../hooks/useCDSVault";
import { useApprovalNeeded, useApproveToken } from "../hooks/useERC20";
import { useTx } from "../context/TxContext";
import ConfirmTxModal from "../components/ConfirmTxModal";
import { formatGasEstimate, getExplorerUrl, extractErrorMessage } from "../utils/txHelpers";
import { SEPOLIA_ADDRESSES, CDS_VAULT_ABI, PREMIUM_ENGINE_ABI, ERC20_ABI } from "../config/contracts";

interface CDSPosition {
  id: string;
  reference: string;
  buyer: string;
  seller: string;
  spread: number;
  collateral: string;
  purchased: string;
  premiumRate: number;
  status: "Active" | "Margin Call" | "Expired" | "Defaulted";
}

const CDSMarket: React.FC = () => {
  const { theme } = useTheme();
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { notifyPending, notifySuccess, notifyError } = useTx();
  const navigate = useNavigate();
  const totalPositions = useTotalPositions();
  const [selectedFilter, setSelectedFilter] = useState<"All" | "Active" | "Margin Call" | "Expired" | "Defaulted">("All");
  const [showNewForm, setShowNewForm] = useState(false);
  const [buyerAddr, setBuyerAddr] = useState("");
  const [sellerAddr, setSellerAddr] = useState(address ?? "");
  const [referenceEntity, setReferenceEntity] = useState("");
  const [notional, setNotional] = useState("");
  const [spreadBps, setSpreadBps] = useState("");
  const [maturityDays, setMaturityDays] = useState(365);
  const notionalUnits = notional ? parseUnits(notional, 6) : 0n;
  const requiredCollateralUnits = (notionalUnits * 12000n) / 10000n;
  const requiredCollateralLabel = Number(formatUnits(requiredCollateralUnits, 6));

  const totalOpenPositions = totalPositions.data ? Number(totalPositions.data) : 0;
  const positionIds = Array.from({ length: Math.min(totalOpenPositions, 6) }, (_, index) => BigInt(index + 1));
  const positionReads = useReadContracts({
    contracts: positionIds.map((positionId) => ({
      address: SEPOLIA_ADDRESSES.CDSVault,
      abi: CDS_VAULT_ABI,
      functionName: "getPosition",
      args: [positionId],
    })),
  });

  const positions: CDSPosition[] = (positionReads.data ?? [])
    .map((result, index) => {
      const position = result.result as any;
      if (!position) return null;

      const stateLabel = position.state === 1 ? "Margin Call" : position.state === 2 ? "Defaulted" : position.state === 3 ? "Expired" : "Active";

      return {
        id: String(index + 1),
        reference: position.referenceEntity,
        buyer: position.buyer,
        seller: position.seller,
        spread: Number(position.spreadBps ?? 0),
        collateral: formatUnits(BigInt(position.collateral ?? 0), 6),
        purchased: formatUnits(BigInt(position.notional ?? 0), 6),
        premiumRate: Number(position.spreadBps ?? 0),
        status: stateLabel,
      };
    })
    .filter((position): position is CDSPosition => position !== null);

  // ERC20 approval flow
  const sellerIsConnected = !!address && !!sellerAddr && sellerAddr.toLowerCase() === address.toLowerCase();
  const { isNeeded: needsApproval } = useApprovalNeeded(
    SEPOLIA_ADDRESSES.USDC,
    SEPOLIA_ADDRESSES.CDSVault,
    sellerIsConnected ? requiredCollateralUnits : undefined
  );

  const { prepare: approvePrepare, write: approveWrite } = useApproveToken(
    sellerIsConnected && referenceEntity && requiredCollateralUnits > 0n
      ? {
          tokenAddress: SEPOLIA_ADDRESSES.USDC,
          spender: SEPOLIA_ADDRESSES.CDSVault,
          amount: requiredCollateralUnits,
        }
      : undefined
  );

  const { prepare: openPrepare, write: openWrite } = useOpenCDS(
    buyerAddr && sellerAddr && referenceEntity && notionalUnits > 0n && Number(spreadBps) > 0
      ? {
          buyer: buyerAddr,
          seller: sellerAddr,
          referenceEntity,
          notional: notionalUnits,
          spreadBps: Number(spreadBps),
          maturityDays,
        }
      : undefined
  );

  const bgClass = theme === "dark" ? "bg-slate-950" : "bg-slate-50";
  const cardBgClass = theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
  const textClass = theme === "dark" ? "text-white" : "text-slate-900";
  const secondaryTextClass = theme === "dark" ? "text-slate-400" : "text-slate-600";
  const inputBgClass = theme === "dark" ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-300";

  const filteredPositions = selectedFilter === "All"
    ? positions
    : positions.filter((p) => p.status === selectedFilter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-500/20 text-green-400";
      case "Margin Call":
        return "bg-yellow-500/20 text-yellow-400";
      case "Expired":
        return "bg-slate-500/20 text-slate-400";
      case "Defaulted":
        return "bg-red-500/20 text-red-400";
      default:
        return "bg-slate-500/20 text-slate-400";
    }
  };

  const getCollateralRatio = (position: CDSPosition) => {
    const notional = Number(position.purchased);
    const collateral = Number(position.collateral);
    if (!notional) return 0;
    return (collateral / notional) * 100;
  };

  const payPremiumForPosition = async (position: CDSPosition) => {
    if (!isConnected) throw new Error("Connect your wallet first");
    if (!address || position.buyer.toLowerCase() !== address.toLowerCase()) {
      throw new Error("Only the protection buyer can pay this premium");
    }
    const premiumAmount = (parseUnits(position.purchased, 6) * BigInt(position.spread) * 90n) / (10000n * 365n);
    const approveHash = await writeContractAsync({
      address: SEPOLIA_ADDRESSES.USDC,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [SEPOLIA_ADDRESSES.PremiumEngine, premiumAmount],
    });
    if (publicClient) {
      await publicClient.waitForTransactionReceipt({ hash: approveHash });
    }
    const txHash = await writeContractAsync({
      address: SEPOLIA_ADDRESSES.PremiumEngine,
      abi: PREMIUM_ENGINE_ABI,
      functionName: "collectPremium",
      args: [BigInt(position.id)],
    });
    if (publicClient) {
      await publicClient.waitForTransactionReceipt({ hash: txHash });
    }
    return txHash;
  };

  const topUpPosition = async (position: CDSPosition) => {
    if (!isConnected) throw new Error("Connect your wallet first");
    if (!address || position.seller.toLowerCase() !== address.toLowerCase()) {
      throw new Error("Only the protection seller can top up collateral");
    }
    const rawAmount = window.prompt(`Additional collateral for CDS #${position.id} (USDC)`, "0");
    if (!rawAmount) return;
    const amount = Number(rawAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Enter a valid top-up amount");
    }

    const amountUnits = parseUnits(rawAmount, 6);
    const approveHash = await writeContractAsync({
      address: SEPOLIA_ADDRESSES.USDC,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [SEPOLIA_ADDRESSES.CDSVault, amountUnits],
    });
    if (publicClient) {
      await publicClient.waitForTransactionReceipt({ hash: approveHash });
    }
    const txHash = await writeContractAsync({
      address: SEPOLIA_ADDRESSES.CDSVault,
      abi: CDS_VAULT_ABI,
      functionName: "topUpCollateral",
      args: [BigInt(position.id), amountUnits],
    });
    if (publicClient) {
      await publicClient.waitForTransactionReceipt({ hash: txHash });
    }
    return txHash;
  };

  return (
    <div className={`min-h-screen ${bgClass} pt-24 pb-12`}>
      <div className="lg:ml-64 px-4 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className={`text-4xl font-bold ${textClass} mb-2`}>CDS Market</h1>
            <p className={secondaryTextClass}>Open seller positions and manage CDS exposure</p>
          </div>
          <button
            onClick={() => setShowNewForm(!showNewForm)}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
          >
            {showNewForm ? "Cancel" : "Open New CDS Position"}
          </button>
        </div>

        {/* New Position Form */}
        {showNewForm && (
          <div className={`mb-8 border rounded-xl p-6 ${cardBgClass}`}>
            <h2 className={`text-xl font-semibold ${textClass} mb-6`}>Open New CDS Position</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Buyer Address */}
              <div>
                <label className={`block text-sm font-medium ${textClass} mb-2`}>Buyer Address</label>
                <input
                  type="text"
                  value={buyerAddr}
                  onChange={(e) => setBuyerAddr(e.target.value)}
                  placeholder="0x..."
                  className={`w-full px-4 py-2 rounded-lg border ${inputBgClass} ${textClass} placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>

              {/* Seller Address */}
              <div>
                <label className={`block text-sm font-medium ${textClass} mb-2`}>Seller Address</label>
                <input
                  type="text"
                  value={sellerAddr}
                  onChange={(e) => setSellerAddr(e.target.value)}
                  placeholder="0x seller / collateral provider"
                  className={`w-full px-4 py-2 rounded-lg border ${inputBgClass} ${textClass} placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                <p className={`text-xs ${secondaryTextClass} mt-1`}>
                  Seller must hold USDC and approve the vault for 120% collateral.
                </p>
              </div>

              {/* Reference Entity */}
              <div>
                <label className={`block text-sm font-medium ${textClass} mb-2`}>Reference Entity</label>
                <input
                  type="text"
                  value={referenceEntity}
                  onChange={(e) => setReferenceEntity(e.target.value)}
                  placeholder="0x reference entity address"
                  className={`w-full px-4 py-2 rounded-lg border ${inputBgClass} ${textClass} placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>

              {/* Notional Amount */}
              <div>
                <label className={`block text-sm font-medium ${textClass} mb-2`}>Notional Amount</label>
                <input
                  type="number"
                  value={notional}
                  onChange={(e) => setNotional(e.target.value)}
                  placeholder="100"
                  className={`w-full px-4 py-2 rounded-lg border ${inputBgClass} ${textClass} placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>

              {/* Spread */}
              <div>
                <label className={`block text-sm font-medium ${textClass} mb-2`}>Spread (bps)</label>
                <input
                  type="number"
                  value={spreadBps}
                  onChange={(e) => setSpreadBps(e.target.value)}
                  placeholder="200"
                  className={`w-full px-4 py-2 rounded-lg border ${inputBgClass} ${textClass} placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>

              {/* Duration */}
              <div>
                <label className={`block text-sm font-medium ${textClass} mb-2`}>Duration</label>
                <input
                  type="number"
                  value={maturityDays}
                  onChange={(e) => setMaturityDays(Number(e.target.value))}
                  placeholder="365 days"
                  className={`w-full px-4 py-2 rounded-lg border ${inputBgClass} ${textClass} placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>

              {/* Collateral Required */}
              <div>
                <label className={`block text-sm font-medium ${textClass} mb-2`}>Collateral Required</label>
                <div className={`w-full px-4 py-2 rounded-lg border ${inputBgClass} ${secondaryTextClass}`}>
                  {requiredCollateralUnits > 0n ? `${formatNumber(requiredCollateralLabel)} USDC` : "Calculated from notional"}
                </div>
              </div>

              {/* Premium and Payout */}
              <div>
                <label className={`block text-sm font-medium ${textClass} mb-2`}>Quarterly Premium / Max Payout</label>
                <div className={`px-4 py-2 rounded-lg border ${inputBgClass} ${secondaryTextClass}`}>
                  Premium is settled by the PremiumEngine after opening; payout is based on the live recovery rate.
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="mt-6 flex gap-4">
              <button
                onClick={async () => {
                  try {
                    if (!buyerAddr || !isAddress(buyerAddr)) throw new Error("Enter a valid buyer address");
                    if (!sellerAddr || !isAddress(sellerAddr)) throw new Error("Enter a valid seller address");
                    if (!referenceEntity || !isAddress(referenceEntity)) throw new Error("Enter a valid reference entity address");
                    if (notionalUnits <= 0n) throw new Error("Enter a notional amount greater than zero");
                    if (Number(spreadBps) <= 0) throw new Error("Enter a spread greater than zero");

                    const id = notifyPending(needsApproval ? "Approving collateral and opening CDS" : "Opening CDS position");

                    if (sellerIsConnected && needsApproval) {
                      if (!approveWrite?.writeAsync) throw new Error("Approval contract not ready");
                      const approveHash = await approveWrite.writeAsync();
                      if (publicClient) await publicClient.waitForTransactionReceipt({ hash: approveHash });
                    }

                    if (!openWrite || !openWrite.writeAsync) throw new Error("CDS vault contract not ready");
                    const hash = await openWrite.writeAsync();
                    if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
                    notifySuccess(id, "Opened CDS position", {
                      txHash: hash,
                      explorerUrl: getExplorerUrl(hash),
                    });
                  } catch (err: any) {
                    notifyError(Date.now(), extractErrorMessage(err));
                  }
                }}
                className="flex-1 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition"
              >
                {sellerIsConnected && needsApproval ? "Approve + Open CDS" : "Open CDS Position"}
              </button>
              <button
                onClick={() => setShowNewForm(false)}
                className={`px-6 py-2 border rounded-lg font-medium transition ${
                  theme === "dark"
                    ? "border-slate-700 text-slate-300 hover:bg-slate-800"
                    : "border-slate-300 text-slate-600 hover:bg-slate-100"
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-4 mb-8">
          {(["All", "Active", "Margin Call", "Expired", "Defaulted"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                selectedFilter === filter
                  ? "bg-blue-600 text-white"
                  : theme === "dark"
                    ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    : "bg-slate-200 text-slate-600 hover:bg-slate-300"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Positions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {filteredPositions.map((position) => (
            <div key={position.id} className={`border rounded-xl p-6 ${cardBgClass}`}>
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className={`text-lg font-semibold ${textClass}`}>Reference: {formatAddress(position.reference)}</h3>
                  <p className={`text-sm ${secondaryTextClass}`}>Seller: {formatAddress(position.seller)}</p>
                  <p className={`text-sm ${secondaryTextClass}`}>Buyer: {formatAddress(position.buyer)}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(position.status)}`}>
                  {position.status}
                </span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className={`text-xs ${secondaryTextClass} mb-1`}>Spread</p>
                  <p className={`text-lg font-bold text-orange-500`}>{formatBps(position.spread)}</p>
                </div>
                <div>
                  <p className={`text-xs ${secondaryTextClass} mb-1`}>Premium Rate</p>
                  <p className={`text-lg font-bold text-blue-400`}>{formatBps(position.premiumRate)}</p>
                </div>
                <div>
                  <p className={`text-xs ${secondaryTextClass} mb-1`}>Notional</p>
                  <p className={`text-lg font-bold ${textClass}`}>${formatNumber(position.purchased)}</p>
                </div>
                <div>
                  <p className={`text-xs ${secondaryTextClass} mb-1`}>Collateral</p>
                  <p className={`text-lg font-bold ${textClass}`}>${formatNumber(position.collateral)}</p>
                </div>
              </div>

              {/* Collateral Ratio */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <p className={`text-sm font-medium ${secondaryTextClass}`}>Collateral Ratio</p>
                  <p className={`text-sm font-semibold text-green-400`}>{formatNumber(getCollateralRatio(position), 1)}%</p>
                </div>
                <div className={`w-full h-2 rounded-full border ${theme === "dark" ? "border-slate-700" : "border-slate-300"} bg-slate-200`}>
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-green-500 to-blue-500"
                    style={{ width: `${Math.min(100, getCollateralRatio(position) / 1.2)}%` }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    try {
                      const id = notifyPending(`Paying premium for CDS #${position.id}`);
                      const hash = await payPremiumForPosition(position);
                      notifySuccess(id, `Premium paid for CDS #${position.id}`, { txHash: hash, explorerUrl: getExplorerUrl(hash) });
                    } catch (error: any) {
                      notifyError(Date.now(), extractErrorMessage(error));
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg font-medium transition"
                >
                  Pay Premium
                </button>
                <button
                  onClick={async () => {
                    try {
                      const id = notifyPending(`Topping up CDS #${position.id}`);
                      const hash = await topUpPosition(position);
                      if (hash) {
                        notifySuccess(id, `Collateral topped up for CDS #${position.id}`, { txHash: hash, explorerUrl: getExplorerUrl(hash) });
                      }
                    } catch (error: any) {
                      notifyError(Date.now(), extractErrorMessage(error));
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg font-medium transition"
                >
                  Top-up
                </button>
                <button onClick={() => navigate(`/positions/${position.id}`)} className={`flex-1 px-4 py-2 border rounded-lg text-sm font-medium transition ${
                  theme === "dark"
                    ? "border-slate-700 text-slate-300 hover:bg-slate-800"
                    : "border-slate-300 text-slate-600 hover:bg-slate-100"
                }`}>
                  Details
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Positions Table */}
        <div className={`border rounded-xl overflow-hidden ${cardBgClass}`}>
          <div className={`border-b ${theme === "dark" ? "border-slate-800" : "border-slate-200"} px-6 py-4`}>
            <h3 className={`text-lg font-semibold ${textClass}`}>All Positions</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={theme === "dark" ? "bg-slate-800" : "bg-slate-100"}>
                <tr>
                  <th className={`px-6 py-3 text-left text-sm font-semibold ${textClass}`}>Reference Entity</th>
                  <th className={`px-6 py-3 text-left text-sm font-semibold ${textClass}`}>Seller</th>
                  <th className={`px-6 py-3 text-left text-sm font-semibold ${textClass}`}>Spread</th>
                  <th className={`px-6 py-3 text-left text-sm font-semibold ${textClass}`}>Notional</th>
                  <th className={`px-6 py-3 text-left text-sm font-semibold ${textClass}`}>Collateral</th>
                  <th className={`px-6 py-3 text-left text-sm font-semibold ${textClass}`}>Status</th>
                  <th className={`px-6 py-3 text-left text-sm font-semibold ${textClass}`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPositions.map((position) => (
                  <tr
                    key={position.id}
                    className={theme === "dark" ? "border-t border-slate-800 hover:bg-slate-800/50" : "border-t border-slate-200 hover:bg-slate-100"}
                  >
                    <td className={`px-6 py-4 font-medium ${textClass}`}>{formatAddress(position.reference)}</td>
                    <td className={`px-6 py-4 ${textClass}`}>{formatAddress(position.seller)}</td>
                    <td className={`px-6 py-4 ${textClass}`}>{formatBps(position.spread)}</td>
                    <td className={`px-6 py-4 ${textClass}`}>${formatNumber(position.purchased)}</td>
                    <td className={`px-6 py-4 ${textClass}`}>${formatNumber(position.collateral)}</td>
                    <td className={`px-6 py-4`}>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(position.status)}`}>
                        {position.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => navigate(`/positions/${position.id}`)} className="text-blue-500 hover:text-blue-400 text-sm font-medium">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CDSMarket;
