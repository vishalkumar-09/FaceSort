"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Image as ImageIcon,
  Users,
  Wand2,
  ScanFace,
  Settings,
  ArrowRight,
  FolderHeart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { statsApi } from "@/lib/api";

export function Sidebar() {
  const pathname = usePathname();
  const [unknownCount, setUnknownCount] = useState<number | null>(null);

  useEffect(() => {
    statsApi.get()
      .then((s) => setUnknownCount(s.unknown_faces))
      .catch(() => setUnknownCount(null));
  }, [pathname]);

  const navItems = [
    { href: "/", label: "Overview", icon: Home },
    { href: "/photos", label: "All Photos", icon: ImageIcon },
    { href: "/people", label: "People", icon: Users },
    { href: "/organize", label: "Organize Photos", icon: Wand2 },
    {
      href: "/unknown",
      label: "Unknown Faces",
      icon: ScanFace,
      badge: unknownCount && unknownCount > 0 ? String(unknownCount) : undefined,
    },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside
      style={{ width: "260px", minWidth: "260px" }}
      className="shrink-0 sticky top-0 h-screen flex flex-col z-40 select-none bg-[#090b16] text-slate-300 border-r border-[#141728]"
    >
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 pt-7 pb-6">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-600/30">
          <ScanFace size={20} className="text-white" strokeWidth={2.2} />
        </div>
        <span className="font-bold text-lg text-white tracking-tight">
          FaceSort
        </span>
      </div>

      {/* Main Navigation */}
      <nav className="px-3.5 space-y-1.5">
        {navItems.map(({ href, label, icon: Icon, badge }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group relative flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-all",
                active
                  ? "bg-[#5850ec] text-white shadow-md shadow-indigo-600/30 font-semibold"
                  : "text-slate-400 hover:text-white hover:bg-white/[0.04] font-medium"
              )}
              aria-current={active ? "page" : undefined}
            >
              <div className="flex items-center gap-3">
                <Icon
                  size={18}
                  strokeWidth={active ? 2.2 : 1.8}
                  className={cn(
                    "transition-colors",
                    active ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                  )}
                />
                <span>{label}</span>
              </div>

              {badge && (
                <span
                  className={cn(
                    "px-2 py-0.5 text-[11px] font-bold rounded-full transition-colors",
                    active
                      ? "bg-white/25 text-white"
                      : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                  )}
                >
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom Promo Card */}
      <div className="px-3.5 mb-3">
        <div className="relative rounded-2xl p-4 bg-gradient-to-b from-[#13162b] to-[#0d0f20] border border-[#1e233f] overflow-hidden text-center shadow-xl">
          {/* Subtle violet background glow */}
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-24 h-24 bg-indigo-500/25 blur-xl rounded-full pointer-events-none" />

          {/* 3D Folder Graphic */}
          <div className="relative mx-auto mb-2.5 w-12 h-12 flex items-center justify-center">
            <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700 flex items-center justify-center shadow-lg border border-indigo-400/30">
              <FolderHeart size={22} className="text-white drop-shadow" />
            </div>
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-pink-500 rounded-full border-2 border-[#13162b]" />
          </div>

          <h4 className="text-white text-xs font-semibold tracking-tight mb-1">
            Your memories, organized
          </h4>
          <p className="text-[11px] leading-relaxed text-slate-400 mb-3 px-1">
            Let FaceSort find the people in your photos and keep everything neatly sorted.
          </p>

          <Link
            href="/organize"
            className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl text-xs font-semibold text-white bg-[#5850ec] hover:bg-[#4f46e5] transition-colors shadow-sm shadow-indigo-600/30"
          >
            <span>Organize Photos</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </aside>
  );
}
