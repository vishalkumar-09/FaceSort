"use client";

import { useState } from "react";
import { Search, Moon, Sun, Bell } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export function TopBar() {
  const { theme, toggle } = useTheme();
  const [query, setQuery] = useState("");

  return (
    <header className="topbar">
      <div className="topbar-inner">
        {/* Search */}
        <div className="topbar-search">
          <div className="topbar-search-icon">
            <Search size={14} strokeWidth={2.3} />
          </div>
          <input
            id="topbar-search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people, photos…"
            className="topbar-search-input"
            autoComplete="off"
          />
          <div className="topbar-kbd">
            <kbd className="kbd">⌘ K</kbd>
          </div>
        </div>

        {/* Right Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {/* Notification bell */}
          <button className="icon-btn" aria-label="Notifications" title="Notifications">
            <Bell size={16} strokeWidth={1.9} />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggle}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="icon-btn"
            title="Toggle theme"
          >
            {theme === "dark" ? <Sun size={16} strokeWidth={1.9} /> : <Moon size={16} strokeWidth={1.9} />}
          </button>

          {/* Divider */}
          <div className="divider-v" style={{ height: "20px", margin: "0 4px" }} />

          {/* User Avatar */}
          <div className="topbar-avatar">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80"
              alt="Aditya Verma"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
