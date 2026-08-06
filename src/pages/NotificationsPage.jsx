// src/pages/NotificationsPage.jsx
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { api, SUPABASE_URL, ANON_KEY } from '../lib/supabaseApi'
import { useAuth } from '../context/AuthContext'
import { formatDateId } from '../lib/format'
import Card from '../components/organisms/Card'
import Alert from '../components/molecules/Alert'
import EmptyState from '../components/molecules/EmptyState'

// FITUR 1 (client side): Supabase Realtime listener -- same caveat as the
// vanilla-JS version: this connects to a LIVE WebSocket endpoint that
// cannot be exercised in a sandboxed build/test environment. Verified
// here: it doesn't throw when unauthenticated/misconfigured, and cleans
// up its subscription on unmount. NOT verified: an actual live round-trip
// (test that manually on your deployed project).
export default function NotificationsPage() {
  const { session, user } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  function fetchAll() {
    setLoading(true)
    api('/rest/v1/notifications?select=*&order=created_at.desc')
      .then((r) => setRows(r || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(fetchAll, [])

  useEffect(() => {
    if (!session || !user) return
    let channel
    try {
      const client = createClient(SUPABASE_URL, ANON_KEY)
      client.realtime.setAuth(session.access_token)
      channel = client
        .channel('notifications-' + user.id)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => {
          fetchAll()
        })
        .subscribe()
    } catch (e) {
      console.warn('Realtime notifications unavailable:', e.message)
    }
    return () => {
      try { channel?.unsubscribe() } catch { /* noop */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, user])

  if (loading) return <div className="flex h-64 items-center justify-center text-sm text-slate-500">Memuat…</div>

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 font-display text-xl font-bold text-slate-900">Notifikasi</h1>
      {error && <Alert variant="error" className="mb-4">{error}</Alert>}
      <Card>
        {rows.length === 0 ? (
          <EmptyState icon="🔔" title="Tidak ada notifikasi" />
        ) : (
          <ul className="divide-y divide-app-border">
            {rows.map((n) => (
              <li key={n.id} className="py-3">
                <p className="text-xs text-slate-400">{formatDateId(n.created_at?.slice(0, 10))}</p>
                <p className="text-sm font-medium text-slate-900">{n.type}</p>
                <p className="text-sm text-slate-600">{n.message}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
