import React, { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

// Mock data for spread history
const SPREAD_DATA = [
  { date: "Jun 1", spread: 180, price: 2100 },
  { date: "Jun 5", spread: 195, price: 2050 },
  { date: "Jun 10", spread: 210, price: 1980 },
  { date: "Jun 15", spread: 235, price: 1920 },
  { date: "Jun 20", spread: 250, price: 1850 },
  { date: "Jun 25", spread: 280, price: 1780 },
  { date: "Jun 30", spread: 310, price: 1650 },
];

interface Entity {
  name: string;
  creditScore: number;
  spread: number;
  riskLevel: "Low" | "Medium" | "High" | "Critical";
  tvl: string;
  activeCDS: number;
  defaultProbability: number;
  status: "Healthy" | "Watch" | "Default";
}

const ENTITIES: Entity[] = [
  {
    name: "Aave Protocol",
    creditScore: 850,
    spread: 150,
    riskLevel: "Low",
    tvl: "$10.2B",
    activeCDS: 45,
    defaultProbability: 0.5,
    status: "Healthy",
  },
  {
    name: "Compound Protocol",
    creditScore: 820,
    spread: 180,
    riskLevel: "Low",
    tvl: "$3.8B",
    activeCDS: 28,
    defaultProbability: 0.8,
    status: "Healthy",
  },
  {
    name: "Uniswap Protocol",
    creditScore: 710,
    spread: 310,
    riskLevel: "High",
    tvl: "$1.2B",
    activeCDS: 12,
    defaultProbability: 3.2,
    status: "Watch",
  },
  {
    name: "Curve Finance",
    creditScore: 650,
    spread: 520,
    riskLevel: "Critical",
    tvl: "$800M",
    activeCDS: 8,
    defaultProbability: 8.5,
    status: "Watch",
  },
];

const EntityRisk: React.FC = () => {
  const { theme } = useTheme();
  const [selectedEntity, setSelectedEntity] = useState<Entity>(ENTITIES[0]);

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

  const riskColor = getRiskColor(selectedEntity.riskLevel);
  const statusColor = selectedEntity.status === "Healthy" ? "text-green-400" : "text-yellow-400";

  return (
    <div className={`min-h-screen ${bgClass} pt-24 pb-12`}>
      <div className="lg:ml-64 px-4 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-4xl font-bold ${textClass} mb-2`}>Entity Risk Monitor</h1>
          <p className={secondaryTextClass}>Track credit spreads and default probabilities</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left - Entity List */}
          <div className={`border rounded-xl p-4 ${cardBgClass} h-fit`}>
            <h3 className={`text-lg font-semibold ${textClass} mb-4`}>Entities</h3>
            <div className="space-y-2">
              {ENTITIES.map((entity) => (
                <button
                  key={entity.name}
                  onClick={() => setSelectedEntity(entity)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition ${
                    selectedEntity.name === entity.name
                      ? "bg-blue-600 text-white"
                      : theme === "dark"
                        ? "bg-slate-800 hover:bg-slate-700"
                        : "bg-slate-100 hover:bg-slate-200"
                  } ${selectedEntity.name !== entity.name ? textClass : ""}`}
                >
                  <p className="font-medium text-sm">{entity.name}</p>
                  <p className={`text-xs ${selectedEntity.name === entity.name ? "text-blue-100" : secondaryTextClass}`}>
                    Spread: {entity.spread} bps
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
                  <h2 className={`text-2xl font-bold ${textClass} mb-2`}>{selectedEntity.name}</h2>
                  <p className={`text-sm ${secondaryTextClass}`}>Credit Risk Analysis</p>
                </div>
                <div className={`px-4 py-2 rounded-lg ${riskColor.bg} ${riskColor.text} font-semibold`}>
                  {selectedEntity.riskLevel}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className={`text-xs ${secondaryTextClass} mb-1`}>Credit Score</p>
                  <p className="text-2xl font-bold text-blue-400">{selectedEntity.creditScore}</p>
                </div>
                <div>
                  <p className={`text-xs ${secondaryTextClass} mb-1`}>Spread (bps)</p>
                  <p className="text-2xl font-bold text-orange-400">{selectedEntity.spread}</p>
                </div>
                <div>
                  <p className={`text-xs ${secondaryTextClass} mb-1`}>Default Prob.</p>
                  <p className="text-2xl font-bold text-red-400">{selectedEntity.defaultProbability}%</p>
                </div>
                <div>
                  <p className={`text-xs ${secondaryTextClass} mb-1`}>Status</p>
                  <p className={`text-lg font-bold ${statusColor}`}>
                    {selectedEntity.status === "Healthy" ? "✅" : "⚠️"} {selectedEntity.status}
                  </p>
                </div>
              </div>
            </div>

            {/* Spread Chart */}
            <div className={`border rounded-xl p-6 ${cardBgClass}`}>
              <h3 className={`text-lg font-semibold ${textClass} mb-4`}>30-Day Spread History</h3>
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={SPREAD_DATA}>
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
                    <p className={`text-2xl font-bold text-blue-400`}>{selectedEntity.activeCDS}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className={secondaryTextClass}>Total Notional</p>
                    <p className={`text-lg font-bold ${textClass}`}>
                      ${(selectedEntity.activeCDS * 250000 / 1000000).toFixed(1)}M
                    </p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className={secondaryTextClass}>Avg Spread</p>
                    <p className={`text-lg font-bold text-orange-400`}>{selectedEntity.spread} bps</p>
                  </div>
                </div>
              </div>

              {/* Pool Info */}
              <div className={`border rounded-xl p-6 ${cardBgClass}`}>
                <h3 className={`text-lg font-semibold ${textClass} mb-4`}>Pool Info</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className={secondaryTextClass}>TVL</p>
                    <p className={`text-lg font-bold ${textClass}`}>{selectedEntity.tvl}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className={secondaryTextClass}>Last Updated</p>
                    <p className={`text-sm ${secondaryTextClass}`}>2 minutes ago</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className={secondaryTextClass}>Price Change (24h)</p>
                    <p className="text-lg font-bold text-red-400">-2.3%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition">
                Buy Protection
              </button>
              <button className={`flex-1 px-6 py-3 border rounded-lg font-medium transition ${
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
