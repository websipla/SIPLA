import { useEffect, useState } from 'react'
import api, { getApiError, getAssetUrl } from '../../services/api'
import AdminLayout from '../../components/AdminLayout'
import { useAuth } from '../../context/AuthContext'

// Status resmi — dipakai di dropdown filter & progress bar
const FILTER_PERMOHONAN = [
  { val: 'verifikasi_persyaratan', label: 'Verifikasi Persyaratan',   cls: 'bg-blue-100 text-blue-700',    step: 1 },
  { val: 'pembuatan_draft',        label: 'Pembuatan Draft Surat',    cls: 'bg-purple-100 text-purple-700', step: 2 },
  { val: 'penandatanganan',        label: 'Proses Penandatanganan',   cls: 'bg-yellow-100 text-yellow-700', step: 3 },
  { val: 'register_dokumen',       label: 'Register Dokumen',         cls: 'bg-orange-100 text-orange-700', step: 4 },
  { val: 'selesai',                label: 'Selesai',                  cls: 'bg-green-100 text-green-700',   step: 5 },
  { val: 'ditolak',                label: 'Ditolak',                  cls: 'bg-red-100 text-red-700',       step: 6 },
]

// Map lengkap termasuk fallback status lama — HANYA untuk badge & label
const STATUS_PERMOHONAN = {
  verifikasi_persyaratan: { label: 'Verifikasi Persyaratan',   cls: 'bg-blue-100 text-blue-700',    step: 1 },
  pembuatan_draft:        { label: 'Pembuatan Draft Surat',    cls: 'bg-purple-100 text-purple-700', step: 2 },
  penandatanganan:        { label: 'Proses Penandatanganan',   cls: 'bg-yellow-100 text-yellow-700', step: 3 },
  register_dokumen:       { label: 'Register Dokumen',         cls: 'bg-orange-100 text-orange-700', step: 4 },
  selesai:                { label: 'Selesai',                  cls: 'bg-green-100 text-green-700',   step: 5 },
  ditolak:                { label: 'Ditolak',                  cls: 'bg-red-100 text-red-700',       step: 6 },
  // Fallback status lama (data lama di DB)
  menunggu: { label: 'Verifikasi Persyaratan', cls: 'bg-blue-100 text-blue-700',    step: 1 },
  diproses: { label: 'Pembuatan Draft Surat',  cls: 'bg-purple-100 text-purple-700', step: 2 },
  proses:   { label: 'Pembuatan Draft Surat',  cls: 'bg-purple-100 text-purple-700', step: 2 },
}

const badge = (s) => {
  const st = STATUS_PERMOHONAN[s] || { label: s || 'Verifikasi Persyaratan', cls: 'bg-blue-100 text-blue-700' }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${st.cls}`}>{st.label}</span>
}
const statusLabel = (s) => STATUS_PERMOHONAN[s]?.label || s || 'Verifikasi Persyaratan'

const StatusProgress = ({ status }) => {
  const steps = [
    { key: 'verifikasi_persyaratan', label: 'Verifikasi' },
    { key: 'pembuatan_draft',        label: 'Draft Surat' },
    { key: 'penandatanganan',        label: 'Tanda Tangan' },
    { key: 'register_dokumen',       label: 'Register' },
    { key: 'selesai',                label: 'Selesai' },
  ]
  const currentStep = STATUS_PERMOHONAN[status]?.step || 1
  const isDitolak = status === 'ditolak'
  return (
    <div className="mb-2">
      {isDitolak ? (
        <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-700 font-medium">❌ Permohonan ini ditolak</div>
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

export default function AdminPermohonan() {
  const { user } = useAuth()
  const [list, setList]         = useState([])
  const [selected, setSelected] = useState(null)
  const [form, setForm]         = useState({ status: '', catatan_petugas: '', file_hasil: null })
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDari, setFilterDari]     = useState('')
  const [filterSampai, setFilterSampai] = useState('')
  const [loading, setLoading]   = useState(false)
  const [feedback, setFeedback] = useState(null)

  const handleDelete = async (p) => {
    if (!confirm(`Hapus permohonan "${p.jenis_layanan?.nama_layanan}" dari ${p.masyarakat?.name}? Tindakan ini tidak dapat dibatalkan.`)) return
    try {
      if (user?.roles === 'admin') {
        await api.delete(`/admin/permohonan/${p.id}`)
      } else {
        await api.delete(`/permohonan/${p.id}`)
      }
      await fetchData()
      setFeedback({ type: 'success', text: 'Permohonan berhasil dihapus' })
    } catch (err) {
      setFeedback({ type: 'error', text: getApiError(err, 'Gagal menghapus permohonan') })
    }
  }

  const fetchData = () => {
    const params = new URLSearchParams()
    if (filterStatus) params.append('status', filterStatus)
    const q = params.toString() ? `?${params.toString()}` : ''
    return api.get(`/permohonan${q}`)
      .then(r => setList(r.data.data || []))
      .catch(err => setFeedback({ type: 'error', text: getApiError(err, 'Gagal memuat permohonan') }))
  }
  useEffect(() => { fetchData() }, [filterStatus])

  // Filter date di frontend
  const filtered = list.filter(p => {
    const tgl = new Date(p.tgl_permohonan)
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
    setFeedback(null)
    try {
      const res = await api.get(`/permohonan/${p.id}`)
      setSelected(res.data.data)
      setForm({ status: res.data.data.status, catatan_petugas: '', file_hasil: null })
    } catch (err) {
      setFeedback({ type: 'error', text: getApiError(err, 'Gagal memuat detail permohonan') })
    }
  }

  const handleProses = async () => {
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('status', form.status)
      fd.append('catatan_petugas', form.catatan_petugas)
      if (form.file_hasil) fd.append('file_hasil', form.file_hasil)
      const res = await api.put(`/permohonan/${selected.id}/proses`, fd)
      await fetchData()
      setSelected(null)
      setFeedback({ type: 'success', text: res.data.message || 'Permohonan berhasil diperbarui' })
    } catch (err) {
      setFeedback({ type: 'error', text: getApiError(err, 'Gagal memproses permohonan') })
    } finally {
      setLoading(false)
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
      const lastCatatan = p.catatan_petugas || '-'
      return `<tr>
        <td>${i+1}</td>
        <td>${p.jenis_layanan?.nama_layanan || '-'}</td>
        <td>${p.masyarakat?.name || p.nik}<br/><small>${p.nik}</small></td>
        <td>${new Date(p.tgl_permohonan).toLocaleDateString('id-ID')}</td>
        <td>${statusLabel(p.status)}</td>
        <td>${lastCatatan}</td>
        <td>${p.tgl_selesai ? new Date(p.tgl_selesai).toLocaleDateString('id-ID') : '-'}</td>
      </tr>`
    }).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
    <title>Laporan Permohonan</title>
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
      th:nth-child(2){width:20%}
      th:nth-child(3){width:14%}
      th:nth-child(4){width:9%}
      th:nth-child(5){width:12%}
      th:nth-child(6){width:33%}
      th:nth-child(7){width:8%}
      @media print{body{margin:0}}
    </style></head><body>
    <div class="header">
      <h2>LAPORAN PERMOHONAN LAYANAN</h2>
      <p>Kelurahan Serua Indah · Kecamatan Ciputat · Kota Tangerang Selatan</p>
      <p>Sistem Informasi Pusat Layanan dan Aspirasi Masyarakat (SIPLA)</p>
    </div>
    ${filterInfo ? `<div class="filter-info">Filter: ${filterInfo}</div>` : ''}
    <div class="meta">
      <span>Tanggal Cetak: ${tgl}</span>
      <span>Total Data: ${filtered.length} permohonan</span>
    </div>
    <table>
      <thead><tr>
        <th>No</th><th>Jenis Layanan</th><th>Pemohon</th><th>Tgl Permohonan</th>
        <th>Status</th><th>Catatan Petugas</th><th>Tgl Selesai</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table></body></html>`

    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print(); w.close() }, 600)
  }

  return (
    <AdminLayout>
      <div className="space-y-5">
        {feedback && (
          <div className={`rounded-xl px-4 py-3 text-sm border ${
            feedback.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>{feedback.text}</div>
        )}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Permohonan Layanan</h1>
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
                {FILTER_PERMOHONAN.map(s => (
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
                  {['No','Jenis Layanan','Pemohon','Tgl','Status','Tanggapan Terakhir','Aksi'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-gray-500 font-semibold text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-gray-400">Tidak ada permohonan</td></tr>
                ) : filtered.map((p, i) => (
                  <tr key={p.id} className="border-b hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-gray-400 text-xs">{i+1}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 whitespace-nowrap">{p.jenis_layanan?.nama_layanan}</p>
                      <p className="text-xs text-gray-400">Est. {p.jenis_layanan?.estimasi_hari} hari</p>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <p className="text-gray-700 font-medium whitespace-nowrap">{p.masyarakat?.name}</p>
                      <p className="text-gray-400">{p.nik}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(p.tgl_permohonan).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-4 py-3">{badge(p.status)}</td>
                    <td className="px-4 py-3 max-w-[180px]">
                      {p.catatan_petugas ? (
                        <div>
                          <p className="text-xs text-gray-700 line-clamp-2">{p.catatan_petugas}</p>
                          {p.tgl_selesai && (
                            <p className="text-xs text-gray-400 mt-0.5">{new Date(p.tgl_selesai).toLocaleDateString('id-ID')}</p>
                          )}
                        </div>
                      ) : <span className="text-gray-300 text-xs">Belum ada</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => openDetail(p)}
                        className="text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded-lg text-xs font-medium border border-emerald-200 whitespace-nowrap">
                        Proses
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Proses */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex items-center justify-between">
              <h2 className="font-bold text-gray-800">Detail Permohonan</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-5 space-y-4 text-sm">
              <StatusProgress status={selected.status} />
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                <p className="font-bold text-emerald-800 text-base">{selected.jenis_layanan?.nama_layanan}</p>
                <p className="text-emerald-600 text-xs mt-1">Est. {selected.jenis_layanan?.estimasi_hari} hari kerja</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Pemohon', selected.masyarakat?.name],
                  ['NIK', selected.nik],
                  ['Tgl Permohonan', new Date(selected.tgl_permohonan).toLocaleDateString('id-ID')],
                  ['Status', statusLabel(selected.status)],
                ].map(([l,v]) => (
                  <div key={l} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-gray-400 text-xs">{l}</p>
                    <p className="font-medium text-gray-800 mt-0.5">{v}</p>
                  </div>
                ))}
              </div>
              {selected.keterangan && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Keterangan Pemohon</p>
                  <p className="bg-gray-50 rounded-xl p-3 text-gray-700">{selected.keterangan}</p>
                </div>
              )}
              <div>
                <p className="font-semibold text-gray-700 mb-2">File Dokumen Pemohon</p>
                <div className="space-y-2">
                  {[['KTP',selected.file_ktp],['Kartu Keluarga',selected.file_kk],
                    ['Surat RT/RW',selected.file_surat_rtrw],['Foto Rumah',selected.file_foto_rumah],
                    ['File Pendukung',selected.file_pendukung]].map(([label,file]) => file && (
                    <div key={label} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                      <span className="text-gray-700">📎 {label}</span>
                      <a href={getAssetUrl(file)} target="_blank" rel="noreferrer"
                        className="text-emerald-600 text-xs underline">Lihat / Download</a>
                    </div>
                  ))}
                </div>
              </div>
              {selected.file_hasil && (
                <div className="bg-green-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">File Hasil Sebelumnya</p>
                  <a href={getAssetUrl(selected.file_hasil)} target="_blank" rel="noreferrer"
                    className="text-green-700 text-sm underline">📄 Lihat file hasil</a>
                </div>
              )}
              <div className="border-t pt-4 space-y-3">
                <p className="font-semibold text-gray-800">Update Status Proses</p>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500">
                  {FILTER_PERMOHONAN.map(s => (
                    <option key={s.val} value={s.val}>{s.step}. {s.label}</option>
                  ))}
                </select>
                <textarea value={form.catatan_petugas} onChange={e => setForm({...form, catatan_petugas: e.target.value})}
                  placeholder="Catatan untuk pemohon..." rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Upload Hasil / Bukti (PDF/JPG/PNG)</label>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png"
                    onChange={e => setForm({...form, file_hasil: e.target.files[0]})}
                    className="w-full text-sm text-gray-500 border border-gray-200 rounded-xl px-3 py-2" />
                </div>
                <button onClick={handleProses} disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-sm font-semibold transition disabled:bg-emerald-400">
                  {loading ? 'Menyimpan...' : 'Simpan & Update Status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
