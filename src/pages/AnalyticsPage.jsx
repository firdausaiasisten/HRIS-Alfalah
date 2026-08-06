// src/pages/AnalyticsPage.jsx
import { useEffect, useRef, useState } from 'react'
import Chart from 'chart.js/auto'
import { api } from '../lib/supabaseApi'
import Card from '../components/organisms/Card'

const CHART_COLORS = ['#0F766E', '#4F46E5', '#0d9488', '#7c3aed', '#c2410c', '#1d4ed8', '#64748b']

function useChart(canvasRef, config) {
  useEffect(() => {
    if (!canvasRef.current || !config) return
    const chart = new Chart(canvasRef.current, config)
    return () => chart.destroy()
  }, [canvasRef, config])
}

function ChartCard({ title, config, empty }) {
  const ref = useRef(null)
  useChart(ref, config)
  return (
    <Card title={title}>
      {empty ? (
        <p className="py-8 text-center text-sm text-slate-400">Belum ada data.</p>
      ) : (
        <div className="h-64">
          <canvas ref={ref} role="img" aria-label={title} />
        </div>
      )}
    </Card>
  )
}

export default function AnalyticsPage() {
  const [byDept, setByDept] = useState(null)
  const [byStatus, setByStatus] = useState(null)
  const [byLeaveType, setByLeaveType] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api('/rest/v1/employees?select=m_departemen(nama)&deleted_at=is.null'),
      api('/rest/v1/employees?select=m_status_kepegawaian(nama)&deleted_at=is.null'),
      api('/rest/v1/leave_requests?select=type&status=eq.Approved'),
    ])
      .then(([emp, empStatus, leave]) => {
        const deptCounts = {}
        ;(emp || []).forEach((e) => {
          const name = e.m_departemen?.nama || 'Tanpa Departemen'
          deptCounts[name] = (deptCounts[name] || 0) + 1
        })
        setByDept(deptCounts)

        const statusCounts = {}
        ;(empStatus || []).forEach((e) => {
          const name = e.m_status_kepegawaian?.nama || 'Tidak Diketahui'
          statusCounts[name] = (statusCounts[name] || 0) + 1
        })
        setByStatus(statusCounts)

        const typeCounts = {}
        ;(leave || []).forEach((l) => {
          typeCounts[l.type] = (typeCounts[l.type] || 0) + 1
        })
        setByLeaveType(typeCounts)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex h-64 items-center justify-center text-sm text-slate-500">Memuat…</div>

  const deptEmpty = !byDept || Object.keys(byDept).length === 0
  const statusEmpty = !byStatus || Object.keys(byStatus).length === 0
  const leaveEmpty = !byLeaveType || Object.keys(byLeaveType).length === 0

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-4 font-display text-xl font-bold text-slate-900">Analitik</h1>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Pegawai per Departemen"
          empty={deptEmpty}
          config={
            deptEmpty ? null : {
              type: 'bar',
              data: {
                labels: Object.keys(byDept),
                datasets: [{ label: 'Jumlah Pegawai', data: Object.values(byDept), backgroundColor: CHART_COLORS[0] }],
              },
              options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } },
            }
          }
        />
        <ChartCard
          title="Status Kepegawaian"
          empty={statusEmpty}
          config={
            statusEmpty ? null : {
              type: 'doughnut',
              data: {
                labels: Object.keys(byStatus),
                datasets: [{ data: Object.values(byStatus), backgroundColor: CHART_COLORS }],
              },
              options: { responsive: true, maintainAspectRatio: false },
            }
          }
        />
        <ChartCard
          title="Cuti Disetujui per Jenis"
          empty={leaveEmpty}
          config={
            leaveEmpty ? null : {
              type: 'pie',
              data: {
                labels: Object.keys(byLeaveType),
                datasets: [{ data: Object.values(byLeaveType), backgroundColor: CHART_COLORS }],
              },
              options: { responsive: true, maintainAspectRatio: false },
            }
          }
        />
      </div>
    </div>
  )
}
