import { useEffect, useState } from 'react'
import api, { getAssetUrl } from '../../services/api'
import UserLayout from '../../components/UserLayout'

const statusBadge = (status) => {
  const map = {
    '0': { label: 'Menunggu', cls: 'bg-yellow-100 text-yellow-700' },
    proses: { label: 'Diproses', cls: 'bg-blue-100 text-blue-700' },
    selesai: { label: 'Selesai', cls: 'bg-green-100 text-green-700' },
  }
  const s = map[status] || map['0']
  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>
}

export default function UserPengaduan() {
  const [list, setList] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({ judul_laporan: '', isi_laporan: '', tgl_kejadian: '', lokasi_kejadian: '', foto: null })
  const [loading, setLoading] = useState(false)

  const fetchData = () => api.get('/pengaduan').then(r => setList(r.data.data || []))
  useEffect(() => { fetchData() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v) })
      await api.post('/pengaduan', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setShowForm(false)
      setForm({ judul_laporan: '', isi_laporan: '', tgl_kejadian: '', lokasi_kejadian: '', foto: null })
      fetchData()
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal membuat pengaduan')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Hapus pengaduan ini?')) return
    await api.delete(`/pengaduan/${id}`)
    fetchData()
  }

  return (
    <UserLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Pengaduan Saya</h1>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            + Buat Pengaduan
          </button>
        </div>

        {list.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-12 text-center">
            <p className="text-5xl mb-3">📝</p>
            <p className="text-gray-500">Belum ada pengaduan. Klik tombol di atas untuk membuat pengaduan baru.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {list.map(p => (
              <div key={p.id_pengaduan} className="bg-white rounded-xl shadow p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {statusBadge(p.status)}
                      <span className="text-xs text-gray-400">
                        {new Date(p.tgl_pengaduan).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-800 truncate">{p.judul_laporan}</h3>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{p.isi_laporan}</p>
                    <p className="text-xs text-gray-400 mt-1">📍 {p.lokasi_kejadian}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => setSelected(p)}
                      className="text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded text-xs font-medium border border-blue-200"
                    >
                      Detail
                    </button>
                    {p.status === '0' && (
                      <button
                        onClick={() => handleDelete(p.id_pengaduan)}
                        className="text-red-600 hover:bg-red-50 px-3 py-1.5 rounded text-xs font-medium border border-red-200"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Form Buat Pengaduan */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex items-center justify-between">
              <h2 className="font-bold text-gray-800">Buat Pengaduan Baru</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Judul Laporan</label>
                <input
                  value={form.judul_laporan}
                  onChange={e => setForm({ ...form, judul_laporan: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Isi Laporan</label>
                <textarea
                  value={form.isi_laporan}
                  onChange={e => setForm({ ...form, isi_laporan: e.target.value })}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Tanggal Kejadian</label>
                <input
                  type="date"
                  value={form.tgl_kejadian}
                  onChange={e => setForm({ ...form, tgl_kejadian: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Lokasi Kejadian</label>
                <input
                  value={form.lokasi_kejadian}
                  onChange={e => setForm({ ...form, lokasi_kejadian: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Foto (opsional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setForm({ ...form, foto: e.target.files[0] })}
                  className="w-full text-sm text-gray-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 rounded-lg text-sm font-medium transition"
              >
                {loading ? 'Mengirim...' : 'Kirim Pengaduan'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex items-center justify-between">
              <h2 className="font-bold text-gray-800">Detail Pengaduan</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div className="flex gap-2">{statusBadge(selected.status)}</div>
              <p><span className="text-gray-500">Judul:</span> <strong>{selected.judul_laporan}</strong></p>
              <p><span className="text-gray-500">Isi:</span> {selected.isi_laporan}</p>
              <p><span className="text-gray-500">Lokasi:</span> {selected.lokasi_kejadian}</p>
              <p><span className="text-gray-500">Tgl Kejadian:</span> {new Date(selected.tgl_kejadian).toLocaleDateString('id-ID')}</p>
              {selected.foto && (
                <img src={getAssetUrl(selected.foto)} alt="foto" className="rounded-lg max-h-48 w-full object-cover" />
              )}

              {selected.tanggapan?.length > 0 && (
                <div className="border-t pt-3">
                  <p className="font-medium text-gray-800 mb-2">Tanggapan Petugas</p>
                  {selected.tanggapan.map(t => (
                    <div key={t.id_tanggapan} className="bg-blue-50 rounded-lg p-3 mb-2">
                      <p className="font-medium text-blue-800">{t.petugas?.nama_petugas}</p>
                      <p className="text-gray-700 mt-1">{t.tanggapan}</p>
                      <p className="text-gray-400 text-xs mt-1">{new Date(t.tgl_tanggapan).toLocaleString('id-ID')}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </UserLayout>
  )
}
