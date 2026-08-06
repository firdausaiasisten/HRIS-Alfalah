// src/pages/CalendarPage.jsx
import { useEffect, useMemo, useState, useCallback } from 'react'
import { api } from '../lib/supabaseApi'
import { useAuth } from '../context/AuthContext'
import { can } from '../lib/roleConfig'
import {
  DAY_NAMES_ID, MONTH_NAMES_ID, buildMonthGrid, distributeEventsByDay, distributeInstEvents,
  leaveColor, eventColor, EVENT_CATEGORY_COLORS, ymdStr, daysInMonth,
} from '../lib/calendarLogic'
import { loadHolidays, getHolidayForDate } from '../lib/holidayIntegration'

import Card from '../components/organisms/Card'
import Button from '../components/atoms/Button'
import Modal from '../components/organisms/Modal'
import Input from '../components/atoms/Input'
import Select from '../components/atoms/Select'
import DatePicker from '../components/atoms/DatePicker'
import Alert from '../components/molecules/Alert'

const EVENT_CATEGORIES = Object.keys(EVENT_CATEGORY_COLORS)
const EMPTY_EVENT_FORM = { title: '', category: 'Umum', start_date: '', end_date: '', description: '' }

export default function CalendarPage() {
  const { role } = useAuth()
  const canManageEvents = can(role, 'canManageEvents')

  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month0, setMonth0] = useState(today.getMonth())

  const [leaveRows, setLeaveRows] = useState([])
  const [holidays, setHolidays] = useState({})
  const [instEvents, setInstEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [form, setForm] = useState(EMPTY_EVENT_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchAll = useCallback(() => {
    setLoading(true)
    setError('')
    Promise.all([
      api('/rest/v1/leave_requests?select=*,employees(full_name)&status=eq.Approved'),
      loadHolidays(),
      api('/rest/v1/institutional_events?select=*&order=start_date.asc').catch(() => []),
    ])
      .then(([leave, hol, events]) => {
        setLeaveRows(leave || [])
        setHolidays(hol || {})
        setInstEvents(events || [])
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const gridStart = ymdStr(year, month0, 1)
  const gridEnd = ymdStr(year, month0, daysInMonth(year, month0))
  const weeks = useMemo(() => buildMonthGrid(year, month0), [year, month0])
  const leaveByDay = useMemo(() => distributeEventsByDay(leaveRows, gridStart, gridEnd), [leaveRows, gridStart, gridEnd])
  const eventsByDay = useMemo(() => distributeInstEvents(instEvents, gridStart, gridEnd), [instEvents, gridStart, gridEnd])
  const todayStr = ymdStr(today.getFullYear(), today.getMonth(), today.getDate())

  const legendLeaveTypes = useMemo(() => {
    const present = new Set()
    Object.values(leaveByDay).forEach((list) => list.forEach((e) => present.add(e.type)))
    return [...present]
  }, [leaveByDay])
  const legendEventCategories = useMemo(() => {
    const present = new Set(instEvents.map((e) => e.category))
    return EVENT_CATEGORIES.filter((c) => present.has(c))
  }, [instEvents])

  function goPrev() {
    if (month0 === 0) { setMonth0(11); setYear((y) => y - 1) } else setMonth0((m) => m - 1)
  }
  function goNext() {
    if (month0 === 11) { setMonth0(0); setYear((y) => y + 1) } else setMonth0((m) => m + 1)
  }
  function goToday() {
    setYear(today.getFullYear())
    setMonth0(today.getMonth())
  }

  function openAddModal(dateStr) {
    setEditingEvent(null)
    setForm({ ...EMPTY_EVENT_FORM, start_date: dateStr || '', end_date: dateStr || '' })
    setFormError('')
    setModalOpen(true)
  }
  function openEditModal(ev) {
    setEditingEvent(ev)
    setForm({ title: ev.title, category: ev.category, start_date: ev.start_date, end_date: ev.end_date, description: ev.description || '' })
    setFormError('')
    setModalOpen(true)
  }
  function closeModal() {
    setModalOpen(false)
  }

  async function handleSaveEvent() {
    if (!form.title.trim()) { setFormError('Nama kegiatan wajib diisi.'); return }
    if (!form.start_date || !form.end_date) { setFormError('Tanggal wajib diisi.'); return }
    if (form.end_date < form.start_date) { setFormError('Tanggal selesai harus setelah tanggal mulai.'); return }
    setSaving(true)
    setFormError('')
    try {
      const payload = {
        title: form.title.trim(),
        category: form.category,
        start_date: form.start_date,
        end_date: form.end_date,
        description: form.description.trim() || null,
        updated_at: new Date().toISOString(),
      }
      if (editingEvent) {
        await api(`/rest/v1/institutional_events?id=eq.${editingEvent.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: payload })
      } else {
        await api('/rest/v1/institutional_events', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: payload })
      }
      closeModal()
      fetchAll()
    } catch (e) {
      setFormError('Gagal menyimpan: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteEvent() {
    if (!editingEvent) return
    if (!confirm(`Hapus jadwal "${editingEvent.title}"?`)) return
    setSaving(true)
    try {
      await api(`/rest/v1/institutional_events?id=eq.${editingEvent.id}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } })
      closeModal()
      fetchAll()
    } catch (e) {
      setFormError('Gagal menghapus: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex h-64 items-center justify-center text-sm text-slate-500">Memuat kalender…</div>
  if (error) return <Alert variant="error" title="Gagal memuat kalender">{error}</Alert>

  return (
    <div className="mx-auto max-w-7xl">
      <Card className="overflow-hidden !p-0">
        <div className="flex flex-col lg:flex-row">
          <div className="w-full shrink-0 bg-brand-primary p-5 text-white lg:w-56">
            <p className="font-display text-2xl font-bold leading-tight">{MONTH_NAMES_ID[month0]}</p>
            <p className="font-display text-2xl font-bold">{year}</p>
            <div className="my-4 flex gap-2">
              <button onClick={goPrev} aria-label="Bulan sebelumnya" className="rounded-md bg-white/15 px-2.5 py-1 text-sm hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">‹</button>
              <button onClick={goToday} className="rounded-md bg-white/15 px-2.5 py-1 text-sm hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">Hari ini</button>
              <button onClick={goNext} aria-label="Bulan berikutnya" className="rounded-md bg-white/15 px-2.5 py-1 text-sm hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">›</button>
            </div>

            {canManageEvents && (
              <button
                onClick={() => openAddModal(todayStr)}
                className="mb-4 w-full rounded-lg bg-white/15 py-2 text-sm font-medium hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                + Tambah Jadwal
              </button>
            )}

            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/70">Jenis Cuti</p>
            {legendLeaveTypes.length === 0 && <p className="mb-3 text-xs text-white/60">Tidak ada cuti bulan ini</p>}
            {legendLeaveTypes.map((t) => (
              <div key={t} className="mb-2 flex items-center gap-2 text-xs">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: leaveColor(t).fg }} aria-hidden="true" />
                {t}
              </div>
            ))}

            <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-white/70">Kalender Indonesia</p>
            <div className="mb-2 flex items-center gap-2 text-xs">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400" aria-hidden="true" /> Hari Libur Nasional
            </div>
            <div className="mb-2 flex items-center gap-2 text-xs">
              <span className="h-2.5 w-2.5 rounded-full border-2 border-amber-300" aria-hidden="true" /> Hari Penting
            </div>

            {legendEventCategories.length > 0 && (
              <>
                <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-white/70">Kegiatan Lembaga</p>
                {legendEventCategories.map((c) => (
                  <div key={c} className="mb-2 flex items-center gap-2 text-xs">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: eventColor(c) }} aria-hidden="true" />
                    {c}
                  </div>
                ))}
              </>
            )}
          </div>

          <div className="grid flex-1 grid-cols-7">
            {DAY_NAMES_ID.map((d) => (
              <div key={d} className="border-b border-app-border bg-slate-50 py-2 text-center text-xs font-semibold text-slate-500">
                {d}
              </div>
            ))}
            {weeks.map((week, wi) =>
              week.map((cell, ci) => {
                if (cell.day === null) {
                  return <div key={`${wi}-${ci}`} className="min-h-16 border-b border-r border-app-border bg-slate-50 last:border-r-0" />
                }
                const holiday = getHolidayForDate(holidays, cell.date)
                const leaves = leaveByDay[cell.date] || []
                const events = eventsByDay[cell.date] || []
                const isToday = cell.date === todayStr
                return (
                  <div key={cell.date} className="min-h-16 border-b border-r border-app-border p-1 last:border-r-0" style={isToday ? { background: '#F0FDFA' } : undefined}>
                    <div className="flex items-center justify-between">
                      {holiday ? (
                        <span
                          title={holiday.summary}
                          className={
                            'flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ' +
                            (holiday.holiday ? 'bg-red-400 text-white' : 'border-2 border-amber-300 text-slate-700')
                          }
                        >
                          {cell.day}
                        </span>
                      ) : (
                        <span className={'text-[11px] ' + (isToday ? 'font-bold text-brand-primary' : 'text-slate-700')}>{cell.day}</span>
                      )}
                      {canManageEvents && (
                        <button
                          onClick={() => openAddModal(cell.date)}
                          aria-label={`Tambah jadwal di tanggal ${cell.day}`}
                          className="text-[10px] text-slate-400 hover:text-brand-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-primary"
                        >
                          +
                        </button>
                      )}
                    </div>
                    {holiday && <p className={'mt-0.5 truncate text-[9px] ' + (holiday.holiday ? 'text-red-500' : 'text-amber-600')}>{holiday.summary}</p>}
                    {leaves.slice(0, 2).map((lv, i) => (
                      <div key={i} title={`${lv.employeeName} — ${lv.type}`} className="mt-0.5 truncate rounded px-1 text-[9px]" style={{ background: leaveColor(lv.type).bg, color: leaveColor(lv.type).fg }}>
                        {lv.employeeName}
                      </div>
                    ))}
                    {leaves.length > 2 && <p className="mt-0.5 text-[9px] text-slate-400">+{leaves.length - 2} lagi</p>}
                    {events.slice(0, 2).map((ev) => (
                      <button
                        key={ev.id}
                        onClick={() => canManageEvents && openEditModal(ev)}
                        title={ev.title + (ev.description ? ' — ' + ev.description : '')}
                        className="mt-0.5 block w-full truncate border-l-2 px-1 text-left text-[9px] text-slate-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-primary"
                        style={{ borderColor: eventColor(ev.category) }}
                      >
                        {ev.title}
                      </button>
                    ))}
                    {events.length > 2 && <p className="mt-0.5 text-[9px] text-slate-400">+{events.length - 2} kegiatan</p>}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </Card>

      <Modal open={modalOpen} onClose={closeModal} title={editingEvent ? '🏫 Edit Jadwal Kegiatan' : '🏫 Tambah Jadwal Kegiatan'}>
        <div className="space-y-3">
          <Input label="Nama Kegiatan" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <Select label="Kategori" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} options={EVENT_CATEGORIES.map((c) => ({ value: c, label: c }))} />
          <div className="grid grid-cols-2 gap-3">
            <DatePicker label="Tanggal Mulai" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} />
            <DatePicker label="Tanggal Selesai" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="ev-desc">Deskripsi (opsional)</label>
            <textarea
              id="ev-desc"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full resize-y rounded-lg border border-app-border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            />
          </div>
          {formError && <Alert variant="error">{formError}</Alert>}
          <div className="flex items-center justify-between pt-2">
            {editingEvent ? (
              <Button variant="danger" onClick={handleDeleteEvent} disabled={saving}>🗑 Hapus</Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={closeModal} disabled={saving}>Batal</Button>
              <Button onClick={handleSaveEvent} disabled={saving}>{saving ? 'Menyimpan…' : '💾 Simpan'}</Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
