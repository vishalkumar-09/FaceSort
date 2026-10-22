"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Camera } from "lucide-react";
import { peopleApi, photoImgUrl, faceImgUrl } from "@/lib/api";
import { pluralize, formatDate } from "@/lib/utils";

export default function PersonDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [person, setPerson] = useState<{ name: string; photos: { filename: string; original_name: string; uploaded_at: string }[]; reference_photos: string[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      peopleApi.get(id).then((data) => {
        setPerson(data);
        setLoading(false);
      });
    }
  }, [id]);

  if (loading) {
    return (
      <div className="px-8 py-8">
        <div className="skeleton h-6 w-40 rounded mb-6" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton rounded-xl" style={{ aspectRatio: "1" }} />
          ))}
        </div>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="px-8 py-8 text-center">
        <p style={{ color: "var(--text-secondary)" }}>Person not found.</p>
        <Link href="/people" className="btn-secondary mt-4 inline-flex">
          <ArrowLeft size={14} /> Back to People
        </Link>
      </div>
    );
  }

  return (
    <div className="px-8 py-8 max-w-4xl">
      <Link
        href="/people"
        className="inline-flex items-center gap-1.5 text-sm mb-6"
        style={{ color: "var(--text-tertiary)" }}
      >
        <ArrowLeft size={14} /> People
      </Link>

      <div className="flex items-center gap-4 mb-8">
        <div
          className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0"
          style={{ backgroundColor: "var(--accent-light)" }}
        >
          {person.reference_photos?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={faceImgUrl(person.reference_photos[0])}
              alt={person.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-2xl font-semibold"
              style={{ color: "var(--accent)" }}
            >
              {person.name[0]?.toUpperCase()}
            </div>
          )}
        </div>
        <div>
          <h1
            className="text-2xl font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {person.name}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-tertiary)" }}>
            {pluralize(person.photos?.length ?? 0, "photo")}
          </p>
        </div>
      </div>

      {(!person.photos || person.photos.length === 0) ? (
        <div className="text-center py-16">
          <Camera size={36} className="mx-auto mb-3" style={{ color: "var(--text-tertiary)" }} />
          <p style={{ color: "var(--text-secondary)" }}>
            No photos assigned to {person.name} yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {person.photos.map((photo: { filename: string; original_name: string; uploaded_at: string }) => (
            <div key={photo.filename} className="photo-thumb" style={{ aspectRatio: "1" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoImgUrl(photo.filename)}
                alt={photo.original_name}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
