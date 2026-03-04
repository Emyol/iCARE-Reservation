"use client";

import { createContext, useContext, useState, useEffect } from "react";

const AdminContext = createContext({
  isAdmin: false,
  adminInfo: null,
  login: () => {},
  logout: () => {},
});

export const useAdmin = () => useContext(AdminContext);

/**
 * AdminProvider wraps the entire app in layout.js.
 * Admin state persists across page navigation because this component
 * stays mounted (it lives in the root layout, not individual pages).
 * Now also stores admin identity (username, name, email).
 */
export function AdminProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminInfo, setAdminInfo] = useState(null);

  // On initial load, check the server-side cookie to restore session.
  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d) => {
        setIsAdmin(d.isAdmin ?? false);
        if (d.isAdmin && d.adminInfo) {
          setAdminInfo(d.adminInfo);
        }
      })
      .catch(() => {});
  }, []);

  function login(info) {
    setIsAdmin(true);
    setAdminInfo(info || null);
  }

  async function logout() {
    setIsAdmin(false);
    setAdminInfo(null);
    await fetch("/api/auth", { method: "DELETE" }).catch(() => {});
  }

  return (
    <AdminContext.Provider value={{ isAdmin, adminInfo, login, logout }}>
      {children}
    </AdminContext.Provider>
  );
}
