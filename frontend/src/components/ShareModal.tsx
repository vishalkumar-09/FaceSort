"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import QRCode from "qrcode";
import {
  Wifi,
  QrCode,
  Copy,
  Check,
  X,
  Download,
  Clock,
  ShieldCheck,
  ExternalLink,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { shareApi, faceImgUrl } from "@/lib/api";
import type { ShareSession, Person } from "@/lib/api";
import { pluralize } from "@/lib/utils";
import { toast } from "sonner";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  person: Person | { id: string; name: string; thumbnail?: string | null; photo_count?: number };
}

export function ShareModal({ isOpen, onClose, person }: ShareModalProps) {
  const [session, setSession] = useState<ShareSession | null>(null);
  const [qrSvg, setQrSvg] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [allowDownload, setAllowDownload] = useState(true);
  const [expiryHours, setExpiryHours] = useState(24);

  // Initialize or recreate share session
  useEffect(() => {
    if (!isOpen || !person?.id) return;

    let isMounted = true;
    setLoading(true);

    shareApi
      .create({
        person_id: person.id,
        allow_download: allowDownload,
        expires_in_hours: expiryHours,
      })
      .then(async (res) => {
        if (!isMounted) return;
        setSession(res);

        // Generate clean SVG QR code
        try {
          const svg = await QRCode.toString(res.share_url, {
            type: "svg",
            margin: 1,
            width: 220,
            color: {
              dark: "#0f172a",
              light: "#ffffff",
            },
          });
          if (isMounted) setQrSvg(svg);
        } catch (err) {
          console.error("QR Code generation error:", err);
        }
      })
      .catch((err) => {
        toast.error("Failed to generate local share link.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, person?.id, allowDownload, expiryHours]);

  const copyShareLink = () => {
    if (!session?.share_url) return;
    navigator.clipboard.writeText(session.share_url);
    setCopiedLink(true);
    toast.success("Local Wi-Fi link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyAccessCode = () => {
    if (!session?.code) return;
    navigator.clipboard.writeText(session.code.replace("-", ""));
    setCopiedCode(true);
    toast.success(`Access code ${session.code} copied!`);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="relative w-full max-w-lg bg-white dark:bg-[#121424] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-10 p-6 space-y-6"
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {person.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={faceImgUrl(person.thumbnail)}
                    alt={person.name}
                    className="w-12 h-12 rounded-2xl object-cover ring-2 ring-indigo-500/20 shadow-sm"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-bold flex items-center justify-center text-lg shadow-sm">
                    {person.name[0]}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      Share {person.name}&apos;s Album
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center gap-1">
                      <Wifi size={10} /> Local Wi-Fi
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Stream photos directly to their phone with zero cloud upload.
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* QR Code Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-b from-indigo-50/70 to-purple-50/40 dark:from-[#171a2e] dark:to-[#121424] border border-indigo-100/80 dark:border-slate-800 flex flex-col items-center justify-center space-y-4">
              {loading ? (
                <div className="w-56 h-56 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-semibold">Generating QR Code...</span>
                </div>
              ) : qrSvg ? (
                <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200/80 flex items-center justify-center">
                  <div
                    dangerouslySetInnerHTML={{ __html: qrSvg }}
                    className="w-48 h-48 [&>svg]:w-full [&>svg]:h-full"
                  />
                </div>
              ) : null}

              <div className="text-center space-y-1">
                <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
                  <Smartphone size={14} className="text-indigo-600 dark:text-indigo-400" />
                  <span>Scan with Phone Camera</span>
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs">
                  Connect your phone to the same Wi-Fi network and point your camera at the QR code.
                </p>
              </div>

              {/* 6-Digit Access Code fallback */}
              {session?.code && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] font-semibold text-slate-500">Or type code:</span>
                  <button
                    onClick={copyAccessCode}
                    className="px-3 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs font-mono font-bold text-sm tracking-widest text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 hover:border-indigo-400 transition-colors"
                    title="Click to copy 6-digit code"
                  >
                    <span>{session.code}</span>
                    {copiedCode ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  </button>
                </div>
              )}
            </div>

            {/* Direct Local Link Row */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Direct Local Link:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={session?.share_url || ""}
                  className="flex-1 px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-mono select-all outline-none"
                />
                <button
                  type="button"
                  onClick={copyShareLink}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedLink ? "Copied" : "Copy"}</span>
                </button>
                <a
                  href={session?.share_url || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors shrink-0"
                  title="Open preview in new tab"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>

            {/* Permissions & Security Summary */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-500" />
                <span>Zero cloud upload · 100% P2P LAN</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock size={13} className="text-slate-400" />
                <span>Expires in {expiryHours} hours</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
