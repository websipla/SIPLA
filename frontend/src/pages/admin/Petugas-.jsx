import { useEffect, useState } from 'react'
import api from '../../services/api'
import AdminLayout from '../../components/AdminLayout'
import { useAuth } from '../../context/AuthContext'

export default function AdminPetugas() {
  const { user } = useAuth()
  const [list, setList]             = useState([])
  const [resetModal, setResetModal] = useState(null)
  const [newPassword, setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass, setShowPass]     = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMsg, setResetMsg]     = useState(null)

  useEffect(() => {
    api.get('/petugas').then(r => setList(r.data.data || []))
  }, [])

  const openReset = (p) => {
    setResetModal(p)
    setNewPassword('')
    setConfirmPassword('')
    setShowPass(false)
    setResetMsg(null)
  }

  const handleReset = async (e) => {
    e.preventDefault()
    setResetMsg(null)

    if (newPassword.length < 6) {
      setResetMsg({ type: 'error', text: 'Password minimal 6 karakter' })
      return
    }
    if (newPassword !== confirmPassword) {
      setResetMsg({ type: 'error', text: 'Konfirmasi password tidak cocok' })
      return
    }

    setResetLoading(true)
    try {
      const res = await api.put(
        `/reset-password/petugas/${resetModal.id_petugas}`,
        { new_password: newPassword }
      )
      setResetMsg({ type: 'success', text: res.data.message })
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setResetMsg({ type: 'error', text: err.response?.data?.error || 'Gagal mereset password' })
    } finally {
      setResetLoading(false)
    }
  }

  const roleLabel = (r) => ({
    admin:   { label: 'Admin',   cls: 'bg-purple-100 text-purple-700' },
    petugas: { label: 'Petugas', cls: 'bg-blue-100 text-blue-700' },
  }[r] || { label: r, cls: 'bg-gray-100 text-gray-600' })

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Data Petugas</h1>
          <p className="text-gray-500 text-sm">{list.length} petugas terdaftar</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['No', 'Nama Petugas', 'Username', 'No. HP', 'Role', 'Aksi'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-gray-500 font-semibold text-xs uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Tidak ada data</td></tr>
              ) : list.map((p, i) => {
                const { label, cls } = roleLabel(p.roles)
                const isSelf = p.username === user?.username
                return (
                  <tr key={p.id_petugas} className="border-b hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold shrink-0">
                          {p.nama_petugas?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{p.nama_petugas}</p>
                          {isSelf && <p className="text-xs text-emerald-600">(Anda)</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.username}</td>
                    <td className="px-4 py-3 text-gray-600">{p.telp || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openReset(p)}
                        className="text-orange-600 hover:bg-orange-50 px-2 py-1 rounded-lg text-xs font-medium border border-orange-200 whitespace-nowrap"
                      >
                        🔑 Reset PW
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal Reset Password Petugas ── */}
      {resetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-800">Reset Password Petugas</h2>
                <p className="text-gray-400 text-xs mt-0.5">
                  <span className="font-medium text-gray-600">{resetModal.nama_petugas}</span>
                  <span className="mx-1">·</span>
                  <span className="font-mono">{resetModal.username}</span>
                </p>
              </div>
              <button onClick={() => setResetModal(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <form onSubmit={handleReset} className="p-5 space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-xs text-orange-700">
                ⚠️ Hanya admin yang dapat mereset password petugas. Password baru akan langsung aktif.
              </div>

              {resetMsg && (
                <div className={`rounded-xl px-4 py-3 text-sm flex items-center gap-2 ${
                  resetMsg.type === 'success'
                    ? 'bg-green-50 border border-green-200 text-green-700'
                    : 'bg-red-50 border border-red-200 text-red-600'
                }`}>
                  <span>{resetMsg.type === 'success' ? '✅' : '⚠️'}</span>
                  <span>{resetMsg.text}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password Baru</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none pr-10"
                    required
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                    {showPass ? '🙈' : '👁️'}
                  </button>
                </div>
                {newPassword && (
                  <div className="mt-1.5 flex gap-1 items-center">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all ${
                        newPassword.length >= (i + 1) * 3
                          ? newPassword.length >= 10 ? 'bg-green-500' : newPassword.length >= 6 ? 'bg-yellow-400' : 'bg-red-400'
                          : 'bg-gray-200'
                      }`} />
                    ))}
                    <span className="text-xs text-gray-400 ml-1">
                      {newPassword.length < 6 ? 'Lemah' : newPassword.length < 10 ? 'Cukup' : 'Kuat'}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Konfirmasi Password Baru</label>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password baru"
                  className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition ${
                    confirmPassword && confirmPassword !== newPassword ? 'border-red-300 bg-red-50'
                    : confirmPassword && confirmPassword === newPassword ? 'border-green-300 bg-green-50'
                    : 'border-gray-200'
                  }`}
                  required
                />
                {confirmPassword && confirmPassword !== newPassword && (
                  <p className="text-xs text-red-500 mt-1">Password tidak cocok</p>
                )}
                {confirmPassword && confirmPassword === newPassword && (
                  <p className="text-xs text-green-600 mt-1">✓ Password cocok</p>
                )}
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setResetModal(null)}
                  className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 py-2.5 rounded-xl text-sm font-semibold transition">
                  Batal
                </button>
                <button type="submit"
                  disabled={resetLoading || newPassword !== confirmPassword || newPassword.length < 6}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-2.5 rounded-xl text-sm font-semibold transition">
                  {resetLoading ? 'Menyimpan...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
