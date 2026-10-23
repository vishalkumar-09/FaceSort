"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Wifi, KeyRound, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function ShareCodePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim().replace(" ", "").toLowerCase();
    if (!clean) {
      toast.error("Please enter a 6-digit code or share ID.");
      return;
    }
    setLoading(true);
    router.push(`/share/${clean}`);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-[#121424] rounded-3xl shadow-xl border border-slate-200/80 dark:border-slate-800 p-7 sm:p-8 space-y-6 text-center"
      >
        {/* Icon & Heading */}
        <div className="space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-center shadow-xs">
            <Wifi size={26} />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            FaceSort Local Share
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
            Access your personalized photo album over local Wi-Fi with zero cloud uploads.
          </p>
        </div>

        {/* Access Code Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5 text-left">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Enter 6-Digit Code or Album Link:
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. 482-910 or fs_9b2a1"
                maxLength={20}
                className="w-full pl-10 pr-4 py-3 rounded-xl text-center font-mono font-bold text-lg tracking-wider bg-slate-50 dark:bg-[#16192d] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:text-sm placeholder:font-sans placeholder:tracking-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all uppercase"
                autoFocus
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Open My Album</span>
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Security Notice */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-2 text-xs text-slate-500">
          <ShieldCheck size={14} className="text-emerald-500" />
          <span>Local peer-to-peer · 100% Private</span>
        </div>
      </motion.div>
    </div>
  );
}
