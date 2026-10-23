"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Plus, Pencil, Trash2, Upload, X, Check, QrCode } from "lucide-react";
import { peopleApi, faceImgUrl, photoImgUrl } from "@/lib/api";
import type { Person } from "@/lib/api";
import { pluralize } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import { ShareModal } from "@/components/ShareModal";

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
    const arr = Array.from(newFiles).filter((f) =>
      ["image/jpeg", "image/png"].includes(f.type)
    );
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
      toast.error("Please enter a name.");
      return;
    }
    if (files.length === 0) {
      toast.error("Please upload at least one photo.");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("name", name.trim());
      files.forEach((f) => fd.append("files", f));
      await peopleApi.register(fd);
      toast.success(`${name} registered successfully!`);
      onAdded();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Failed to register person.";
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md rounded-2xl p-6"
        style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2
            className="text-base font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Register new person
          </h2>
          <button onClick={onClose} style={{ color: "var(--text-tertiary)" }}>
            <X size={18} />
          </button>
        </div>

        {/* Name */}
        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
          Full name
        </label>
        <input
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none mb-4"
          style={{
            backgroundColor: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
          placeholder="e.g. Akash Vishal"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />

        {/* Photo upload */}
        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
          Reference photos
        </label>
        <div
          className="drop-zone p-4 text-center cursor-pointer mb-4"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFiles(e.dataTransfer.files);
          }}
        >
          <Upload size={20} className="mx-auto mb-2" style={{ color: "var(--text-tertiary)" }} />
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Drop photos here or <span style={{ color: "var(--accent)" }}>browse</span>
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {/* Previews */}
        {previews.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {previews.map((src, i) => (
              <div key={i} className="relative w-14 h-14 rounded-xl overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button
                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "rgba(0,0,0,0.6)", color: "white" }}
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

        <div className="flex gap-2 justify-end">
          <button className="btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="btn-primary" onClick={submit} disabled={loading}>
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Check size={15} />
            )}
            Register
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [sharingPerson, setSharingPerson] = useState<Person | null>(null);

  const fetch = async () => {
    setLoading(true);
    try {
      const data = await peopleApi.list();
      setPeople(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
  }, []);

  const handleRename = async (id: string) => {
    if (!newName.trim()) return;
    try {
      await peopleApi.rename(id, newName.trim());
      toast.success("Person renamed.");
      setRenaming(null);
      fetch();
    } catch {
      toast.error("Failed to rename.");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove ${name} from FaceSort?`)) return;
    try {
      await peopleApi.delete(id);
      toast.success(`${name} removed.`);
      fetch();
    } catch {
      toast.error("Failed to delete.");
    }
  };

  return (
    <div className="px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="text-2xl font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            People
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-tertiary)" }}>
            {pluralize(people.length, "person", "people")} registered
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={15} />
          Add person
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-4">
              <div className="skeleton rounded-2xl mb-3" style={{ aspectRatio: "1" }} />
              <div className="skeleton h-4 rounded w-3/4 mb-2" />
              <div className="skeleton h-3 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : people.length === 0 ? (
        <div className="text-center py-20">
          <Users size={40} className="mx-auto mb-3" style={{ color: "var(--text-tertiary)" }} />
          <p className="mb-4" style={{ color: "var(--text-secondary)" }}>
            No people registered yet
          </p>
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={15} /> Add first person
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {people.map((person) => (
            <motion.div
              key={person.id}
              layout
              className="person-card"
            >
              <Link href={`/people/view?id=${person.id}`}>
                <div className="person-avatar mb-3 rounded-2xl overflow-hidden" style={{ aspectRatio: "1" }}>
                  {person.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={faceImgUrl(person.thumbnail)}
                      alt={person.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-3xl font-semibold"
                      style={{ backgroundColor: "var(--accent-light)", color: "var(--accent)" }}
                    >
                      {person.name[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
              </Link>

              {renaming === person.id ? (
                <div className="flex gap-1">
                  <input
                    className="flex-1 px-2 py-1 rounded-lg text-sm outline-none"
                    style={{
                      backgroundColor: "var(--bg-secondary)",
                      border: "1px solid var(--border)",
                      color: "var(--text-primary)",
                    }}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename(person.id);
                      if (e.key === "Escape") setRenaming(null);
                    }}
                    autoFocus
                  />
                  <button
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: "var(--accent)", color: "white" }}
                    onClick={() => handleRename(person.id)}
                  >
                    <Check size={12} />
                  </button>
                </div>
              ) : (
                <>
                  <p
                    className="text-sm font-medium truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {person.name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                    {pluralize(person.photo_count, "photo")}
                  </p>

                  <div className="flex gap-1.5 mt-3">
                    <button
                      className="flex-1 btn-secondary py-1.5 text-xs"
                      onClick={() => {
                        setRenaming(person.id);
                        setNewName(person.name);
                      }}
                    >
                      <Pencil size={12} /> Rename
                    </button>
                    <button
                      className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                      onClick={() => setSharingPerson(person)}
                      title="Share album via Local Wi-Fi"
                    >
                      <QrCode size={13} />
                    </button>
                    <button
                      className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                      style={{ border: "1px solid var(--border)" }}
                      onClick={() => handleDelete(person.id, person.name)}
                      title="Delete person"
                    >
                      <Trash2 size={13} className="text-red-500" />
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Person Modal */}
      <AnimatePresence>
        {showAdd && (
          <AddPersonModal onClose={() => setShowAdd(false)} onAdded={fetch} />
        )}
      </AnimatePresence>

      {/* Share Modal */}
      {sharingPerson && (
        <ShareModal
          isOpen={true}
          onClose={() => setSharingPerson(null)}
          person={sharingPerson}
        />
      )}
    </div>
  );
}
