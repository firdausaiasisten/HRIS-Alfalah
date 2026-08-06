// src/pages/ExportImportPage.jsx
import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { api } from '../lib/supabaseApi'
import { useAuth } from '../context/AuthContext'
import { can } from '../lib/roleConfig'
import Card from '../components/organisms/Card'
import Button from '../components/atoms/Button'
import Alert from '../components/molecules/Alert'

export default function ExportImportPage() {
  const { role } = useAuth()
  const canExport = can(role, 'canExport')
  const canImport = can(role, 'canImport')
  const fileRef = useRef(null)
  const [status, setStatus] = useState(null) // { type: 'success'|'error', message }
  const [busy, setBusy] = useState(false)

  async function handleExport() {
    setBusy(true)
    setStatus(null)
    try {
      const rows = await api(
        '/rest/v1/employees?select=employee_number,full_name,institution_email,phone,nik,join_date,contract_end&order=full_name.asc'
      )
      const ws = XLSX.utils.json_to_sheet(rows || [])
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Pegawai')
      XLSX.writeFile(wb, 'data-pegawai.xlsx')
      setStatus({ type: 'success', message: `Berhasil mengekspor ${rows?.length || 0} baris.` })
    } catch (e) {
      setStatus({ type: 'error', message: 'Gagal ekspor: ' + e.message })
    } finally {
      setBusy(false)
    }
  }

  function handleImportFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    setStatus(null)
    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'array' })
        const sheet = wb.Sheets[wb.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json(sheet)
        let rows = raw
          .map((r) => ({
            employee_number: r['No. Pegawai'] || null,
            full_name: r['Nama Lengkap'] || null,
            institution_email: r['Email'] || null,
            phone: r['No. HP'] || null,
          }))
          .filter((r) => r.full_name)
        const withoutNumber = rows.filter((r) => !r.employee_number).length
        rows = rows.filter((r) => r.employee_number)
        if (!rows.length) {
          setStatus({ type: 'error', message: 'Tidak ada baris valid ditemukan (No. Pegawai wajib diisi).' })
          return
        }
        // on_conflict=employee_number: without this PostgREST's upsert
        // conflict target defaults to the primary key, which every
        // imported row lacks -- see the vanilla-app fix this ports.
        await api('/rest/v1/employees?on_conflict=employee_number', {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: rows,
        })
        setStatus({
          type: 'success',
          message: `${rows.length} baris berhasil diimpor.` + (withoutNumber ? ` (${withoutNumber} baris dilewati: No. Pegawai kosong)` : ''),
        })
      } catch (err) {
        setStatus({ type: 'error', message: 'Gagal impor: ' + err.message })
      } finally {
        setBusy(false)
        if (fileRef.current) fileRef.current.value = ''
      }
    }
    reader.readAsArrayBuffer(file)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="font-display text-xl font-bold text-slate-900">Ekspor / Impor Data</h1>

      {status && <Alert variant={status.type === 'success' ? 'success' : 'error'}>{status.message}</Alert>}

      {canExport && (
        <Card title="Ekspor" description="Unduh data pegawai sebagai file Excel (.xlsx).">
          <Button onClick={handleExport} disabled={busy}>{busy ? 'Memproses…' : '⬇ Ekspor ke Excel'}</Button>
        </Card>
      )}

      {canImport ? (
        <Card title="Impor" description="Unggah file Excel (.xlsx) berisi kolom: No. Pegawai, Nama Lengkap, Email, No. HP.">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleImportFile}
            disabled={busy}
            aria-label="Pilih file Excel untuk diimpor"
            className="block text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-primary-hover"
          />
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-slate-500">🔒 Impor data hanya tersedia untuk Admin.</p>
        </Card>
      )}
    </div>
  )
}
