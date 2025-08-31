"use client";
import { usePathname } from "next/navigation";
import Navbar from "./navbar";

export default function ClientNavbarWrapper() {
  const pathname = usePathname();
  const isLanding = pathname === "/";
  return <Navbar fixed={isLanding} />;
}