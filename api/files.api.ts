/**
 * api/files.api.ts
 *
 * Brain File Storage API
 *   GET    /files          → list all user files
 *   POST   /files/upload   → upload any file (multipart/form-data)
 *   GET    /files/:id      → fetch one file record
 *   DELETE /files/:id      → delete a file
 *
 * All calls use plain axios + manual token to avoid async-interceptor
 * POST-body corruption on RN New Architecture (Bridgeless/Hermes/Fabric).
 */

import axios from 'axios';
import { BASE_URL, normaliseAxiosError } from './httpClient';
import { tokenService } from '../services/token.service';
import { BRAIN_PIN } from '@env';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FileMetadata {
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
  resource_type?: string;
  created_at?: string;
}

export interface BrainFile {
  _id: string;
  userId: string;
  originalName: string;
  filename: string;
  mimeType: string;
  size: number;
  storage: 'cloudinary' | 'supabase' | string;
  url: string;
  path?: string;
  cloudinary_public_id?: string;
  ingestionStatus: 'queued' | 'processing' | 'done' | 'failed' | string;
  metadata?: FileMetadata;
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

export interface FilesListResponse {
  status: string;
  /** API may return a single `file` object or an array under `files` */
  file?: BrainFile;
  files?: BrainFile[];
}

export interface SingleFileResponse {
  status: string;
  file: BrainFile;
}

export interface DeleteFileResponse {
  status: string;
  message?: string;
}

// ─── Shared headers helper ────────────────────────────────────────────────────

async function authHeaders(extra?: Record<string, string>) {
  const accessToken = await tokenService.getAccessToken();
  return {
    'x-brain-pin': BRAIN_PIN,
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...extra,
  };
}

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * GET /files
 * Returns all files uploaded by the authenticated user.
 * The server response may return a single `file` or an array `files`.
 * This function always resolves to BrainFile[].
 */
export async function listFiles(): Promise<BrainFile[]> {
  try {
    const headers = await authHeaders();
    const { data } = await axios.get<FilesListResponse>(`${BASE_URL}/files`, {
      headers,
      timeout: 30_000,
    });
    // Normalise: server may return a single object or an array
    if (Array.isArray(data.files)) { return data.files; }
    if (Array.isArray((data as any).data)) { return (data as any).data; }
    if (data.file) { return [data.file]; }
    return [];
  } catch (error) {
    throw normaliseAxiosError(error);
  }
}

/**
 * POST /files/upload  (multipart/form-data)
 * @param uri      Local file URI, e.g. file:///data/...
 * @param name     Original file name, e.g. "photo.png"
 * @param mimeType MIME type, e.g. "image/png" or "application/pdf"
 */
export async function uploadFile(
  uri: string,
  name: string,
  mimeType: string,
): Promise<SingleFileResponse> {
  try {
    const headers = await authHeaders({ 'Content-Type': 'multipart/form-data' });

    const form = new FormData();
    form.append('file', {
      uri: uri.startsWith('file://') ? uri : `file://${uri}`,
      type: mimeType || 'application/octet-stream',
      name,
    } as any);

    const { data } = await axios.post<SingleFileResponse>(
      `${BASE_URL}/files/upload`,
      form,
      { headers, timeout: 90_000 },
    );
    return data;
  } catch (error) {
    throw normaliseAxiosError(error);
  }
}

/**
 * GET /files/:id
 * Fetches metadata for a single file by its MongoDB _id.
 */
export async function getFile(id: string): Promise<BrainFile> {
  try {
    const headers = await authHeaders();
    const { data } = await axios.get<SingleFileResponse>(
      `${BASE_URL}/files/${id}`,
      { headers, timeout: 20_000 },
    );
    return data.file;
  } catch (error) {
    throw normaliseAxiosError(error);
  }
}

/**
 * DELETE /files/:id
 * Permanently deletes a file from cloud storage and the database.
 */
export async function deleteFile(id: string): Promise<DeleteFileResponse> {
  try {
    const headers = await authHeaders();
    const { data } = await axios.delete<DeleteFileResponse>(
      `${BASE_URL}/files/${id}`,
      { headers, timeout: 20_000 },
    );
    return data;
  } catch (error) {
    throw normaliseAxiosError(error);
  }
}
