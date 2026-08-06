// src/pages/LeaveManagementPage.jsx
import { useEffect, useState } from 'react'
import { api } from '../lib/supabaseApi'
import { useAuth } from '../context/AuthContext'
import { can } from '../lib/roleConfig'
import { formatDateId } from '../lib/format'
import { leaveColor } from '../lib/calendarLogic'

import Card from '../components/organisms/Card'
import Button from '../components/atoms/Button'
import Badge from '../components/atoms/Badge'
import Modal from '../components/organisms/Modal'
import Select from '../components/atoms/Select'
import DatePicker from '../components/atoms/DatePicker'
import Alert from '../components/molecules/Alert'
import EmptyState from '../components/molecules/EmptyState'

const LEAVE_TYPES = ['Cuti Tahunan', 'Cuti Sakit', 'Cuti Melahirkan', 'Izin Khusus', 'Cuti Lainnya']
const STATUS_BADGE = { Pending: 'contract', Approved: 'active', Rejected: 'inactive' }
const EMPTY_FORM = { type: 'Cuti Tahunan', start_date: '', end_date: '', notes: '' }

export default function LeaveManagementPage() {
  const { role, user } = useAuth()
  const canApprove = can(role, 'canApproveLeave')

  const [rows, setRows] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  function fetchAll() {
    setLoading(true)
    Promise.all([
      api('/rest/v1/leave_requests?select=*,employees(id,full_name,auth_user_id)&order=created_at.desc'),
      api('/rest/v1/employees?select=id,full_name,auth_user_id'),
    ])
      .then(([lv, emp]) => {
        setRows(lv || [])
        setEmployees(emp || [])
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(fetchAll, [])

  async function updateStatus(id, status) {
    try {
      await api(`/rest/v1/leave_requests?id=eq.${id}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: { status, updated_at: new Date().toISOString() },
      })
      fetchAll()
    } catch (e) {
      setError('Gagal memperbarui status: ' + e.message)
    }
  }

  async function handleSubmit() {
    const emp = employees.find((e) => e.auth_user_id === user?.id)
    if (!emp) {
      setFormError('Akun Anda belum tertaut ke data pegawai. Hubungi admin/HRD untuk menautkan email institusi Anda.')
      return
    }
    if (!form.start_date || !form.end_date) { setFormError('Tanggal wajib diisi.'); return }
    if (form.end_date < form.start_date) { setFormError('Tanggal selesai harus setelah tanggal mulai.'); return }
    setSaving(true)
    setFormError('')
    try {
      await api('/rest/v1/leave_requests', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: { employee_id: emp.id, type: form.type, start_date: form.start_date, end_date: form.end_date, notes: form.notes, status: 'Pending', created_at: new Date().toISOString() },
      })
      setModalOpen(false)
      setForm(EMPTY_FORM)
      fetchAll()
    } catch (e) {
      setFormError('Gagal: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex h-64 items-center justify-center text-sm text-slate-500">Memuat…</div>

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-slate-900">Manajemen Cuti</h1>
        {canApprove && <Button onClick={() => { setForm(EMPTY_FORM); setFormError(''); setModalOpen(true) }}>+ Ajukan Cuti</Button>}
      </div>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      <Card>
        {rows.length === 0 ? (
          <EmptyState icon="📋" title="Belum ada pengajuan cuti" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-app-border text-left text-xs uppercase text-slate-500">
                  <th className="py-2 pr-3">Pegawai</th>
                  <th className="py-2 pr-3">Jenis</th>
                  <th className="py-2 pr-3">Tanggal</th>
                  <th className="py-2 pr-3">Keterangan</th>
                  <th className="py-2 pr-3">Status</th>
                  {canApprove && <th className="py-2 pr-3">Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-app-border last:border-0">
                    <td className="py-2.5 pr-3 font-medium text-slate-900">{r.employees?.full_name || '-'}</td>
                    <td className="py-2.5 pr-3">
                      <span className="rounded px-2 py-0.5 text-xs" style={{ background: leaveColor(r.type).bg, color: leaveColor(r.type).fg }}>{r.type}</span>
                    </td>
                    <td className="py-2.5 pr-3 whitespace-nowrap text-slate-600">{formatDateId(r.start_date)} – {formatDateId(r.end_date)}</td>
                    <td className="py-2.5 pr-3 max-w-xs truncate text-slate-500">{r.notes || '-'}</td>
                    <td className="py-2.5 pr-3"><Badge status={STATUS_BADGE[r.status] || 'contract'}>{r.status}</Badge></td>
                    {canApprove && (
                      <td className="py-2.5 pr-3">
                        {r.status === 'Pending' && (
                          <div className="flex gap-1.5">
                            <button onClick={() => updateStatus(r.id, 'Approved')} className="rounded px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500">Setujui</button>
                            <button onClick={() => updateStatus(r.id, 'Rejected')} className="rounded px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500">Tolak</button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="📋 Ajukan Cuti / Izin">
        <div className="space-y-3">
          <Select label="Jenis" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} options={LEAVE_TYPES.map((t) => ({ value: t, label: t }))} />
          <div className="grid grid-cols-2 gap-3">
            <DatePicker label="Tanggal Mulai" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} />
            <DatePicker label="Tanggal Selesai" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="lv-notes">Keterangan</label>
            <textarea id="lv-notes" rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="w-full resize-y rounded-lg border border-app-border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary" />
          </div>
          {formError && <Alert variant="error">{formError}</Alert>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>Batal</Button>
            <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Mengirim…' : 'Kirim Pengajuan'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
