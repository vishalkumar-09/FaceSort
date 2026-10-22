"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, UserPlus, Check, X, ChevronDown, Loader2 } from "lucide-react";
import { unknownApi, peopleApi, faceImgUrl } from "@/lib/api";
import type { UnknownFace, Person } from "@/lib/api";
import { pluralize } from "@/lib/utils";
import { toast } from "sonner";

function AssignPanel({
  face,
  people,
  onAssign,
  onDismiss,
  onClose,
}: {
  face: UnknownFace;
  people: Person[];
  onAssign: () => void;
  onDismiss: () => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"existing" | "new" | null>(null);
  const [selectedPerson, setSelectedPerson] = useState("");
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (mode === "existing" && !selectedPerson) {
      toast.error("Please select a person.");
      return;
    }
    if (mode === "new" && !newName.trim()) {
      toast.error("Please enter a name.");
      return;
    }

    setLoading(true);
    try {
      await unknownApi.assign(face.id, {
        person_id: mode === "existing" ? selectedPerson : undefined,
        new_name: mode === "new" ? newName.trim() : undefined,
      });
      toast.success("Face assigned successfully.");
      onAssign();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Failed to assign.";
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
        className="w-full max-w-sm rounded-2xl p-6"
        style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Who is this?
          </h2>
          <button onClick={onClose} style={{ color: "var(--text-tertiary)" }}>
            <X size={16} />
          </button>
        </div>

        {/* Face preview */}
        <div className="flex justify-center mb-4">
          <div className="w-24 h-24 rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--bg-tertiary)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={faceImgUrl(face.face_image)}
              alt="Unknown face"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Mode selection */}
        {!mode && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              className="btn-secondary justify-center py-3 flex-col gap-1.5 h-auto"
              onClick={() => setMode("existing")}
            >
              <Check size={16} />
              <span className="text-xs">Existing person</span>
            </button>
            <button
              className="btn-secondary justify-center py-3 flex-col gap-1.5 h-auto"
              onClick={() => setMode("new")}
            >
              <UserPlus size={16} />
              <span className="text-xs">New person</span>
            </button>
          </div>
        )}

        {mode === "existing" && (
          <div className="mb-4">
            <select
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{
                backgroundColor: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
              value={selectedPerson}
              onChange={(e) => setSelectedPerson(e.target.value)}
            >
              <option value="">Select person…</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {mode === "new" && (
          <div className="mb-4">
            <input
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{
                backgroundColor: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
              placeholder="Enter name…"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
            />
          </div>
        )}

        <div className="flex gap-2">
          <button
            className="btn-secondary flex-1 justify-center"
            onClick={async () => {
              await unknownApi.dismiss(face.id);
              toast("Face dismissed.");
              onDismiss();
            }}
          >
            Dismiss
          </button>
          {mode && (
            <button
              className="btn-primary flex-1 justify-center"
              onClick={submit}
              disabled={loading}
            >
              {loading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Check size={14} />
              )}
              Assign
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function UnknownPage() {
  const [faces, setFaces] = useState<UnknownFace[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<UnknownFace | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [uf, ps] = await Promise.all([unknownApi.list(), peopleApi.list()]);
      setFaces(uf.faces);
      setPeople(ps);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssigned = () => {
    setActive(null);
    fetchData();
  };

  return (
    <div className="px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
          Unknown Faces
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-tertiary)" }}>
          {pluralize(faces.length, "face")} awaiting identification
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card p-4">
              <div className="skeleton rounded-2xl mb-3" style={{ aspectRatio: "1" }} />
              <div className="skeleton h-8 rounded-xl" />
            </div>
          ))}
        </div>
      ) : faces.length === 0 ? (
        <div className="text-center py-20">
          <HelpCircle size={40} className="mx-auto mb-3" style={{ color: "var(--text-tertiary)" }} />
          <p className="text-base font-medium mb-1" style={{ color: "var(--text-primary)" }}>
            All faces identified
          </p>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            No unidentified faces remain.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {faces.map((face) => (
            <motion.div key={face.id} layout className="card p-3">
              <div
                className="rounded-xl overflow-hidden mb-3 cursor-pointer"
                style={{ aspectRatio: "1" }}
                onClick={() => setActive(face)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={faceImgUrl(face.face_image)}
                  alt="Unknown face"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                />
              </div>
              <button
                className="btn-primary w-full justify-center py-2 text-xs"
                onClick={() => setActive(face)}
              >
                <UserPlus size={13} />
                Identify
              </button>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {active && (
          <AssignPanel
            face={active}
            people={people}
            onAssign={handleAssigned}
            onDismiss={() => {
              setActive(null);
              fetchData();
            }}
            onClose={() => setActive(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
