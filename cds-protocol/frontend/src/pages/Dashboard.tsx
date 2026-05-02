import React, { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAccount } from "wagmi";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

// Mock data for protocol value over time
const PROTOCOL_DATA = [
  { date: "05/05", value: 1200 },
  { date: "08/05", value: 1500 },
  { date: "13/05", value: 1800 },
  { date: "20/05", value: 2100 },
  { date: "28/05", value: 2800 },
  { date: "05/06", value: 3433 },
];

// Mock data for protocol exposure breakdown
const ASSET_DATA = [
  { name: "Compound Exposure", value: 24, color: "#ec4899" },
  { name: "Aave Exposure", value: 18, color: "#3b82f6" },
  { name: "Uniswap Exposure", value: 32, color: "#d946ef" },
  { name: "Reserve Buffer", value: 22, color: "#f59e0b" },
  { name: "Settlement Pool", value: 4, color: "#10b981" },
];

const TIME_PERIODS = ["7D", "1M", "3M", "6M", "1Y", "ALL"];

interface PromotionalCardProps {
  title: string;
  description: string;
  bgGradient: string;
}

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
}

const Dashboard: React.FC = () => {
  const { theme } = useTheme();
  const { address, isConnected } = useAccount();
  const [selectedPeriod, setSelectedPeriod] = useState("1M");

  const bgClass = theme === "dark" 
    ? "bg-slate-950" 
    : "bg-slate-50";
  
  const cardBgClass = theme === "dark" 
    ? "bg-slate-900 border-slate-800" 
    : "bg-white border-slate-200";

  const textClass = theme === "dark" 
    ? "text-white" 
    : "text-slate-900";

  const secondaryTextClass = theme === "dark" 
    ? "text-slate-400" 
    : "text-slate-600";

  return (
    <div className={`min-h-screen ${bgClass} pt-24 pb-12`}>
      <div className="lg:ml-64 px-4 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className={`text-4xl font-bold ${textClass} mb-2`}>CDS Protocol</h1>
          <p className={secondaryTextClass}>Monitor protection, credit risk, and protocol exposure</p>
        </div>

        {/* Protocol Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <StatCard title="Total TVL" value="$2.4M" subtitle="Protocol capital tracked" />
          <StatCard title="Open CDS Positions" value="142" subtitle="Active buyer/seller contracts" />
          <StatCard title="Active Loans" value="89" subtitle="Loans protected by CDS" />
          <StatCard title="Total Defaults" value="3" subtitle="Declared credit events" />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Chart */}
          <div className={`lg:col-span-2 border rounded-xl p-6 ${cardBgClass}`}>
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className={`text-sm font-medium ${secondaryTextClass} mb-2`}>Protocol Exposure</p>
                <h2 className={`text-4xl font-bold ${textClass}`}>€12,433.35</h2>
                <p className={`text-sm ${secondaryTextClass} mt-1`}>Net notional under protection</p>
              </div>
              <div className="flex gap-2">
                {TIME_PERIODS.map((period) => (
                  <button
                    key={period}
                    onClick={() => setSelectedPeriod(period)}
                    className={`px-3 py-1 rounded text-sm font-medium transition ${
                      selectedPeriod === period
                        ? "bg-orange-500 text-white"
                        : theme === "dark"
                          ? "bg-slate-800 text-slate-400 hover:bg-slate-700"
                          : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart */}
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={PROTOCOL_DATA}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
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
                  <YAxis stroke={theme === "dark" ? "#94a3b8" : "#64748b"} />
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
                    dataKey="value"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorValue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right Column - Asset Breakdown */}
          <div className={`border rounded-xl p-6 ${cardBgClass}`}>
            {/* Donut Chart */}
            <div className="w-full h-48 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ASSET_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {ASSET_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme === "dark" ? "#1e293b" : "#f8fafc",
                      border: `1px solid ${theme === "dark" ? "#334155" : "#e2e8f0"}`,
                      borderRadius: "8px",
                      color: theme === "dark" ? "#fff" : "#000",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Center Label */}
            <div className="text-center mb-6">
              <p className={`text-sm ${secondaryTextClass} mb-1`}>CDS protocol value</p>
              <p className={`text-2xl font-bold text-orange-500`}>€12,433.35</p>
              <p className={`text-sm ${secondaryTextClass} mt-1`}>5 monitored exposures</p>
            </div>

            {/* Asset List */}
            <div className="space-y-3">
              {ASSET_DATA.map((asset, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div
                    className="w-2 h-8 rounded"
                    style={{ backgroundColor: asset.color }}
                  ></div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${textClass}`}>{asset.name}</p>
                  </div>
                  <p className={`text-sm font-semibold ${textClass}`}>{asset.value}%</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Protocol Table */}
        <div className={`mt-8 border rounded-xl overflow-hidden ${cardBgClass}`}>
          <div className={`border-b ${theme === "dark" ? "border-slate-800" : "border-slate-200"} px-6 py-4`}>
            <div className="flex justify-between items-center">
              <h3 className={`text-lg font-semibold ${textClass}`}>Entity Health</h3>
              <span className={`text-sm ${secondaryTextClass}`}>Latest oracle snapshot</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={theme === "dark" ? "bg-slate-800" : "bg-slate-100"}>
                <tr>
                  <th className={`px-6 py-3 text-left text-sm font-semibold ${textClass}`}>
                    Entity
                  </th>
                  <th className={`px-6 py-3 text-left text-sm font-semibold ${textClass}`}>
                    Spread
                  </th>
                  <th className={`px-6 py-3 text-left text-sm font-semibold ${textClass}`}>
                    24h Move
                  </th>
                  <th className={`px-6 py-3 text-left text-sm font-semibold ${textClass}`}>
                    Collateral
                  </th>
                  <th className={`px-6 py-3 text-left text-sm font-semibold ${textClass}`}>
                    Notional
                  </th>
                  <th className={`px-6 py-3 text-left text-sm font-semibold ${textClass}`}>
                    Coverage
                  </th>
                  <th className={`px-6 py-3 text-left text-sm font-semibold ${textClass}`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className={theme === "dark" ? "border-t border-slate-800 hover:bg-slate-800/50" : "border-t border-slate-200 hover:bg-slate-100"}>
                  <td className={`px-6 py-4 font-medium ${textClass}`}>Compound</td>
                  <td className={`px-6 py-4 ${textClass}`}>850</td>
                  <td className={`px-6 py-4 ${textClass}`}>50 bps</td>
                  <td className={`px-6 py-4 ${textClass}`}>0.5%</td>
                  <td className={`px-6 py-4`}><span className="text-green-400 font-semibold">Healthy</span></td>
                  <td className={`px-6 py-4`}><button className="text-blue-500 hover:text-blue-400 text-sm font-medium">View</button></td>
                </tr>
                <tr className={theme === "dark" ? "border-t border-slate-800 hover:bg-slate-800/50" : "border-t border-slate-200 hover:bg-slate-100"}>
                  <td className={`px-6 py-4 font-medium ${textClass}`}>Aave</td>
                  <td className={`px-6 py-4 ${textClass}`}>820</td>
                  <td className={`px-6 py-4 ${textClass}`}>80 bps</td>
                  <td className={`px-6 py-4 ${textClass}`}>0.8%</td>
                  <td className={`px-6 py-4`}><span className="text-green-400 font-semibold">Healthy</span></td>
                  <td className={`px-6 py-4`}><button className="text-blue-500 hover:text-blue-400 text-sm font-medium">View</button></td>
                </tr>
                <tr className={theme === "dark" ? "border-t border-slate-800 hover:bg-slate-800/50" : "border-t border-slate-200 hover:bg-slate-100"}>
                  <td className={`px-6 py-4 font-medium ${textClass}`}>Uniswap</td>
                  <td className={`px-6 py-4 ${textClass}`}>600</td>
                  <td className={`px-6 py-4 ${textClass}`}>200 bps</td>
                  <td className={`px-6 py-4 ${textClass}`}>2.0%</td>
                  <td className={`px-6 py-4`}><span className="text-yellow-400 font-semibold">Watch</span></td>
                  <td className={`px-6 py-4`}><button className="text-blue-500 hover:text-blue-400 text-sm font-medium">View</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const PromotionalCard: React.FC<PromotionalCardProps> = ({
  title,
  description,
  bgGradient,
}) => {
  return (
    <div
      className={`rounded-xl p-6 text-white overflow-hidden relative ${bgGradient} bg-gradient-to-br`}
    >
      <div className="relative z-10">
        <h3 className="text-xl font-bold mb-4">{title}</h3>
        <a href="#" className="text-sm font-medium hover:underline flex items-center gap-1">
          {description} →
        </a>
      </div>
      {/* Decorative circles */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-20 -mr-16 -mt-16">
        <div className="w-full h-full rounded-full border-8 border-white"></div>
      </div>
      <div className="absolute bottom-0 left-1/2 w-32 h-32 opacity-20 -mb-16 -ml-16">
        <div className="w-full h-full rounded-full border-8 border-white"></div>
      </div>
    </div>
  );
};

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle }) => {
  const { theme } = useTheme();
  const cardBgClass = theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
  const textClass = theme === "dark" ? "text-white" : "text-slate-900";
  const secondaryTextClass = theme === "dark" ? "text-slate-400" : "text-slate-600";

  return (
    <div className={`border rounded-xl p-6 ${cardBgClass}`}>
      <p className={`text-sm font-medium ${secondaryTextClass} mb-2`}>{title}</p>
      <p className={`text-3xl font-bold ${textClass}`}>{value}</p>
      <p className={`text-xs mt-2 ${secondaryTextClass}`}>{subtitle}</p>
    </div>
  );
};

export default Dashboard;
