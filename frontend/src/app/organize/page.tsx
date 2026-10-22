"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Scan,
  FolderOpen,
  Check,
  X,
  Download,
  ChevronRight,
  File as FileIcon,
  AlertCircle,
  Loader2,
  FolderCheck,
  Layers,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Users,
  Image as ImageIcon,
} from "lucide-react";
import Link from "next/link";
import { photosApi, organizeApi, statsApi, photoImgUrl } from "@/lib/api";
import { pluralize } from "@/lib/utils";
import { toast } from "sonner";

type Step = 1 | 2 | 3;

interface UploadResult {
  filename: string;
  original_name: string;
  faces_detected: number;
  recognized: number;
  unknown: number;
  error?: string;
}

interface FolderInfo {
  name: string;
  count: number;
  photos: string[];
}

function StepIndicator({
  step,
  current,
  label,
}: {
  step: number;
  current: Step;
  label: string;
}) {
  const done = current > step;
  const active = current === step;
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
          done
            ? "bg-emerald-600 text-white shadow-xs"
            : active
            ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-4 ring-indigo-500/20"
            : "bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700"
        }`}
      >
        {done ? <Check size={14} /> : step}
      </div>
      <span
        className={`text-xs font-semibold ${
          active
            ? "text-slate-900 dark:text-white"
            : done
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-slate-400"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

export default function OrganizePage() {
  const [step, setStep] = useState<Step>(1);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [organizing, setOrganizing] = useState(false);
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [existingPhotosCount, setExistingPhotosCount] = useState<number>(0);
  const [registeredPeopleCount, setRegisteredPeopleCount] = useState<number>(0);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [downloading, setDownloading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchStats = useCallback(async () => {
    try {
      const s = await statsApi.get();
      setExistingPhotosCount(s.photos);
      setRegisteredPeopleCount(s.people);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const addFiles = useCallback((incoming: FileList | null) => {
    if (!incoming) return;
    const valid = Array.from(incoming).filter((f) => {
      const type = (f.type || "").toLowerCase();
      const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
      return (
        ["image/jpeg", "image/png", "image/webp", "image/jpg"].includes(type) ||
        [".jpg", ".jpeg", ".png", ".webp"].includes(ext)
      );
    });

    if (valid.length === 0) {
      toast.error("Please choose JPG, PNG, or WebP images.");
      return;
    }
    setFiles((prev) => [...prev, ...valid]);
    valid.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (e) =>
        setPreviews((prev) => [...prev, e.target?.result as string]);
      reader.readAsDataURL(f);
    });
  }, []);

  const removeFile = (idx: number) => {
    setFiles((f) => f.filter((_, i) => i !== idx));
    setPreviews((p) => p.filter((_, i) => i !== idx));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  // Upload new photos then auto-advance to step 2
  const uploadAll = async () => {
    if (files.length === 0) {
      toast.error("Please add photos first.");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));

      const res = await photosApi.upload(fd, (pct) => setUploadProgress(pct));

      setUploadResults(res.results);
      toast.success(`${pluralize(res.uploaded, "photo")} uploaded & faces scanned!`);
      await fetchStats();
      setStep(2);
    } catch {
      toast.error("Upload failed. Please ensure the backend is running.");
    } finally {
      setUploading(false);
    }
  };

  // Run organization on library (both existing and newly uploaded photos)
  const runOrganize = async () => {
    setOrganizing(true);
    try {
      const res = await organizeApi.run();
      setFolders(res.folders || []);
      setDownloadUrl(organizeApi.downloadUrl());
      toast.success(res.message || "Photos organized successfully!");
      await fetchStats();
      setStep(3);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Organization failed.";
      toast.error(msg);
    } finally {
      setOrganizing(false);
    }
  };

  const reset = () => {
    setStep(1);
    setFiles([]);
    setPreviews([]);
    setUploadResults([]);
    setFolders([]);
    setDownloadUrl("");
    setUploadProgress(0);
    fetchStats();
  };

  const handleDownloadZip = () => {
    setDownloading(true);
    toast.success("Downloading FaceSort_organized.zip...");
    try {
      organizeApi.downloadZip();
    } catch {
      window.open(organizeApi.downloadUrl(), "_blank");
    } finally {
      setTimeout(() => setDownloading(false), 1500);
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

  const totalFaces = uploadResults.reduce(
    (a, r) => a + (r.faces_detected || 0),
    0
  );
  const totalRecognized = uploadResults.reduce(
    (a, r) => a + (r.recognized || 0),
    0
  );
  const totalUnknown = uploadResults.reduce(
    (a, r) => a + (r.unknown || 0),
    0
  );

  return (
    <div className="px-8 py-8 max-w-4xl mx-auto space-y-7">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Organize Photos
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Detect faces with AI, auto-sort photos into person-named folders, and
          export an organized ZIP archive.
        </p>
      </div>

      {/* Step indicators */}
      <div className="card p-4 flex items-center gap-4 sm:gap-6 shadow-xs">
        <StepIndicator step={1} current={step} label="Import / Select" />
        <ChevronRight size={14} className="text-slate-400" />
        <StepIndicator step={2} current={step} label="Scan & Sort" />
        <ChevronRight size={14} className="text-slate-400" />
        <StepIndicator step={3} current={step} label="Folder Export" />
      </div>

      <AnimatePresence mode="wait">
        {/* ─── Step 1: Import or Organize Current Library ────────────── */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* If user already has photos in database, offer 1-click organize */}
            {existingPhotosCount > 0 && (
              <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-50/90 via-purple-50/70 to-indigo-50/50 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-[#121424] border border-indigo-200/80 dark:border-indigo-800/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Library Ready: {pluralize(existingPhotosCount, "photo")} indexed
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Registered people: <strong>{registeredPeopleCount}</strong>. You can
                    organize your current photos immediately or drop new ones below.
                  </p>
                </div>

                <button
                  onClick={runOrganize}
                  disabled={organizing}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-[#5850ec] hover:bg-[#4f46e5] shadow-md shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-100 flex-shrink-0"
                >
                  {organizing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Sorting photos...</span>
                    </>
                  ) : (
                    <>
                      <FolderCheck size={16} />
                      <span>Organize Current Library</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Drop Zone for New Photos */}
            <div
              className={`p-10 border-2 border-dashed rounded-3xl text-center cursor-pointer transition-all ${
                dragging
                  ? "border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30"
                  : "border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111322] hover:border-indigo-400"
              }`}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3 shadow-xs">
                <Upload size={24} />
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                {dragging ? "Drop photos to add" : "Drag & drop photos here to sort"}
              </p>
              <p className="text-xs text-slate-400 mb-2">
                Click anywhere in this box to select files from your computer
              </p>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-full">
                JPG, JPEG, PNG, WebP · Up to 50 MB per photo
              </div>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />
            </div>

            {/* File previews */}
            {previews.length > 0 && (
              <div className="space-y-3 bg-white dark:bg-[#111322] border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Selected Files ({files.length})
                  </span>
                  <button
                    className="text-xs text-rose-500 hover:text-rose-600 font-medium"
                    onClick={() => {
                      setFiles([]);
                      setPreviews([]);
                    }}
                  >
                    Clear all
                  </button>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2.5">
                  {previews.map((src, i) => (
                    <div
                      key={i}
                      className="relative rounded-xl overflow-hidden aspect-square border border-slate-200 dark:border-slate-700 shadow-2xs group"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <button
                        className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center bg-black/70 text-white hover:bg-rose-600 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(i);
                        }}
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Progress bar */}
            {uploading && (
              <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-2">
                <div className="flex justify-between text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                  <span>Scanning faces & uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden bg-indigo-200/60 dark:bg-indigo-900/60">
                  <motion.div
                    className="h-full rounded-full bg-indigo-600"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.2 }}
                  />
                </div>
              </div>
            )}

            {/* Upload Button */}
            {files.length > 0 && (
              <button
                className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                onClick={uploadAll}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Processing {files.length} photos...</span>
                  </>
                ) : (
                  <>
                    <Scan size={16} />
                    <span>Upload & Scan {pluralize(files.length, "Photo")}</span>
                  </>
                )}
              </button>
            )}
          </motion.div>
        )}

        {/* ─── Step 2: Review Scan Results ──────────────────────────── */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Summary metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="stat-card text-center justify-center p-4">
                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {totalFaces}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Faces Detected
                </div>
              </div>
              <div className="stat-card text-center justify-center p-4">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {totalRecognized}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Recognized Faces
                </div>
              </div>
              <div className="stat-card text-center justify-center p-4">
                <div className="text-2xl font-bold text-amber-500">
                  {totalUnknown}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Unknown Faces
                </div>
              </div>
            </div>

            {/* Per-photo results breakdown */}
            <div className="card p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Scanned Files ({uploadResults.length})
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {uploadResults.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#16192d] text-xs"
                  >
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate flex-1">
                      {r.original_name || r.filename}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {r.faces_detected > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                          {pluralize(r.faces_detected, "face")}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          No face
                        </span>
                      )}
                      {r.recognized > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          {r.recognized} matched
                        </span>
                      )}
                      {r.unknown > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                          {r.unknown} unknown
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                className="px-5 py-3 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors"
                onClick={reset}
              >
                Start Over
              </button>
              <button
                className="flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
                onClick={runOrganize}
                disabled={organizing}
              >
                {organizing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Copying to person folders...</span>
                  </>
                ) : (
                  <>
                    <FolderOpen size={16} />
                    <span>Sort Photos into Person Folders</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── Step 3: Organized Folder Results & Download ──────────── */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Success Hero */}
            <div className="p-8 rounded-3xl bg-gradient-to-tr from-emerald-50 via-teal-50/40 to-indigo-50/30 dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-[#121424] border border-emerald-200/80 dark:border-emerald-800/60 text-center space-y-2 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto mb-2 shadow-md shadow-emerald-600/30">
                <Check size={26} strokeWidth={2.5} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Photos Successfully Organized!
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Created {pluralize(folders.length, "folder")} under{" "}
                <code className="text-emerald-700 dark:text-emerald-400 font-semibold font-mono">
                  backend/storage/organized/
                </code>
              </p>
            </div>

            {/* Folder Cards List */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Organized Folder Breakdown
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {folders.map((folder) => (
                  <div
                    key={folder.name}
                    className="card p-4 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                          <FolderOpen size={16} />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            {folder.name}
                          </h4>
                          <span className="text-[10px] text-slate-400">
                            {pluralize(folder.count, "photo")}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full">
                        {folder.count} files
                      </span>
                    </div>

                    {/* Thumbnail previews */}
                    {folder.photos && folder.photos.length > 0 && (
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                        {folder.photos.slice(0, 4).map((fn, idx) => (
                          <div
                            key={idx}
                            className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-slate-100 dark:border-slate-800 bg-slate-100"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={photoImgUrl(fn)}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                className="px-5 py-3 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-center cursor-pointer"
                onClick={reset}
              >
                Organize More Photos
              </button>
              <button
                type="button"
                onClick={handleOpenFolder}
                className="px-5 py-3 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 shadow-xs transition-all flex items-center justify-center gap-2 text-center cursor-pointer"
              >
                <FolderOpen size={16} className="text-indigo-600 dark:text-indigo-400" />
                <span>Open Folder in Explorer</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadZip}
                disabled={downloading}
                className="flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 text-center cursor-pointer"
              >
                {downloading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Preparing ZIP Archive...</span>
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    <span>Download ZIP Archive (.zip)</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
