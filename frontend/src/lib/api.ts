/**
 * Centralised API client for FaceSort backend.
 */

import axios from "axios";

export const getApiUrl = () => {
  if (typeof window !== "undefined") {
    // Both host computer and phones on local Wi-Fi communicate through the same origin port
    // In dev: http://10.25.154.234:3000 (proxied by Next.js to 8000 internally)
    // In desktop standalone: http://127.0.0.1:8000 (served directly by FastAPI)
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
};

export const api = axios.create({
  timeout: 15_000,
});

api.interceptors.request.use((config) => {
  config.baseURL = getApiUrl();
  return config;
});

export function faceImgUrl(filename: string) {
  if (typeof window !== "undefined") {
    return `/static/faces/${encodeURIComponent(filename)}`;
  }
  return `${getApiUrl()}/static/faces/${encodeURIComponent(filename)}`;
}

export function photoImgUrl(filename: string) {
  if (typeof window !== "undefined") {
    return `/static/uploads/${encodeURIComponent(filename)}`;
  }
  return `${getApiUrl()}/static/uploads/${encodeURIComponent(filename)}`;
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

export interface PhotoFilterParams {
  person_id?: string;
  person_ids?: string[];
  match_mode?: "and" | "or";
  q?: string;
  face_count_type?: "solo" | "duo" | "group" | "any";
  tag_status?: "all" | "identified" | "has_unknown" | "pure_unknown";
  sort?: "newest" | "oldest" | "most_faces";
  page?: number;
  per_page?: number;
}

export interface SmartSuggestResult {
  people: {
    id: string;
    name: string;
    count: number;
    face_image?: string | null;
  }[];
  presets: {
    title: string;
    person_ids?: string[];
    match_mode?: "and" | "or";
    face_count_type?: "solo" | "duo" | "group";
    tag_status?: "identified" | "has_unknown" | "pure_unknown";
    count: number;
  }[];
  total_photos: number;
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
  list: (params?: PhotoFilterParams) =>
    api
      .get<{ total: number; page: number; per_page: number; photos: Photo[] }>(
        "/api/photos",
        {
          params,
          paramsSerializer: {
            indexes: null,
          },
        }
      )
      .then((r) => r.data),
  suggest: (q: string = "") =>
    api
      .get<SmartSuggestResult>("/api/photos/smart-suggest", { params: { q } })
      .then((r) => r.data),
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
  downloadUrl: () => `${getApiUrl()}/api/organize/download`,
  downloadZip: () => {
    const url = typeof window !== "undefined" ? `${window.location.origin}/api/organize/download` : `${getApiUrl()}/api/organize/download`;
    try {
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "FaceSort_organized.zip");
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        try {
          document.body.removeChild(link);
        } catch {
          // ignore
        }
      }, 500);
    } catch {
      window.location.href = url;
    }
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

export interface ShareSession {
  share_id: string;
  code: string;
  person_id: string;
  person_name: string;
  person_thumbnail?: string | null;
  allow_download: boolean;
  created_at: string;
  expires_at?: string | null;
  photo_count: number;
  share_url: string;
  lan_ip: string;
}

export interface SharedAlbumData {
  share_id: string;
  code?: string;
  person_id: string;
  person_name: string;
  person_thumbnail?: string | null;
  allow_download: boolean;
  expires_at?: string | null;
  photo_count: number;
  photos: {
    id: string;
    filename: string;
    original_name: string;
    uploaded_at: string;
    face_count: number;
  }[];
}

export const shareApi = {
  getNetworkInfo: () =>
    api
      .get<{ lan_ip: string; frontend_port: number; backend_port: number; base_url: string }>(
        "/api/share/network-info"
      )
      .then((r) => r.data),
  create: (body: { person_id: string; allow_download?: boolean; expires_in_hours?: number }) =>
    api.post<ShareSession>("/api/share/create", body).then((r) => r.data),
  getShared: async (tokenOrCode: string): Promise<SharedAlbumData> => {
    // In browser, use direct native fetch with timeout for max reliability across mobile browsers
    if (typeof window !== "undefined") {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        const resp = await fetch(`/api/share/${encodeURIComponent(tokenOrCode.trim())}`, {
          signal: controller.signal,
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        clearTimeout(timer);
        if (!resp.ok) {
          const errJson = await resp.json().catch(() => ({}));
          throw new Error(errJson.detail || `Server returned ${resp.status}`);
        }
        return await resp.json();
      } catch (err: any) {
        clearTimeout(timer);
        if (err.name === "AbortError") {
          throw new Error("Connection timed out. Please check that your phone is on the same Wi-Fi.");
        }
        throw err;
      }
    }
    return api.get<SharedAlbumData>(`/api/share/${encodeURIComponent(tokenOrCode.trim())}`).then((r) => r.data);
  },
  downloadZipUrl: (tokenOrCode: string) => {
    if (typeof window !== "undefined") {
      return `/api/share/${encodeURIComponent(tokenOrCode.trim())}/download`;
    }
    return `${getApiUrl()}/api/share/${encodeURIComponent(tokenOrCode.trim())}/download`;
  },
};

