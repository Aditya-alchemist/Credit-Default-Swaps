import React, { useState } from "react";
import { useTheme } from "../context/ThemeContext";

interface MarginPosition {
  id: string;
  reference: string;
  collateralRatio: number;
  healthFactor: number;
  collateral: string;
  debt: string;
  liquidationPrice: number;
  daysToLiquidation: number;
  status: "Safe" | "Warning" | "Critical";
}

const MARGIN_POSITIONS: MarginPosition[] = [
  {
    id: "1",
    reference: "Aave CDS Position",
    collateralRatio: 145,
    healthFactor: 2.1,
    collateral: "500000",
    debt: "300000",
    liquidationPrice: 1200,
    daysToLiquidation: 45,
    status: "Safe",
  },
  {
    id: "2",
    reference: "Compound CDS Position",
    collateralRatio: 122,
    healthFactor: 1.3,
    collateral: "400000",
    debt: "320000",
    liquidationPrice: 980,
    daysToLiquidation: 12,
    status: "Warning",
  },
  {
    id: "3",
    reference: "Uniswap CDS Position",
    collateralRatio: 115,
    healthFactor: 1.05,
    collateral: "300000",
    debt: "260000",
    liquidationPrice: 850,
    daysToLiquidation: 3,
    status: "Critical",
  },
];

const MarginDashboard: React.FC = () => {
  const { theme } = useTheme();
  const [selectedPosition, setSelectedPosition] = useState<MarginPosition | null>(MARGIN_POSITIONS[0]);
  const [showTopUpModal, setShowTopUpModal] = useState(false);

  const bgClass = theme === "dark" ? "bg-slate-950" : "bg-slate-50";
  const cardBgClass = theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
  const textClass = theme === "dark" ? "text-white" : "text-slate-900";
  const secondaryTextClass = theme === "dark" ? "text-slate-400" : "text-slate-600";

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Safe":
        return { bg: "bg-green-500/20", text: "text-green-400", icon: "✅" };
      case "Warning":
        return { bg: "bg-yellow-500/20", text: "text-yellow-400", icon: "⚠️" };
      case "Critical":
        return { bg: "bg-red-500/20", text: "text-red-400", icon: "🚨" };
      default:
        return { bg: "bg-slate-500/20", text: "text-slate-400", icon: "•" };
    }
  };

  const criticalCount = MARGIN_POSITIONS.filter((p) => p.status === "Critical").length;
  const warningCount = MARGIN_POSITIONS.filter((p) => p.status === "Warning").length;

  return (
    <div className={`min-h-screen ${bgClass} pt-24 pb-12`}>
      <div className="lg:ml-64 px-4 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-4xl font-bold ${textClass} mb-2`}>Margin Dashboard</h1>
          <p className={secondaryTextClass}>Monitor collateral ratios and liquidation risks</p>
        </div>

        {/* Alert Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className={`border-l-4 border-red-600 rounded-lg p-6 ${cardBgClass}`}>
            <p className={`text-sm font-medium ${secondaryTextClass} mb-2`}>🚨 Critical Positions</p>
            <p className={`text-4xl font-bold text-red-400 mb-1`}>{criticalCount}</p>
            <p className={`text-xs ${secondaryTextClass}`}>Requiring immediate attention</p>
          </div>
          <div className={`border-l-4 border-yellow-600 rounded-lg p-6 ${cardBgClass}`}>
            <p className={`text-sm font-medium ${secondaryTextClass} mb-2`}>⚠️ Warning Positions</p>
            <p className={`text-4xl font-bold text-yellow-400 mb-1`}>{warningCount}</p>
            <p className={`text-xs ${secondaryTextClass}`}>Monitor closely</p>
          </div>
          <div className={`border-l-4 border-green-600 rounded-lg p-6 ${cardBgClass}`}>
            <p className={`text-sm font-medium ${secondaryTextClass} mb-2`}>✅ Safe Positions</p>
            <p className={`text-4xl font-bold text-green-400 mb-1`}>
              {MARGIN_POSITIONS.filter((p) => p.status === "Safe").length}
            </p>
            <p className={`text-xs ${secondaryTextClass}`}>No action needed</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Position List */}
          <div className={`border rounded-xl p-6 ${cardBgClass}`}>
            <h3 className={`text-lg font-semibold ${textClass} mb-4`}>Positions</h3>
            <div className="space-y-2">
              {MARGIN_POSITIONS.map((position) => {
                const statusColor = getStatusColor(position.status);
                const isSelected = selectedPosition?.id === position.id;

                return (
                  <button
                    key={position.id}
                    onClick={() => setSelectedPosition(position)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition border ${
                      isSelected
                        ? "bg-blue-600 text-white border-blue-600"
                        : theme === "dark"
                          ? "border-slate-700 hover:border-slate-600 hover:bg-slate-800"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className={`font-medium text-sm ${isSelected ? "text-white" : textClass}`}>
                        {position.reference}
                      </p>
                      <span className={`text-xs font-bold ${isSelected ? "bg-white/20 text-white" : statusColor.text}`}>
                        {statusColor.icon}
                      </span>
                    </div>
                    <p
                      className={`text-xs ${
                        isSelected
                          ? "text-blue-100"
                          : position.status === "Critical"
                            ? "text-red-400"
                            : position.status === "Warning"
                              ? "text-yellow-400"
                              : secondaryTextClass
                      }`}
                    >
                      Ratio: {position.collateralRatio}% · HF: {position.healthFactor.toFixed(2)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Details Panel */}
          {selectedPosition && (
            <div className="lg:col-span-2 space-y-6">
              {/* Position Header */}
              <div className={`border rounded-xl p-6 ${cardBgClass}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className={`text-2xl font-bold ${textClass} mb-1`}>{selectedPosition.reference}</h2>
                    <p className={secondaryTextClass}>Position Details</p>
                  </div>
                  <div
                    className={`px-4 py-2 rounded-lg ${getStatusColor(selectedPosition.status).bg} ${
                      getStatusColor(selectedPosition.status).text
                    } font-bold`}
                  >
                    {getStatusColor(selectedPosition.status).icon} {selectedPosition.status}
                  </div>
                </div>

                {/* Main Metrics */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className={`text-xs ${secondaryTextClass} mb-1`}>Collateral Ratio</p>
                    <p
                      className={`text-3xl font-bold ${
                        selectedPosition.collateralRatio > 150
                          ? "text-green-400"
                          : selectedPosition.collateralRatio > 120
                            ? "text-yellow-400"
                            : "text-red-400"
                      }`}
                    >
                      {selectedPosition.collateralRatio}%
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs ${secondaryTextClass} mb-1`}>Health Factor</p>
                    <p
                      className={`text-3xl font-bold ${
                        selectedPosition.healthFactor > 1.5
                          ? "text-green-400"
                          : selectedPosition.healthFactor > 1.2
                            ? "text-yellow-400"
                            : "text-red-400"
                      }`}
                    >
                      {selectedPosition.healthFactor.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <p className={`text-sm font-medium ${secondaryTextClass}`}>Liquidation Risk</p>
                    <p className={`text-sm font-bold ${selectedPosition.healthFactor > 1.5 ? "text-green-400" : "text-red-400"}`}>
                      {((1 / selectedPosition.healthFactor) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div
                    className={`w-full h-3 rounded-full border ${
                      theme === "dark" ? "border-slate-700" : "border-slate-300"
                    } bg-slate-200`}
                  >
                    <div
                      className={`h-full rounded-full ${
                        selectedPosition.healthFactor > 1.5
                          ? "bg-gradient-to-r from-green-500 to-green-600"
                          : selectedPosition.healthFactor > 1.2
                            ? "bg-gradient-to-r from-yellow-500 to-yellow-600"
                            : "bg-gradient-to-r from-red-500 to-red-600"
                      }`}
                      style={{ width: `${Math.min(100, (1 / selectedPosition.healthFactor) * 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Liquidation Warning */}
                {selectedPosition.status !== "Safe" && (
                  <div
                    className={`px-4 py-3 rounded-lg border ${
                      selectedPosition.status === "Critical"
                        ? "bg-red-500/10 border-red-500/50"
                        : "bg-yellow-500/10 border-yellow-500/50"
                    }`}
                  >
                    <p
                      className={`text-sm font-bold ${
                        selectedPosition.status === "Critical" ? "text-red-400" : "text-yellow-400"
                      }`}
                    >
                      ⏰ {selectedPosition.daysToLiquidation} days until liquidation threshold
                    </p>
                    <p
                      className={`text-xs mt-1 ${
                        selectedPosition.status === "Critical" ? "text-red-300" : "text-yellow-300"
                      }`}
                    >
                      Top-up collateral to avoid liquidation
                    </p>
                  </div>
                )}
              </div>

              {/* Collateral & Debt Details */}
              <div className="grid grid-cols-2 gap-6">
                {/* Collateral Info */}
                <div className={`border rounded-xl p-6 ${cardBgClass}`}>
                  <h3 className={`text-lg font-semibold ${textClass} mb-4`}>Collateral</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <p className={secondaryTextClass}>Amount</p>
                      <p className={`font-bold ${textClass}`}>${selectedPosition.collateral}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className={secondaryTextClass}>Price</p>
                      <p className={`font-bold ${textClass}`}>$2,000</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className={secondaryTextClass}>Value</p>
                      <p className={`font-bold text-green-400`}>$1,000,000</p>
                    </div>
                  </div>
                </div>

                {/* Debt Info */}
                <div className={`border rounded-xl p-6 ${cardBgClass}`}>
                  <h3 className={`text-lg font-semibold ${textClass} mb-4`}>Debt</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <p className={secondaryTextClass}>Outstanding</p>
                      <p className={`font-bold ${textClass}`}>${selectedPosition.debt}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className={secondaryTextClass}>Interest Rate</p>
                      <p className={`font-bold text-red-400`}>6.9% APY</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className={secondaryTextClass}>Accrued Interest</p>
                      <p className={`font-bold ${textClass}`}>$2,345</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={() => setShowTopUpModal(true)}
                  className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition"
                >
                  Add Collateral
                </button>
                <button className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition">
                  Repay Debt
                </button>
                <button
                  className={`flex-1 px-6 py-3 border rounded-lg font-medium transition ${
                    theme === "dark"
                      ? "border-slate-700 text-slate-300 hover:bg-slate-800"
                      : "border-slate-300 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Close Position
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Top-up Modal */}
        {showTopUpModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className={`border rounded-xl p-8 w-full max-w-md ${cardBgClass}`}>
              <h3 className={`text-2xl font-bold ${textClass} mb-6`}>Add Collateral</h3>

              <div className="space-y-4 mb-6">
                <div>
                  <label className={`block text-sm font-medium ${textClass} mb-2`}>WETH Amount</label>
                  <input
                    type="number"
                    placeholder="1"
                    className={`w-full px-4 py-2 rounded-lg border ${
                      theme === "dark" ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-300"
                    } ${textClass} placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                </div>

                <div className={`px-4 py-3 rounded-lg border ${
                  theme === "dark" ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-300"
                }`}>
                  <p className={`text-sm ${secondaryTextClass} mb-1`}>New Collateral Ratio</p>
                  <p className={`text-2xl font-bold text-green-400`}>160%</p>
                </div>
              </div>

              <div className="flex gap-4">
                <button className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition">
                  Confirm
                </button>
                <button
                  onClick={() => setShowTopUpModal(false)}
                  className={`flex-1 px-4 py-2 border rounded-lg font-medium transition ${
                    theme === "dark"
                      ? "border-slate-700 text-slate-300 hover:bg-slate-800"
                      : "border-slate-300 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarginDashboard;
