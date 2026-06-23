import { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api, { getApiError } from '../services/api'

export default function Login() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const location = useLocation()

  const [form, setForm]     = useState({ username: '', password: '', role: 'masyarakat' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  // Lupa password
  const [showLupa, setShowLupa]   = useState(false)
  const [lupaForm, setLupaForm]   = useState({ nik: '', no_hp: '' })
  const [lupaStep, setLupaStep]   = useState('form') // 'form' | 'success'
  const [lupaError, setLupaError] = useState('')
  const [lupaLoading, setLupaLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await login(form.username, form.password, form.role)
      if (data.role === 'admin' || data.role === 'petugas') navigate('/admin/dashboard')
      else navigate('/user/aspirasi')
    } catch (err) {
      setError(getApiError(err, 'Username atau password salah'))
    } finally {
      setLoading(false)
    }
  }

  const handleLupaSubmit = async (e) => {
    e.preventDefault()
    setLupaError('')
    setLupaLoading(true)
    try {
      await api.post('/public/lupa-password', lupaForm)
      setLupaStep('success')
    } catch (err) {
      setLupaError(getApiError(err, 'Gagal mengirim permintaan'))
    } finally {
      setLupaLoading(false)
    }
  }

  const closeLupa = () => {
    setShowLupa(false)
    setLupaStep('form')
    setLupaForm({ nik: '', no_hp: '' })
    setLupaError('')
  }

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'Segoe UI', sans-serif" }}>

      {/* Panel Kiri */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-900 via-teal-800 to-emerald-800 flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/2" />
        <div className="relative z-10 text-center max-w-sm">
          <div className="w-20 h-20 mx-auto mb-6 bg-white/15 rounded-3xl flex items-center justify-center border border-white/20">
            <span className="text-4xl">🏛️</span>
          </div>
          <h1 className="text-white text-xl font-bold leading-snug mb-2">
            Sistem Informasi Pusat Layanan dan Aspirasi Masyarakat Berbasis Web
          </h1>
          <p className="text-emerald-300 font-semibold text-base mt-3">Kelurahan Serua Indah</p>
          <p className="text-white/50 text-sm mt-1">Kecamatan Ciputat · Tangerang Selatan</p>
          <div className="mt-10 grid grid-cols-2 gap-3">
            {[['📢','Aspirasi Masyarakat'],['📄','Permohonan Layanan'],['🗺️','Info Wilayah'],['⚡','Proses Cepat']].map(([icon, label]) => (
              <div key={label} className="bg-white/10 rounded-xl p-3 flex items-center gap-2 border border-white/10">
                <span className="text-base">{icon}</span>
                <span className="text-white/80 text-xs font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel Kanan */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md">

          {/* Mobile header */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-3 bg-emerald-600 rounded-2xl flex items-center justify-center">
              <span className="text-2xl">🏛️</span>
            </div>
            <h1 className="text-base font-bold text-gray-800 leading-snug">SIPLA Kelurahan Serua Indah</h1>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-1">Selamat Datang</h2>
            <p className="text-gray-400 text-sm mb-6">Masuk ke akun Anda untuk melanjutkan</p>
            {location.state?.success && (
              <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm mb-4">
                {location.state.success}
              </div>
            )}

            {/* Toggle Role */}
            <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
              {[{ val: 'masyarakat', label: '👤 Masyarakat' }, { val: 'petugas', label: '🛡️ Petugas / Admin' }].map(r => (
                <button key={r.val} type="button"
                  onClick={() => setForm({ ...form, role: r.val })}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    form.role === r.val ? 'bg-white text-emerald-700 shadow font-semibold' : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  {r.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
                  <span>⚠️</span><span>{error}</span>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input type="text" value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value })}
                  placeholder="Masukkan username"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition bg-gray-50"
                  required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder="Masukkan password"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition bg-gray-50 pr-12"
                    required />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
                    {showPass ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Link lupa password - hanya untuk masyarakat */}
              {form.role === 'masyarakat' && (
                <div className="text-right">
                  <button type="button" onClick={() => setShowLupa(true)}
                    className="text-sm text-emerald-600 hover:underline">
                    Lupa password?
                  </button>
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold py-3 rounded-xl transition text-sm">
                {loading ? 'Memproses...' : 'Masuk'}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-5">
              Belum punya akun?{' '}
              <Link to="/register" className="text-emerald-600 hover:underline font-semibold">Daftar sekarang</Link>
            </p>
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">
            © 2026 Kelurahan Serua Indah · Sistem Informasi Pusat Layanan dan Aspirasi Masyarakat
          </p>
        </div>
      </div>

      {/* ── Modal Lupa Password ── */}
      {showLupa && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-800">Lupa Password</h2>
                <p className="text-gray-400 text-xs mt-0.5">Kirim permintaan reset ke petugas kelurahan</p>
              </div>
              <button onClick={closeLupa} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div className="p-5">
              {lupaStep === 'form' ? (
                <form onSubmit={handleLupaSubmit} className="space-y-4">

                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                    ℹ️ Isi NIK dan no. HP yang terdaftar. Petugas kelurahan akan memproses permintaan Anda dan menghubungi Anda dengan password baru.
                  </div>

                  {lupaError && (
                    <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
                      <span>⚠️</span><span>{lupaError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">NIK (16 digit)</label>
                    <input type="text" value={lupaForm.nik}
                      onChange={e => setLupaForm({ ...lupaForm, nik: e.target.value })}
                      placeholder="Masukkan NIK Anda"
                      maxLength={16}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      required />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">No. HP Terdaftar</label>
                    <input type="tel" value={lupaForm.no_hp}
                      onChange={e => setLupaForm({ ...lupaForm, no_hp: e.target.value })}
                      placeholder="08xxxxxxxxxx"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      required />
                    <p className="text-xs text-gray-400 mt-1">Harus sesuai dengan no. HP yang didaftarkan</p>
                  </div>

                  <div className="flex gap-3">
                    <button type="button" onClick={closeLupa}
                      className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 py-2.5 rounded-xl text-sm font-semibold transition">
                      Batal
                    </button>
                    <button type="submit" disabled={lupaLoading}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white py-2.5 rounded-xl text-sm font-semibold transition">
                      {lupaLoading ? 'Mengirim...' : 'Kirim Permintaan'}
                    </button>
                  </div>
                </form>
              ) : (
                /* Success state */
                <div className="text-center py-4 space-y-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-3xl">✅</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">Permintaan Terkirim!</h3>
                    <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                      Permintaan reset password Anda sudah diterima. Petugas kelurahan akan segera memproses dan menghubungi Anda melalui nomor HP yang terdaftar.
                    </p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 text-left">
                    💡 <strong>Jam layanan:</strong> Senin–Jumat, 08.00–16.00 WIB. Permintaan di luar jam layanan akan diproses pada hari kerja berikutnya.
                  </div>
                  <button onClick={closeLupa}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-sm font-semibold transition">
                    Kembali ke Login
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
