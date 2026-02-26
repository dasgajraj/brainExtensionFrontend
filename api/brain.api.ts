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

import httpClient, { normaliseAxiosError } from './httpClient';

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

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * POST /brain/ask
 * Submits a query to the Cognitive OS.  Returns immediately with a requestId.
 */
export async function askBrain(payload: BrainAskRequest): Promise<BrainAskResponse> {
  console.log('🧠 [brain.api] askBrain → POST /brain/ask', { query: payload.query.slice(0, 80), mode: payload.mode, workspaceId: payload.workspaceId, targetLanguage: payload.targetLanguage });
  try {
    const { data } = await httpClient.post<BrainAskResponse>('/brain/ask', payload);
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
    );
    console.log('✅ [brain.api] getBrainResult ← success', { status: data.request.status, lobe: data.request.selectedLobe, output: data.request.output ? `${String(data.request.output).slice(0, 60)}...` : null });
    return data;
  } catch (error) {
    console.error(`❌ [brain.api] getBrainResult ← error for id=${requestId}`, error);
    throw normaliseAxiosError(error);
  }
}
