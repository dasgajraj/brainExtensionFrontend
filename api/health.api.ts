/**
 * api/health.api.ts
 *
 * Raw HTTP call for the health-check endpoint.
 *
 * NOTE: This uses a plain axios call rather than httpClient so that the
 * health check can proceed independently of auth state and without
 * triggering the token-refresh interceptor.  This is intentional —
 * /health is a public endpoint and must remain callable during bootstrap
 * before any tokens exist.
 */

import axios from 'axios';
import type { HealthResponse } from '../types/api.types';
import { BASE_URL, normaliseAxiosError } from './httpClient';

const HEALTH_URL = `${BASE_URL}/health`;
// Render free tier can take 90-120 s to cold-start after inactivity.
// One 120-second attempt is more effective than repeated 30-second pokes
// because the server needs sustained time to boot.
const HEALTH_TIMEOUT_MS = 120_000;

/**
 * Tests server availability.
 *
 * @throws NormalisedError if the server is unreachable or returns non-2xx
 */
export async function checkHealth(): Promise<HealthResponse> {
  try {
    const response = await axios.get<HealthResponse>(HEALTH_URL, {
      timeout: HEALTH_TIMEOUT_MS,
    });
    return response.data;
  } catch (error) {
    throw normaliseAxiosError(error);
  }
}
