"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MotionConfig } from "framer-motion";
import { BarChart3, CalendarClock, CalendarDays, History, LogIn, LogOut, TriangleAlert } from "lucide-react";
import { useAdmin } from "@/components/AdminProvider";

const PUBLIC_NAV = [
  { href: "/availability", label: "Availability", icon: CalendarClock },
  { href: "/schedule", label: "Calendar", icon: CalendarDays },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

const STAFF_NAV = [
  { href: "/availability", label: "Availability", icon: CalendarClock },
  { href: "/conflicts", label: "Conflicts", icon: TriangleAlert },
  { href: "/schedule", label: "Calendar", icon: CalendarDays },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/activity", label: "Activity", icon: History },
];

function Wordmark() {
  return (
    <Link href="/availability" className="flex flex-col leading-tight" aria-label="iCARE Room Reservation, Availability">
      <span className="text-[22px] font-bold tracking-tight text-[var(--lg-brand)]">iCARE</span>
      <span className="text-[13px] lg-muted">Room Reservation</span>
    </Link>
  );
}

function NavLink({ item, compact = false }) {
  const pathname = usePathname();
  const active = pathname === item.href;
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={
        compact
          ? `flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-semibold ${
              active ? "text-[var(--lg-action)]" : "lg-muted"
            }`
          : `flex min-h-11 items-center gap-3 rounded-2xl px-3 text-[15px] font-medium ${
              active ? "bg-[var(--lg-sheet-fill)] font-semibold shadow-[inset_0_1px_0_var(--lg-rim-strong)]" : "hover:bg-[var(--lg-chrome-fill)]"
            }`
      }
    >
      <Icon aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.75} />
      <span>{item.label}</span>
    </Link>
  );
}

function TopLink({ item }) {
  const pathname = usePathname();
  const active = pathname === item.href;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`lg-btn lg-btn-quiet min-h-10 text-[14px] ${active ? "bg-[var(--lg-sheet-fill)]" : ""}`}
    >
      {item.label}
    </Link>
  );
}

/**
 * Liquid Glass page frame. Staff get the sidebar from the staff comp; the
 * public get the floating top bar from the public comp. Phones get a bottom
 * tab bar either way.
 */
export default function GlassShell({ title, onSignIn, children }) {
  const { isAdmin, adminInfo, logout } = useAdmin();
  const nav = isAdmin ? STAFF_NAV : PUBLIC_NAV;

  // With reduced motion on, Motion drops movement and keeps the fades.
  return (
    <MotionConfig reducedMotion="user">
      <div className="lg">
        <div className={isAdmin ? "md:grid md:grid-cols-[236px_minmax(0,1fr)] md:gap-4 md:p-4" : "md:p-4"}>
          {isAdmin && (
            <aside className="lg-chrome sticky top-4 hidden h-[calc(100vh-2rem)] flex-col gap-8 p-5 md:flex">
              <Wordmark />
              <nav aria-label="Main" className="flex flex-col gap-1">
                {nav.map((item) => (
                  <NavLink key={item.href} item={item} />
                ))}
              </nav>
              <div className="mt-auto flex items-center justify-between gap-2 border-t border-[var(--lg-line)] pt-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{adminInfo?.name || "iCARE staff"}</p>
                  <p className="text-xs lg-muted">Signed in</p>
                </div>
                <button type="button" onClick={logout} className="lg-btn lg-btn-quiet lg-btn-icon" aria-label="Log out">
                  <LogOut aria-hidden="true" className="size-5" strokeWidth={1.75} />
                </button>
              </div>
            </aside>
          )}

          <div className="flex min-w-0 flex-col gap-4 px-4 pb-24 pt-4 md:px-0 md:pb-4 md:pt-0">
            {!isAdmin && (
              <header className="lg-chrome sticky top-4 z-30 flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3">
                <Wordmark />
                <span aria-hidden="true" className="hidden h-8 w-px bg-[var(--lg-line)] md:block" />
                <p className="hidden text-[19px] font-semibold md:block">{title}</p>
                <nav aria-label="Main" className="ml-auto hidden items-center gap-1 md:flex">
                  {nav.map((item) => (
                    <TopLink key={item.href} item={item} />
                  ))}
                </nav>
                {onSignIn && (
                  <button type="button" onClick={onSignIn} className="lg-btn lg-btn-secondary ml-auto min-h-10 text-[14px] md:ml-0">
                    <LogIn aria-hidden="true" className="size-4" strokeWidth={2} />
                    Staff sign in
                  </button>
                )}
              </header>
            )}

            <main className="flex min-w-0 flex-col gap-4">{children}</main>
          </div>
        </div>

        <nav
          aria-label="Main"
          className="lg-chrome fixed inset-x-3 bottom-3 z-40 flex items-stretch gap-1 p-1.5 md:hidden"
          style={{ paddingBottom: "calc(0.375rem + env(safe-area-inset-bottom, 0px))" }}
        >
          {nav.slice(0, 4).map((item) => (
            <NavLink key={item.href} item={item} compact />
          ))}
        </nav>
      </div>
    </MotionConfig>
  );
}
