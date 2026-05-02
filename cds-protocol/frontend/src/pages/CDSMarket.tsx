import React, { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAccount } from "wagmi";
import { useNavigate } from "react-router-dom";
import { formatUsdc, formatBps, formatNumber } from "../utils/formatters";
import { useOpenCDS } from "../hooks/useCDSVault";
import { useApprovalNeeded, useApproveToken } from "../hooks/useERC20";
import { useTx } from "../context/TxContext";
import ConfirmTxModal from "../components/ConfirmTxModal";
import { formatGasEstimate, getExplorerUrl, extractErrorMessage } from "../utils/txHelpers";
import { SEPOLIA_ADDRESSES } from "../config/contracts";
interface CDSPosition {
  id: string;
  reference: string;
  spread: number;
  collateral: string;
  purchased: string;
  premiumRate: number;
  status: "Active" | "Pending" | "Closed";
}

const MOCK_POSITIONS: CDSPosition[] = [
  {
    id: "1",
    reference: "Aave Protocol",
    spread: 250,
    collateral: "500000",
    purchased: "1000000",
    premiumRate: 200,
    status: "Active",
  },
  {
    id: "2",
    reference: "Compound Protocol",
    spread: 180,
    collateral: "300000",
    purchased: "600000",
    premiumRate: 150,
    status: "Active",
  },
  {
    id: "3",
    reference: "Uniswap Protocol",
    spread: 320,
    collateral: "400000",
    purchased: "800000",
    premiumRate: 280,
    status: "Pending",
  },
];

const CDSMarket: React.FC = () => {
  const { theme } = useTheme();
  const { address, isConnected } = useAccount();
  const { notifyPending, notifySuccess, notifyError } = useTx();
  const navigate = useNavigate();
  const [selectedFilter, setSelectedFilter] = useState<"All" | "Active" | "Pending" | "Closed">("All");
  const [showNewForm, setShowNewForm] = useState(false);
  const [buyerAddr, setBuyerAddr] = useState("");
  const [referenceEntity, setReferenceEntity] = useState("");
  const [notional, setNotional] = useState(0);
  const [spreadBps, setSpreadBps] = useState(0);
  const [maturityDays, setMaturityDays] = useState(365);
  const [collateral, setCollateral] = useState(0);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // ERC20 approval flow
  const { isNeeded: needsApproval } = useApprovalNeeded(
    SEPOLIA_ADDRESSES.USDC,
    SEPOLIA_ADDRESSES.CDSVault,
    collateral
  );

  const { prepare: approvePrepare, write: approveWrite } = useApproveToken(
    buyerAddr && referenceEntity && collateral > 0
      ? {
          tokenAddress: SEPOLIA_ADDRESSES.USDC,
          spender: SEPOLIA_ADDRESSES.CDSVault,
          amount: collateral,
        }
      : undefined
  );

  const { prepare: openPrepare, write: openWrite } = useOpenCDS(
    buyerAddr && referenceEntity
      ? {
          buyer: buyerAddr,
          referenceEntity,
          notional,
          spreadBps,
          maturity: maturityDays,
          collateral,
        }
      : undefined
  );

  const bgClass = theme === "dark" ? "bg-slate-950" : "bg-slate-50";
  const cardBgClass = theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
  const textClass = theme === "dark" ? "text-white" : "text-slate-900";
  const secondaryTextClass = theme === "dark" ? "text-slate-400" : "text-slate-600";
  const inputBgClass = theme === "dark" ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-300";

  const filteredPositions = selectedFilter === "All" 
    ? MOCK_POSITIONS 
    : MOCK_POSITIONS.filter(p => p.status === selectedFilter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-500/20 text-green-400";
      case "Pending":
        return "bg-yellow-500/20 text-yellow-400";
      case "Closed":
        return "bg-red-500/20 text-red-400";
      default:
        return "bg-slate-500/20 text-slate-400";
    }
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

              {/* Reference Entity */}
              <div>
                <label className={`block text-sm font-medium ${textClass} mb-2`}>Reference Entity</label>
                <select value={referenceEntity} onChange={(e) => setReferenceEntity(e.target.value)} className={`w-full px-4 py-2 rounded-lg border ${inputBgClass} ${textClass} focus:outline-none focus:ring-2 focus:ring-blue-500`}>
                  <option value="">Select...</option>
                  <option value="0xCompound">Compound Protocol</option>
                  <option value="0xAave">Aave Protocol</option>
                  <option value="0xUniswap">Uniswap Protocol</option>
                  <option value="0xCurve">Curve Finance</option>
                </select>
              </div>

              {/* Notional Amount */}
              <div>
                <label className={`block text-sm font-medium ${textClass} mb-2`}>Notional Amount</label>
                <input
                  type="number"
                  value={notional}
                  onChange={(e) => setNotional(Number(e.target.value))}
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
                  onChange={(e) => setSpreadBps(Number(e.target.value))}
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
                <input type="number" value={collateral} onChange={(e) => setCollateral(Number(e.target.value))} className={`w-full px-4 py-2 rounded-lg border ${inputBgClass} ${textClass}`} />
              </div>

              {/* Premium and Payout */}
              <div>
                <label className={`block text-sm font-medium ${textClass} mb-2`}>Quarterly Premium / Max Payout</label>
                <div className={`px-4 py-2 rounded-lg border ${inputBgClass} ${secondaryTextClass}`}>
                  $0.50 / quarter, max payout $60.00
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="mt-6 flex gap-4">
              <button className="flex-1 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition">
                Approve USDC
              </button>
              <button
                onClick={async () => {
                  try {
                    const id = notifyPending("Opening CDS position");
                    if (!openWrite || !openWrite.writeAsync) throw new Error("Contract not ready");
                    const tx = await openWrite.writeAsync();
                    await tx.wait?.();
                    notifySuccess(id, "Opened position — tx confirmed");
                  } catch (err: any) {
                    notifyError(Date.now(), String(err?.message ?? err));
                  }
                }}
                className="flex-1 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition"
              >
                Open CDS Position
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
          {(["All", "Active", "Pending", "Closed"] as const).map((filter) => (
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
                  <h3 className={`text-lg font-semibold ${textClass}`}>{position.reference}</h3>
                  <p className={`text-sm ${secondaryTextClass}`}>CDS Protection</p>
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
                  <p className={`text-sm font-semibold text-green-400`}>50%</p>
                </div>
                <div className={`w-full h-2 rounded-full border ${theme === "dark" ? "border-slate-700" : "border-slate-300"} bg-slate-200`}>
                  <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-green-500 to-blue-500"></div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg font-medium transition">
                  Pay Premium
                </button>
                <button className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg font-medium transition">
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
                  <th className={`px-6 py-3 text-left text-sm font-semibold ${textClass}`}>Entity</th>
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
                    <td className={`px-6 py-4 font-medium ${textClass}`}>{position.reference}</td>
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
