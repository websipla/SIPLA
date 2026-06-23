import { useEffect, useState } from 'react'
import api from '../../services/api'
import AdminLayout from '../../components/AdminLayout'

export default function AdminMasyarakat() {
  const [list, setList]         = useState([])
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState(null)
  const [resetModal, setResetModal] = useState(null)   // data user yang akan direset
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMsg, setResetMsg] = useState(null) // { type: 'success'|'error', text }

  useEffect(() => {
    api.get('/masyarakat').then(r => setList(r.data.data || []))
  }, [])

  const filtered = list.filter(m =>
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.nik?.includes(search) ||
    m.username?.toLowerCase().includes(search.toLowerCase()) ||
    m.email?.toLowerCase().includes(search.toLowerCase()) ||
    m.telp?.includes(search)
  )

  const openReset = (m) => {
    setResetModal(m)
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
        `/reset-password/masyarakat/${resetModal.nik}`,
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

  // Export PDF
  const exportPDF = () => {
    const tgl  = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    const rows = filtered.map((m, i) => `
      <tr>
        <td>${i + 1}</td>
        <td style="font-family:monospace;font-size:9px">${m.nik}</td>
        <td>${m.name}</td>
        <td>${m.email}</td>
        <td>${m.telp}</td>
        <td>${m.jenis_kelamin}</td>
        <td>${m.alamat ? `${m.alamat}, RT ${m.rt}/RW ${m.rw}` : '-'}</td>
      </tr>`).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
    <title>Data Masyarakat</title>
    <style>
      body{font-family:Arial,sans-serif;font-size:11px;margin:20px;color:#333}
      .header{text-align:center;margin-bottom:20px;border-bottom:2px solid #059669;padding-bottom:12px}
      .header h2{margin:0;color:#059669;font-size:15px}
      .header p{margin:2px 0;font-size:11px;color:#666}
      .meta{display:flex;justify-content:space-between;margin-bottom:12px;font-size:10px;color:#666}
      table{width:100%;border-collapse:collapse}
      th{background:#059669;color:#fff;padding:7px 6px;text-align:left;font-size:10px}
      td{padding:6px;border-bottom:1px solid #eee;vertical-align:top;font-size:10px}
      tr:nth-child(even) td{background:#f9f9f9}
      @media print{body{margin:0}}
    </style></head><body>
    <div class="header">
      <h2>DATA MASYARAKAT TERDAFTAR</h2>
      <p>Kelurahan Serua Indah · Kecamatan Ciputat · Kota Tangerang Selatan</p>
      <p>Sistem Informasi Pusat Layanan dan Aspirasi Masyarakat (SIPLA)</p>
    </div>
    <div class="meta">
      <span>Tanggal Cetak: ${tgl}</span>
      <span>Total: ${filtered.length} warga terdaftar</span>
    </div>
    <table>
      <thead><tr><th>No</th><th>NIK</th><th>Nama</th><th>Email</th><th>No. HP</th><th>Jenis Kelamin</th><th>Alamat</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></body></html>`

    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print(); w.close() }, 500)
  }

  return (
    <AdminLayout>
      <div className="space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Data Masyarakat</h1>
            <p className="text-gray-500 text-sm">
              {filtered.length} dari {list.length} warga terdaftar
            </p>
          </div>
          <button
            onClick={exportPDF}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-xl text-sm font-semibold transition"
          >
            📄 Export PDF
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama, NIK, username, email, atau no. HP..."
            className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
              ✕
            </button>
          )}
        </div>

        {/* Tabel */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['No','NIK','Nama','Username','Email','No. HP','Jenis Kelamin','Alamat','Aksi'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-gray-500 font-semibold text-xs uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-10 text-gray-400">
                      {search ? `Tidak ada hasil untuk "${search}"` : 'Belum ada data masyarakat'}
                    </td>
                  </tr>
                ) : filtered.map((m, i) => (
                  <tr key={m.nik} className="border-b hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600 whitespace-nowrap">{m.nik}</td>
                    <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{m.name}</td>
                    <td className="px-4 py-3 text-gray-600">{m.username}</td>
                    <td className="px-4 py-3 text-gray-600">{m.email}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{m.telp}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        m.jenis_kelamin === 'Laki-laki' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'
                      }`}>
                        {m.jenis_kelamin}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs">
                      {m.alamat ? (
                        <div>
                          <p className="truncate max-w-[180px]">{m.alamat}</p>
                          <p className="text-xs text-gray-400">RT {m.rt}/RW {m.rw}{m.kode_pos ? ` · ${m.kode_pos}` : ''}</p>
                        </div>
                      ) : <span className="text-gray-300">-</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setSelected(m)}
                          className="text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded-lg text-xs font-medium border border-emerald-200 whitespace-nowrap"
                        >
                          Detail
                        </button>
                        <button
                          onClick={() => openReset(m)}
                          className="text-orange-600 hover:bg-orange-50 px-2 py-1 rounded-lg text-xs font-medium border border-orange-200 whitespace-nowrap"
                        >
                          🔑 Reset PW
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Modal Detail ── */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex items-center justify-between">
              <h2 className="font-bold text-gray-800">Detail Masyarakat</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center text-2xl font-bold text-emerald-700 shrink-0">
                  {selected.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-lg">{selected.name}</p>
                  <p className="text-gray-400 text-sm">{selected.username}</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium mt-1 inline-block ${
                    selected.jenis_kelamin === 'Laki-laki' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'
                  }`}>
                    {selected.jenis_kelamin}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Informasi Akun</p>
                <div className="space-y-2">
                  {[['NIK', selected.nik], ['Email', selected.email], ['No. Telepon', selected.telp]].map(([l, v]) => (
                    <div key={l} className="flex items-start gap-3 bg-gray-50 rounded-xl px-4 py-3">
                      <span className="text-gray-400 text-sm w-24 shrink-0">{l}</span>
                      <span className="font-medium text-gray-800 text-sm break-all">{v || '-'}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Alamat</p>
                <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1.5 text-sm">
                  <p className="text-gray-800 font-medium">{selected.alamat || '-'}</p>
                  {selected.rt && <p className="text-gray-500">RT {selected.rt} / RW {selected.rw}</p>}
                  {selected.kode_pos && <p className="text-gray-400 text-xs">Kode Pos: {selected.kode_pos}</p>}
                </div>
              </div>
              {selected.created_at && (
                <p className="text-xs text-gray-400 text-center">
                  Terdaftar sejak {new Date(selected.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}
              <button
                onClick={() => { setSelected(null); openReset(selected) }}
                className="w-full border border-orange-200 text-orange-600 hover:bg-orange-50 py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2"
              >
                🔑 Reset Password Akun Ini
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Reset Password ── */}
      {resetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-800">Reset Password</h2>
                <p className="text-gray-400 text-xs mt-0.5">
                  Akun: <span className="font-medium text-gray-600">{resetModal.name}</span>
                  <span className="mx-1">·</span>
                  <span className="font-mono">{resetModal.username}</span>
                </p>
              </div>
              <button
                onClick={() => setResetModal(null)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleReset} className="p-5 space-y-4">

              {/* Info box */}
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-xs text-orange-700">
                ⚠️ Password baru akan langsung aktif. Pastikan masyarakat mengetahui password barunya.
              </div>

              {/* Pesan sukses / error */}
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
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                  >
                    {showPass ? '🙈' : '👁️'}
                  </button>
                </div>
                {/* Password strength indicator */}
                {newPassword && (
                  <div className="mt-1.5 flex gap-1">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all ${
                        newPassword.length >= (i + 1) * 3
                          ? newPassword.length >= 10 ? 'bg-green-500'
                          : newPassword.length >= 6 ? 'bg-yellow-400'
                          : 'bg-red-400'
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
                    confirmPassword && confirmPassword !== newPassword
                      ? 'border-red-300 bg-red-50'
                      : confirmPassword && confirmPassword === newPassword
                      ? 'border-green-300 bg-green-50'
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
                <button
                  type="button"
                  onClick={() => setResetModal(null)}
                  className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 py-2.5 rounded-xl text-sm font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={resetLoading || newPassword !== confirmPassword || newPassword.length < 6}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-2.5 rounded-xl text-sm font-semibold transition"
                >
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
