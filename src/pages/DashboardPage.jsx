// src/pages/DashboardPage.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/supabaseApi'
import { useAuth } from '../context/AuthContext'
import { getRoleConfig, can } from '../lib/roleConfig'
import { formatDateId } from '../lib/format'
import Card from '../components/organisms/Card'

function StatCard({ icon, label, value, onClick }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className={
        'rounded-app border border-app-border bg-app-card p-4 text-left shadow-sm ' +
        (onClick ? 'transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary' : '')
      }
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary/10 text-lg" aria-hidden="true">{icon}</span>
        <div>
          <p className="text-xl font-bold text-slate-900">{value}</p>
          <p className="text-xs text-slate-500">{label}</p>
        </div>
      </div>
    </Tag>
  )
}

export default function DashboardPage() {
  const { fullName, role } = useAuth()
  const navigate = useNavigate()
  const canApprove = can(role, 'canApproveLeave')
  const [stats, setStats] = useState(null)

  useEffect(() => {
    Promise.all([
      api('/rest/v1/employees?select=id&deleted_at=is.null'),
      api('/rest/v1/leave_requests?select=id&status=eq.Pending'),
      api(`/rest/v1/employees?select=id,full_name,contract_end&contract_end=gte.${new Date().toISOString().slice(0, 10)}&contract_end=lte.${new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)}`),
    ])
      .then(([emp, pendingLeave, expiring]) => {
        setStats({ totalEmployees: emp?.length || 0, pendingLeave: pendingLeave?.length || 0, expiring: expiring || [] })
      })
      .catch(() => setStats({ totalEmployees: 0, pendingLeave: 0, expiring: [] }))
  }, [])

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-1 font-display text-xl font-bold text-slate-900">Selamat datang, {fullName || 'Pengguna'}</h1>
      <p className="mb-5 text-sm text-slate-500">{getRoleConfig(role).label}</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon="👥" label="Total Pegawai" value={stats ? stats.totalEmployees : '…'} onClick={() => navigate('/biodata')} />
        <StatCard icon="📋" label="Cuti Menunggu Persetujuan" value={stats ? stats.pendingLeave : '…'} onClick={canApprove ? () => navigate('/leave') : undefined} />
        <StatCard icon="📅" label="Kontrak Berakhir 30 Hari" value={stats ? stats.expiring.length : '…'} onClick={() => navigate('/calendar')} />
      </div>

      {stats?.expiring?.length > 0 && (
        <Card title="⚠ Kontrak Akan Berakhir" className="mt-4">
          <ul className="divide-y divide-app-border">
            {stats.expiring.map((e) => (
              <li key={e.id} className="flex items-center justify-between py-2 text-sm">
                <span className="font-medium text-slate-900">{e.full_name}</span>
                <span className="text-slate-500">{formatDateId(e.contract_end)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
