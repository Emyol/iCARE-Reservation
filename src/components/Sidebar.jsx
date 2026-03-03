"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar({ isAdmin, onLoginClick, onLogout }) {
  const pathname = usePathname();

  const navItems = [
    { icon: "home", label: "Home", href: "/dashboard" },
    { icon: "meeting_room", label: "Rooms", href: "/rooms" },
    { icon: "calendar_today", label: "Schedule", href: "/schedule" },
    { icon: "bar_chart", label: "Reports", href: "/reports" },
  ];

  return (
    <aside className="w-64 flex-shrink-0 bg-black/20 backdrop-blur-xl border-r border-white/10 flex flex-col min-h-screen hidden lg:flex">
      {/* Brand */}
      <div className="p-6 flex items-center gap-3">
        <div className="bg-primary/20 p-2 rounded-lg">
          <span className="material-symbols-outlined text-[#0f49bd]">
            school
          </span>
        </div>
        <div>
          <h1 className="text-sm font-bold leading-tight">
            <span className="text-teal-400">iCARE</span> Room Reservation
          </h1>
          <p className="text-xs text-slate-400">Campus Management</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
              pathname === item.href
                ? "bg-gradient-to-r from-indigo-600 to-teal-600 text-white shadow-lg shadow-teal-500/20"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">
              {item.icon}
            </span>
            <span className="text-sm font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* User / Auth Section */}
      <div className="p-4 border-t border-white/10">
        {isAdmin ? (
          <div className="flex items-center gap-3 p-2">
            <div className="size-10 rounded-full bg-gradient-to-br from-indigo-500 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
              A
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-semibold truncate">Administrator</p>
              <p className="text-[10px] text-slate-400">Admin Session</p>
            </div>
            <button
              onClick={onLogout}
              className="text-slate-400 hover:text-red-400 transition-colors"
              title="Logout"
            >
              <span className="material-symbols-outlined text-[20px]">
                logout
              </span>
            </button>
          </div>
        ) : (
          <button
            onClick={onLoginClick}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-200"
          >
            <span className="material-symbols-outlined text-[20px]">
              admin_panel_settings
            </span>
            Admin Login
          </button>
        )}
      </div>
    </aside>
  );
}
