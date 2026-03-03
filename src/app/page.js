"use client";

import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white px-4 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0f49bd]/10 via-transparent to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-teal-500/5 via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10 text-center space-y-6 max-w-2xl w-full">
        {/* Brand mark */}
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="bg-[#0f49bd]/20 p-3 rounded-xl border border-[#0f49bd]/20">
            <span className="material-symbols-outlined text-[#0f49bd] text-3xl">
              school
            </span>
          </div>
        </div>

        <div>
          <h1 className="text-5xl font-extrabold tracking-tight leading-tight">
            <span className="text-teal-400">iCARE</span> Room Reservation
          </h1>
          <p className="text-slate-400 text-lg mt-3 leading-relaxed">
            Real-time room scheduling for FEU Institute of Technology.
            <br />
            View, manage, and track AVR and Training Room bookings.
          </p>
        </div>

        {/* CTA buttons */}
        <div className="flex items-center justify-center gap-4 flex-wrap pt-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-7 py-3 bg-gradient-to-r from-indigo-600 to-teal-600 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 transition-all duration-200"
          >
            <span className="material-symbols-outlined text-[20px]">
              dashboard
            </span>
            Go to Dashboard
          </Link>
          <Link
            href="/schedule"
            className="flex items-center gap-2 px-7 py-3 bg-white/5 border border-white/10 text-slate-300 font-semibold rounded-xl hover:bg-white/10 transition-all duration-200"
          >
            <span className="material-symbols-outlined text-[20px]">
              calendar_today
            </span>
            View Schedule
          </Link>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-left">
          {[
            {
              icon: "videocam",
              label: "2 Rooms Available",
              desc: "AVR + Individual Training Room",
              href: "/rooms",
              color: "text-emerald-400",
            },
            {
              icon: "calendar_today",
              label: "Daily Schedule",
              desc: "Browse reservations by date",
              href: "/schedule",
              color: "text-blue-400",
            },
            {
              icon: "bar_chart",
              label: "Reports",
              desc: "Booking stats and monthly trends",
              href: "/reports",
              color: "text-amber-400",
            },
          ].map((f) => (
            <Link
              key={f.label}
              href={f.href}
              className="bg-slate-900/60 border border-white/5 hover:border-white/15 rounded-xl p-5 flex flex-col gap-2 transition-all duration-200 group"
            >
              <span
                className={`material-symbols-outlined text-[24px] ${f.color}`}
              >
                {f.icon}
              </span>
              <p className="text-sm font-semibold text-white group-hover:text-slate-100">
                {f.label}
              </p>
              <p className="text-xs text-slate-500">{f.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      <footer className="absolute bottom-0 left-0 right-0 text-center pb-6">
        <p className="text-slate-600 text-xs">
          © {new Date().getFullYear()} iCARE Room Reservation System — FEU
          Institute of Technology
        </p>
      </footer>
    </div>
  );
}
