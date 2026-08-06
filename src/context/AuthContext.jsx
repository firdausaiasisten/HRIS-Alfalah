// src/context/AuthContext.jsx
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, setAccessToken } from '../lib/supabaseApi'

const AuthContext = createContext(null)

// Neither the original vanilla-JS app nor the first React port persisted
// the session anywhere -- `state.session`/`useState` both live only in
// memory, so every full page reload (or opening a second tab) silently
// logs the user out even though their Supabase refresh token would still
// be valid for weeks. Persisting just the refresh token (not the
// short-lived access token) and exchanging it for a fresh access token on
// mount fixes that without weakening security: the refresh token is the
// same credential Supabase's own client SDK stores in localStorage by
// default.
const STORAGE_KEY = 'hris-refresh-token'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  // Distinct from `loading` (used for the login form's submit spinner):
  // this covers the one-time check on first mount for a saved session, so
  // route guards can wait instead of bouncing straight to /login and then
  // flashing back once restoration finishes.
  const [initializing, setInitializing] = useState(true)

  // Same call as the original fetchRole(): reads user_roles for the
  // current user, defaults to "pending" if no row exists yet.
  const fetchRole = useCallback(async (currentUser) => {
    const rows = await api(`/rest/v1/user_roles?select=role,full_name&user_id=eq.${currentUser.id}`)
    if (rows && rows[0]) {
      setRole(rows[0].role)
      setFullName(rows[0].full_name)
    } else {
      setRole('pending')
    }
  }, [])

  const persistSession = useCallback((data) => {
    setAccessToken(data.access_token)
    setSession(data)
    setUser(data.user)
    try {
      if (data.refresh_token) localStorage.setItem(STORAGE_KEY, data.refresh_token)
    } catch {
      /* localStorage unavailable/full -- session still works for this tab */
    }
  }, [])

  // On first mount, try to silently resume a session from a saved refresh
  // token before rendering any route guard decision.
  useEffect(() => {
    let cancelled = false
    async function restore() {
      let refreshToken
      try {
        refreshToken = localStorage.getItem(STORAGE_KEY)
      } catch {
        refreshToken = null
      }
      if (!refreshToken) {
        setInitializing(false)
        return
      }
      try {
        const data = await api('/auth/v1/token?grant_type=refresh_token', {
          method: 'POST',
          body: { refresh_token: refreshToken },
        })
        if (cancelled) return
        persistSession(data)
        await fetchRole(data.user)
      } catch {
        // Refresh token expired/revoked -- clear it so we don't retry every
        // mount, and fall through to the logged-out state.
        try {
          localStorage.removeItem(STORAGE_KEY)
        } catch {
          /* ignore */
        }
      } finally {
        if (!cancelled) setInitializing(false)
      }
    }
    restore()
    return () => {
      cancelled = true
    }
  }, [fetchRole, persistSession])

  const signIn = useCallback(
    async (email, password) => {
      setLoading(true)
      try {
        const data = await api('/auth/v1/token?grant_type=password', {
          method: 'POST',
          body: { email, password },
        })
        persistSession(data)
        await fetchRole(data.user)
        return { ok: true }
      } catch (e) {
        return { ok: false, error: e.message }
      } finally {
        setLoading(false)
      }
    },
    [fetchRole, persistSession]
  )

  const signUp = useCallback(async (email, password, name) => {
    setLoading(true)
    try {
      const data = await api('/auth/v1/signup', {
        method: 'POST',
        body: { email, password, data: { full_name: name } },
      })
      // If Supabase's "Confirm email" setting is off (README documents this
      // as the common setup for internal testing), signup returns a live
      // session directly, same shape as signIn's response -- mirror the
      // original vanilla-JS onAuthed() behavior and log the user straight
      // in instead of telling them to check an email that was never sent.
      if (data?.access_token) {
        persistSession(data)
        await fetchRole(data.user)
        return { ok: true, authenticated: true }
      }
      return { ok: true, authenticated: false }
    } catch (e) {
      return { ok: false, error: e.message }
    } finally {
      setLoading(false)
    }
  }, [fetchRole, persistSession])

  const signOut = useCallback(() => {
    setAccessToken(null)
    setSession(null)
    setUser(null)
    setRole(null)
    setFullName('')
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{ session, user, role, fullName, loading, initializing, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
