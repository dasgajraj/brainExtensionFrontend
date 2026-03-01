/**
 * api/brain.api.ts
 *
 * Brain cognitive OS API — two endpoints:
 *   POST /brain/ask      → submit a query, get a requestId back immediately
 *   GET  /brain/result/:id → poll until status === 'done' or 'failed'
 *
 * Authorization is handled automatically by the httpClient Bearer interceptor
 * (reads accessToken from AsyncStorage / token.service.ts).
 */

import axios from 'axios';
import httpClient, { BASE_URL, normaliseAxiosError } from './httpClient';
import { tokenService } from '../services/token.service';
import { BRAIN_PIN } from '@env';

// ─── Request / Response Types ─────────────────────────────────────────────────

export interface BrainAskRequest {
  query: string;
  /** e.g. "English", "Hindi", "Tamil" */
  targetLanguage: string;
  /** "study" | "default" | "creative" */
  mode: string;
  /** workspace / lobe identifier, e.g. "Economics_101" | "General" */
  workspaceId: string;
}

/** Immediate response from POST /brain/ask */
export interface BrainAskResponse {
  status: string;
  message: string;
  requestId: string;
  selectedLobe: string;
  routerReason: string;
  mode: string;
  confidence: number;
}

/** Full request document returned by GET /brain/result/:id */
export interface BrainRequest {
  _id: string;
  userId: string;
  inputType: string;
  query: string;
  lobe: string;
  selectedLobe: string;
  routerReason: string;
  routerConfidence: number;
  /** "pending" | "processing" | "done" | "failed" */
  status: string;
  output: string | null;
  error: string | null;
  targetLanguage: string;
  workspaceId: string;
  mode: string;
  createdAt: string;
  updatedAt: string;
}

export interface BrainResultResponse {
  status: string;
  request: BrainRequest;
}

// ─── Translate ────────────────────────────────────────────────────────────────

export interface BrainTranslateRequest {
  text: string;
  targetLanguage: string;
}

export interface BrainTranslateResponse {
  status: string;
  translation: string;
  sourceText: string;
  targetLanguage: string;
}

// ─── Vision ───────────────────────────────────────────────────────────────────

export interface BrainVisionRequest {
  /** Full data URI: "data:image/png;base64,..." */
  image: string;
  workspaceId: string;
}

export interface BrainVisionResponse {
  status: string;
  explanation: string;
}

export interface DreamEntry {
  id: string;
  date: string;
  title: string;
  insight: string;
  action: string;
}

export interface DreamsResponse {
  status: string;
  count: number;
  journal: DreamEntry[];
}

export interface GraphNode {
  id: string;
  label: string;
  fullText: string;
  type: 'memory' | 'file' | string;
  group: 'answer' | 'file' | string;
  val: number;        // relative size / strength weight
}

export interface GraphLink {
  source: string;
  target: string;
  strength: number;
}

export interface GraphStats {
  totalNodes: number;
  totalLinks: number;
}

export interface GraphResponse {
  status: string;
  stats: GraphStats;
  data: {
    nodes: GraphNode[];
    links: GraphLink[];
  };
}

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * POST /brain/ask
 * Submits a query to the Cognitive OS.  Returns immediately with a requestId.
 */
export async function askBrain(payload: BrainAskRequest): Promise<BrainAskResponse> {
  console.log('🧠 [brain.api] askBrain → POST /brain/ask', { query: payload.query.slice(0, 80), mode: payload.mode, workspaceId: payload.workspaceId, targetLanguage: payload.targetLanguage });
  try {
    // Use plain axios (not httpClient) to avoid async-interceptor issues with
    // POST bodies on React Native New Architecture (Bridgeless/Hermes).
    // This is the same pattern used by apiRefresh which is known to work.
    const accessToken = await tokenService.getAccessToken();
    const { data } = await axios.post<BrainAskResponse>(
      `${BASE_URL}/brain/ask`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-brain-pin': BRAIN_PIN,
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        timeout: 30_000,
      },
    );
    console.log('✅ [brain.api] askBrain ← success', { requestId: data.requestId, selectedLobe: data.selectedLobe, confidence: data.confidence, routerReason: data.routerReason });
    return data;
  } catch (error) {
    console.error('❌ [brain.api] askBrain ← error', error);
    throw normaliseAxiosError(error);
  }
}

/**
 * GET /brain/result/:id
 * Fetches the processing result for a given requestId.
 * Poll this until request.status === "done" or "failed".
 */
export async function getBrainResult(requestId: string): Promise<BrainResultResponse> {
  console.log(`📊 [brain.api] getBrainResult → GET /brain/result/${requestId}`);
  try {
    const { data } = await httpClient.get<BrainResultResponse>(
      `/brain/result/${requestId}`,
      { headers: { 'x-brain-pin': BRAIN_PIN } },
    );
    console.log('✅ [brain.api] getBrainResult ← success', { status: data.request.status, lobe: data.request.selectedLobe, output: data.request.output ? `${String(data.request.output).slice(0, 60)}...` : null });
    return data;
  } catch (error) {
    console.error(`❌ [brain.api] getBrainResult ← error for id=${requestId}`, error);
    throw normaliseAxiosError(error);
  }
}

/**
 * POST /brain/translate
 * Translates text into the target language.
 * Uses plain axios (not httpClient) to avoid async-interceptor POST-body issues.
 */
export async function translateBrain(payload: BrainTranslateRequest): Promise<BrainTranslateResponse> {
  console.log('🌐 [brain.api] translateBrain → POST /brain/translate', { textLen: payload.text.length, targetLanguage: payload.targetLanguage });
  try {
    const accessToken = await tokenService.getAccessToken();
    const { data } = await axios.post<BrainTranslateResponse>(
      `${BASE_URL}/brain/translate`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-brain-pin': BRAIN_PIN,
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        timeout: 30_000,
      },
    );
    console.log('✅ [brain.api] translateBrain ← success', { targetLanguage: data.targetLanguage, translationLen: data.translation?.length });
    return data;
  } catch (error) {
    console.error('❌ [brain.api] translateBrain ← error', error);
    throw normaliseAxiosError(error);
  }
}

/**
 * GET /brain/dreams
 * Fetches the user's brain dream journal.
 * Uses plain axios to avoid async-interceptor issues on New Architecture.
 */
export async function getDreams(): Promise<DreamsResponse> {
  try {
    const accessToken = await tokenService.getAccessToken();
    const { data } = await axios.get<DreamsResponse>(
      `${BASE_URL}/brain/dreams`,
      {
        headers: {
          'x-brain-pin': BRAIN_PIN,
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        timeout: 30_000,
      },
    );
    return data;
  } catch (error) {
    throw normaliseAxiosError(error);
  }
}

export async function analyzeVision(payload: BrainVisionRequest): Promise<BrainVisionResponse> {
  console.log('👁️ [brain.api] analyzeVision → POST /brain/vision', { workspaceId: payload.workspaceId, imageLen: payload.image.length });
  try {
    const accessToken = await tokenService.getAccessToken();
    const { data } = await axios.post<BrainVisionResponse>(
      `${BASE_URL}/brain/vision`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-brain-pin': BRAIN_PIN,
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        timeout: 60_000, // vision can take longer
      },
    );
    // Server may return explanation in different field names
    const explanation = data.explanation ?? (data as any).result ?? (data as any).analysis ?? (data as any).output ?? '';
    console.log('✅ [brain.api] analyzeVision ← success', { explanationLen: explanation.length });
    return { ...data, explanation };
  } catch (error) {
    console.error('❌ [brain.api] analyzeVision ← error', error);
    throw normaliseAxiosError(error);
  }
}

/**
 * GET /brain/graph  — semantic memory graph (no parameters)
 */
export async function getGraph(): Promise<GraphResponse> {
  console.log('🕸️ [brain.api] getGraph → GET /brain/graph');
  try {
    const accessToken = await tokenService.getAccessToken();
    const { data } = await axios.get<GraphResponse>(
      `${BASE_URL}/brain/graph`,
      {
        headers: {
          'x-brain-pin': BRAIN_PIN,
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        timeout: 30_000,
      },
    );
    console.log('✅ [brain.api] getGraph ← success', { nodes: data.stats?.totalNodes, links: data.stats?.totalLinks });
    return data;
  } catch (error) {
    console.error('❌ [brain.api] getGraph ← error', error);
    throw normaliseAxiosError(error);
  }
}
