import React from "react";
import { useTheme } from "../context/ThemeContext";

const HOLDINGS = [
  { asset: "Bitcoin", ticker: "BTC", value: "$4,120.00", weight: "33%", change: "+8.2%" },
  { asset: "Ethereum", ticker: "ETH", value: "$3,260.00", weight: "26%", change: "+5.4%" },
  { asset: "Shard", ticker: "SHARD", value: "$2,850.00", weight: "23%", change: "+14.1%" },
  { asset: "USDC", ticker: "USDC", value: "$1,203.35", weight: "10%", change: "0.0%" },
  { asset: "CDS Protection", ticker: "CDS", value: "$1,000.00", weight: "8%", change: "+1.9%" },
];

const Portfolio: React.FC = () => {
  const { theme } = useTheme();

  const bgClass = theme === "dark" ? "bg-slate-950" : "bg-slate-50";
  const cardBgClass = theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
  const textClass = theme === "dark" ? "text-white" : "text-slate-900";
  const secondaryTextClass = theme === "dark" ? "text-slate-400" : "text-slate-600";

  return (
    <div className={`min-h-screen ${bgClass} pt-24 pb-12`}>
      <div className="lg:ml-64 px-4 lg:px-8">
        <div className="mb-8">
          <h1 className={`text-4xl font-bold ${textClass} mb-2`}>Portfolio</h1>
          <p className={secondaryTextClass}>Consolidated holdings, allocation, and performance</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className={`border rounded-xl p-6 ${cardBgClass}`}>
            <p className={`text-sm ${secondaryTextClass} mb-2`}>Total Value</p>
            <p className={`text-3xl font-bold ${textClass}`}>$12,433.35</p>
          </div>
          <div className={`border rounded-xl p-6 ${cardBgClass}`}>
            <p className={`text-sm ${secondaryTextClass} mb-2`}>24h Change</p>
            <p className="text-3xl font-bold text-green-400">+4.8%</p>
          </div>
          <div className={`border rounded-xl p-6 ${cardBgClass}`}>
            <p className={`text-sm ${secondaryTextClass} mb-2`}>Risk Score</p>
            <p className="text-3xl font-bold text-orange-400">Moderate</p>
          </div>
        </div>

        <div className={`border rounded-xl overflow-hidden ${cardBgClass}`}>
          <div className={`border-b ${theme === "dark" ? "border-slate-800" : "border-slate-200"} px-6 py-4`}>
            <h2 className={`text-lg font-semibold ${textClass}`}>Holdings</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={theme === "dark" ? "bg-slate-800" : "bg-slate-100"}>
                <tr>
                  <th className={`px-6 py-3 text-left text-sm font-semibold ${textClass}`}>Asset</th>
                  <th className={`px-6 py-3 text-left text-sm font-semibold ${textClass}`}>Value</th>
                  <th className={`px-6 py-3 text-left text-sm font-semibold ${textClass}`}>Weight</th>
                  <th className={`px-6 py-3 text-left text-sm font-semibold ${textClass}`}>24h Change</th>
                </tr>
              </thead>
              <tbody>
                {HOLDINGS.map((holding) => (
                  <tr
                    key={holding.ticker}
                    className={theme === "dark" ? "border-t border-slate-800 hover:bg-slate-800/50" : "border-t border-slate-200 hover:bg-slate-100"}
                  >
                    <td className={`px-6 py-4 ${textClass}`}>
                      <div className="font-medium">{holding.asset}</div>
                      <div className={`text-sm ${secondaryTextClass}`}>{holding.ticker}</div>
                    </td>
                    <td className={`px-6 py-4 ${textClass}`}>{holding.value}</td>
                    <td className={`px-6 py-4 ${textClass}`}>{holding.weight}</td>
                    <td className="px-6 py-4 text-green-400 font-medium">{holding.change}</td>
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

export default Portfolio;
