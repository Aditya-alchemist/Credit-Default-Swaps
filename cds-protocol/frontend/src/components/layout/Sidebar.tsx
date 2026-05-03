import React from "react";
import { useTheme } from "../../context/ThemeContext";
import { useLocation, Link } from "react-router-dom";
import { IconImage } from "../IconImage";

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentProps<typeof IconImage>["name"];
  badge?: number;
}

const MAIN_PAGES: NavItem[] = [
  { label: "Dashboard", path: "/", icon: "dashboard" },
  { label: "CDS Market", path: "/cds-market", icon: "shield" },
  { label: "Lending Pool", path: "/lending", icon: "card" },
  { label: "Entity Risk", path: "/entity-risk", icon: "chart" },
  { label: "Oracle Monitor", path: "/oracle-monitor", icon: "oracle" },
  { label: "Margin Dashboard", path: "/margin-dashboard", icon: "alert" },
  { label: "Portfolio", path: "/portfolio", icon: "dashboard" },
  { label: "Admin Panel", path: "/admin", icon: "admin" },
];

const SUPPORT: NavItem[] = [
  { label: "Documentation", path: "#", icon: "docs" },
  { label: "Support", path: "#", icon: "support" },
];

export const Sidebar: React.FC = () => {
  const { theme } = useTheme();
  const location = useLocation();

  const bgClass = theme === "dark" 
    ? "bg-slate-900 border-slate-700" 
    : "bg-slate-100 border-slate-200";
  
  const textClass = theme === "dark" 
    ? "text-slate-300 hover:text-white" 
    : "text-slate-600 hover:text-slate-900";

  const activeClass = (path: string) => {
    const isActive = location.pathname === path;
    if (theme === "dark") {
      return isActive ? "bg-orange-500 text-white" : "";
    } else {
      return isActive ? "bg-orange-500 text-white" : "";
    }
  };

  const NavItemComponent: React.FC<{ item: NavItem }> = ({ item }) => (
    <Link
      to={item.path}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${textClass} ${activeClass(item.path)}`}
    >
      <IconImage name={item.icon} className="h-6 w-6 shrink-0" alt="" />
      <span className="text-sm font-medium">{item.label}</span>
      {item.badge && (
        <span className="ml-auto bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
          {item.badge}
        </span>
      )}
      <span className="text-xl ml-auto opacity-50">&gt;</span>
    </Link>
  );

  return (
    <div className={`w-64 h-screen border-r ${bgClass} overflow-y-auto fixed left-0 top-0 pt-20 pb-6 px-4 space-y-6 hidden lg:block`}>
      {/* Pages Section */}
      <div>
        <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`}>
          PAGES
        </p>
        <div className="space-y-2">
          {MAIN_PAGES.map((item) => (
            <NavItemComponent key={`${item.path}-${item.label}`} item={item} />
          ))}
        </div>
      </div>

      {/* Documentation & Support */}
      <div>
        <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`}>
          DOCUMENTATION & SUPPORT
        </p>
        <div className="space-y-2">
          {SUPPORT.map((item) => (
            <NavItemComponent key={`${item.path}-${item.label}`} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
};
