"use client";

import type { ReactNode } from "react";
import AdminLoginForm from "@/components/admin-login-form";
import type { useAdminAuth } from "@/lib/useAdminAuth";

// The three lines every admin page opened with:
//
//   if (checking) return null;
//   if (!loggedIn) return <AdminLoginForm onSuccess={recheck} />;
//
// Takes the whole auth object rather than owning the hook itself, because
// pages still read `loggedIn` to gate their data fetching — moving the hook
// in here would mean restructuring each page into an outer gate and an inner
// content component, which is a bigger change than this is worth.
export default function AdminGate({
  auth,
  children,
}: {
  auth: ReturnType<typeof useAdminAuth>;
  children: ReactNode;
}) {
  // `checking` renders nothing rather than a spinner on purpose: the session
  // check resolves in a few ms against a cookie, and a flash of loading state
  // reads worse than a beat of blank.
  if (auth.checking) return null;
  if (!auth.loggedIn) return <AdminLoginForm onSuccess={auth.recheck} />;
  return <>{children}</>;
}
