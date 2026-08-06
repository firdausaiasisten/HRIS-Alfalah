// src/pages/EmployeeProfilePage.jsx
import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/supabaseApi'
import { useAuth } from '../context/AuthContext'
import { can } from '../lib/roleConfig'
import { computeProfileCompletion } from '../lib/profileCompletion'
import { formatRupiah, formatDateId, yearsOfService } from '../lib/format'
import { downloadIcs, buildGoogleCalendarUrl } from '../lib/calendarIntegration'

import Avatar from '../components/atoms/Avatar'
import Badge from '../components/atoms/Badge'
import Button from '../components/atoms/Button'
import ProgressBar from '../components/atoms/ProgressBar'
import Input from '../components/atoms/Input'
import Select from '../components/atoms/Select'
import DatePicker from '../components/atoms/DatePicker'
import Card from '../components/organisms/Card'
import Tabs from '../components/organisms/Tabs'
import Timeline from '../components/organisms/Timeline'
import SummaryPanel from '../components/organisms/SummaryPanel'
import StickyActionBar from '../components/organisms/StickyActionBar'
import FormField from '../components/molecules/FormField'
import Alert from '../components/molecules/Alert'
import EmptyState from '../components/molecules/EmptyState'

const EMPLOYEE_SELECT =
  '*,m_jabatan(nama),m_departemen(nama),m_unit_kerja(nama),m_status_kepegawaian(nama),m_jenis_kepegawaian(nama),m_bank(nama)'

const TABS = [
  { id: 'profile', label: 'Profil', icon: '👤' },
  { id: 'employment', label: 'Kepegawaian', icon: '💼' },
  { id: 'education', label: 'Pendidikan', icon: '🎓' },
  { id: 'payroll', label: 'Payroll', icon: '🏦' },
  { id: 'documents', label: 'Dokumen', icon: '📄' },
  { id: 'performance', label: 'Kinerja', icon: '⭐' },
  { id: 'leave', label: 'Cuti', icon: '🗓️' },
  { id: 'contract', label: 'Kontrak', icon: '📝' },
  { id: 'system_account', label: 'Akun Sistem', icon: '⚙️' },
]

function statusFromEmployee(e) {
  if (e.deleted_at) return 'inactive'
  if (e.m_status_kepegawaian?.nama === 'Kontrak') return 'contract'
  if (e.m_status_kepegawaian?.nama === 'Tetap') return 'permanent'
  return 'active'
}

export default function EmployeeProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { role, user } = useAuth()

  const [employee, setEmployee] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('profile')
  const [editMode, setEditMode] = useState(false)
  const [draft, setDraft] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api(`/rest/v1/employees?id=eq.${id}&select=${EMPLOYEE_SELECT}`)
      .then((rows) => {
        if (cancelled) return
        if (!rows || !rows[0]) {
          setError('Data pegawai tidak ditemukan.')
        } else {
          setEmployee(rows[0])
          setDraft(rows[0])
        }
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [id])

  const isOwnProfile = employee?.auth_user_id && user && employee.auth_user_id === user.id
  const canEditFull = can(role, 'canEdit')
  const canViewSalary = can(role, 'canViewSalary')
  const dirty = editMode && draft && employee && JSON.stringify(draft) !== JSON.stringify(employee)

  // Master data for the editable dropdowns (Employment/Payroll tabs).
  // Only fetched for roles that can actually use them (canEditFull) --
  // no point loading 6 lookup tables for a read-only viewer or a
  // self-service-only editor who can't touch these fields anyway.
  const [masters, setMasters] = useState(null)
  useEffect(() => {
    if (!canEditFull) return
    Promise.all([
      api('/rest/v1/m_jabatan?select=id,nama&order=nama.asc'),
      api('/rest/v1/m_departemen?select=id,nama&order=nama.asc'),
      api('/rest/v1/m_unit_kerja?select=id,nama&order=nama.asc'),
      api('/rest/v1/m_status_kepegawaian?select=id,nama&order=nama.asc'),
      api('/rest/v1/m_jenis_kepegawaian?select=id,nama&order=nama.asc'),
      api('/rest/v1/m_bank?select=id,nama&order=nama.asc'),
    ])
      .then(([jabatan, departemen, unitKerja, statusKepegawaian, jenisKepegawaian, bank]) => {
        setMasters({ jabatan, departemen, unitKerja, statusKepegawaian, jenisKepegawaian, bank })
      })
      .catch(() => setMasters(null)) // edit form still works for the profile-tab fields even if this fails
  }, [canEditFull])
  function toOptions(list) {
    return (list || []).map((m) => ({ value: m.id, label: m.nama }))
  }

  const completion = useMemo(() => computeProfileCompletion(employee), [employee])

  // Timeline: same source data as the original app's `employment_history`
  // fetch (loadAll's /rest/v1/employment_history) -- just rendered as a
  // visual timeline here instead of a table, per brief section 9.
  // NOTE: employment_history only stores jabatan_baru_id/unit_kerja_baru_id
  // (FKs), not readable names -- and it has two FKs each to m_jabatan and
  // m_unit_kerja (lama + baru), so PostgREST needs an explicit column hint
  // to know which FK to embed through. Confirmed against a live PostgREST
  // instance: plain `select=*` returns only the raw *_id columns, so
  // without this hinted embed `h.jabatan_baru`/`h.unit_kerja_baru` were
  // always undefined and the timeline silently fell back to notes/nothing.
  const [history, setHistory] = useState([])
  useEffect(() => {
    if (!id) return
    api(
      `/rest/v1/employment_history?employee_id=eq.${id}&select=*,jabatan_baru:m_jabatan!jabatan_baru_id(nama),unit_kerja_baru:m_unit_kerja!unit_kerja_baru_id(nama)&order=effective_date.asc`
    )
      .then((rows) => setHistory(rows || []))
      .catch(() => setHistory([]))
  }, [id])

  const timelineItems = useMemo(
    () =>
      history.map((h) => ({
        year: h.effective_date?.slice(0, 4),
        title: h.change_type,
        description: [h.jabatan_baru?.nama, h.unit_kerja_baru?.nama].filter(Boolean).join(' — ') || h.notes,
      })),
    [history]
  )

  function setField(key, value) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    setSaveError('')
    try {
      // Non-admin/hrd editors (self-service) should only ever send the
      // safe contact fields -- the database's fn_restrict_self_update
      // trigger enforces this too (defense in depth), but sending only
      // what the UI actually let them touch avoids a confusing "your
      // change to X was silently ignored" experience.
      const payload = canEditFull
        ? { ...draft, updated_at: new Date().toISOString() }
        : {
            phone: draft.phone,
            mobile_phone: draft.mobile_phone,
            personal_email: draft.personal_email,
            address: draft.address,
            emergency_contact_name: draft.emergency_contact_name,
            emergency_contact_phone: draft.emergency_contact_phone,
            updated_at: new Date().toISOString(),
          }
      if (!canEditFull) {
        delete payload.basic_salary
        delete payload.allowances
      }
      await api(`/rest/v1/employees?id=eq.${id}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: payload,
      })
      setEmployee(draft)
      setEditMode(false)
    } catch (e) {
      setSaveError('Gagal menyimpan: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-sm text-slate-500">Memuat data pegawai…</div>
  }
  if (error) {
    return <Alert variant="error" title="Gagal memuat">{error}</Alert>
  }
  if (!employee) return null

  const canEditThisPage = canEditFull || isOwnProfile

  return (
    <div className="mx-auto max-w-7xl pb-24">
      <button
        onClick={() => navigate('/biodata')}
        className="mb-4 text-sm text-slate-500 hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded"
      >
        ← Kembali ke daftar pegawai
      </button>

      {/* ============ 1. HERO HEADER ============ */}
      <Card className="mb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            <Avatar src={employee.photo_url} name={employee.full_name} size="xl" />
            <div>
              <h1 className="font-display text-2xl font-bold text-slate-900">{employee.full_name}</h1>
              <p className="text-sm text-slate-500">{employee.employee_number}</p>
              <p className="mt-1 text-sm text-slate-700">
                {employee.m_jabatan?.nama || '-'} · {employee.m_departemen?.nama || '-'}
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-1.5 sm:justify-start">
                <Badge status={statusFromEmployee(employee)} />
                <Badge status="contract">{employee.m_jenis_kepegawaian?.nama || '-'}</Badge>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Bergabung {formatDateId(employee.join_date)}
                {employee.contract_end && <> · Kontrak berakhir {formatDateId(employee.contract_end)}</>}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 justify-center gap-2 sm:justify-end">
            {canEditThisPage && !editMode && (
              <Button variant="secondary" onClick={() => setEditMode(true)}>✎ Edit</Button>
            )}
          </div>
        </div>
      </Card>

      {/* ============ 2. PROFILE COMPLETION ============ */}
      {completion.percent < 100 && (
        <Card className="mb-4">
          <ProgressBar value={completion.percent} label="Kelengkapan Profil" />
          {completion.missing.length > 0 && (
            <p className="mt-2 text-xs text-slate-500">Belum lengkap: {completion.missing.join(', ')}</p>
          )}
        </Card>
      )}

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-4">
          {/* ============ 3. TABS + CARDS ============ */}
          <Card>
            <Tabs items={TABS} active={activeTab} onChange={setActiveTab}>
              {activeTab === 'profile' && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {editMode ? (
                    <>
                      <Input label="Nama Lengkap" value={draft.full_name || ''} onChange={(e) => setField('full_name', e.target.value)} disabled={!canEditFull} />
                      <Input label="No. HP" value={draft.mobile_phone || ''} onChange={(e) => setField('mobile_phone', e.target.value)} />
                      <Input label="Email Pribadi" type="email" value={draft.personal_email || ''} onChange={(e) => setField('personal_email', e.target.value)} helperText="example@company.com" />
                      <Input label="Alamat" value={draft.address || ''} onChange={(e) => setField('address', e.target.value)} className="sm:col-span-2 lg:col-span-3" />
                      <Input label="Kontak Darurat" value={draft.emergency_contact_name || ''} onChange={(e) => setField('emergency_contact_name', e.target.value)} />
                      <Input label="No. HP Kontak Darurat" value={draft.emergency_contact_phone || ''} onChange={(e) => setField('emergency_contact_phone', e.target.value)} />
                    </>
                  ) : (
                    <>
                      <FormField label="Nama Lengkap" value={employee.full_name} />
                      <FormField label="No. HP" value={employee.mobile_phone} />
                      <FormField label="Email Pribadi" value={employee.personal_email} />
                      <FormField label="Alamat" value={employee.address} />
                      <FormField label="Kontak Darurat" value={employee.emergency_contact_name} />
                      <FormField label="No. HP Kontak Darurat" value={employee.emergency_contact_phone} />
                    </>
                  )}
                </div>
              )}

              {activeTab === 'employment' && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {editMode && canEditFull ? (
                    <>
                      <Select label="Jabatan" value={draft.jabatan_id || ''} onChange={(e) => setField('jabatan_id', e.target.value)} options={toOptions(masters?.jabatan)} />
                      <Select label="Departemen" value={draft.departemen_id || ''} onChange={(e) => setField('departemen_id', e.target.value)} options={toOptions(masters?.departemen)} />
                      <Select label="Unit Kerja" value={draft.unit_kerja_id || ''} onChange={(e) => setField('unit_kerja_id', e.target.value)} options={toOptions(masters?.unitKerja)} />
                      <Select label="Status Kepegawaian" value={draft.status_kepegawaian_id || ''} onChange={(e) => setField('status_kepegawaian_id', e.target.value)} options={toOptions(masters?.statusKepegawaian)} />
                      <Select label="Jenis Kepegawaian" value={draft.jenis_kepegawaian_id || ''} onChange={(e) => setField('jenis_kepegawaian_id', e.target.value)} options={toOptions(masters?.jenisKepegawaian)} />
                      <DatePicker label="Tanggal Bergabung" value={draft.join_date || ''} onChange={(e) => setField('join_date', e.target.value)} />
                    </>
                  ) : (
                    <>
                      <FormField label="Jabatan" value={employee.m_jabatan?.nama} />
                      <FormField label="Departemen" value={employee.m_departemen?.nama} />
                      <FormField label="Unit Kerja" value={employee.m_unit_kerja?.nama} />
                      <FormField label="Status Kepegawaian" value={employee.m_status_kepegawaian?.nama} />
                      <FormField label="Jenis Kepegawaian" value={employee.m_jenis_kepegawaian?.nama} />
                      <FormField label="Tanggal Bergabung" value={formatDateId(employee.join_date)} />
                      <FormField label="Masa Kerja" value={`${yearsOfService(employee.join_date) ?? 0} tahun`} />
                    </>
                  )}
                </div>
              )}

              {activeTab === 'payroll' && (
                <div>
                  {canViewSalary ? (
                    editMode && canEditFull ? (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <Input label="Gaji Pokok" type="number" value={draft.basic_salary ?? ''} onChange={(e) => setField('basic_salary', e.target.value)} />
                        <Input label="Tunjangan" type="number" value={draft.allowances ?? ''} onChange={(e) => setField('allowances', e.target.value)} />
                        <Select label="Bank" value={draft.bank_id || ''} onChange={(e) => setField('bank_id', e.target.value)} options={toOptions(masters?.bank)} />
                        <Input label="No. Rekening" value={draft.bank_account_number || ''} onChange={(e) => setField('bank_account_number', e.target.value)} />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <FormField label="Gaji Pokok" value={formatRupiah(employee.basic_salary)} />
                        <FormField label="Tunjangan" value={formatRupiah(employee.allowances)} />
                        <FormField
                          label="Total Gaji"
                          value={formatRupiah((Number(employee.basic_salary) || 0) + (Number(employee.allowances) || 0))}
                        />
                        <FormField label="Bank" value={employee.m_bank?.nama} />
                        <FormField label="No. Rekening" value={employee.bank_account_number} />
                      </div>
                    )
                  ) : (
                    <EmptyState icon="🔒" title="Data terbatas" description="Hanya Admin yang dapat melihat rincian payroll." />
                  )}
                </div>
              )}

              {activeTab === 'contract' && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {editMode && canEditFull ? (
                    <>
                      <DatePicker label="Tanggal Bergabung" value={draft.join_date || ''} onChange={(e) => setField('join_date', e.target.value)} />
                      <DatePicker label="Kontrak Berakhir" value={draft.contract_end || ''} onChange={(e) => setField('contract_end', e.target.value)} />
                    </>
                  ) : (
                    <>
                      <FormField label="Tanggal Bergabung" value={formatDateId(employee.join_date)} />
                      <div>
                        <FormField label="Kontrak Berakhir" value={formatDateId(employee.contract_end)} />
                        {employee.contract_end && (
                          <div className="-mt-1 flex gap-2">
                            <button
                              onClick={() =>
                                downloadIcs({
                                  dateStr: employee.contract_end,
                                  title: 'Kontrak Berakhir: ' + employee.full_name,
                                  description: 'Nomor pegawai ' + (employee.employee_number || '-') + ' — mohon tindak lanjuti perpanjangan/pemutusan kontrak.',
                                })
                              }
                              className="text-xs font-medium text-brand-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded"
                            >
                              📅 .ics
                            </button>
                            <a
                              href={buildGoogleCalendarUrl({
                                dateStr: employee.contract_end,
                                title: 'Kontrak Berakhir: ' + employee.full_name,
                                description: 'Nomor pegawai ' + (employee.employee_number || '-') + ' — mohon tindak lanjuti perpanjangan/pemutusan kontrak.',
                              })}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-medium text-brand-primary hover:underline"
                            >
                              📅 Google Calendar
                            </a>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === 'system_account' && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <FormField label="Email Institusi" value={employee.institution_email} />
                  <FormField label="Status Akun" value={employee.auth_user_id ? 'Tertaut' : 'Belum tertaut'} />
                </div>
              )}

              {['education', 'documents', 'performance', 'leave'].includes(activeTab) && (
                <EmptyState
                  icon="🚧"
                  title="Segera hadir di halaman ini"
                  description="Modul ini sudah ada di database (lihat batch1-3) tapi belum dipindah ke tampilan React -- menyusul di iterasi berikutnya."
                />
              )}
            </Tabs>
          </Card>

          <Timeline items={timelineItems} />
        </div>

        <SummaryPanel employee={employee} canViewSalary={canViewSalary} />
      </div>

      {/* ============ 5. STICKY ACTION BAR ============ */}
      {editMode && (
        <StickyActionBar
          saving={saving}
          dirty={dirty}
          onCancel={() => {
            setDraft(employee)
            setEditMode(false)
            setSaveError('')
          }}
          onSave={handleSave}
        />
      )}
      {saveError && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2">
          <Alert variant="error">{saveError}</Alert>
        </div>
      )}
    </div>
  )
}
