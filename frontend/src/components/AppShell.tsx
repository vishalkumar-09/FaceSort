"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // On shared guest views (/share and /share/view), hide the desktop management sidebar & topbar
  const isGuestShareView = pathname?.startsWith("/share");

  if (isGuestShareView) {
    return <main className="min-h-screen w-full bg-slate-50 dark:bg-[#0c0e18]">{children}</main>;
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <TopBar />
        <main style={{ flex: 1 }}>{children}</main>
      </div>
    </div>
  );
}
