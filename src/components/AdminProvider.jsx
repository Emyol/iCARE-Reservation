"use client";

import { createContext, useContext, useState, useEffect } from "react";

const AdminContext = createContext({
  isAdmin: false,
  login: () => {},
  logout: () => {},
});

export const useAdmin = () => useContext(AdminContext);

/**
 * AdminProvider wraps the entire app in layout.js.
 * Admin state persists across page navigation because this component
 * stays mounted (it lives in the root layout, not individual pages).
 */
export function AdminProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(false);

  // On initial load, check the server-side cookie to restore session.
  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d) => setIsAdmin(d.isAdmin ?? false))
      .catch(() => {});
  }, []);

  function login() {
    setIsAdmin(true);
  }

  async function logout() {
    setIsAdmin(false);
    // Clear the httpOnly cookie via server endpoint (client-side JS cannot touch httpOnly cookies).
    await fetch("/api/auth", { method: "DELETE" }).catch(() => {});
  }

  return (
    <AdminContext.Provider value={{ isAdmin, login, logout }}>
      {children}
    </AdminContext.Provider>
  );
}
