"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wifi,
  Download,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  X,
  Images,
  ArrowDownToLine,
} from "lucide-react";
import { shareApi, photoImgUrl, faceImgUrl } from "@/lib/api";
import type { SharedAlbumData } from "@/lib/api";
import { toast } from "sonner";

function SharedAlbumContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || searchParams.get("code") || searchParams.get("id") || "";

  const [data, setData] = useState<SharedAlbumData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [downloadingZip, setDownloadingZip] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("No share token or code provided.");
      setLoading(false);
      return;
    }
    setLoading(true);
    shareApi
      .getShared(token)
      .then((res) => {
        setData(res);
        setError(null);
      })
      .catch((err) => {
        const msg =
          err?.response?.data?.detail || "Invalid or expired share link.";
        setError(msg);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const handleDownloadZip = () => {
    if (!data?.allow_download) return;
    setDownloadingZip(true);
    toast.success("Preparing your photos ZIP archive...");
    window.location.href = shareApi.downloadZipUrl(token);
    setTimeout(() => setDownloadingZip(false), 2000);
  };

  const currentPhoto =
    lightboxIndex !== null && data?.photos ? data.photos[lightboxIndex] : null;

  const nextPhoto = () => {
    if (lightboxIndex !== null && data?.photos) {
      setLightboxIndex((lightboxIndex + 1) % data.photos.length);
    }
  };

  const prevPhoto = () => {
    if (lightboxIndex !== null && data?.photos) {
      setLightboxIndex(
        (lightboxIndex - 1 + data.photos.length) % data.photos.length
      );
    }
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === "ArrowRight") nextPhoto();
      if (e.key === "ArrowLeft") prevPhoto();
      if (e.key === "Escape") setLightboxIndex(null);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 space-y-4 text-center">
        <div className="w-12 h-12 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          Connecting to local FaceSort library...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-[#121424] rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center">
            <X size={26} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Album Unavailable
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {error || "The requested shared album could not be found."}
          </p>
          <Link
            href="/share"
            className="inline-flex px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-xs transition-colors"
          >
            Enter Access Code
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0c0e18] text-slate-900 dark:text-white pb-16">
      {/* Mobile-Friendly Top Bar */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-[#121424]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 py-3 sm:px-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              FS
            </div>
            <span className="text-sm font-bold tracking-tight">FaceSort Share</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
              <Wifi size={11} />
              <span>Local Wi-Fi</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-8 pt-6 sm:pt-8 space-y-6">
        {/* Album Hero Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#121424] border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            {data.person_thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={faceImgUrl(data.person_thumbnail)}
                alt={data.person_name}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-4 ring-indigo-500/20 shadow-md shrink-0"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-indigo-600 text-white font-extrabold flex items-center justify-center text-2xl shadow-md shrink-0">
                {data.person_name[0]}
              </div>
            )}

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                  Hey, {data.person_name}!
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Here are your <strong>{data.photos.length}</strong> photos organized from the library.
              </p>
              <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400">
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <ShieldCheck size={13} /> 100% Private (LAN Only)
                </span>
                {data.code && (
                  <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500">
                    Code: {data.code}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Download All Button */}
          {data.allow_download && data.photos.length > 0 && (
            <button
              onClick={handleDownloadZip}
              disabled={downloadingZip}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <Download size={16} />
              <span>Download All ({data.photos.length} Photos)</span>
            </button>
          )}
        </div>

        {/* Photos Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Images size={13} className="text-indigo-500" />
              <span>Photos ({data.photos.length})</span>
            </h2>
            <span className="text-[11px] text-slate-400 font-medium">
              Tap any photo to view or save
            </span>
          </div>

          {data.photos.length === 0 ? (
            <div className="card py-16 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                No photos found in this shared album.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {data.photos.map((photo, index) => (
                <motion.div
                  key={photo.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setLightboxIndex(index)}
                  className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-800/80 shadow-xs cursor-pointer"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoImgUrl(photo.filename)}
                    alt={photo.original_name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2.5 flex items-end">
                    <span className="text-[10px] text-white font-medium truncate">
                      {photo.original_name}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Security / Privacy Guarantee */}
        <div className="pt-8 text-center text-xs text-slate-400 space-y-1">
          <p className="flex items-center justify-center gap-1.5 font-medium">
            <ShieldCheck size={14} className="text-emerald-500" />
            FaceSort Local-First AirDrop Architecture
          </p>
          <p className="text-[11px] text-slate-500">
            Transferred directly peer-to-peer over your local Wi-Fi router. 0 bytes uploaded to the cloud.
          </p>
        </div>
      </main>

      {/* Full-Screen Mobile Lightbox */}
      <AnimatePresence>
        {currentPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex flex-col justify-between"
          >
            {/* Top Lightbox Controls */}
            <div className="p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent z-10">
              <span className="text-white text-xs font-semibold truncate max-w-[200px] sm:max-w-md">
                {currentPhoto.original_name}
              </span>

              <div className="flex items-center gap-2">
                <a
                  href={photoImgUrl(currentPhoto.filename)}
                  download={currentPhoto.original_name}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-white/20 hover:bg-white/30 backdrop-blur-md flex items-center gap-1.5 transition-colors"
                >
                  <ArrowDownToLine size={14} />
                  <span>Save Photo</span>
                </a>

                <button
                  onClick={() => setLightboxIndex(null)}
                  className="p-2 rounded-full text-white bg-white/20 hover:bg-white/30 backdrop-blur-md transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Central Photo View */}
            <div className="relative flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoImgUrl(currentPhoto.filename)}
                alt={currentPhoto.original_name}
                className="max-w-full max-h-[75vh] object-contain select-none"
              />

              {data.photos.length > 1 && (
                <>
                  <button
                    onClick={prevPhoto}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full text-white bg-black/50 hover:bg-black/70 backdrop-blur-md transition-all cursor-pointer"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={nextPhoto}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full text-white bg-black/50 hover:bg-black/70 backdrop-blur-md transition-all cursor-pointer"
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}
            </div>

            {/* Bottom Caption / Counter */}
            <div className="p-4 text-center bg-gradient-to-t from-black/80 to-transparent">
              <span className="text-white/70 text-xs font-medium">
                Photo {(lightboxIndex ?? 0) + 1} of {data.photos.length}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SharedAlbumPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading shared album...</div>}>
      <SharedAlbumContent />
    </Suspense>
  );
}
