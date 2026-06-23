import { useEffect, useState, useRef } from 'react'
import api from '../../services/api'
import AdminLayout from '../../components/AdminLayout'

const statusBadge = (s) => {
  const m = { '0': ['Menunggu','bg-yellow-100 text-yellow-700'], proses: ['Diproses','bg-blue-100 text-blue-700'], selesai: ['Selesai','bg-green-100 text-green-700'] }
  const [label, cls] = m[s] || m['0']
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{label}</span>
}

const statusLabel = (s) => ({ '0': 'Menunggu', proses: 'Diproses', selesai: 'Selesai' }[s] || 'Menunggu')

export default function AdminAspirasi() {
  const [list, setList] = useState([])
  const [selected, setSelected] = useState(null)
  const [tanggapan, setTanggapan] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [fileBukti, setFileBukti] = useState(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const printRef = useRef()

  const fetchData = () => {
    const q = filterStatus ? `?status=${filterStatus}` : ''
    api.get(`/aspirasi${q}`).then(r => setList(r.data.data || []))
  }
  useEffect(() => { fetchData() }, [filterStatus])

  const openDetail = async (p) => {
    const res = await api.get(`/aspirasi/${p.id_pengaduan}`)
    setSelected(res.data.data)
    setNewStatus(res.data.data.status)
    setTanggapan('')
    setFileBukti(null)
  }

  const handleTanggapan = async () => {
    if (!tanggapan.trim()) return
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('id_pengaduan', selected.id_pengaduan)
      fd.append('tanggapan', tanggapan)
      fd.append('status', newStatus)
      if (fileBukti) fd.append('file_bukti', fileBukti)
      await api.post('/tanggapan', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      fetchData()
      setSelected(null)
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal kirim tanggapan')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Hapus aspirasi ini?')) return
    await api.delete(`/aspirasi/${id}`)
    fetchData()
  }

  // ── EXPORT EXCEL (via CSV) ──
  const exportExcel = () => {
    const headers = ['No','Judul Aspirasi','Pelapor','NIK','Tgl Pengaduan','Lokasi','Status']
    const rows = list.map((p, i) => [
      i + 1,
      `"${p.judul_laporan}"`,
      `"${p.masyarakat?.name || p.nik}"`,
      p.nik,
      new Date(p.tgl_pengaduan).toLocaleDateString('id-ID'),
      `"${p.lokasi_kejadian}"`,
      statusLabel(p.status),
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `aspirasi_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── EXPORT PDF (print) ──
  const exportPDF = () => {
    const tgl = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    const rows = list.map((p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${p.judul_laporan}</strong><br/><small>${p.isi_laporan?.slice(0, 80)}...</small></td>
        <td>${p.masyarakat?.name || p.nik}</td>
        <td>${new Date(p.tgl_pengaduan).toLocaleDateString('id-ID')}</td>
        <td>${p.lokasi_kejadian}</td>
        <td><span class="badge badge-${p.status}">${statusLabel(p.status)}</span></td>
      </tr>`).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
    <title>Laporan Aspirasi Masyarakat</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; color: #333; }
      .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #059669; padding-bottom: 12px; }
      .header h2 { margin: 0; color: #059669; font-size: 15px; }
      .header p { margin: 2px 0; font-size: 11px; color: #666; }
      .meta { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 10px; color: #666; }
      table { width: 100%; border-collapse: collapse; }
      th { background: #059669; color: white; padding: 7px 6px; text-align: left; font-size: 10px; }
      td { padding: 6px; border-bottom: 1px solid #eee; vertical-align: top; font-size: 10px; }
      tr:nth-child(even) td { background: #f9f9f9; }
      .badge { padding: 2px 7px; border-radius: 10px; font-size: 9px; font-weight: bold; }
      .badge-0 { background: #fef3c7; color: #92400e; }
      .badge-proses { background: #dbeafe; color: #1e40af; }
      .badge-selesai { background: #d1fae5; color: #065f46; }
      @media print { body { margin: 0; } }
    </style></head><body>
    <div class="header">
      <h2>LAPORAN ASPIRASI MASYARAKAT</h2>
      <p>Kelurahan Serua Indah · Kecamatan Ciputat · Kota Tangerang Selatan</p>
      <p>Sistem Informasi Pusat Layanan dan Aspirasi Masyarakat (SIPLA)</p>
    </div>
    <div class="meta">
      <span>Tanggal Cetak: ${tgl}</span>
      <span>Total Data: ${list.length} aspirasi ${filterStatus ? '· Filter: ' + statusLabel(filterStatus) : ''}</span>
    </div>
    <table>
      <thead><tr><th>No</th><th>Judul Aspirasi</th><th>Pelapor</th><th>Tgl</th><th>Lokasi</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    </body></html>`

    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print(); w.close() }, 500)
  }

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Aspirasi Masyarakat</h1>
            <p className="text-gray-500 text-sm">Kelola penyampaian aspirasi dan pengaduan</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none bg-white focus:ring-2 focus:ring-emerald-500">
              <option value="">Semua Status</option>
              <option value="0">Menunggu</option>
              <option value="proses">Diproses</option>
              <option value="selesai">Selesai</option>
            </select>
            {/* Export buttons */}
            <button onClick={exportPDF}
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-xl text-sm font-semibold transition">
              <span>📄</span> PDF
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['No','Judul Aspirasi','Pelapor','Tgl Pengaduan','Lokasi','Status','Aksi'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-gray-500 font-semibold text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">Tidak ada data</td></tr>
              ) : list.map((p, i) => (
                <tr key={p.id_pengaduan} className="border-b hover:bg-gray-50 transition">
                  <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800 max-w-xs truncate">{p.judul_laporan}</p>
                    <p className="text-xs text-gray-400 truncate">{p.isi_laporan}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{p.masyarakat?.name || p.nik}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(p.tgl_pengaduan).toLocaleDateString('id-ID')}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{p.lokasi_kejadian}</td>
                  <td className="px-4 py-3">{statusBadge(p.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openDetail(p)}
                        className="text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded-lg text-xs font-medium border border-emerald-200">Detail</button>
                      <button onClick={() => handleDelete(p.id_pengaduan)}
                        className="text-red-500 hover:bg-red-50 px-2 py-1 rounded-lg text-xs font-medium border border-red-200">Hapus</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-lg">Detail Aspirasi</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Pelapor', selected.masyarakat?.name || selected.nik],
                  ['NIK', selected.nik],
                  ['Tgl Pengaduan', new Date(selected.tgl_pengaduan).toLocaleString('id-ID')],
                  ['Tgl Kejadian', new Date(selected.tgl_kejadian).toLocaleDateString('id-ID')],
                ].map(([l, v]) => (
                  <div key={l} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-gray-400 text-xs">{l}</p>
                    <p className="font-medium text-gray-800 mt-0.5">{v}</p>
                  </div>
                ))}
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <p className="font-semibold text-gray-800">{selected.judul_laporan}</p>
                <p className="text-gray-600">{selected.isi_laporan}</p>
                <p className="text-gray-500 text-xs">📍 {selected.lokasi_kejadian}</p>
                {selected.latitude && <p className="text-gray-400 text-xs">🗺️ {selected.latitude}, {selected.longitude}</p>}
              </div>
              {selected.foto && (
                <img src={`http://localhost:8080/${selected.foto}`} alt="foto" className="rounded-xl max-h-48 object-cover w-full" />
              )}
              {selected.tanggapan?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Riwayat Tanggapan</p>
                  {selected.tanggapan.map(t => (
                    <div key={t.id_tanggapan} className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-sm mb-2">
                      <p className="font-semibold text-emerald-800">{t.petugas?.nama_petugas}</p>
                      <p className="text-gray-700 mt-1">{t.tanggapan}</p>
                      {t.file_bukti && (
                        <a href={`http://localhost:8080/${t.file_bukti}`} target="_blank" rel="noreferrer"
                          className="text-emerald-600 text-xs underline mt-1 block">📎 Lihat file bukti</a>
                      )}
                      <p className="text-gray-400 text-xs mt-1">{new Date(t.tgl_tanggapan).toLocaleString('id-ID')}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="border-t pt-4 space-y-3">
                <p className="font-semibold text-gray-800">Kirim Tanggapan</p>
                <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="0">Menunggu</option>
                  <option value="proses">Diproses</option>
                  <option value="selesai">Selesai</option>
                </select>
                <textarea value={tanggapan} onChange={e => setTanggapan(e.target.value)}
                  placeholder="Tulis tanggapan..." rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Upload Bukti Penanganan (PDF / JPG / PNG)</label>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setFileBukti(e.target.files[0])}
                    className="w-full text-sm text-gray-500 border border-gray-200 rounded-xl px-3 py-2" />
                </div>
                <button onClick={handleTanggapan} disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-sm font-semibold transition disabled:bg-emerald-400">
                  {loading ? 'Mengirim...' : 'Kirim Tanggapan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
