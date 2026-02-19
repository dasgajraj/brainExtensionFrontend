/**
 * types/user.types.ts
 *
 * User domain model returned by the backend.
 *
 * Shape is inferred from /auth/login and /auth/signup responses.
 * Add fields here as the backend API evolves.
 */

export interface User {
  /** MongoDB ObjectId — backend uses _id, not id */
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  emailVerified?: boolean;
  roles?: string[];
  plan?: string;
  createdAt: string;
  updatedAt: string;
}
