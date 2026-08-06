// src/lib/supabaseApi.js
//
// Ported 1:1 from the original app/index.html `api()` helper. Same
// endpoint, same headers, same error handling -- the backend/API contract
// is unchanged, only how the frontend is built has changed.
//
// The URL/anon key now read from Vite env vars first (VITE_SUPABASE_URL /
// VITE_SUPABASE_ANON_KEY), falling back to the values the project has
// always shipped with so `npm run dev` still works with zero setup. The
// anon key is safe to ship in client bundles by Supabase's own design --
// real access control lives in RLS, not in hiding this value -- but
// pushing this repo to a public GitHub remote and deploying to Vercel is
// exactly the point where using env vars (set once in the Vercel project
// dashboard, and in `.env.local` for local dev) becomes worth doing: it
// lets the same codebase point at a different Supabase project (staging
// vs. production) without editing source.
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://tnqeicxwxwtufuglxmdb.supabase.co'
export const ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRucWVpY3h3eHd0dWZ1Z2x4bWRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3NDMxNTksImV4cCI6MjEwMTMxOTE1OX0.QmH_sZ3fv6rywlCqj5cmX1VDjQHYTeOr7psAp7GMIKg'

let currentAccessToken = null
export function setAccessToken(token) {
  currentAccessToken = token
}

/**
 * Calls the Supabase REST/Auth API. Identical semantics to the original
 * vanilla-JS `api()`: throws an Error with the server's message on any
 * non-2xx response, returns parsed JSON (or null for 204/empty bodies).
 */
export async function api(path, opts = {}) {
  const headers = {
    apikey: ANON_KEY,
    Authorization: `Bearer ${currentAccessToken || ANON_KEY}`,
    'Content-Type': 'application/json',
    ...opts.headers,
  }
  const res = await fetch(SUPABASE_URL + path, {
    method: opts.method || 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const errBody = await res.json()
      message = errBody.message || errBody.msg || errBody.error_description || message
    } catch {
      /* non-JSON error body -- keep the generic HTTP status message */
    }
    throw new Error(message)
  }
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}
