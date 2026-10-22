"use client";

import { useState } from "react";
import { Search, Moon, Sun, Bell } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { SmartSearchModal } from "./SmartSearchModal";

export function TopBar() {
  const { theme, toggle } = useTheme();
  const [showSearchModal, setShowSearchModal] = useState(false);

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          {/* Search Trigger Button */}
          <button
            type="button"
            onClick={() => setShowSearchModal(true)}
            className="topbar-search text-left cursor-pointer hover:border-indigo-500/40 transition-colors"
            title="Open Smart Search (⌘ K)"
          >
            <div className="topbar-search-icon">
              <Search size={14} strokeWidth={2.3} />
            </div>
            <span className="topbar-search-input text-slate-400 select-none">
              Smart Search people, photos, presets…
            </span>
            <div className="topbar-kbd">
              <kbd className="kbd">⌘ K</kbd>
            </div>
          </button>

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
          </div>
        </div>
      </header>

      {/* Smart Search Spotlight Modal */}
      <SmartSearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
      />
    </>
  );
}

