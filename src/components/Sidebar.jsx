"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Sidebar as AnimatedSidebar,
  SidebarBody,
  SidebarLink,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  DoorOpen,
  CalendarDays,
  BarChart3,
  LogOut,
  ShieldCheck,
} from "lucide-react";

export default function Sidebar({ isAdmin, onLoginClick, onLogout }) {
  const [open, setOpen] = useState(false);

  return (
    <AnimatedSidebar open={open} setOpen={setOpen}>
      <SidebarBody className="justify-between gap-10 glass-panel border-0 border-r border-white/5 rounded-none min-h-screen">
        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
          {/* Brand */}
          {open ? <Logo /> : <LogoIcon />}

          {/* Navigation Links */}
          <div className="mt-8 flex flex-col gap-2">
            <SidebarNavLink
              href="/dashboard"
              label="Dashboard"
              icon={<LayoutDashboard className="h-5 w-5 flex-shrink-0" />}
            />
            <SidebarNavLink
              href="/rooms"
              label="Rooms"
              icon={<DoorOpen className="h-5 w-5 flex-shrink-0" />}
            />
            <SidebarNavLink
              href="/schedule"
              label="Schedule"
              icon={<CalendarDays className="h-5 w-5 flex-shrink-0" />}
            />
            <SidebarNavLink
              href="/reports"
              label="Reports"
              icon={<BarChart3 className="h-5 w-5 flex-shrink-0" />}
            />
          </div>
        </div>

        {/* User / Auth Section */}
        <div>
          {isAdmin ? (
            <AdminSection onLogout={onLogout} />
          ) : (
            <LoginButton onLoginClick={onLoginClick} />
          )}
        </div>
      </SidebarBody>
    </AnimatedSidebar>
  );
}

/* ── Sub-components ─────────────────────────────────────────────── */

function SidebarNavLink({ href, label, icon }) {
  const pathname = usePathname();
  const { open, animate } = useSidebar();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`flex items-center group/sidebar py-2.5 rounded-xl transition-all duration-300 relative overflow-hidden ${
        open ? "justify-start gap-2 px-3" : "justify-center px-0"
      } ${
        isActive
          ? "text-white bg-gradient-to-r from-purple-600/40 to-pink-600/10 border border-purple-500/30"
          : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
      }`}
    >
      <span
        className={`flex-shrink-0 ${
          isActive
            ? "text-purple-400"
            : "text-slate-500 group-hover/sidebar:text-purple-300"
        }`}
      >
        {icon}
      </span>
      <motion.span
        animate={{
          display: animate ? (open ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className="text-sm font-medium group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre inline-block !p-0 !m-0"
      >
        {label}
      </motion.span>
    </Link>
  );
}

function AdminSection({ onLogout }) {
  const { open, animate } = useSidebar();

  return (
    <div
      className={`flex items-center py-2 ${open ? "gap-2 px-2" : "justify-center px-0"}`}
    >
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-purple-500/20 flex-shrink-0">
        A
      </div>
      <motion.div
        animate={{
          display: animate ? (open ? "flex" : "none") : "flex",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className="flex items-center gap-2 flex-1 min-w-0"
      >
        <div className="overflow-hidden flex-1">
          <p className="text-sm font-bold text-white truncate">Administrator</p>
          <p className="text-xs text-purple-300">Online</p>
        </div>
        <button
          onClick={onLogout}
          className="text-slate-400 hover:text-pink-400 transition-colors bg-white/5 p-1.5 rounded-lg hover:bg-pink-500/20 flex-shrink-0"
          title="Logout"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </motion.div>
    </div>
  );
}

function LoginButton({ onLoginClick }) {
  const { open, animate } = useSidebar();

  return (
    <button
      onClick={onLoginClick}
      className={`flex items-center py-2.5 rounded-xl text-sm font-medium text-purple-200 hover:bg-purple-500/10 transition-colors w-full ${
        open ? "gap-2 px-2" : "justify-center px-0"
      }`}
    >
      <ShieldCheck className="h-5 w-5 flex-shrink-0 text-purple-400" />
      <motion.span
        animate={{
          display: animate ? (open ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className="whitespace-pre inline-block !p-0 !m-0"
      >
        Admin Login
      </motion.span>
    </button>
  );
}

const Logo = () => {
  return (
    <Link
      href="/dashboard"
      className="font-normal flex space-x-3 items-center text-sm py-1 relative z-20 px-2"
    >
      <div className="bg-purple-500/20 p-2 rounded-xl border border-purple-500/30 flex-shrink-0">
        <span className="material-symbols-outlined text-purple-400 glow-text text-lg">
          school
        </span>
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col"
      >
        <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 text-lg leading-tight tracking-wide">
          iCARE
        </span>
        <span className="text-[10px] text-slate-400 tracking-wider uppercase font-semibold">
          Reservation
        </span>
      </motion.div>
    </Link>
  );
};

const LogoIcon = () => {
  return (
    <Link
      href="/dashboard"
      className="font-normal flex items-center justify-center text-sm py-1 relative z-20 mx-auto"
    >
      <div className="bg-purple-500/20 p-1.5 rounded-lg border border-purple-500/30 flex-shrink-0">
        <span className="material-symbols-outlined text-purple-400 glow-text text-base">
          school
        </span>
      </div>
    </Link>
  );
};
