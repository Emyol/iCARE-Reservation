"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

function SplashScreen({ onComplete }) {
  const line1 = "Always for the students,";
  const line2 = "iCARE for you.";
  const speed = 55;
  const pauseAfterComma = 1000;
  const pauseBeforeReveal = 1000;

  const [display, setDisplay] = useState("");
  const [phase, setPhase] = useState("typing1"); // typing1 | pause | typing2 | done

  useEffect(() => {
    if (phase === "typing1") {
      if (display.length < line1.length) {
        const t = setTimeout(
          () => setDisplay(line1.slice(0, display.length + 1)),
          speed,
        );
        return () => clearTimeout(t);
      } else {
        const t = setTimeout(() => setPhase("pause"), 0);
        return () => clearTimeout(t);
      }
    }
    if (phase === "pause") {
      const t = setTimeout(() => setPhase("typing2"), pauseAfterComma);
      return () => clearTimeout(t);
    }
    if (phase === "typing2") {
      const typed = display.length - line1.length - 1; // -1 for the space
      if (typed < 0) {
        // add the space + start line2
        const t = setTimeout(() => setDisplay(display + " "), speed);
        return () => clearTimeout(t);
      } else if (typed < line2.length) {
        const t = setTimeout(() => setDisplay(display + line2[typed]), speed);
        return () => clearTimeout(t);
      } else {
        const t = setTimeout(() => setPhase("done"), pauseBeforeReveal);
        return () => clearTimeout(t);
      }
    }
    if (phase === "done") {
      onComplete();
    }
  }, [display, phase, onComplete]);

  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6">
      <span className="text-2xl md:text-4xl font-bold text-white tracking-wide text-center">
        {display}
        <span className="animate-pulse text-white/60">|</span>
      </span>
    </div>
  );
}

export default function LandingPage() {
  const [showSplash, setShowSplash] = useState(true);
  const handleComplete = useCallback(() => setShowSplash(false), []);

  return (
    <>
      <AnimatePresence>
        {showSplash && (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-[200] bg-black flex items-center justify-center"
          >
            <SplashScreen onComplete={handleComplete} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="min-h-screen flex flex-col items-center justify-center text-white px-4 relative overflow-hidden">
        <div className="cosmic-bg" />
        <div className="relative z-10 text-center space-y-8 max-w-4xl w-full flex flex-col items-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex items-center justify-center gap-3 mb-4"
          >
            <div
              className="glass-panel p-4 rounded-2xl flex items-center justify-center"
              style={{ animation: "float 6s ease-in-out infinite" }}
            >
              <span className="material-symbols-outlined text-purple-400 text-5xl glow-text">
                school
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight leading-tight mb-4">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 glow-text">
                iCARE
              </span>{" "}
              Room Reservation
            </h1>
            <p className="text-slate-300 text-xl mt-4 leading-relaxed max-w-2xl mx-auto">
              Real-time room scheduling for iTamaraw Center for Academic
              Resources and Enrichment.
              <br />
              View, manage, and track AVR and Training Room bookings with ease.
            </p>
          </motion.div>

          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4 w-full relative z-20"
          >
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-8 py-4 auro-button text-white font-bold rounded-2xl text-lg w-full sm:w-auto justify-center relative z-20"
            >
              <span className="material-symbols-outlined">dashboard</span>
              Enter Dashboard
            </Link>
            <Link
              href="/schedule"
              className="flex items-center gap-2 px-8 py-4 glass-panel glass-panel-interactive text-slate-200 font-bold rounded-2xl text-lg w-full sm:w-auto justify-center relative z-20"
            >
              <span className="material-symbols-outlined">calendar_today</span>
              View Schedule
            </Link>
          </motion.div>

          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 w-full text-left relative z-20"
          >
            {[
              {
                icon: "videocam",
                label: "2 Rooms Available",
                desc: "AVR & Training Room ready for booking",
                href: "/rooms",
                color: "text-purple-400",
              },
              {
                icon: "calendar_today",
                label: "Dynamic Schedule",
                desc: "Browse reservations & availability",
                href: "/schedule",
                color: "text-pink-400",
              },
              {
                icon: "bar_chart",
                label: "Analytics",
                desc: "Booking stats and monthly trends",
                href: "/reports",
                color: "text-blue-400",
              },
            ].map((f, i) => (
              <motion.div
                key={f.label}
                whileHover={{ y: -5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Link
                  href={f.href}
                  className="glass-panel glass-panel-interactive p-6 flex flex-col gap-3 h-full cursor-pointer"
                >
                  <div className="bg-white/5 w-12 h-12 rounded-full flex items-center justify-center border border-white/10 mb-2">
                    <span
                      className={`material-symbols-outlined text-3xl ${f.color}`}
                    >
                      {f.icon}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white">{f.label}</h3>
                  <p className="text-sm text-slate-400">{f.desc}</p>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <footer className="absolute bottom-0 w-full text-center pb-6 z-10">
          <p className="text-slate-500 text-sm font-medium">
            © {new Date().getFullYear()} iCARE Room Reservation System
          </p>
        </footer>
      </div>
    </>
  );
}
