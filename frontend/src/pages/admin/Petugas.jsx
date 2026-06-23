import { useEffect, useState } from 'react'
import api, { getApiError } from '../../services/api'
import AdminLayout from '../../components/AdminLayout'
import { useAuth } from '../../context/AuthContext'

const EMPTY_FORM = { nama_petugas: '', username: '', password: '', telp: '', roles: 'petugas' }

export default function AdminPetugas() {
  const { user } = useAuth()
  const [list, setList]               = useState([])
  const [showForm, setShowForm]       = useState(false)
  const [form, setForm]               = useState(EMPTY_FORM)
  const [showPass, setShowPass]       = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [formMsg, setFormMsg]         = useState(null)
  const [resetModal, setResetModal]   = useState(null)
  const [newPassword, setNewPassword]         = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showResetPass, setShowResetPass]     = useState(false)
  const [resetLoading, setResetLoading]       = useState(false)
  const [resetMsg, setResetMsg]               = useState(null)

  const fetchData = () => api.get('/petugas')
    .then(r => setList(r.data.data || []))
    .catch(err => setFormMsg({ type: 'error', text: getApiError(err, 'Gagal memuat petugas') }))
  useEffect(() => { fetchData() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setFormMsg(null)
    setFormLoading(true)
    try {
      const res = await api.post('/petugas', form)
      setShowForm(false)
      setForm(EMPTY_FORM)
      setFormMsg({ type: 'success', text: res.data.message || `Petugas "${form.nama_petugas}" berhasil ditambahkan` })
      await fetchData()
    } catch (err) {
      setFormMsg({ type: 'error', text: getApiError(err, 'Gagal menambah petugas') })
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async (p) => {
    if (!confirm(`Hapus petugas "${p.nama_petugas}" (${p.username})? Tindakan ini tidak dapat dibatalkan.`)) return
    try {
      const res = await api.delete(`/petugas/${p.id_petugas}`)
      await fetchData()
      setFormMsg({ type: 'success', text: res.data.message || 'Petugas berhasil dihapus' })
    } catch (err) {
      setFormMsg({ type: 'error', text: getApiError(err, 'Gagal menghapus petugas') })
    }
  }

  const openReset = (p) => {
    setResetModal(p)
    setNewPassword('')
    setConfirmPassword('')
    setShowResetPass(false)
    setResetMsg(null)
  }

  const handleReset = async (e) => {
    e.preventDefault()
    setResetMsg(null)
    if (newPassword.length < 6) { setResetMsg({ type: 'error', text: 'Password minimal 6 karakter' }); return }
    if (newPassword !== confirmPassword) { setResetMsg({ type: 'error', text: 'Konfirmasi password tidak cocok' }); return }
    setResetLoading(true)
    try {
      const res = await api.put(`/reset-password/petugas/${resetModal.id_petugas}`, { new_password: newPassword })
      setResetMsg({ type: 'success', text: res.data.message })
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setResetMsg({ type: 'error', text: getApiError(err, 'Gagal mereset password') })
    } finally {
      setResetLoading(false)
    }
  }

  const roleLabel = (r) => ({
    admin:   { label: 'Administrator', cls: 'bg-purple-100 text-purple-700' },
    petugas: { label: 'Petugas',       cls: 'bg-blue-100 text-blue-700' },
  }[r] || { label: r, cls: 'bg-gray-100 text-gray-600' })

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Data Petugas</h1>
            <p className="text-gray-500 text-sm">{list.length} petugas terdaftar</p>
          </div>
          <button onClick={() => { setShowForm(true); setFormMsg(null) }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2">
            + Tambah Petugas
          </button>
        </div>

        {/* Pesan sukses/error global */}
        {formMsg && !showForm && (
          <div className={`rounded-xl px-4 py-3 text-sm flex items-center gap-2 ${
            formMsg.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-600'
          }`}>
            <span>{formMsg.type === 'success' ? '✅' : '⚠️'}</span><span>{formMsg.text}</span>
          </div>
        )}

        {/* Tabel */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['No','Nama Petugas','Username','No. HP','Role','Aksi'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-gray-500 font-semibold text-xs uppercase tracking-wide">{h}</th>
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
                    <td className="px-4 py-3 text-gray-400 text-xs">{i+1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold shrink-0">
                          {p.nama_petugas?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{p.nama_petugas}</p>
                          {isSelf && <p className="text-xs text-emerald-600 font-medium">(Akun Anda)</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.username}</td>
                    <td className="px-4 py-3 text-gray-600">{p.telp || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => openReset(p)}
                          className="text-orange-600 hover:bg-orange-50 px-2 py-1 rounded-lg text-xs font-medium border border-orange-200 whitespace-nowrap">
                          🔑 Reset PW
                        </button>
                        {!isSelf && (
                          <button onClick={() => handleDelete(p)}
                            className="text-red-500 hover:bg-red-50 px-2 py-1 rounded-lg text-xs font-medium border border-red-200 whitespace-nowrap">
                            🗑️ Hapus
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal Tambah Petugas ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b flex items-center justify-between">
              <h2 className="font-bold text-gray-800">Tambah Petugas Baru</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              {formMsg && (
                <div className={`rounded-xl px-4 py-3 text-sm flex items-center gap-2 ${
                  formMsg.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-600'
                }`}>
                  <span>{formMsg.type === 'success' ? '✅' : '⚠️'}</span><span>{formMsg.text}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <div className="flex gap-2">
                  {[
                    { val: 'petugas', label: '👮 Petugas', desc: 'Dapat mengelola aspirasi & permohonan' },
                    { val: 'admin',   label: '🛡️ Administrator', desc: 'Akses penuh ke semua fitur' },
                  ].map(r => (
                    <button key={r.val} type="button" onClick={() => setForm({ ...form, roles: r.val })}
                      className={`flex-1 p-3 rounded-xl border-2 text-left transition ${
                        form.roles === r.val ? 'border-emerald-500 bg-emerald-50' : 'border-gray-100 bg-gray-50 hover:border-emerald-200'
                      }`}>
                      <p className="font-semibold text-sm text-gray-800">{r.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{r.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {[
                ['Nama Lengkap', 'nama_petugas', 'text', 'Nama petugas'],
                ['Username',     'username',     'text', 'Username login'],
                ['No. HP',       'telp',         'tel',  '08xxxxxxxxxx'],
              ].map(([label, key, type, placeholder]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input type={type} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
                    placeholder={placeholder}
                    required={key !== 'telp'}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-gray-50" />
                </div>
              ))}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder="Minimal 6 karakter" required
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-gray-50 pr-10" />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                    {showPass ? '🙈' : '👁️'}
                  </button>
                </div>
                {form.password && (
                  <div className="mt-1.5 flex gap-1 items-center">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all ${
                        form.password.length >= (i+1)*3
                          ? form.password.length >= 10 ? 'bg-green-500' : form.password.length >= 6 ? 'bg-yellow-400' : 'bg-red-400'
                          : 'bg-gray-200'
                      }`} />
                    ))}
                    <span className="text-xs text-gray-400 ml-1">
                      {form.password.length < 6 ? 'Lemah' : form.password.length < 10 ? 'Cukup' : 'Kuat'}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 py-2.5 rounded-xl text-sm font-semibold transition">
                  Batal
                </button>
                <button type="submit" disabled={formLoading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white py-2.5 rounded-xl text-sm font-semibold transition">
                  {formLoading ? 'Menyimpan...' : 'Tambah Petugas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Reset Password ── */}
      {resetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
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
                ⚠️ Password baru akan langsung aktif saat petugas login berikutnya.
              </div>
              {resetMsg && (
                <div className={`rounded-xl px-4 py-3 text-sm flex items-center gap-2 ${
                  resetMsg.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-600'
                }`}>
                  <span>{resetMsg.type === 'success' ? '✅' : '⚠️'}</span><span>{resetMsg.text}</span>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password Baru</label>
                <div className="relative">
                  <input type={showResetPass ? 'text' : 'password'} value={newPassword}
                    onChange={e => setNewPassword(e.target.value)} placeholder="Minimal 6 karakter" required
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none pr-10" />
                  <button type="button" onClick={() => setShowResetPass(!showResetPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                    {showResetPass ? '🙈' : '👁️'}
                  </button>
                </div>
                {newPassword && (
                  <div className="mt-1.5 flex gap-1 items-center">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full ${
                        newPassword.length >= (i+1)*3
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Konfirmasi Password</label>
                <input type={showResetPass ? 'text' : 'password'} value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)} placeholder="Ulangi password baru" required
                  className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition ${
                    confirmPassword && confirmPassword !== newPassword ? 'border-red-300 bg-red-50'
                    : confirmPassword && confirmPassword === newPassword ? 'border-green-300 bg-green-50'
                    : 'border-gray-200'
                  }`} />
                {confirmPassword && confirmPassword !== newPassword && <p className="text-xs text-red-500 mt-1">Password tidak cocok</p>}
                {confirmPassword && confirmPassword === newPassword && <p className="text-xs text-green-600 mt-1">✓ Password cocok</p>}
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setResetModal(null)}
                  className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 py-2.5 rounded-xl text-sm font-semibold transition">
                  Batal
                </button>
                <button type="submit" disabled={resetLoading || newPassword !== confirmPassword || newPassword.length < 6}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white py-2.5 rounded-xl text-sm font-semibold transition disabled:cursor-not-allowed">
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
