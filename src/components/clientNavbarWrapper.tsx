"use client";
import { usePathname } from "@/i18n/routing";
import Navbar from "./navbar";

export default function ClientNavbarWrapper({ initialShopVisible }: { initialShopVisible: boolean }) {
  const pathname = usePathname();
  const isLanding = pathname === "/";
  return <Navbar fixed={isLanding} initialShopVisible={initialShopVisible} />;
}