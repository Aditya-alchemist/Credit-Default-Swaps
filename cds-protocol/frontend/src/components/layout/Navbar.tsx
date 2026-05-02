import React from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useTheme } from "../../context/ThemeContext";

export const Navbar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  const bgClass = theme === "dark" 
    ? "bg-slate-950 border-slate-800" 
    : "bg-white border-slate-200";
  
  const textClass = theme === "dark" 
    ? "text-white" 
    : "text-slate-900";

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 border-b ${bgClass} h-16`}>
      <div className="h-full flex items-center justify-between px-4 lg:px-8">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold">🛡️</span>
          <h1 className={`text-2xl font-bold ${textClass}`}>CDS Protocol</h1>
        </div>

        {/* Middle - Search (optional) */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <input
            type="text"
            placeholder="Search..."
            className={`w-full px-4 py-2 rounded-lg border transition ${
              theme === "dark"
                ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                : "bg-slate-100 border-slate-200 text-slate-900 placeholder:text-slate-400"
            }`}
          />
        </div>

        {/* Right Side - Actions */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <button className={`p-2 rounded-lg transition ${
            theme === "dark"
              ? "hover:bg-slate-800"
              : "hover:bg-slate-100"
          }`}>
            <span className="text-xl">🔔</span>
          </button>

          {/* Settings */}
          <button className={`p-2 rounded-lg transition ${
            theme === "dark"
              ? "hover:bg-slate-800"
              : "hover:bg-slate-100"
          }`}>
            <span className="text-xl">⚙️</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition ${
              theme === "dark"
                ? "bg-slate-800 hover:bg-slate-700"
                : "bg-slate-200 hover:bg-slate-300"
            }`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>

          {/* User Profile */}
          <div className={`hidden sm:flex items-center gap-3 px-3 py-2 rounded-lg ${
            theme === "dark"
              ? "bg-slate-800"
              : "bg-slate-100"
          }`}>
            <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold">
              AR
            </div>
            <div className="hidden md:block text-left">
              <p className={`text-sm font-semibold ${textClass}`}>Austin Robertson</p>
              <p className={`text-xs ${theme === "dark" ? "text-slate-500" : "text-slate-500"}`}>
                Admin
              </p>
            </div>
          </div>

          {/* Wallet Button */}
          <div className="hidden sm:block">
            <ConnectButton />
          </div>

          {/* Language */}
          <button className={`p-2 rounded-lg transition ${
            theme === "dark"
              ? "hover:bg-slate-800"
              : "hover:bg-slate-100"
          }`}>
            <span className="text-xl">🇬🇧</span>
          </button>
        </div>
      </div>
    </nav>
  );
};
