"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Sparkles,
  Users,
  User,
  Image as ImageIcon,
  ArrowRight,
  X,
  Command,
  CornerDownLeft,
  Tag,
  Clock,
  Layers,
} from "lucide-react";
import { photosApi, faceImgUrl, photoImgUrl } from "@/lib/api";
import type { SmartSuggestResult, Photo } from "@/lib/api";
import { pluralize } from "@/lib/utils";

interface SmartSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SmartSearchModal({ isOpen, onClose }: SmartSearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [data, setData] = useState<SmartSuggestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewPhotos, setPreviewPhotos] = useState<Photo[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch suggestions
  const fetchSuggestions = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const [res, photosRes] = await Promise.all([
        photosApi.suggest(q),
        photosApi.list({ q: q || undefined, per_page: 6 }),
      ]);
      setData(res);
      setPreviewPhotos(photosRes.photos);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      fetchSuggestions("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, fetchSuggestions]);

  // Handle typing with debounce
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      fetchSuggestions(query);
    }, 200);
    return () => clearTimeout(timer);
  }, [query, isOpen, fetchSuggestions]);

  // Global hotkey Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const navigateToFilter = (params: {
    person_ids?: string[];
    match_mode?: "and" | "or";
    face_count_type?: string;
    tag_status?: string;
    q?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params.person_ids && params.person_ids.length > 0) {
      params.person_ids.forEach((id) => searchParams.append("person_ids", id));
    }
    if (params.match_mode) searchParams.set("match_mode", params.match_mode);
    if (params.face_count_type) searchParams.set("face_count_type", params.face_count_type);
    if (params.tag_status) searchParams.set("tag_status", params.tag_status);
    if (params.q) searchParams.set("q", params.q);

    onClose();
    router.push(`/photos?${searchParams.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    navigateToFilter({ q: query.trim() });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="relative w-full max-w-2xl bg-white dark:bg-[#121424] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-10 flex flex-col max-h-[85vh]"
          >
            {/* Search Input Bar */}
            <form onSubmit={handleSearchSubmit} className="flex items-center px-4 py-3.5 border-b border-slate-100 dark:border-slate-800">
              <Search className="text-indigo-600 dark:text-indigo-400 shrink-0 mr-3" size={18} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by person name, photo, or group ('Lucas & Sophia')..."
                className="w-full bg-transparent text-sm sm:text-base text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={16} />
                </button>
              ) : (
                <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                  <Command size={11} /> K
                </div>
              )}
            </form>

            {/* Results Content Area */}
            <div className="overflow-y-auto p-4 space-y-5 flex-1">
              {/* Presets & Smart Combinations */}
              {data && data.presets && data.presets.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                    <Sparkles size={13} className="text-indigo-500" />
                    <span>Smart Combinations & Presets</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {data.presets.map((preset, idx) => (
                      <button
                        key={idx}
                        onClick={() =>
                          navigateToFilter({
                            person_ids: preset.person_ids,
                            match_mode: preset.match_mode,
                            face_count_type: preset.face_count_type,
                            tag_status: preset.tag_status,
                          })
                        }
                        className="group flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40 border border-slate-200/80 dark:border-slate-700/60 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all text-left"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                            {preset.match_mode === "and" ? (
                              <Users size={14} />
                            ) : preset.face_count_type === "solo" ? (
                              <User size={14} />
                            ) : preset.tag_status ? (
                              <Tag size={14} />
                            ) : (
                              <Layers size={14} />
                            )}
                          </span>
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
                            {preset.title}
                          </span>
                        </div>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300 ml-2 shrink-0">
                          {pluralize(preset.count, "photo")}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* People Section */}
              {data && data.people && data.people.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                    <User size={13} className="text-indigo-500" />
                    <span>People ({data.people.length})</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {data.people.map((person) => (
                      <button
                        key={person.id}
                        onClick={() => navigateToFilter({ person_ids: [person.id] })}
                        className="group flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40 border border-slate-200/80 dark:border-slate-700/60 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all text-left"
                      >
                        {person.face_image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={faceImgUrl(person.face_image)}
                            alt={person.name}
                            className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-slate-200 dark:ring-slate-700"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 font-bold flex items-center justify-center text-xs shrink-0">
                            {person.name[0]}
                          </div>
                        )}
                        <div className="truncate">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
                            {person.name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {pluralize(person.count, "photo")}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Matching Photos Preview */}
              {previewPhotos.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <ImageIcon size={13} className="text-indigo-500" />
                      <span>Matching Photos Preview</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigateToFilter({ q: query })}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      <span>View All in Gallery</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {previewPhotos.map((photo) => (
                      <button
                        key={photo.id}
                        onClick={() => navigateToFilter({ q: photo.original_name })}
                        className="group relative aspect-square rounded-xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-slate-100 dark:bg-slate-800"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photoImgUrl(photo.filename)}
                          alt={photo.original_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                          <span className="text-[9px] text-white font-medium truncate">
                            {photo.faces.length} {photo.faces.length === 1 ? "face" : "faces"}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {query && data?.people.length === 0 && previewPhotos.length === 0 && (
                <div className="text-center py-10 space-y-2">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    No results found for &ldquo;{query}&rdquo;
                  </p>
                  <p className="text-xs text-slate-400">
                    Try searching for a person&apos;s name, photo filename, or clear the search.
                  </p>
                </div>
              )}
            </div>

            {/* Footer with Keyboard Shortcuts */}
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-[#0c0e18] border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 font-mono text-[10px]">
                    Enter
                  </kbd>{" "}
                  Select / Search
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 font-mono text-[10px]">
                    Esc
                  </kbd>{" "}
                  Close
                </span>
              </div>
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                FaceSort AI Smart Search
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
