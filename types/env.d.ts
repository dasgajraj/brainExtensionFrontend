/**
 * types/env.d.ts
 *
 * TypeScript module declarations for variables exposed by react-native-dotenv.
 * Every key added to .env MUST have a matching declaration here so the
 * TypeScript compiler can verify usage.
 */
declare module '@env' {
  /** Static pincode sent in `x-brain-pin` header for password-reset requests. */
  export const BRAIN_PIN: string;
}
