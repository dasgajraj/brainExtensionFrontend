/**
 * api/memory.api.ts
 *
 * Brain Memory API
 *   GET    /memory            → list all memories
 *   GET    /memory/search     → semantic search (query param)
 *   GET    /memory/:id        → get single memory
 *   POST   /memory            → create new memory { text }
 *   DELETE /memory/:id        → delete memory
 *
 * All requests use x-brain-pin + Bearer token headers.
 */

import axios from 'axios';
import { BASE_URL, normaliseAxiosError } from './httpClient';
import { tokenService } from '../services/token.service';
import { BRAIN_PIN } from '@env';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MemoryItem {
  _id: string;
  userId: string;
  content: string;
  BrainReqId?: string;
  tags?: string[];
  workspaceId?: string;
  context?: string;
  types?: string;
  decayRate?: number;
  nextReviewDate?: string;
  createdAt: string;
  __v?: number;
}

export interface MemorySearchResult {
  _id: string;
  content: string;
  types?: string;
  createdAt: string;
  score: number;
}

export interface MemoryListResponse {
  status: string;
  count: number;
  memories: MemoryItem[];
}

export interface MemorySearchResponse {
  status: string;
  count: number;
  memories: MemorySearchResult[];
}

export interface SingleMemoryResponse {
  status: string;
  memory: MemoryItem;
}

export interface CreateMemoryResponse {
  status: string;
  memory: MemoryItem;
}

export interface DeleteMemoryResponse {
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
 * GET /memory
 * Returns all memories for the authenticated user.
 */
export async function listMemories(): Promise<MemoryItem[]> {
  try {
    const headers = await authHeaders();
    const { data } = await axios.get<MemoryListResponse>(`${BASE_URL}/memory`, {
      headers,
      timeout: 30_000,
    });
    return data.memories ?? [];
  } catch (error) {
    throw normaliseAxiosError(error);
  }
}

/**
 * GET /memory/search?query=<query>
 * Semantic search across memories.
 */
export async function searchMemories(query: string): Promise<MemorySearchResult[]> {
  try {
    const headers = await authHeaders();
    const { data } = await axios.get<MemorySearchResponse>(
      `${BASE_URL}/memory/search`,
      { headers, params: { query }, timeout: 30_000 },
    );
    return data.memories ?? [];
  } catch (error) {
    throw normaliseAxiosError(error);
  }
}

/**
 * GET /memory/:id
 * Fetches a single memory by its ID.
 */
export async function getMemory(id: string): Promise<MemoryItem> {
  try {
    const headers = await authHeaders();
    const { data } = await axios.get<SingleMemoryResponse>(
      `${BASE_URL}/memory/${id}`,
      { headers, timeout: 20_000 },
    );
    return data.memory;
  } catch (error) {
    throw normaliseAxiosError(error);
  }
}

/**
 * POST /memory
 * Creates a new memory from text.
 */
export async function createMemory(text: string): Promise<MemoryItem> {
  try {
    const headers = await authHeaders({ 'Content-Type': 'application/json' });
    const { data } = await axios.post<CreateMemoryResponse>(
      `${BASE_URL}/memory`,
      { text },
      { headers, timeout: 30_000 },
    );
    return data.memory;
  } catch (error) {
    throw normaliseAxiosError(error);
  }
}

/**
 * DELETE /memory/:id
 * Permanently deletes a memory.
 */
export async function deleteMemory(id: string): Promise<DeleteMemoryResponse> {
  try {
    const headers = await authHeaders();
    const { data } = await axios.delete<DeleteMemoryResponse>(
      `${BASE_URL}/memory/${id}`,
      { headers, timeout: 20_000 },
    );
    return data;
  } catch (error) {
    throw normaliseAxiosError(error);
  }
}
