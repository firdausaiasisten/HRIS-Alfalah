// src/pages/PendingPage.jsx
import { useAuth } from '../context/AuthContext'
import Card from '../components/organisms/Card'
import Button from '../components/atoms/Button'
import EmptyState from '../components/molecules/EmptyState'

export default function PendingPage() {
  const { signOut } = useAuth()
  return (
    <div className="flex min-h-screen items-center justify-center bg-app-bg p-4">
      <Card className="w-full max-w-sm">
        <EmptyState
          icon="⏳"
          title="Menunggu Persetujuan"
          description="Akun Anda sudah terdaftar dan menunggu admin memberikan peran akses. Hubungi admin HRD Al-Falah untuk mempercepat proses ini."
          action={<Button variant="secondary" onClick={signOut}>Keluar</Button>}
        />
      </Card>
    </div>
  )
}
