import React from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useTheme } from "../../context/ThemeContext";
import { IconImage } from "../IconImage";
import { Link } from "react-router-dom";
import { BookOpen, ExternalLink } from "lucide-react";
import { useState } from "react";

export const Navbar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [showMenu, setShowMenu] = useState(false);

  const bgClass = theme === "dark" 
    ? "bg-slate-950 border-slate-800" 
    : "bg-white border-slate-200";
  
  const textClass = theme === "dark" 
    ? "text-white" 
    : "text-slate-900";

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 border-b ${bgClass} h-16`}>
      <div className="h-full flex items-center justify-between px-4 lg:px-8">
        {/* Logo & Links */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <IconImage name="shield" className="h-8 w-8" alt="" />
            <h1 className={`text-2xl font-bold ${textClass}`}>CDS Protocol</h1>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              to="/documentation"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
                theme === "dark"
                  ? "hover:bg-slate-800"
                  : "hover:bg-slate-100"
              }`}
              title="View protocol documentation"
            >
              <BookOpen size={18} />
              <span className="text-sm font-medium">Docs</span>
            </Link>

            {/* GitHub Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
                  theme === "dark"
                    ? "hover:bg-slate-800"
                    : "hover:bg-slate-100"
                }`}
                title="GitHub links"
              >
                <ExternalLink size={18} />
                <span className="text-sm font-medium">GitHub</span>
              </button>

              {/* Dropdown Menu */}
              {showMenu && (
                <div className={`absolute top-full right-0 mt-2 w-48 rounded-lg border ${
                  theme === "dark"
                    ? "bg-slate-900 border-slate-700"
                    : "bg-white border-slate-200"
                } shadow-lg py-2 z-50`}>
                  <a
                    href="https://github.com/Aditya-alchemist/Credit-Default-Swaps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 px-4 py-2 transition ${
                      theme === "dark"
                        ? "hover:bg-slate-800"
                        : "hover:bg-slate-100"
                    }`}
                  >
                    <ExternalLink size={16} />
                    <span className="text-sm">Repository</span>
                    <ExternalLink size={14} />
                  </a>
                  <a
                    href="https://github.com/Aditya-alchemist/Credit-Default-Swaps/blob/main/README.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 px-4 py-2 transition ${
                      theme === "dark"
                        ? "hover:bg-slate-800"
                        : "hover:bg-slate-100"
                    }`}
                  >
                    <BookOpen size={16} />
                    <span className="text-sm">Full README</span>
                    <ExternalLink size={14} />
                  </a>
                  <a
                    href="https://github.com/Aditya-alchemist/Credit-Default-Swaps/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 px-4 py-2 transition ${
                      theme === "dark"
                        ? "hover:bg-slate-800"
                        : "hover:bg-slate-100"
                    }`}
                  >
                    <span className="text-sm">Issues</span>
                    <ExternalLink size={14} />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="hidden md:block flex-1" />

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
