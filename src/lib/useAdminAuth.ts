"use client";

import { useCallback, useEffect, useState } from "react";

// Shared auth-gate hook for admin sub-pages (/admin/merch, /admin/orders, ...).
// The admin session cookie is set by /api/admin/login and applies site-wide,
// so any page can just ping /api/admin/me to know whether it's authenticated.
export function useAdminAuth() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [checking, setChecking] = useState(true);

  const check = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/me");
      setLoggedIn(res.ok);
    } catch {
      setLoggedIn(false);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    // Initial auth check on mount — setState happens after the async fetch
    // resolves, not synchronously in the effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    check();
  }, [check]);

  const logout = useCallback(async () => {
    await fetch("/api/admin/login", { method: "DELETE" });
    setLoggedIn(false);
  }, []);

  return { loggedIn, checking, recheck: check, logout };
}
