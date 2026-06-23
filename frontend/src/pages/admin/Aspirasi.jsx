import { useEffect, useRef, useState } from 'react'
import api, { getAssetUrl } from '../../services/api'
import AdminLayout from '../../components/AdminLayout'
import { useAuth } from '../../context/AuthContext'

// Status resmi — dipakai di dropdown filter & progress bar
const FILTER_ASPIRASI = [
  { val: 'verifikasi_lapangan',  label: 'Verifikasi Lapangan',         cls: 'bg-blue-100 text-blue-700',    step: 1 },
  { val: 'koordinasi',           label: 'Koordinasi Perangkat Daerah', cls: 'bg-purple-100 text-purple-700', step: 2 },
  { val: 'proses_penyelesaian',  label: 'Proses Penyelesaian',         cls: 'bg-orange-100 text-orange-700', step: 3 },
  { val: 'selesai',              label: 'Selesai',                      cls: 'bg-green-100 text-green-700',   step: 4 },
  { val: 'ditolak',              label: 'Ditolak',                      cls: 'bg-red-100 text-red-700',       step: 5 },
]

// Map lengkap termasuk fallback status lama — HANYA untuk badge & label
const STATUS_ASPIRASI = {
  verifikasi_lapangan:  { label: 'Verifikasi Lapangan',         cls: 'bg-blue-100 text-blue-700',    step: 1 },
  koordinasi:           { label: 'Koordinasi Perangkat Daerah', cls: 'bg-purple-100 text-purple-700', step: 2 },
  proses_penyelesaian:  { label: 'Proses Penyelesaian',         cls: 'bg-orange-100 text-orange-700', step: 3 },
  selesai:              { label: 'Selesai',                      cls: 'bg-green-100 text-green-700',   step: 4 },
  ditolak:              { label: 'Ditolak',                      cls: 'bg-red-100 text-red-700',       step: 5 },
  // Fallback status lama (data lama di DB)
  '0':      { label: 'Verifikasi Lapangan',  cls: 'bg-blue-100 text-blue-700',    step: 1 },
  menunggu: { label: 'Verifikasi Lapangan',  cls: 'bg-blue-100 text-blue-700',    step: 1 },
  proses:   { label: 'Proses Penyelesaian',  cls: 'bg-orange-100 text-orange-700', step: 3 },
  diproses: { label: 'Proses Penyelesaian',  cls: 'bg-orange-100 text-orange-700', step: 3 },
}

const statusBadge = (s) => {
  const st = STATUS_ASPIRASI[s] || { label: s || 'Verifikasi Lapangan', cls: 'bg-blue-100 text-blue-700' }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${st.cls}`}>{st.label}</span>
}
const statusLabel = (s) => STATUS_ASPIRASI[s]?.label || s || 'Verifikasi Lapangan'

const StatusProgress = ({ status }) => {
  const steps = [
    { key: 'verifikasi_lapangan', label: 'Verifikasi Lapangan' },
    { key: 'koordinasi',          label: 'Koordinasi' },
    { key: 'proses_penyelesaian', label: 'Proses Penyelesaian' },
    { key: 'selesai',             label: 'Selesai' },
  ]
  const currentStep = STATUS_ASPIRASI[status]?.step || 1
  const isDitolak = status === 'ditolak'
  return (
    <div className="mb-2">
      {isDitolak ? (
        <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-700 font-medium">❌ Aspirasi ini ditolak</div>
      ) : (
        <div className="flex items-center gap-1">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                  currentStep > i+1 ? 'bg-emerald-500 border-emerald-500 text-white'
                  : currentStep === i+1 ? 'bg-white border-emerald-500 text-emerald-600'
                  : 'bg-gray-100 border-gray-200 text-gray-400'}`}>
                  {currentStep > i+1 ? '✓' : i+1}
                </div>
                <p className={`text-center mt-1 leading-tight ${currentStep >= i+1 ? 'text-emerald-700' : 'text-gray-400'}`}
                  style={{ fontSize: 9 }}>{s.label}</p>
              </div>
              {i < steps.length-1 && (
                <div className={`h-0.5 flex-1 mb-4 ${currentStep > i+1 ? 'bg-emerald-500' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminAspirasi() {
  const { user } = useAuth()
  const [list, setList]             = useState([])
  const [selected, setSelected]     = useState(null)
  const [tanggapan, setTanggapan]   = useState('')
  const [newStatus, setNewStatus]   = useState('')
  const [fileBukti, setFileBukti]   = useState([null, null, null])
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDari, setFilterDari] = useState('')
  const [filterSampai, setFilterSampai] = useState('')
  const [loading, setLoading]       = useState(false)

  const fetchData = () => {
    const params = new URLSearchParams()
    if (filterStatus)  params.append('status', filterStatus)
    if (filterDari)    params.append('dari', filterDari)
    if (filterSampai)  params.append('sampai', filterSampai)
    const q = params.toString() ? `?${params.toString()}` : ''
    api.get(`/aspirasi${q}`).then(r => setList(r.data.data || []))
  }

  useEffect(() => { fetchData() }, [filterStatus, filterDari, filterSampai])

  // Filter by date di frontend (karena BE mungkin belum support date filter)
  const filtered = list.filter(p => {
    const tgl = new Date(p.tgl_pengaduan)
    if (filterDari && tgl < new Date(filterDari)) return false
    if (filterSampai && tgl > new Date(filterSampai + 'T23:59:59')) return false
    return true
  })

  const resetFilter = () => {
    setFilterStatus('')
    setFilterDari('')
    setFilterSampai('')
  }

  const openDetail = async (p) => {
    const res = await api.get(`/aspirasi/${p.id_pengaduan}`)
    setSelected(res.data.data)
    setNewStatus(res.data.data.status)
    setTanggapan('')
    setFileBukti([null, null, null])
  }

  const handleSetBukti = (idx, file) => {
    setFileBukti(prev => { const n = [...prev]; n[idx] = file; return n })
  }

  const handleTanggapan = async () => {
    if (!tanggapan.trim()) return
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('id_pengaduan', selected.id_pengaduan)
      fd.append('tanggapan', tanggapan)
      fd.append('status', newStatus)
      fileBukti.forEach((f, i) => { if (f) fd.append(`file_bukti_${i+1}`, f) })
      await api.post('/tanggapan', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      fetchData()
      setSelected(null)
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal kirim tanggapan')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (p) => {
    if (!confirm(`Hapus aspirasi "${p.judul_laporan}"? Tindakan ini tidak dapat dibatalkan.`)) return
    try {
      if (user?.roles === 'admin') {
        await api.delete(`/admin/aspirasi/${p.id_pengaduan}`)
      } else {
        await api.delete(`/aspirasi/${p.id_pengaduan}`)
      }
      fetchData()
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menghapus aspirasi')
    }
  }

  const exportPDF = () => {
    const tgl = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    const filterInfo = [
      filterStatus ? `Status: ${statusLabel(filterStatus)}` : '',
      filterDari ? `Dari: ${new Date(filterDari).toLocaleDateString('id-ID')}` : '',
      filterSampai ? `Sampai: ${new Date(filterSampai).toLocaleDateString('id-ID')}` : '',
    ].filter(Boolean).join(' · ')

    const rows = filtered.map((p, i) => {
      const lastTanggapan = p.tanggapan?.length > 0 ? p.tanggapan[p.tanggapan.length - 1] : null
      return `<tr>
        <td>${i+1}</td>
        <td>${p.tipe_aspirasi || '-'}</td>
        <td><strong>${p.judul_laporan}</strong><br/><small>${p.isi_laporan?.slice(0,60)}...</small></td>
        <td>${p.masyarakat?.name || p.nik}</td>
        <td>${new Date(p.tgl_pengaduan).toLocaleDateString('id-ID')}</td>
        <td>${statusLabel(p.status)}</td>
        <td>${lastTanggapan ? `<em>${lastTanggapan.tanggapan?.slice(0,80)}...</em><br/><small>${new Date(lastTanggapan.tgl_tanggapan).toLocaleDateString('id-ID')}</small>` : '-'}</td>
      </tr>`
    }).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
    <title>Laporan Aspirasi</title>
    <style>
      body{font-family:Arial,sans-serif;font-size:10px;margin:20px;color:#333}
      .header{text-align:center;margin-bottom:16px;border-bottom:2px solid #059669;padding-bottom:10px}
      .header h2{margin:0;color:#059669;font-size:14px}
      .header p{margin:2px 0;color:#666;font-size:10px}
      .filter-info{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:4px;padding:6px 10px;margin-bottom:12px;font-size:10px;color:#166534}
      .meta{display:flex;justify-content:space-between;margin-bottom:10px;font-size:10px;color:#666}
      table{width:100%;border-collapse:collapse;table-layout:fixed}
      th{background:#059669;color:#fff;padding:6px;text-align:left;font-size:9px;overflow:hidden}
      td{padding:5px 6px;border-bottom:1px solid #eee;vertical-align:top;font-size:9px;overflow-wrap:break-word;word-wrap:break-word;word-break:break-word}
      tr:nth-child(even) td{background:#f9f9f9}
      th:nth-child(1){width:4%}
      th:nth-child(2){width:10%}
      th:nth-child(3){width:22%}
      th:nth-child(4){width:10%}
      th:nth-child(5){width:8%}
      th:nth-child(6){width:10%}
      th:nth-child(7){width:36%}
      @media print{body{margin:0}}
    </style></head><body>
    <div class="header">
      <h2>LAPORAN ASPIRASI MASYARAKAT</h2>
      <p>Kelurahan Serua Indah · Kecamatan Ciputat · Kota Tangerang Selatan</p>
      <p>Sistem Informasi Pusat Layanan dan Aspirasi Masyarakat (SIPLA)</p>
    </div>
    ${filterInfo ? `<div class="filter-info">Filter: ${filterInfo}</div>` : ''}
    <div class="meta">
      <span>Tanggal Cetak: ${tgl}</span>
      <span>Total Data: ${filtered.length} aspirasi</span>
    </div>
    <table>
      <thead><tr>
        <th>No</th><th>Kategori</th><th>Judul Aspirasi</th><th>Pelapor</th>
        <th>Tgl Pengaduan</th><th>Status</th><th>Tanggapan Terakhir</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table></body></html>`

    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print(); w.close() }, 600)
  }

  // Ambil tanggapan terakhir
  const lastTanggapan = (p) => {
    if (!p.tanggapan?.length) return null
    return p.tanggapan[p.tanggapan.length - 1]
  }

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Aspirasi Masyarakat</h1>
            <p className="text-gray-500 text-sm">{filtered.length} data ditampilkan</p>
          </div>
          <button onClick={exportPDF}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-xl text-sm font-semibold transition">
            📄 Export PDF
          </button>
        </div>

        {/* Filter bar */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500 shrink-0">Status:</span>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none bg-white focus:ring-2 focus:ring-emerald-500">
                <option value="">Semua Status</option>
                {FILTER_ASPIRASI.map(s => (
                  <option key={s.val} value={s.val}>{s.step}. {s.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500 shrink-0">Dari:</span>
              <input type="date" value={filterDari} onChange={e => setFilterDari(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500 shrink-0">Sampai:</span>
              <input type="date" value={filterSampai} onChange={e => setFilterSampai(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            {(filterStatus || filterDari || filterSampai) && (
              <button onClick={resetFilter}
                className="text-xs text-gray-400 hover:text-red-500 border border-gray-200 px-3 py-2 rounded-xl transition">
                ✕ Reset Filter
              </button>
            )}
          </div>
        </div>

        {/* Tabel */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['No','Kategori','Judul Aspirasi','Pelapor','Tgl','Status','Tanggapan Terakhir','Aksi'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-gray-500 font-semibold text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-10 text-gray-400">Tidak ada data</td></tr>
                ) : filtered.map((p, i) => {
                  const last = lastTanggapan(p)
                  return (
                    <tr key={p.id_pengaduan} className="border-b hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-gray-400 text-xs">{i+1}</td>
                      <td className="px-4 py-3">
                        {p.tipe_aspirasi
                          ? <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full border border-emerald-100 whitespace-nowrap">{p.tipe_aspirasi}</span>
                          : <span className="text-gray-300 text-xs">-</span>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800 max-w-[160px] truncate">{p.judul_laporan}</p>
                        <p className="text-xs text-gray-400 truncate max-w-[160px]">{p.isi_laporan}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{p.masyarakat?.name || p.nik}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{new Date(p.tgl_pengaduan).toLocaleDateString('id-ID')}</td>
                      <td className="px-4 py-3">{statusBadge(p.status)}</td>
                      <td className="px-4 py-3 max-w-[180px]">
                        {last ? (
                          <div>
                            <p className="text-xs text-gray-700 line-clamp-2">{last.tanggapan}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{new Date(last.tgl_tanggapan).toLocaleDateString('id-ID')}</p>
                          </div>
                        ) : <span className="text-gray-300 text-xs">Belum ada</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => openDetail(p)}
                            className="text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded-lg text-xs font-medium border border-emerald-200 whitespace-nowrap">Detail</button>
                          {(user?.roles === 'admin' || p.status === 'verifikasi_lapangan' || p.status === '0') && (
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
      </div>

      {/* Modal Detail */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-lg">Detail Aspirasi</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <StatusProgress status={selected.status} />
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Pelapor', selected.masyarakat?.name || selected.nik],
                  ['NIK', selected.nik],
                  ['Tgl Pengaduan', new Date(selected.tgl_pengaduan).toLocaleString('id-ID')],
                  ['Tgl Kejadian', new Date(selected.tgl_kejadian).toLocaleDateString('id-ID')],
                ].map(([l,v]) => (
                  <div key={l} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-gray-400 text-xs">{l}</p>
                    <p className="font-medium text-gray-800 mt-0.5">{v}</p>
                  </div>
                ))}
              </div>
              {selected.tipe_aspirasi && (
                <span className="inline-flex items-center bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-medium border border-emerald-100">
                  {selected.tipe_aspirasi}
                </span>
              )}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <p className="font-semibold text-gray-800">{selected.judul_laporan}</p>
                <p className="text-gray-600">{selected.isi_laporan}</p>
                <p className="text-gray-500 text-xs">📍 {selected.lokasi_kejadian}</p>
                {selected.latitude && <p className="text-gray-400 text-xs">🗺️ {selected.latitude}, {selected.longitude}</p>}
              </div>
              {selected.foto && (
                <img src={getAssetUrl(selected.foto)} alt="foto"
                  className="rounded-xl max-h-48 object-cover w-full" />
              )}
              {selected.tanggapan?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Riwayat Tanggapan</p>
                  {selected.tanggapan.map(t => (
                    <div key={t.id_tanggapan} className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-sm mb-2">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-emerald-800">{t.petugas?.nama_petugas}</p>
                        {statusBadge(selected.status)}
                      </div>
                      <p className="text-gray-700">{t.tanggapan}</p>
                      {[t.file_bukti, t.file_bukti_2, t.file_bukti_3].filter(Boolean).map((f, i) => (
                        <a key={i} href={getAssetUrl(f)} target="_blank" rel="noreferrer"
                          className="text-emerald-600 text-xs underline mt-1 block">📎 Bukti {i+1}</a>
                      ))}
                      <p className="text-gray-400 text-xs mt-1">{new Date(t.tgl_tanggapan).toLocaleString('id-ID')}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="border-t pt-4 space-y-3">
                <p className="font-semibold text-gray-800">Kirim Tanggapan & Update Status</p>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Update Status Proses</label>
                  <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500">
                    {FILTER_ASPIRASI.map(s => (
                      <option key={s.val} value={s.val}>{s.step}. {s.label}</option>
                    ))}
                  </select>
                </div>
                <textarea value={tanggapan} onChange={e => setTanggapan(e.target.value)}
                  placeholder="Tulis tanggapan untuk masyarakat..." rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-gray-500">Upload Bukti (PDF/JPG/PNG · maks. 3 file)</label>
                    {fileBukti.filter(Boolean).length > 0 && (
                      <span className="text-xs text-emerald-600 font-medium">{fileBukti.filter(Boolean).length}/3 dipilih</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {[0,1,2].map(idx => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-12 shrink-0">Bukti {idx+1}</span>
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png"
                          onChange={e => handleSetBukti(idx, e.target.files[0] || null)}
                          className="flex-1 text-xs text-gray-500 border border-gray-200 rounded-lg px-2 py-1.5 file:mr-2 file:py-0.5 file:px-2 file:rounded-md file:border-0 file:text-xs file:bg-emerald-50 file:text-emerald-700" />
                        {fileBukti[idx] && (
                          <button type="button" onClick={() => handleSetBukti(idx, null)}
                            className="text-red-400 hover:text-red-600 text-xs shrink-0">✕</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={handleTanggapan} disabled={loading || !tanggapan.trim()}
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
