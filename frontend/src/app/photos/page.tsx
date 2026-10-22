"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Images,
  Search,
  Filter,
  X,
  Check,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Users,
  User,
  Sparkles,
  SlidersHorizontal,
  ArrowUpDown,
  Tag,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
} from "lucide-react";
import { photosApi, peopleApi, photoImgUrl, faceImgUrl } from "@/lib/api";
import type { Photo, Person, SmartSuggestResult } from "@/lib/api";
import { formatDate, pluralize } from "@/lib/utils";
import { toast } from "sonner";

function PhotosContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // State from URL or defaults
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);
  const [matchMode, setMatchMode] = useState<"and" | "or">("and");
  const [faceCountType, setFaceCountType] = useState<"all" | "solo" | "duo" | "group">("all");
  const [tagStatus, setTagStatus] = useState<"all" | "identified" | "has_unknown">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "most_faces">("newest");

  // Data state
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [smartPresets, setSmartPresets] = useState<SmartSuggestResult["presets"]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lightbox, setLightbox] = useState<Photo | null>(null);
  const [loading, setLoading] = useState(true);
  const perPage = 30;

  // Initialize from URL search parameters on mount
  useEffect(() => {
    const pids = searchParams.getAll("person_ids");
    const pid = searchParams.get("person_id");
    const initialPids = pids.length > 0 ? pids : pid ? [pid] : [];
    if (initialPids.length > 0) setSelectedPersonIds(initialPids);

    const mode = searchParams.get("match_mode");
    if (mode === "or" || mode === "and") setMatchMode(mode);

    const fc = searchParams.get("face_count_type");
    if (fc === "solo" || fc === "duo" || fc === "group") setFaceCountType(fc);

    const tag = searchParams.get("tag_status");
    if (tag === "identified" || tag === "has_unknown") setTagStatus(tag);

    const q = searchParams.get("q");
    if (q) setSearchQuery(q);
  }, [searchParams]);

  // Load people and smart presets
  useEffect(() => {
    peopleApi.list().then(setPeople);
    photosApi.suggest("").then((res) => {
      setSmartPresets(res.presets || []);
    });
  }, []);

  // Fetch photos whenever filters change
  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await photosApi.list({
        person_ids: selectedPersonIds.length > 0 ? selectedPersonIds : undefined,
        match_mode: selectedPersonIds.length > 1 ? matchMode : undefined,
        face_count_type: faceCountType !== "all" ? faceCountType : undefined,
        tag_status: tagStatus !== "all" ? tagStatus : undefined,
        q: searchQuery.trim() || undefined,
        sort: sortOrder,
        page,
        per_page: perPage,
      });
      setPhotos(res.photos);
      setTotal(res.total);
    } catch {
      toast.error("Failed to load photos.");
    } finally {
      setLoading(false);
    }
  }, [selectedPersonIds, matchMode, faceCountType, tagStatus, searchQuery, sortOrder, page]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  // Sync state to URL without reloading
  const updateUrl = useCallback(() => {
    const params = new URLSearchParams();
    selectedPersonIds.forEach((id) => params.append("person_ids", id));
    if (selectedPersonIds.length > 1 && matchMode === "or") params.set("match_mode", "or");
    if (faceCountType !== "all") params.set("face_count_type", faceCountType);
    if (tagStatus !== "all") params.set("tag_status", tagStatus);
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    if (sortOrder !== "newest") params.set("sort", sortOrder);

    const queryStr = params.toString();
    router.replace(`/photos${queryStr ? `?${queryStr}` : ""}`, { scroll: false });
  }, [selectedPersonIds, matchMode, faceCountType, tagStatus, searchQuery, sortOrder, router]);

  useEffect(() => {
    updateUrl();
  }, [updateUrl]);

  // Toggle person selection
  const togglePerson = (pid: string) => {
    setPage(1);
    setSelectedPersonIds((prev) =>
      prev.includes(pid) ? prev.filter((id) => id !== pid) : [...prev, pid]
    );
  };

  // Reset all filters
  const resetFilters = () => {
    setSelectedPersonIds([]);
    setMatchMode("and");
    setFaceCountType("all");
    setTagStatus("all");
    setSearchQuery("");
    setSortOrder("newest");
    setPage(1);
    router.replace("/photos");
  };

  const hasActiveFilters =
    selectedPersonIds.length > 0 ||
    faceCountType !== "all" ||
    tagStatus !== "all" ||
    searchQuery.trim() !== "" ||
    sortOrder !== "newest";

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} photo(s)?`)) return;
    try {
      await Promise.all([...selected].map((id) => photosApi.delete(id)));
      toast.success(`Deleted ${pluralize(selected.size, "photo")}`);
      setSelected(new Set());
      fetchPhotos();
    } catch {
      toast.error("Failed to delete photos.");
    }
  };

  const openLightbox = (photo: Photo, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".select-btn")) return;
    setLightbox(photo);
  };

  const totalPages = Math.ceil(total / perPage);

  // Selected people objects
  const selectedPeople = people.filter((p) => selectedPersonIds.includes(p.id));

  return (
    <div className="px-6 sm:px-8 py-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              All Photos
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
              {pluralize(total, "photo")}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Filter by multiple people (&ldquo;Together&rdquo; mode), face count, recognition status, or search query.
          </p>
        </div>

        {selected.size > 0 && (
          <button
            onClick={deleteSelected}
            className="self-start sm:self-auto px-4 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 border border-rose-200 dark:border-rose-900/60 flex items-center gap-1.5 transition-colors"
          >
            <Trash2 size={14} />
            <span>Delete {selected.size} selected</span>
          </button>
        )}
      </div>

      {/* ─── Smart Search Control Panel ─── */}
      <div className="card p-5 space-y-4 shadow-xs">
        {/* Row 1: Search Input & Sort Dropdown */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search by photo filename or person name..."
              className="w-full pl-9 pr-9 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-[#16192d] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#16192d] border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <ArrowUpDown size={13} className="text-slate-400" />
              <select
                value={sortOrder}
                onChange={(e) => {
                  setSortOrder(e.target.value as "newest" | "oldest" | "most_faces");
                  setPage(1);
                }}
                className="bg-transparent outline-none cursor-pointer"
              >
                <option value="newest">Newest Uploads</option>
                <option value="oldest">Oldest First</option>
                <option value="most_faces">Most Faces Detected</option>
              </select>
            </div>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 transition-colors flex items-center gap-1"
                title="Reset all filters"
              >
                <X size={13} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: People Multi-Select with "Together" Switch */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Users size={12} className="text-indigo-500" />
              Filter by People {selectedPersonIds.length > 0 && `(${selectedPersonIds.length} selected)`}
            </span>

            {/* Mode Toggle Switch when 2 or more people selected */}
            {selectedPersonIds.length >= 2 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-[11px] font-bold border border-slate-200 dark:border-slate-700"
              >
                <button
                  type="button"
                  onClick={() => setMatchMode("and")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    matchMode === "and"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                  title="Photos where ALL selected people appear together"
                >
                  ✨ Together (AND)
                </button>
                <button
                  type="button"
                  onClick={() => setMatchMode("or")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    matchMode === "or"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                  title="Photos where ANY of the selected people appear"
                >
                  Either (OR)
                </button>
              </motion.div>
            )}
          </div>

          {/* People Avatars Scroll Row */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {people.map((p) => {
              const isSelected = selectedPersonIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => togglePerson(p.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-500/30"
                      : "bg-slate-50 dark:bg-[#16192d] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600"
                  }`}
                >
                  {p.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={faceImgUrl(p.thumbnail)}
                      alt={p.name}
                      className="w-5 h-5 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[10px] flex items-center justify-center font-bold">
                      {p.name[0]}
                    </span>
                  )}
                  <span>{p.name}</span>
                  {isSelected && <Check size={12} className="stroke-[3]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 3: Face Count & Tagging Status Filters */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Face count buttons */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold mr-1">Face count:</span>
            {(
              [
                { id: "all", label: "All" },
                { id: "solo", label: "👤 Solo (1)" },
                { id: "duo", label: "👥 Duo (2)" },
                { id: "group", label: "👨‍👩‍👧 Group (3+)" },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setFaceCountType(item.id);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  faceCountType === item.id
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Status buttons */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold mr-1">Status:</span>
            {(
              [
                { id: "all", label: "All" },
                { id: "identified", label: "✅ Identified" },
                { id: "has_unknown", label: "❓ Needs Tagging" },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setTagStatus(item.id);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  tagStatus === item.id
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 4: Smart Suggestion Presets Chips (if available) */}
        {smartPresets && smartPresets.length > 0 && !hasActiveFilters && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Sparkles size={11} />
              Suggestions:
            </span>
            {smartPresets.slice(0, 5).map((preset, idx) => (
              <button
                key={idx}
                onClick={() => {
                  if (preset.person_ids) setSelectedPersonIds(preset.person_ids);
                  if (preset.match_mode) setMatchMode(preset.match_mode);
                  if (preset.face_count_type) setFaceCountType(preset.face_count_type);
                  if (preset.tag_status) setTagStatus(preset.tag_status as "all" | "identified" | "has_unknown");
                  setPage(1);
                }}
                className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 hover:bg-indigo-100 shrink-0 transition-colors"
              >
                {preset.title} ({preset.count})
              </button>
            ))}
          </div>
        )}

        {/* Active Filters Summary Badge Bar */}
        {hasActiveFilters && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400 font-semibold">Active:</span>

            {/* Selected Person chips */}
            {selectedPeople.map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800/60"
              >
                <span>{p.name}</span>
                <button onClick={() => togglePerson(p.id)} className="hover:text-indigo-900">
                  <X size={11} />
                </button>
              </span>
            ))}

            {/* Multi-person mode indicator */}
            {selectedPersonIds.length >= 2 && (
              <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200 font-bold text-[10px]">
                Mode: {matchMode === "and" ? "Together (AND)" : "Either (OR)"}
              </span>
            )}

            {/* Face count chip */}
            {faceCountType !== "all" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                <span>{faceCountType === "solo" ? "Solo (1)" : faceCountType === "duo" ? "Duo (2)" : "Group (3+)"}</span>
                <button onClick={() => setFaceCountType("all")}>
                  <X size={11} />
                </button>
              </span>
            )}

            {/* Tag status chip */}
            {tagStatus !== "all" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                <span>{tagStatus === "identified" ? "Identified" : "Needs Tagging"}</span>
                <button onClick={() => setTagStatus("all")}>
                  <X size={11} />
                </button>
              </span>
            )}

            {/* Search query chip */}
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                <span>Query: &ldquo;{searchQuery}&rdquo;</span>
                <button onClick={() => setSearchQuery("")}>
                  <X size={11} />
                </button>
              </span>
            )}

            <span className="ml-auto text-xs font-semibold text-slate-500">
              Showing {total} {total === 1 ? "match" : "matches"}
            </span>
          </div>
        )}
      </div>

      {/* ─── Photo Grid ─── */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="skeleton rounded-2xl aspect-square" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div className="card py-20 text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Images size={28} />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            No matching photos found
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
            {hasActiveFilters
              ? "Try broadening your filters, switching from 'Together (AND)' to 'Either (OR)', or resetting your search."
              : "No photos uploaded yet. Import photos or load the sample demo dataset to get started."}
          </p>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {photos.map((photo) => {
            const isSelected = selected.has(photo.id);
            const recognizedFaces = photo.faces.filter((f) => f.person_name);
            const unknownFaces = photo.faces.filter((f) => !f.person_name);

            return (
              <motion.div
                key={photo.id}
                layout
                className={`group relative aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border transition-all cursor-pointer ${
                  isSelected
                    ? "ring-4 ring-indigo-500 border-transparent shadow-lg shadow-indigo-500/20"
                    : "border-slate-200/80 dark:border-slate-800/80 hover:shadow-md hover:scale-[1.01]"
                }`}
                onClick={(e) => openLightbox(photo, e)}
              >
                {/* Image */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoImgUrl(photo.filename)}
                  alt={photo.original_name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />

                {/* Selection Checkbox */}
                <button
                  type="button"
                  className="select-btn absolute top-2.5 left-2.5 w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm z-10"
                  style={{
                    backgroundColor: isSelected ? "#4f46e5" : "rgba(255,255,255,0.85)",
                    color: isSelected ? "white" : "#64748b",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelect(photo.id);
                  }}
                  title={isSelected ? "Deselect" : "Select"}
                >
                  {isSelected ? (
                    <Check size={13} className="stroke-[3]" />
                  ) : (
                    <span className="w-2.5 h-2.5 rounded-full border border-slate-400" />
                  )}
                </button>

                {/* Overlaid Badges */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                  <p className="text-white text-xs font-semibold truncate">
                    {photo.original_name}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    {recognizedFaces.length > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/80 text-white">
                        {recognizedFaces.map((f) => f.person_name).join(", ")}
                      </span>
                    )}
                    {unknownFaces.length > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/80 text-white">
                        {unknownFaces.length} unknown
                      </span>
                    )}
                  </div>
                </div>

                {/* Permanent face count pill */}
                {photo.faces.length > 0 && (
                  <div className="absolute bottom-2.5 right-2.5 z-10 pointer-events-none">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/60 backdrop-blur-md text-white border border-white/20">
                      {photo.faces.length} {photo.faces.length === 1 ? "face" : "faces"}
                    </span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-6">
          <button
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft size={14} />
            <span>Previous</span>
          </button>
          <span className="text-xs font-bold text-slate-500">
            Page {page} of {totalPages}
          </span>
          <button
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            <span>Next</span>
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
            onClick={() => setLightbox(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative max-w-4xl w-full bg-white dark:bg-[#121424] rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Image Container */}
              <div className="relative bg-black flex items-center justify-center min-h-[300px] max-h-[60vh] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoImgUrl(lightbox.filename)}
                  alt={lightbox.original_name}
                  className="max-w-full max-h-[60vh] object-contain"
                />
              </div>

              {/* Photo Details Footer */}
              <div className="p-5 space-y-3 bg-white dark:bg-[#121424]">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      {lightbox.original_name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Uploaded {formatDate(lightbox.uploaded_at)} · {lightbox.faces.length} {lightbox.faces.length === 1 ? "face" : "faces"} detected
                    </p>
                  </div>

                  <button
                    onClick={() => setLightbox(null)}
                    className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Faces in this photo */}
                {lightbox.faces.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Detected Faces:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {lightbox.faces.map((face) => (
                        <div
                          key={face.face_id}
                          className="flex items-center gap-2 p-1.5 pr-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={faceImgUrl(face.face_image)}
                            alt={face.person_name ?? "Face"}
                            className="w-7 h-7 rounded-lg object-cover"
                          />
                          <div>
                            <span className="text-xs font-semibold text-slate-900 dark:text-white block">
                              {face.person_name ?? "Unknown"}
                            </span>
                            {face.confidence && (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                {(face.confidence * 100).toFixed(0)}% match
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PhotosPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Smart Search...</div>}>
      <PhotosContent />
    </Suspense>
  );
}
