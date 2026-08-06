// src/pages/BiodataListPage.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/supabaseApi'
import Card from '../components/organisms/Card'
import Avatar from '../components/atoms/Avatar'
import Input from '../components/atoms/Input'
import EmptyState from '../components/molecules/EmptyState'

export default function BiodataListPage() {
  const navigate = useNavigate()
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  useEffect(() => {
    api('/rest/v1/employees?select=id,employee_number,full_name,photo_url,m_jabatan(nama),m_departemen(nama)&order=full_name.asc')
      .then((rows) => setEmployees(rows || []))
      .finally(() => setLoading(false))
  }, [])

  const filtered = employees.filter(
    (e) =>
      e.full_name?.toLowerCase().includes(q.toLowerCase()) ||
      e.employee_number?.toLowerCase().includes(q.toLowerCase())
  )

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-4 font-display text-xl font-bold text-slate-900">Biodata Pegawai</h1>
      <Card>
        <Input
          placeholder="Cari nama atau nomor pegawai…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="mb-4"
          aria-label="Cari pegawai"
        />
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">Memuat…</p>
        ) : filtered.length === 0 ? (
          <EmptyState icon="👥" title="Tidak ada pegawai ditemukan" />
        ) : (
          <ul className="divide-y divide-app-border">
            {filtered.map((e) => (
              <li key={e.id}>
                <button
                  onClick={() => navigate(`/biodata/${e.id}`)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                >
                  <Avatar src={e.photo_url} name={e.full_name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">{e.full_name}</p>
                    <p className="truncate text-sm text-slate-500">
                      {e.employee_number} · {e.m_jabatan?.nama || '-'} · {e.m_departemen?.nama || '-'}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
