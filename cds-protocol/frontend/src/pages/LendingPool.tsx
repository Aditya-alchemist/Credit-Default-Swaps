import React, { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAccount } from "wagmi";
import { formatUsdc, formatNumber } from "../utils/formatters";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useDeposit, useBorrow, useRepay } from "../hooks/useLendingPool";
import { useTx } from "../context/TxContext";
import { SEPOLIA_ADDRESSES } from "../config/contracts";

// Mock data for supply/borrow rate history
const RATE_DATA = [
  { date: "Jan", supply: 4.5, borrow: 7.2 },
  { date: "Feb", supply: 4.8, borrow: 7.5 },
  { date: "Mar", supply: 5.2, borrow: 8.1 },
  { date: "Apr", supply: 5.0, borrow: 7.8 },
  { date: "May", supply: 5.5, borrow: 8.4 },
  { date: "Jun", supply: 5.8, borrow: 8.7 },
];

// Mock data for lending pool breakdown
const POOL_DATA = [
  { asset: "USDC", supplied: 5000000, borrowed: 3500000, color: "#3b82f6" },
  { asset: "WETH", supplied: 2000, borrowed: 1200, color: "#f59e0b" },
];

const LendingPool: React.FC = () => {
  const { theme } = useTheme();
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<"supply" | "borrow">("supply");

  const bgClass = theme === "dark" ? "bg-slate-950" : "bg-slate-50";
  const cardBgClass = theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
  const textClass = theme === "dark" ? "text-white" : "text-slate-900";
  const secondaryTextClass = theme === "dark" ? "text-slate-400" : "text-slate-600";
  const inputBgClass = theme === "dark" ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-300";

  return (
    <div className={`min-h-screen ${bgClass} pt-24 pb-12`}>
      <div className="lg:ml-64 px-4 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-4xl font-bold ${textClass} mb-2`}>Lending Pool</h1>
          <p className={secondaryTextClass}>Deposit to earn interest or borrow against collateral</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className={`border rounded-xl p-6 ${cardBgClass}`}>
            <p className={`text-sm font-medium ${secondaryTextClass} mb-2`}>Total Supplied</p>
            <p className={`text-3xl font-bold ${textClass} mb-1`}>$7,000,000</p>
            <p className={`text-sm text-green-400`}>↑ 12% this month</p>
          </div>
          <div className={`border rounded-xl p-6 ${cardBgClass}`}>
            <p className={`text-sm font-medium ${secondaryTextClass} mb-2`}>Total Borrowed</p>
            <p className={`text-3xl font-bold ${textClass} mb-1`}>$4,700,000</p>
            <p className={`text-sm text-orange-400`}>67% Utilization</p>
          </div>
          <div className={`border rounded-xl p-6 ${cardBgClass}`}>
            <p className={`text-sm font-medium ${secondaryTextClass} mb-2`}>Supply APY</p>
            <p className={`text-3xl font-bold text-green-400 mb-1`}>5.8%</p>
            <p className={`text-sm ${secondaryTextClass}`}>Average across assets</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Left Column - Form */}
          <div className="lg:col-span-1">
            <div className={`border rounded-xl p-6 ${cardBgClass} sticky top-24`}>
              {/* Tab Buttons */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setActiveTab("supply")}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                    activeTab === "supply"
                      ? "bg-green-600 text-white"
                      : theme === "dark"
                        ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                  }`}
                >
                  Supply
                </button>
                <button
                  onClick={() => setActiveTab("borrow")}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                    activeTab === "borrow"
                      ? "bg-blue-600 text-white"
                      : theme === "dark"
                        ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                  }`}
                >
                  Borrow
                </button>
              </div>

              {activeTab === "supply" ? (
                <SupplyForm theme={theme} cardBgClass={cardBgClass} textClass={textClass} secondaryTextClass={secondaryTextClass} inputBgClass={inputBgClass} />
              ) : (
                <BorrowForm theme={theme} cardBgClass={cardBgClass} textClass={textClass} secondaryTextClass={secondaryTextClass} inputBgClass={inputBgClass} />
              )}
            </div>
          </div>

          {/* Right Column - Charts */}
          <div className="lg:col-span-2 space-y-6">
            {/* Rate History Chart */}
            <div className={`border rounded-xl p-6 ${cardBgClass}`}>
              <h3 className={`text-lg font-semibold ${textClass} mb-4`}>Rate History</h3>
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={RATE_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#334155" : "#e2e8f0"} />
                    <XAxis dataKey="date" stroke={theme === "dark" ? "#94a3b8" : "#64748b"} />
                    <YAxis stroke={theme === "dark" ? "#94a3b8" : "#64748b"} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: theme === "dark" ? "#1e293b" : "#f8fafc",
                        border: `1px solid ${theme === "dark" ? "#334155" : "#e2e8f0"}`,
                        borderRadius: "8px",
                        color: theme === "dark" ? "#fff" : "#000",
                      }}
                    />
                    <Line type="monotone" dataKey="supply" stroke="#10b981" strokeWidth={2} name="Supply APY" />
                    <Line type="monotone" dataKey="borrow" stroke="#ef4444" strokeWidth={2} name="Borrow APY" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pool Composition */}
            <div className={`border rounded-xl p-6 ${cardBgClass}`}>
              <h3 className={`text-lg font-semibold ${textClass} mb-4`}>Pool Composition</h3>
              <div className="space-y-4">
                {POOL_DATA.map((pool, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between items-center mb-2">
                      <p className={`font-medium ${textClass}`}>{pool.asset}</p>
                      <div className="text-right">
                        <p className={`text-sm ${textClass}`}>
                          ${formatNumber(pool.borrowed)} / ${formatNumber(pool.supplied)}
                        </p>
                        <p className={`text-xs ${secondaryTextClass}`}>
                          {((pool.borrowed / pool.supplied) * 100).toFixed(1)}% utilized
                        </p>
                      </div>
                    </div>
                    <div className={`w-full h-3 rounded-full border ${theme === "dark" ? "border-slate-700" : "border-slate-300"} bg-slate-200`}>
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-orange-500 to-red-500"
                        style={{ width: `${(pool.borrowed / pool.supplied) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Assets Overview Table */}
        <div className={`border rounded-xl overflow-hidden ${cardBgClass}`}>
          <div className={`border-b ${theme === "dark" ? "border-slate-800" : "border-slate-200"} px-6 py-4`}>
            <h3 className={`text-lg font-semibold ${textClass}`}>Asset Overview</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={theme === "dark" ? "bg-slate-800" : "bg-slate-100"}>
                <tr>
                  <th className={`px-6 py-3 text-left text-sm font-semibold ${textClass}`}>Asset</th>
                  <th className={`px-6 py-3 text-left text-sm font-semibold ${textClass}`}>Supply APY</th>
                  <th className={`px-6 py-3 text-left text-sm font-semibold ${textClass}`}>Borrow APY</th>
                  <th className={`px-6 py-3 text-left text-sm font-semibold ${textClass}`}>Supplied</th>
                  <th className={`px-6 py-3 text-left text-sm font-semibold ${textClass}`}>Borrowed</th>
                  <th className={`px-6 py-3 text-left text-sm font-semibold ${textClass}`}>Utilization</th>
                  <th className={`px-6 py-3 text-left text-sm font-semibold ${textClass}`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr className={theme === "dark" ? "border-t border-slate-800 hover:bg-slate-800/50" : "border-t border-slate-200 hover:bg-slate-100"}>
                  <td className={`px-6 py-4 font-medium ${textClass}`}>USDC</td>
                  <td className="px-6 py-4">
                    <span className="text-green-400 font-semibold">5.8%</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-red-400 font-semibold">8.7%</span>
                  </td>
                  <td className={`px-6 py-4 ${textClass}`}>$5,000,000</td>
                  <td className={`px-6 py-4 ${textClass}`}>$3,500,000</td>
                  <td className="px-6 py-4">
                    <span className="text-orange-400 font-medium">70%</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded font-medium transition">
                        Supply
                      </button>
                      <button className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded font-medium transition">
                        Borrow
                      </button>
                    </div>
                  </td>
                </tr>
                <tr className={theme === "dark" ? "border-t border-slate-800 hover:bg-slate-800/50" : "border-t border-slate-200 hover:bg-slate-100"}>
                  <td className={`px-6 py-4 font-medium ${textClass}`}>WETH</td>
                  <td className="px-6 py-4">
                    <span className="text-green-400 font-semibold">4.2%</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-red-400 font-semibold">6.9%</span>
                  </td>
                  <td className={`px-6 py-4 ${textClass}`}>2,000 ETH</td>
                  <td className={`px-6 py-4 ${textClass}`}>1,200 ETH</td>
                  <td className="px-6 py-4">
                    <span className="text-orange-400 font-medium">60%</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded font-medium transition">
                        Supply
                      </button>
                      <button className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded font-medium transition">
                        Borrow
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

interface FormProps {
  theme: string;
  cardBgClass: string;
  textClass: string;
  secondaryTextClass: string;
  inputBgClass: string;
}

const SupplyForm: React.FC<FormProps> = ({ theme, cardBgClass, textClass, secondaryTextClass, inputBgClass }) => {
  const [amount, setAmount] = useState("");

  const amountNum = parseFloat(amount) || 0;
  const apy = 5.8;
  const earnedPerYear = amountNum * (apy / 100);
  const { notifyPending, notifySuccess, notifyError } = useTx();
  const { prepare, write } = useDeposit(amountNum ? BigInt(Math.floor(amountNum)) : undefined);

  return (
    <div className="space-y-4">
      <h3 className={`text-lg font-semibold ${textClass} mb-4`}>Supply Assets</h3>

      <div>
        <label className={`block text-sm font-medium ${textClass} mb-2`}>Asset</label>
        <select className={`w-full px-4 py-2 rounded-lg border ${inputBgClass} ${textClass} focus:outline-none focus:ring-2 focus:ring-blue-500`}>
          <option>USDC</option>
          <option>WETH</option>
        </select>
      </div>

      <div>
        <label className={`block text-sm font-medium ${textClass} mb-2`}>Amount</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1000"
            className={`flex-1 px-4 py-2 rounded-lg border ${inputBgClass} ${textClass} placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
          <button className={`px-4 py-2 border rounded-lg font-medium transition ${
            theme === "dark"
              ? "border-slate-700 text-slate-300 hover:bg-slate-800"
              : "border-slate-300 text-slate-600 hover:bg-slate-100"
          }`}>
            MAX
          </button>
        </div>
      </div>

      <div className={`px-4 py-3 rounded-lg border ${inputBgClass}`}>
        <p className={`text-sm ${secondaryTextClass} mb-2`}>Earning Estimate</p>
        <p className={`text-2xl font-bold text-green-400`}>${earnedPerYear.toFixed(2)}</p>
        <p className={`text-xs ${secondaryTextClass} mt-1`}>per year at {apy}% APY</p>
      </div>

      <button
        onClick={async () => {
          try {
            const id = notifyPending("Supplying to pool");
            if (!write?.writeAsync) throw new Error("contract not ready");
            const tx = await write.writeAsync();
            await tx.wait?.();
            notifySuccess(id, "Supply confirmed");
          } catch (e: any) {
            notifyError(Date.now(), String(e?.message ?? e));
          }
        }}
        className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition"
      >
        Supply
      </button>
      <button className={`w-full px-4 py-2 border rounded-lg font-medium transition ${
        theme === "dark"
          ? "border-slate-700 text-slate-300 hover:bg-slate-800"
          : "border-slate-300 text-slate-600 hover:bg-slate-100"
      }`}>
        Approve
      </button>
    </div>
  );
};

const BorrowForm: React.FC<FormProps> = ({ theme, cardBgClass, textClass, secondaryTextClass, inputBgClass }) => {
  const [collateral, setCollateral] = useState("");
  const [borrow, setBorrow] = useState("");
  const [repayLoanId, setRepayLoanId] = useState("");
  const [repayAmount, setRepayAmount] = useState("");

  const collateralNum = parseFloat(collateral) || 0;
  const borrowNum = parseFloat(borrow) || 0;
  const collateralValue = collateralNum * 2000; // ETH price
  const maxBorrow = collateralValue * 0.75; // 75% LTV
  const healthFactor = collateralValue / (borrowNum || 1) / 1.5;

  const { notifyPending, notifySuccess, notifyError } = useTx();
  const { prepare: borrowPrepare, write: borrowWrite } = useBorrow(
    SEPOLIA_ADDRESSES.WETH,
    collateralNum ? BigInt(Math.floor(collateralNum)) : undefined,
    borrowNum ? BigInt(Math.floor(borrowNum)) : undefined
  );
  const repayIdNum = repayLoanId ? Number(repayLoanId) : undefined;
  const repayAmtNum = repayAmount ? Number(repayAmount) : undefined;
  const { prepare: repayPrepare, write: repayWrite } = useRepay(repayIdNum, repayAmtNum ? BigInt(Math.floor(repayAmtNum)) : undefined);

  return (
    <div className="space-y-4">
      <h3 className={`text-lg font-semibold ${textClass} mb-4`}>Borrow Assets</h3>

      <div>
        <label className={`block text-sm font-medium ${textClass} mb-2`}>Collateral (WETH)</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={collateral}
            onChange={(e) => setCollateral(e.target.value)}
            placeholder="1"
            className={`flex-1 px-4 py-2 rounded-lg border ${inputBgClass} ${textClass} placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
          <button className={`px-4 py-2 border rounded-lg font-medium transition ${
            theme === "dark"
              ? "border-slate-700 text-slate-300 hover:bg-slate-800"
              : "border-slate-300 text-slate-600 hover:bg-slate-100"
          }`}>
            MAX
          </button>
        </div>
        <p className={`text-xs ${secondaryTextClass} mt-1`}>= ${collateralValue.toFixed(2)}</p>
      </div>

      <div>
        <label className={`block text-sm font-medium ${textClass} mb-2`}>Borrow (USDC)</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={borrow}
            onChange={(e) => setBorrow(e.target.value)}
            placeholder="1500"
            className={`flex-1 px-4 py-2 rounded-lg border ${inputBgClass} ${textClass} placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
          <button
            onClick={() => setBorrow(maxBorrow.toFixed(2))}
            className={`px-4 py-2 border rounded-lg font-medium transition ${
              theme === "dark"
                ? "border-slate-700 text-slate-300 hover:bg-slate-800"
                : "border-slate-300 text-slate-600 hover:bg-slate-100"
            }`}
          >
            MAX
          </button>
        </div>
        <p className={`text-xs ${secondaryTextClass} mt-1`}>Max: ${maxBorrow.toFixed(2)}</p>
      </div>

      <div className={`px-4 py-3 rounded-lg border ${inputBgClass} space-y-2`}>
        <div className="flex justify-between items-center">
          <p className={`text-sm ${secondaryTextClass}`}>Health Factor</p>
          <p className={`font-bold ${healthFactor > 1.5 ? "text-green-400" : healthFactor > 1.2 ? "text-yellow-400" : "text-red-400"}`}>
            {healthFactor.toFixed(2)}
          </p>
        </div>
        <div className="flex justify-between items-center">
          <p className={`text-sm ${secondaryTextClass}`}>LTV</p>
          <p className={`font-bold ${borrowNum <= maxBorrow ? "text-green-400" : "text-red-400"}`}>
            {((borrowNum / maxBorrow) * 100).toFixed(1)}%
          </p>
        </div>
        <div className="flex justify-between items-center">
          <p className={`text-sm ${secondaryTextClass}`}>Borrow APY</p>
          <p className="font-bold text-red-400">6.9%</p>
        </div>
      </div>

      <button
        onClick={async () => {
          try {
            const id = notifyPending("Borrowing from pool");
            if (!borrowWrite?.writeAsync) throw new Error("contract not ready");
            const tx = await borrowWrite.writeAsync();
            await tx.wait?.();
            notifySuccess(id, "Borrow confirmed");
          } catch (e: any) {
            notifyError(Date.now(), String(e?.message ?? e));
          }
        }}
        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
      >
        Borrow
      </button>
      <button className={`w-full px-4 py-2 border rounded-lg font-medium transition ${
        theme === "dark"
          ? "border-slate-700 text-slate-300 hover:bg-slate-800"
          : "border-slate-300 text-slate-600 hover:bg-slate-100"
      }`}>
        Approve
      </button>

      <div className="mt-4 border-t pt-4">
        <h4 className={`text-sm font-semibold ${textClass} mb-2`}>Repay Loan</h4>
        <div className="flex gap-2 mb-2">
          <input value={repayLoanId} onChange={(e) => setRepayLoanId(e.target.value)} placeholder="loan id" className="flex-1 px-3 py-2 rounded-lg border" />
          <input value={repayAmount} onChange={(e) => setRepayAmount(e.target.value)} placeholder="amount" className="flex-1 px-3 py-2 rounded-lg border" />
        </div>
        <button
          onClick={async () => {
            try {
              const id = notifyPending("Repaying loan");
              if (!repayWrite?.writeAsync) throw new Error("contract not ready");
              const tx = await repayWrite.writeAsync();
              await tx.wait?.();
              notifySuccess(id, "Repay confirmed");
            } catch (e: any) {
              notifyError(Date.now(), String(e?.message ?? e));
            }
          }}
          className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition"
        >
          Repay
        </button>
      </div>
    </div>
  );
};

export default LendingPool;
