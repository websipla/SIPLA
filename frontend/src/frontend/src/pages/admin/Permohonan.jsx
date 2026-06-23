import { useEffect, useState } from 'react'
import api from '../../services/api'
import AdminLayout from '../../components/AdminLayout'

const STATUS = {
  menunggu: ['Menunggu', 'bg-yellow-100 text-yellow-700'],
  diproses: ['Diproses', 'bg-blue-100 text-blue-700'],
  selesai: ['Selesai', 'bg-green-100 text-green-700'],
  ditolak: ['Ditolak', 'bg-red-100 text-red-700'],
}
const badge = (s) => {
  const [label, cls] = STATUS[s] || STATUS.menunggu
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{label}</span>
}
const statusLabel = (s) => STATUS[s]?.[0] || 'Menunggu'

export default function AdminPermohonan() {
  const [list, setList] = useState([])
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({ status: '', catatan_petugas: '', file_hasil: null })
  const [filterStatus, setFilterStatus] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchData = () => {
    const q = filterStatus ? `?status=${filterStatus}` : ''
    api.get(`/permohonan${q}`).then(r => setList(r.data.data || []))
  }
  useEffect(() => { fetchData() }, [filterStatus])

  const openDetail = async (p) => {
    const res = await api.get(`/permohonan/${p.id}`)
    setSelected(res.data.data)
    setForm({ status: res.data.data.status, catatan_petugas: '', file_hasil: null })
  }

  const handleProses = async () => {
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('status', form.status)
      fd.append('catatan_petugas', form.catatan_petugas)
      if (form.file_hasil) fd.append('file_hasil', form.file_hasil)
      await api.put(`/permohonan/${selected.id}/proses`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      fetchData()
      setSelected(null)
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal memproses')
    } finally {
      setLoading(false)
    }
  }

  // ── EXPORT EXCEL (CSV) ──
  const exportExcel = () => {
    const headers = ['No','Jenis Layanan','Pemohon','NIK','Tgl Permohonan','Status','Catatan Petugas','Tgl Selesai']
    const rows = list.map((p, i) => [
      i + 1,
      `"${p.jenis_layanan?.nama_layanan || ''}"`,
      `"${p.masyarakat?.name || p.nik}"`,
      p.nik,
      new Date(p.tgl_permohonan).toLocaleDateString('id-ID'),
      statusLabel(p.status),
      `"${p.catatan_petugas || '-'}"`,
      p.tgl_selesai ? new Date(p.tgl_selesai).toLocaleDateString('id-ID') : '-',
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `permohonan_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── EXPORT PDF (print) ──
  const exportPDF = () => {
    const tgl = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    const rows = list.map((p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${p.jenis_layanan?.nama_layanan || '-'}</td>
        <td>${p.masyarakat?.name || p.nik}<br/><small style="color:#888">${p.nik}</small></td>
        <td>${new Date(p.tgl_permohonan).toLocaleDateString('id-ID')}</td>
        <td><span class="badge badge-${p.status}">${statusLabel(p.status)}</span></td>
        <td>${p.catatan_petugas || '-'}</td>
        <td>${p.tgl_selesai ? new Date(p.tgl_selesai).toLocaleDateString('id-ID') : '-'}</td>
      </tr>`).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
    <title>Laporan Permohonan Layanan</title>
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
      .badge-menunggu { background: #fef3c7; color: #92400e; }
      .badge-diproses { background: #dbeafe; color: #1e40af; }
      .badge-selesai { background: #d1fae5; color: #065f46; }
      .badge-ditolak { background: #fee2e2; color: #991b1b; }
      @media print { body { margin: 0; } }
    </style></head><body>
    <div class="header">
      <h2>LAPORAN PERMOHONAN LAYANAN</h2>
      <p>Kelurahan Serua Indah · Kecamatan Ciputat · Kota Tangerang Selatan</p>
      <p>Sistem Informasi Pusat Layanan dan Aspirasi Masyarakat (SIPLA)</p>
    </div>
    <div class="meta">
      <span>Tanggal Cetak: ${tgl}</span>
      <span>Total Data: ${list.length} permohonan ${filterStatus ? '· Filter: ' + statusLabel(filterStatus) : ''}</span>
    </div>
    <table>
      <thead><tr><th>No</th><th>Jenis Layanan</th><th>Pemohon</th><th>Tgl Permohonan</th><th>Status</th><th>Catatan</th><th>Tgl Selesai</th></tr></thead>
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
            <h1 className="text-2xl font-bold text-gray-800">Permohonan Layanan</h1>
            <p className="text-gray-500 text-sm">Kelola permohonan surat dan layanan masyarakat</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none bg-white focus:ring-2 focus:ring-emerald-500">
              <option value="">Semua Status</option>
              <option value="menunggu">Menunggu</option>
              <option value="diproses">Diproses</option>
              <option value="selesai">Selesai</option>
              <option value="ditolak">Ditolak</option>
            </select>
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
                {['No','Jenis Layanan','Pemohon','Tgl Permohonan','Status','Aksi'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-gray-500 font-semibold text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Tidak ada permohonan</td></tr>
              ) : list.map((p, i) => (
                <tr key={p.id} className="border-b hover:bg-gray-50 transition">
                  <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{p.jenis_layanan?.nama_layanan}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Est. {p.jenis_layanan?.estimasi_hari} hari kerja</p>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <p className="text-gray-700 font-medium">{p.masyarakat?.name}</p>
                    <p className="text-gray-400">{p.nik}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(p.tgl_permohonan).toLocaleDateString('id-ID')}</td>
                  <td className="px-4 py-3">{badge(p.status)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => openDetail(p)}
                      className="text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded-lg text-xs font-medium border border-emerald-200">Proses</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Proses */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex items-center justify-between">
              <h2 className="font-bold text-gray-800">Detail Permohonan</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-5 space-y-4 text-sm">
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                <p className="font-bold text-emerald-800 text-base">{selected.jenis_layanan?.nama_layanan}</p>
                <p className="text-emerald-600 text-xs mt-1">Est. {selected.jenis_layanan?.estimasi_hari} hari kerja</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Pemohon', selected.masyarakat?.name],
                  ['NIK', selected.nik],
                  ['Tgl Permohonan', new Date(selected.tgl_permohonan).toLocaleDateString('id-ID')],
                  ['Status', selected.status],
                ].map(([l, v]) => (
                  <div key={l} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-gray-400 text-xs">{l}</p>
                    <p className="font-medium text-gray-800 mt-0.5 capitalize">{v}</p>
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
                  {[['KTP', selected.file_ktp], ['Kartu Keluarga', selected.file_kk], ['File Pendukung', selected.file_pendukung]].map(([label, file]) => file && (
                    <div key={label} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                      <span className="text-gray-700">📎 {label}</span>
                      <a href={`http://localhost:8080/${file}`} target="_blank" rel="noreferrer"
                        className="text-emerald-600 text-xs underline">Lihat / Download</a>
                    </div>
                  ))}
                </div>
              </div>
              {selected.file_hasil && (
                <div className="bg-green-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">File Hasil Sebelumnya</p>
                  <a href={`http://localhost:8080/${selected.file_hasil}`} target="_blank" rel="noreferrer"
                    className="text-green-700 text-sm underline">📄 Lihat file hasil</a>
                </div>
              )}
              <div className="border-t pt-4 space-y-3">
                <p className="font-semibold text-gray-800">Proses Permohonan</p>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="menunggu">Menunggu</option>
                  <option value="diproses">Diproses</option>
                  <option value="selesai">Selesai</option>
                  <option value="ditolak">Ditolak</option>
                </select>
                <textarea value={form.catatan_petugas} onChange={e => setForm({ ...form, catatan_petugas: e.target.value })}
                  placeholder="Catatan untuk pemohon..." rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Upload Hasil / Bukti (PDF / JPG / PNG)</label>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setForm({ ...form, file_hasil: e.target.files[0] })}
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
