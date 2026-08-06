// src/pages/LoginPage.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Button from '../components/atoms/Button'
import Input from '../components/atoms/Input'
import Card from '../components/organisms/Card'
import Alert from '../components/molecules/Alert'

export default function LoginPage() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setSubmitting(true)
    if (mode === 'login') {
      const res = await signIn(email, password)
      if (res.ok) navigate('/')
      else setError(res.error)
    } else {
      const res = await signUp(email, password, fullName)
      if (res.ok) {
        if (res.authenticated) {
          navigate('/')
        } else {
          setInfo('Pendaftaran berhasil. Silakan periksa email Anda untuk konfirmasi, lalu masuk.')
          setMode('login')
        }
      } else setError(res.error)
    }
    setSubmitting(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-bg p-4">
      <Card className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-primary font-display text-2xl font-bold text-white">
            A
          </div>
          <h1 className="font-display text-lg font-bold text-slate-900">HRIS Al-Falah</h1>
          <p className="text-sm text-slate-500">{mode === 'login' ? 'Masuk ke akun Anda' : 'Buat akun baru'}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <Input label="Nama Lengkap" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          )}
          <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@alfalahabulamu.com" />
          <Input label="Kata Sandi" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />

          {error && <Alert variant="error">{error}</Alert>}
          {info && <Alert variant="success">{info}</Alert>}

          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={submitting}>
            {submitting ? 'Memproses…' : mode === 'login' ? 'Masuk' : 'Daftar'}
          </Button>
        </form>

        <button
          className="mt-4 w-full text-center text-sm text-slate-500 hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded"
          onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setInfo('') }}
        >
          {mode === 'login' ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Masuk'}
        </button>
      </Card>
    </div>
  )
}
