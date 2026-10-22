"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Images,
  Search,
  Filter,
  X,
  Check,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { photosApi, peopleApi, photoImgUrl, faceImgUrl } from "@/lib/api";
import type { Photo, Person } from "@/lib/api";
import { formatDate, pluralize } from "@/lib/utils";
import { toast } from "sonner";

export default function PhotosPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [personFilter, setPersonFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lightbox, setLightbox] = useState<Photo | null>(null);
  const [loading, setLoading] = useState(true);
  const perPage = 30;

  const fetchPhotos = async () => {
    setLoading(true);
    try {
      const res = await photosApi.list({
        person_id: personFilter || undefined,
        page,
        per_page: perPage,
      });
      setPhotos(res.photos);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, personFilter]);

  useEffect(() => {
    peopleApi.list().then(setPeople);
  }, []);

  const filtered = search
    ? photos.filter((p) =>
        p.original_name.toLowerCase().includes(search.toLowerCase()) ||
        p.faces.some((f) => f.person_name?.toLowerCase().includes(search.toLowerCase()))
      )
    : photos;

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

  return (
    <div className="px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="text-2xl font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            All Photos
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-tertiary)" }}>
            {pluralize(total, "photo")}
          </p>
        </div>

        {selected.size > 0 && (
          <button onClick={deleteSelected} className="btn-secondary text-red-500">
            <Trash2 size={15} />
            Delete {selected.size}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 max-w-sm"
          style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border)" }}
        >
          <Search size={15} style={{ color: "var(--text-tertiary)" }} />
          <input
            className="bg-transparent text-sm flex-1 outline-none"
            style={{ color: "var(--text-primary)" }}
            placeholder="Search photos or people…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")}>
              <X size={14} style={{ color: "var(--text-tertiary)" }} />
            </button>
          )}
        </div>

        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border)" }}
        >
          <Filter size={15} style={{ color: "var(--text-tertiary)" }} />
          <select
            className="bg-transparent text-sm outline-none"
            style={{ color: "var(--text-primary)" }}
            value={personFilter}
            onChange={(e) => {
              setPersonFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All people</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              className="skeleton rounded-xl"
              style={{ aspectRatio: "1" }}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Images
            size={40}
            className="mx-auto mb-3"
            style={{ color: "var(--text-tertiary)" }}
          />
          <p style={{ color: "var(--text-secondary)" }}>
            {search || personFilter ? "No matching photos" : "No photos uploaded yet"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map((photo) => (
            <motion.div
              key={photo.id}
              layout
              className={`photo-thumb ${selected.has(photo.id) ? "selected" : ""}`}
              onClick={(e) => openLightbox(photo, e)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoImgUrl(photo.filename)}
                alt={photo.original_name}
                className="w-full h-full object-cover"
                loading="lazy"
              />

              {/* Select button */}
              <button
                className="select-btn absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center transition-all"
                style={{
                  backgroundColor: selected.has(photo.id)
                    ? "var(--accent)"
                    : "rgba(255,255,255,0.85)",
                  color: selected.has(photo.id) ? "white" : "var(--text-secondary)",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelect(photo.id);
                }}
              >
                {selected.has(photo.id) ? (
                  <Check size={12} />
                ) : (
                  <span className="w-2.5 h-2.5 rounded-full border" />
                )}
              </button>

              {/* Face count */}
              {photo.faces.length > 0 && (
                <div className="absolute bottom-2 right-2">
                  <span className="badge badge-accent text-[10px]">
                    {photo.faces.length}
                  </span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            className="btn-secondary px-3 py-2"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft size={15} />
          </button>
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {page} / {totalPages}
          </span>
          <button
            className="btn-secondary px-3 py-2"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
            onClick={() => setLightbox(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative max-w-3xl max-h-[80vh] rounded-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoImgUrl(lightbox.filename)}
                alt={lightbox.original_name}
                className="max-w-full max-h-[70vh] object-contain"
              />

              {/* Info overlay */}
              <div
                className="p-4"
                style={{ backgroundColor: "var(--bg-card)" }}
              >
                <p
                  className="text-sm font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  {lightbox.original_name}
                </p>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {formatDate(lightbox.uploaded_at)} ·{" "}
                  {lightbox.faces.length > 0
                    ? lightbox.faces
                        .map((f) => f.person_name ?? "Unknown")
                        .join(", ")
                    : "No faces detected"}
                </p>
              </div>

              <button
                className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "rgba(0,0,0,0.5)", color: "white" }}
                onClick={() => setLightbox(null)}
              >
                <X size={15} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
