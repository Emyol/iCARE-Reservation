"use client";

import { useState, useEffect } from "react";
import { useAdmin } from "@/components/AdminProvider";
import AdminLoginModal from "@/components/AdminLoginModal";
import AvailabilityChecker from "@/components/AvailabilityChecker";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";

const ROOMS = [
  {
    name: "Audio-Visual Room / Enhancement Area",
    capacity: 40,
    icon: "videocam",
    color: "emerald",
    description:
      "Equipped with a DLP projector, audio system, and presentation setup. Ideal for lectures, seminars, and large group activities.",
    features: [
      "DLP Projector",
      "Audio System",
      "Whiteboard",
      "Extension Cords",
    ],
  },
  {
    name: "Individual Training / Small Group Discussion Room",
    capacity: 10,
    icon: "groups",
    color: "blue",
    description:
      "A dedicated space for focused individual study or small group discussions. Perfect for tutorials, group reviews, and reading sessions.",
    features: [
      "Study Tables",
      "Whiteboards",
      "Quiet Environment",
      "Natural Lighting",
    ],
  },
];

const colorMap = {
  emerald: {
    icon: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20 hover:border-emerald-500/40",
    badge: "bg-emerald-500/20 text-emerald-400",
    pill: "bg-emerald-500/10 text-emerald-400",
  },
  blue: {
    icon: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20 hover:border-blue-500/40",
    badge: "bg-blue-500/20 text-blue-400",
    pill: "bg-blue-500/10 text-blue-400",
  },
};

export default function RoomsPage() {
  const { isAdmin, login, logout } = useAdmin();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [reservations, setReservations] = useState([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/reservations");
        if (!res.ok) return;
        const data = await res.json();
        setReservations(data);
      } catch {}
    }
    fetchData();
  }, []);

  function handleLogin(adminInfo) {
    login(adminInfo);
    setShowLoginModal(false);
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar
        isAdmin={isAdmin}
        onLoginClick={() => setShowLoginModal(true)}
        onLogout={logout}
      />

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-black/10 backdrop-blur-md border-b border-white/10 flex items-center px-4 md:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-slate-400 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">
                arrow_back
              </span>
            </Link>
            <h2 className="text-lg md:text-xl font-bold tracking-tight">
              <span className="text-teal-400">iCARE</span> Rooms
            </h2>
          </div>
        </header>

        <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto w-full">
          <div>
            <h3 className="text-2xl font-bold text-white mb-1">
              Available Rooms
            </h3>
            <p className="text-slate-400 text-sm">
              iCARE currently manages 2 reservable venues. Submit a reservation
              request via the Google Form.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ROOMS.map((room) => {
              const c = colorMap[room.color];
              return (
                <div
                  key={room.name}
                  className={`glass-panel/60 rounded-xl border ${c.border} p-6 flex flex-col gap-4 transition-colors`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`size-12 rounded-lg ${c.bg} flex items-center justify-center shrink-0`}
                    >
                      <span className={`material-symbols-outlined ${c.icon}`}>
                        {room.icon}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white leading-snug">
                        {room.name}
                      </h4>
                      <span
                        className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${c.badge}`}
                      >
                        Capacity: {room.capacity}
                      </span>
                    </div>
                  </div>

                  <p className="text-slate-400 text-sm leading-relaxed">
                    {room.description}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {room.features.map((f) => (
                      <span
                        key={f}
                        className={`text-xs px-2 py-1 rounded-md font-medium ${c.pill}`}
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <AvailabilityChecker reservations={reservations} />

          <div className="glass-panel/60 rounded-xl border border-white/5 p-6 flex items-start gap-4">
            <span className="material-symbols-outlined text-[#0f49bd] shrink-0 mt-0.5">
              info
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-200">
                How to Reserve a Room
              </p>
              <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                Submit a reservation request through the iCARE Google Form.
                Requests are reviewed and a confirmation email will be sent once
                approved. Admins may also book directly from the{" "}
                <Link href="/" className="text-teal-400 hover:underline">
                  Dashboard
                </Link>
                .
              </p>
            </div>
          </div>
        </div>

        <footer className="mt-auto px-8 py-6 border-t border-white/5 text-center">
          <p className="text-slate-500 text-xs">
            © {new Date().getFullYear()} iCARE Room Reservation System — FEU
            Institute of Technology
          </p>
        </footer>
      </main>
      {showLoginModal && (
        <AdminLoginModal
          onClose={() => setShowLoginModal(false)}
          onLogin={handleLogin}
        />
      )}
    </div>
  );
}

