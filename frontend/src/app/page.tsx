"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Plus,
  Image as ImageIcon,
  Users,
  Folder,
  ScanFace,
  CheckCircle2,
  Clock,
  ArrowRight,
  Upload,
  X,
  Check,
  RefreshCw,
  Database,
  Layers,
  Activity,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Cpu,
  FolderOpen,
  Download,
  Loader2,
} from "lucide-react";
import {
  statsApi,
  peopleApi,
  photosApi,
  demoApi,
  organizeApi,
  faceImgUrl,
  photoImgUrl,
} from "@/lib/api";
import type { Stats, Person, Photo } from "@/lib/api";
import { pluralize } from "@/lib/utils";
import { toast } from "sonner";

// Modal for adding a new person directly from the overview dashboard
function AddPersonModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: () => void;
}) {
  const [name, setName] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const arr = Array.from(newFiles).filter((f) => {
      const type = (f.type || "").toLowerCase();
      const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
      return (
        ["image/jpeg", "image/png", "image/webp", "image/jpg"].includes(type) ||
        [".jpg", ".jpeg", ".png", ".webp"].includes(ext)
      );
    });
    if (arr.length === 0) {
      toast.error("Please upload JPG, PNG, or WebP images.");
      return;
    }
    setFiles((prev) => [...prev, ...arr]);
    arr.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (e) =>
        setPreviews((prev) => [...prev, e.target?.result as string]);
      reader.readAsDataURL(f);
    });
  };

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Please enter a person name.");
      return;
    }
    if (files.length === 0) {
      toast.error("Please select at least one clear face photo.");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("name", name.trim());
      files.forEach((f) => fd.append("files", f));
      await peopleApi.register(fd);
      toast.success(`${name} registered! AI face embeddings saved.`);
      onAdded();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Failed to register person. Make sure a face is clearly visible.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md rounded-2xl p-6 bg-white dark:bg-[#121424] border border-slate-200 dark:border-slate-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Users size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Register New Person
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                AI extracts 128-d face embeddings for auto-tagging
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Name input */}
        <div className="space-y-1.5 mb-4">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Full Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alex Johnson"
            className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-[#181b30] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        {/* Upload dropzone */}
        <div className="space-y-1.5 mb-4">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Reference Face Photos
          </label>
          <div
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500/60 rounded-xl p-4 text-center cursor-pointer transition-all bg-slate-50/50 dark:bg-[#151829]/50 hover:bg-indigo-50/20"
          >
            <Upload size={22} className="mx-auto mb-1.5 text-indigo-500" />
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Click to choose face photo(s)
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              JPG, PNG, or WebP — clear frontal portrait works best
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {/* Previews */}
        {previews.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {previews.map((src, i) => (
              <div
                key={i}
                className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xs"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button
                  className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center bg-black/70 text-white"
                  onClick={() => {
                    setPreviews((p) => p.filter((_, j) => j !== i));
                    setFiles((p) => p.filter((_, j) => j !== i));
                  }}
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-1">
          <button
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
            onClick={submit}
            disabled={loading}
          >
            {loading ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Check size={14} />
            )}
            Register Person
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function OverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);
  const [folderPreview, setFolderPreview] = useState<{ name: string; count: number }[]>([]);
  const [downloadingZip, setDownloadingZip] = useState(false);

  const loadAllData = useCallback(async () => {
    try {
      const [s, p, ph, org] = await Promise.all([
        statsApi.get(),
        peopleApi.list(),
        photosApi.list({ per_page: 8 }),
        organizeApi.preview().catch(() => ({ folders: [] })),
      ]);
      setStats(s);
      setPeople(p);
      setPhotos(ph.photos);
      setFolderPreview(org.folders || []);
      setBackendOnline(true);
    } catch {
      setBackendOnline(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const handleSeedDemo = async () => {
    setSeeding(true);
    const toastId = toast.loading("Loading sample dataset with real faces...");
    try {
      const res = await demoApi.seed();
      toast.success(res.message, { id: toastId });
      await loadAllData();
    } catch {
      toast.error("Failed to load sample dataset. Check backend connection.", {
        id: toastId,
      });
    } finally {
      setSeeding(false);
    }
  };

  const handleDownloadZip = () => {
    setDownloadingZip(true);
    toast.success("Downloading FaceSort_organized.zip...");
    try {
      organizeApi.downloadZip();
    } catch {
      window.open(organizeApi.downloadUrl(), "_blank");
    } finally {
      setTimeout(() => setDownloadingZip(false), 1500);
    }
  };

  const handleOpenFolder = async () => {
    const toastId = toast.loading("Opening folder in File Explorer...");
    try {
      await organizeApi.openFolder();
      toast.success("Opened organized folder in File Explorer!", { id: toastId });
    } catch {
      toast.info("Photos organized under backend/storage/organized/", { id: toastId });
    }
  };

  const photosCount = stats?.photos ?? 0;
  const peopleCount = stats?.people ?? 0;
  const unknownCount = stats?.unknown_faces ?? 0;
  const collectionsCount = folderPreview.length > 0
    ? folderPreview.filter((f) => f.name !== "Unknown").length
    : people.filter((p) => p.photo_count > 0).length;

  const hasData = people.length > 0 || photos.length > 0;

  return (
    <div className="w-full max-w-[1320px] mx-auto px-6 sm:px-8 py-6 space-y-6">
      {/* ─── Hero Section with Visual Showcase ─── */}
      <section className="relative pt-2 pb-2 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        {/* Left Hero Content */}
        <div className="max-w-xl space-y-3.5">
          {/* Live Status Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border border-indigo-200/80 dark:border-indigo-900/60 bg-indigo-50/70 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300">
            {backendOnline === true ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>AI Vision Engine Active · OpenCV SFace & YuNet</span>
              </>
            ) : backendOnline === false ? (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-rose-600 dark:text-rose-400">
                  Backend Offline · Reconnecting...
                </span>
                <button
                  onClick={loadAllData}
                  className="underline hover:no-underline ml-1 text-rose-700"
                >
                  Retry
                </button>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span>Connecting to AI Engine...</span>
              </>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
            Your memories,
            <br />
            <span className="text-[#5850ec] dark:text-indigo-400">
              organized by faces.
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-normal leading-relaxed max-w-lg">
            FaceSort automatically detects faces in your photos and groups them into
            person-named folders using high-precision on-device AI recognition.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              href="/organize"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-[#5850ec] hover:bg-[#4f46e5] shadow-md shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-100"
            >
              <Sparkles size={15} />
              <span>Organize Photos</span>
            </Link>

            <button
              onClick={() => setShowAddPerson(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-[#121424] border border-slate-200/90 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-[#181b30] shadow-2xs transition-all"
            >
              <Plus size={15} />
              <span>Register Person</span>
            </button>

            {!hasData && (
              <button
                onClick={handleSeedDemo}
                disabled={seeding}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 hover:bg-indigo-100/80 transition-all disabled:opacity-50"
              >
                {seeding ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Database size={14} />
                )}
                <span>Load Sample Dataset</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Floating Visual Showcase Deck */}
        <div className="relative w-full lg:w-[480px] h-[260px] flex items-center justify-center flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-200/30 via-purple-100/20 to-violet-50/10 dark:from-indigo-950/30 dark:via-purple-950/15 dark:to-transparent rounded-full blur-3xl pointer-events-none" />

          {photos.length > 0 ? (
            <div className="relative w-full h-full flex items-center justify-center select-none">
              {/* Photo 1: Left Angled Card */}
              {photos[0] && (
                <motion.div
                  initial={{ opacity: 0, x: -15, rotate: -6 }}
                  animate={{ opacity: 0.9, x: 0, rotate: -4 }}
                  whileHover={{ opacity: 1, scale: 1.03, zIndex: 30 }}
                  transition={{ duration: 0.3 }}
                  className="absolute left-2 top-2 w-44 aspect-[4/3] rounded-2xl overflow-hidden p-1.5 bg-white dark:bg-slate-800 shadow-md border border-slate-200/90 dark:border-slate-700 cursor-pointer transition-all z-10"
                  onClick={() => setLightboxPhoto(photos[0])}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoImgUrl(photos[0].filename)}
                    alt=""
                    className="w-full h-full object-cover rounded-xl"
                  />
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-slate-900/80 backdrop-blur-xs text-[10px] text-white px-2 py-0.5 rounded-md truncate font-medium">
                    {photos[0].original_name}
                  </div>
                </motion.div>
              )}

              {/* Photo 2: Right Angled Card */}
              {photos[1] && (
                <motion.div
                  initial={{ opacity: 0, x: 15, rotate: 6 }}
                  animate={{ opacity: 0.9, x: 0, rotate: 4 }}
                  whileHover={{ opacity: 1, scale: 1.03, zIndex: 30 }}
                  transition={{ duration: 0.3, delay: 0.08 }}
                  className="absolute right-2 top-2 w-44 aspect-[4/3] rounded-2xl overflow-hidden p-1.5 bg-white dark:bg-slate-800 shadow-md border border-slate-200/90 dark:border-slate-700 cursor-pointer transition-all z-10"
                  onClick={() => setLightboxPhoto(photos[1])}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoImgUrl(photos[1].filename)}
                    alt=""
                    className="w-full h-full object-cover rounded-xl"
                  />
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-slate-900/80 backdrop-blur-xs text-[10px] text-white px-2 py-0.5 rounded-md truncate font-medium">
                    {photos[1].original_name}
                  </div>
                </motion.div>
              )}

              {/* Photo 3: Prominent Center Foreground Showcase */}
              {photos[2] && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.04 }}
                  transition={{ duration: 0.35, delay: 0.15 }}
                  className="absolute left-1/2 -translate-x-1/2 bottom-1.5 w-52 sm:w-56 aspect-[4/3] rounded-2xl overflow-hidden p-1.5 bg-white dark:bg-slate-800 shadow-2xl border-2 border-indigo-400/50 dark:border-indigo-500/50 cursor-pointer transition-transform z-20"
                  onClick={() => setLightboxPhoto(photos[2])}
                >
                  <div className="relative w-full h-full overflow-hidden rounded-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photoImgUrl(photos[2].filename)}
                      alt=""
                      className="w-full h-full object-cover"
                    />

                    {/* AI Detection Landmark Box */}
                    <div className="absolute top-[20%] left-[30%] w-[40%] h-[50%] border-2 border-emerald-400/90 bg-emerald-400/15 rounded-lg pointer-events-none">
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 text-[9px] font-bold bg-emerald-500 text-white px-1.5 py-0.5 rounded-full shadow-xs whitespace-nowrap">
                        <ScanFace size={10} /> 99.4% Match
                      </span>
                    </div>

                    {/* Photo Title Overlay */}
                    <div className="absolute bottom-2 left-2 right-2 bg-slate-950/85 backdrop-blur-xs text-[10px] text-white px-2.5 py-1 rounded-lg truncate font-medium flex items-center justify-between">
                      <span className="truncate">{photos[2].original_name}</span>
                      <span className="text-emerald-400 text-[9px] font-semibold flex-shrink-0 ml-1">AI Indexed</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-white/80 dark:bg-[#121424]/90 border border-slate-200/80 dark:border-slate-800 shadow-xl text-center space-y-2.5 max-w-sm">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                <ScanFace size={24} strokeWidth={2} />
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                Ready to Organize Photos
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                Register people you want to identify, or click &ldquo;Load Sample
                Dataset&rdquo; to test AI auto-tagging.
              </p>
              <button
                onClick={handleSeedDemo}
                disabled={seeding}
                className="w-full py-1.5 px-3 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-xs transition-all"
              >
                {seeding ? "Loading..." : "Load Sample Showcase"}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ─── Unified 4-Card Stats Row ─── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Photos Card */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="stat-label">Photos Uploaded</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <ImageIcon size={16} />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-auto">
            <span className="stat-value">{photosCount}</span>
            <span className="badge badge-brand">
              {photosCount > 0 ? "indexed" : "empty"}
            </span>
          </div>
        </div>

        {/* People Card */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="stat-label">Registered People</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-auto">
            <span className="stat-value">{peopleCount}</span>
            <span className="badge badge-brand">
              {peopleCount > 0 ? "active profiles" : "none yet"}
            </span>
          </div>
        </div>

        {/* Collections Card */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="stat-label">Person Folders</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Folder size={16} />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-auto">
            <span className="stat-value">{collectionsCount}</span>
            <span className="badge badge-warning">ready to sort</span>
          </div>
        </div>

        {/* Unknown Faces Card */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="stat-label">Unknown Faces</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <ScanFace size={16} />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-auto">
            <span className="stat-value">{unknownCount}</span>
            {unknownCount > 0 ? (
              <Link
                href="/unknown"
                className="badge badge-warning hover:opacity-80 transition-opacity"
              >
                Review &rarr;
              </Link>
            ) : (
              <span className="badge badge-neutral">All assigned</span>
            )}
          </div>
        </div>
      </section>

      {/* ─── Two-Column Perfectly Balanced Content Grid ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: People Card & Recent Photos Card (~68%) */}
        <div className="lg:col-span-8 space-y-6">
          {/* People Section Card */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Recognized People
                </h2>
                <p className="text-xs text-slate-400">
                  {people.length > 0
                    ? `${people.length} profiles with active face embeddings`
                    : "No people registered yet"}
                </p>
              </div>
              <Link
                href="/people"
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-colors"
              >
                View all &rarr;
              </Link>
            </div>

            {/* Circular People Avatar Row */}
            <div className="flex items-center gap-4 sm:gap-5 overflow-x-auto pb-1 scrollbar-none">
              {/* Add Person Button */}
              <button
                onClick={() => setShowAddPerson(true)}
                className="flex flex-col items-center group flex-shrink-0 cursor-pointer"
              >
                <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center mb-1.5 group-hover:border-indigo-500 group-hover:bg-indigo-50/50 dark:group-hover:bg-indigo-950/20 transition-all">
                  <Plus size={20} className="text-slate-400 group-hover:text-indigo-600" />
                </div>
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 text-center">
                  Add
                </div>
                <div className="text-[10px] text-slate-400 text-center">
                  Person
                </div>
              </button>

              {people.length > 0 ? (
                people.map((person) => (
                  <Link
                    key={person.id}
                    href={`/people/${person.id}`}
                    className="flex flex-col items-center group flex-shrink-0"
                  >
                    <div className="relative mb-1.5">
                      <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full overflow-hidden ring-2 ring-transparent group-hover:ring-indigo-500 transition-all shadow-xs bg-indigo-500/10">
                        {person.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={faceImgUrl(person.thumbnail)}
                            alt={person.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-white bg-indigo-600 text-sm">
                            {person.name[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-[#111322] rounded-full" />
                    </div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 transition-colors text-center truncate max-w-[80px]">
                      {person.name}
                    </div>
                    <div className="text-[10px] text-slate-400 text-center">
                      {pluralize(person.photo_count, "photo")}
                    </div>
                  </Link>
                ))
              ) : (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#16192d] border border-slate-200/80 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Register a person or load the sample dataset to see recognized profiles.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Photos Card */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Recent Photos
                </h2>
                <p className="text-xs text-slate-400">
                  {photos.length > 0
                    ? `${photos.length} uploaded photos in library`
                    : "No photos uploaded yet"}
                </p>
              </div>
              {photos.length > 0 && (
                <Link
                  href="/photos"
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-colors"
                >
                  View all &rarr;
                </Link>
              )}
            </div>

            {photos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    onClick={() => setLightboxPhoto(photo)}
                    className="group relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-800 shadow-2xs hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 cursor-pointer"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photoImgUrl(photo.filename)}
                      alt={photo.original_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2.5">
                      <span className="text-[11px] font-semibold text-white truncate">
                        {photo.original_name}
                      </span>
                      <span className="text-[10px] text-indigo-300 font-medium">
                        {photo.faces?.length
                          ? `${photo.faces.length} face(s) detected`
                          : "No faces"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-8 text-center space-y-2.5 bg-slate-50/50 dark:bg-[#16192d]/40">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                  <ImageIcon size={20} />
                </div>
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  No Photos in Library Yet
                </h3>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Import photos to let the AI organize them by recognizing who is in each photo.
                </p>
                <div className="flex justify-center gap-2.5 pt-1">
                  <Link
                    href="/organize"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-xs"
                  >
                    <Upload size={12} />
                    <span>Upload Photos</span>
                  </Link>
                  <button
                    onClick={handleSeedDemo}
                    disabled={seeding}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-[#1a1e35] border border-slate-200 dark:border-slate-700"
                  >
                    <Database size={12} />
                    <span>Load Demo Photos</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Engine Status, Quick Actions & Folder Summary (~32%) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Card 1: AI Engine Status */}
          <div className="card p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu size={15} className="text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Vision Engine
                </h3>
              </div>
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Detector</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  OpenCV YuNet (CNN)
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Recognizer</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  SFace (128-d Cosine)
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Processing</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <ShieldCheck size={13} /> 100% On-Device
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 dark:text-slate-400">Backend Port</span>
                <code className="text-[11px] text-indigo-600 dark:text-indigo-400 font-mono font-semibold">
                  http://localhost:8000
                </code>
              </div>
            </div>
          </div>

          {/* Card 2: Quick Actions */}
          <div className="card p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Quick Actions
            </h3>

            <div className="space-y-2">
              <button
                onClick={() => setShowAddPerson(true)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#16192d] hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 text-left transition-all border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800/60 group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 flex items-center justify-center flex-shrink-0">
                    <Plus size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600">
                      Register Person
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Upload face reference photos
                    </div>
                  </div>
                </div>
                <ArrowRight size={14} className="text-slate-400 group-hover:text-indigo-600" />
              </button>

              <Link
                href="/organize"
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#16192d] hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 text-left transition-all border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800/60 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300 flex items-center justify-center flex-shrink-0">
                    <Layers size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600">
                      Organize Photos
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Sort into person folders & ZIP
                    </div>
                  </div>
                </div>
                <ArrowRight size={14} className="text-slate-400 group-hover:text-indigo-600" />
              </Link>

              {unknownCount > 0 && (
                <Link
                  href="/unknown"
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 hover:bg-amber-100/80 dark:hover:bg-amber-950/50 text-left transition-all border border-amber-200/80 dark:border-amber-800/60 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-300 flex items-center justify-center flex-shrink-0">
                      <ScanFace size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                        {unknownCount} Unknown Face(s)
                      </div>
                      <div className="text-[10px] text-amber-700 dark:text-amber-400">
                        Assign to people or name them
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-amber-500" />
                </Link>
              )}

              <button
                onClick={handleSeedDemo}
                disabled={seeding}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#16192d] hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 text-left transition-all border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800/60 group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 flex items-center justify-center flex-shrink-0">
                    <Database size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600">
                      Load Sample Dataset
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Populate demo people & photos
                    </div>
                  </div>
                </div>
                <ArrowRight size={14} className="text-slate-400 group-hover:text-indigo-600" />
              </button>
            </div>
          </div>

          {/* Card 3: Organized Albums Breakdown (Completes the vertical alignment) */}
          {folderPreview.length > 0 && (
            <div className="card p-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderOpen size={15} className="text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Folder Breakdown
                  </h3>
                </div>
                <Link
                  href="/organize"
                  className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Manage &rarr;
                </Link>
              </div>

              <div className="space-y-2">
                {folderPreview.map((folder) => (
                  <div
                    key={folder.name}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#16192d] text-xs"
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {folder.name}/
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {pluralize(folder.count, "photo")}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleOpenFolder}
                  className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Open organized folder in Windows File Explorer"
                >
                  <FolderOpen size={13} className="text-indigo-600 dark:text-indigo-400" />
                  <span>Open Folder</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadZip}
                  disabled={downloadingZip}
                  className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Download organized ZIP archive (.zip)"
                >
                  {downloadingZip ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Downloading...</span>
                    </>
                  ) : (
                    <>
                      <Download size={13} />
                      <span>Download .ZIP</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Add Person Modal ─── */}
      <AnimatePresence>
        {showAddPerson && (
          <AddPersonModal
            onClose={() => setShowAddPerson(false)}
            onAdded={loadAllData}
          />
        )}
      </AnimatePresence>

      {/* ─── Lightbox Preview ─── */}
      <AnimatePresence>
        {lightboxPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setLightboxPhoto(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="max-w-3xl w-full bg-white dark:bg-[#121424] rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {lightboxPhoto.original_name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Uploaded: {new Date(lightboxPhoto.uploaded_at).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => setLightboxPhoto(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="relative aspect-video max-h-[70vh] bg-black flex items-center justify-center overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoImgUrl(lightboxPhoto.filename)}
                  alt={lightboxPhoto.original_name}
                  className="max-h-full max-w-full object-contain"
                />
              </div>

              {/* Detected faces */}
              <div className="p-4 bg-slate-50 dark:bg-[#16192d] border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Detected Faces ({lightboxPhoto.faces?.length || 0}):
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {lightboxPhoto.faces?.map((f) => (
                      <span
                        key={f.face_id}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                      >
                        {f.person_name || "Unknown"}
                        {f.confidence !== null && (
                          <span className="opacity-70 text-[10px]">
                            ({Math.round(f.confidence * 100)}%)
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>

                <Link
                  href="/organize"
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Organize into folders &rarr;
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
