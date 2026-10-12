// Vercel exposes the production domain at build time; fall back to localhost for local dev.
export const baseURL: string = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";
