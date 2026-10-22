/**
 * Centralised API client for FaceSort backend.
 */

import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_URL,
  timeout: 120_000,
});

export const IMG_BASE = `${API_URL}/static`;

export function faceImgUrl(filename: string) {
  return `${IMG_BASE}/faces/${filename}`;
}

export function photoImgUrl(filename: string) {
  return `${IMG_BASE}/uploads/${filename}`;
}

// ─── Types ────────────────────────────────────────────────────
export interface Person {
  id: string;
  name: string;
  photo_count: number;
  reference_count: number;
  thumbnail: string | null;
}

export interface Face {
  face_id: string;
  person_id: string | null;
  person_name: string | null;
  confidence: number | null;
  bbox: number[];
  face_image: string;
}

export interface Photo {
  id: string;
  filename: string;
  original_name: string;
  uploaded_at: string;
  faces: Face[];
}

export interface UnknownFace {
  id: string;
  photo_id: string;
  face_id: string;
  face_image: string;
  bbox: number[];
  assigned: boolean;
  assigned_to: string | null;
}

export interface Stats {
  people: number;
  photos: number;
  unknown_faces: number;
}

// ─── API Calls ────────────────────────────────────────────────
export const peopleApi = {
  list: () => api.get<Person[]>("/api/people").then((r) => r.data),
  get: (id: string) => api.get(`/api/people/${id}`).then((r) => r.data),
  register: (formData: FormData) =>
    api.post("/api/people", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data),
  rename: (id: string, name: string) =>
    api.patch(`/api/people/${id}`, { name }).then((r) => r.data),
  delete: (id: string) => api.delete(`/api/people/${id}`),
};

export const photosApi = {
  list: (params?: { person_id?: string; page?: number; per_page?: number }) =>
    api.get<{ total: number; page: number; per_page: number; photos: Photo[] }>(
      "/api/photos",
      { params }
    ).then((r) => r.data),
  get: (id: string) => api.get<Photo>(`/api/photos/${id}`).then((r) => r.data),
  upload: (formData: FormData, onProgress?: (pct: number) => void) =>
    api
      .post("/api/photos/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          if (onProgress && e.total) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        },
      })
      .then((r) => r.data),
  delete: (id: string) => api.delete(`/api/photos/${id}`),
};

export const organizeApi = {
  preview: () => api.get("/api/organize/preview").then((r) => r.data),
  run: () => api.post("/api/organize/run").then((r) => r.data),
  openFolder: () =>
    api.post<{ success: boolean; path: string }>("/api/organize/open-folder").then((r) => r.data),
  downloadUrl: () => `${API_URL}/api/organize/download`,
  downloadZip: () => {
    // Direct native browser navigation to attachment endpoint
    // Guarantees proper filename FaceSort_organized.zip with .zip extension
    window.location.href = `${API_URL}/api/organize/download`;
    return true;
  },
};

export const unknownApi = {
  list: () =>
    api.get<{ count: number; faces: UnknownFace[] }>("/api/unknown").then((r) => r.data),
  assign: (faceId: string, body: { person_id?: string; new_name?: string }) =>
    api.post(`/api/unknown/${faceId}/assign`, body).then((r) => r.data),
  dismiss: (faceId: string) => api.delete(`/api/unknown/${faceId}`),
};

export const statsApi = {
  get: () => api.get<Stats>("/api/stats").then((r) => r.data),
};

export const demoApi = {
  seed: () => api.post<{ status: string; message: string; people_count: number; photos_count: number; unknown_faces_count: number }>("/api/demo/seed").then((r) => r.data),
  reset: () => api.post<{ status: string; message: string }>("/api/demo/reset").then((r) => r.data),
};

