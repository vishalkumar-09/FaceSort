"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Moon, Sun, Sliders, Shield, HardDrive, ChevronRight } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function SettingsPage() {
  const { theme, toggle } = useTheme();
  const [threshold, setThreshold] = useState(0.5);
  const [saving, setSaving] = useState(false);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // We read threshold from the backend stats as a proxy; actual persistence is env-based
  // In this simplified version, threshold is shown as read-only info + local UI hint.

  return (
    <div className="px-8 py-8 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6" style={{ color: "var(--text-primary)" }}>
        Settings
      </h1>

      {/* Appearance */}
      <section className="card p-5 mb-4">
        <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-secondary)" }}>
          Appearance
        </h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {theme === "dark" ? (
              <Moon size={18} style={{ color: "var(--accent)" }} />
            ) : (
              <Sun size={18} style={{ color: "var(--accent)" }} />
            )}
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                Theme
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                Currently {theme} mode
              </p>
            </div>
          </div>
          <button
            onClick={toggle}
            className="relative w-11 h-6 rounded-full transition-colors duration-200"
            style={{ backgroundColor: theme === "dark" ? "var(--accent)" : "var(--bg-tertiary)" }}
          >
            <motion.span
              className="absolute top-0.5 w-5 h-5 rounded-full bg-white"
              animate={{ left: theme === "dark" ? "calc(100% - 1.375rem)" : "0.125rem" }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </button>
        </div>
      </section>

      {/* Face Recognition */}
      <section className="card p-5 mb-4">
        <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-secondary)" }}>
          Face Recognition
        </h2>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <Sliders size={16} style={{ color: "var(--accent)" }} />
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  Matching threshold
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                  Lower = stricter matching · Higher = more lenient
                </p>
              </div>
            </div>
            <span
              className="badge badge-accent font-mono"
              style={{ minWidth: "3rem", justifyContent: "center" }}
            >
              {threshold.toFixed(2)}
            </span>
          </div>

          <input
            type="range"
            min={0.3}
            max={0.7}
            step={0.05}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full"
            style={{ accentColor: "var(--accent)" }}
          />

          <div className="flex justify-between text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
            <span>Stricter (0.30)</span>
            <span>Lenient (0.70)</span>
          </div>
        </div>

        <p
          className="text-xs px-3 py-2 rounded-xl"
          style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-tertiary)" }}
        >
          ℹ️ To permanently change the threshold, set <code>MATCH_THRESHOLD</code> in{" "}
          <code>backend/.env</code> and restart the server.
        </p>
      </section>

      {/* Storage */}
      <section className="card p-5 mb-4">
        <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-secondary)" }}>
          Storage
        </h2>
        <div className="space-y-3">
          {[
            { label: "Uploaded photos", path: "backend/storage/uploads/" },
            { label: "Face crops", path: "backend/storage/faces/" },
            { label: "Organized output", path: "backend/storage/organized/" },
            { label: "Database", path: "backend/storage/db.json" },
          ].map(({ label, path }) => (
            <div key={label} className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <HardDrive size={15} style={{ color: "var(--text-tertiary)" }} />
                <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                  {label}
                </span>
              </div>
              <code
                className="text-xs px-2 py-1 rounded-lg"
                style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-secondary)" }}
              >
                {path}
              </code>
            </div>
          ))}
        </div>
      </section>

      {/* Privacy */}
      <section className="card p-5">
        <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>
          Privacy
        </h2>
        <div className="flex items-start gap-3">
          <Shield size={18} style={{ color: "var(--success)", flexShrink: 0, marginTop: 1 }} />
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              Fully local processing
            </p>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
              All photos, face embeddings, and recognition data are stored on your device. Nothing is
              sent to external servers. Face recognition runs entirely offline.
            </p>
          </div>
        </div>
      </section>

      {/* API info */}
      <div
        className="mt-4 px-4 py-3 rounded-xl flex items-center justify-between"
        style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border)" }}
      >
        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          Backend API
        </span>
        <code className="text-xs" style={{ color: "var(--accent)" }}>
          {apiUrl}
        </code>
      </div>
    </div>
  );
}
