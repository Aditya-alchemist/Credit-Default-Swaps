import React from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useTheme } from "../../context/ThemeContext";
import { IconImage } from "../IconImage";

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
          <IconImage name="shield" className="h-8 w-8" alt="" />
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
          {/* Notifications intentionally hidden for now */}

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
            <span className={`block h-5 w-5 rounded-full ${
              theme === "dark"
                ? "bg-amber-300 shadow-[0_0_0_4px_rgba(252,211,77,0.18)]"
                : "bg-slate-700 shadow-[inset_6px_-3px_0_0_rgba(255,255,255,0.85)]"
            }`} />
          </button>

          {/* Wallet Button */}
          <div className="hidden sm:block">
            <ConnectButton />
          </div>

          {/* Language selector removed to declutter header */}
        </div>
      </div>
    </nav>
  );
};
