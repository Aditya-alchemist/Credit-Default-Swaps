import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { WagmiConfig } from "wagmi";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";

import { wagmiConfig, chains } from "./config/wagmi";
import { ThemeProvider } from "./context/ThemeContext";
import { TxProvider } from "./context/TxContext";
import { Navbar } from "./components/layout/Navbar";
import { Sidebar } from "./components/layout/Sidebar";
import Dashboard from "./pages/Dashboard";
import CDSMarket from "./pages/CDSMarket";
import LendingPool from "./pages/LendingPool";
import EntityRisk from "./pages/EntityRisk";
import MarginDashboard from "./pages/MarginDashboard";
import Admin from "./pages/Admin";
import Portfolio from "./pages/Portfolio.tsx";
import PositionDetail from "./pages/PositionDetail";
import OracleMonitor from "./pages/OracleMonitor";
import Documentation from "./pages/Documentation";

const queryClient = new QueryClient();

export default function App() {
  return (
    <WagmiConfig config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider chains={chains}>
          <ThemeProvider>
            <TxProvider>
              <Router>
                <div className="flex h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
                  <Sidebar />
                  <div className="flex flex-col flex-1 overflow-hidden">
                    <Navbar />
                    <main className="flex-1 overflow-auto">
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/cds-market" element={<CDSMarket />} />
                        <Route path="/lending" element={<LendingPool />} />
                        <Route path="/entity-risk" element={<EntityRisk />} />
                        <Route path="/margin-dashboard" element={<MarginDashboard />} />
                        <Route path="/oracle-monitor" element={<OracleMonitor />} />
                        <Route path="/positions/:id" element={<PositionDetail />} />
                        <Route path="/portfolio" element={<Portfolio />} />
                        <Route path="/documentation" element={<Documentation />} />
                        <Route path="/admin" element={<Admin />} />
                      </Routes>
                    </main>
                  </div>
                </div>
              </Router>
            </TxProvider>
          </ThemeProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiConfig>
  );
}
