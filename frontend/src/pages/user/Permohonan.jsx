import { useEffect, useState } from 'react'
import api, { getApiError, getAssetUrl } from '../../services/api'
import UserLayout from '../../components/UserLayout'

const STATUS = {
  verifikasi_persyaratan: { label: 'Verifikasi Persyaratan',  cls: 'bg-blue-100 text-blue-700' },
  pembuatan_draft:        { label: 'Pembuatan Draft Surat',   cls: 'bg-purple-100 text-purple-700' },
  penandatanganan:        { label: 'Proses Penandatanganan',  cls: 'bg-yellow-100 text-yellow-700' },
  register_dokumen:       { label: 'Register Dokumen',        cls: 'bg-orange-100 text-orange-700' },
  selesai:                { label: 'Selesai',                 cls: 'bg-green-100 text-green-700' },
  ditolak:                { label: 'Ditolak',                 cls: 'bg-red-100 text-red-700' },
  // Fallback status lama
  menunggu: { label: 'Verifikasi Persyaratan', cls: 'bg-blue-100 text-blue-700' },
  diproses: { label: 'Pembuatan Draft Surat',  cls: 'bg-purple-100 text-purple-700' },
}
const badge = (s) => {
  const st = STATUS[s] || STATUS.verifikasi_persyaratan || { label: s || '-', cls: 'bg-gray-100 text-gray-600' }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${st.cls}`}>{st.label}</span>
}

const getFileFields = (namaLayanan) => {
  const isSKTM = namaLayanan?.toLowerCase().includes('tidak mampu')
  const fields = [
    { key: 'file_ktp',        label: 'Foto / Scan KTP',            required: true  },
    { key: 'file_kk',         label: 'Foto / Scan Kartu Keluarga', required: true  },
    { key: 'file_surat_rtrw', label: 'Surat Pengantar RT/RW',      required: true  },
  ]
  if (isSKTM) {
    fields.push({ key: 'file_foto_rumah', label: 'Foto Rumah Tampak Depan', required: true })
  }
  fields.push({ key: 'file_pendukung', label: 'File Pendukung', required: false })
  return fields
}

const EMPTY_FORM = {
  id_jenis_layanan: '', keterangan: '',
  file_ktp: null, file_kk: null,
  file_surat_rtrw: null, file_foto_rumah: null, file_pendukung: null,
}

export default function UserPermohonan() {
  const [list, setList]                   = useState([])
  const [jenisLayanan, setJenisLayanan]   = useState([])
  const [showForm, setShowForm]           = useState(false)
  const [formStep, setFormStep]           = useState('pilih') // 'pilih' | 'isi'
  const [selected, setSelected]           = useState(null)
  const [selectedJenis, setSelectedJenis] = useState(null)
  const [form, setForm]                   = useState(EMPTY_FORM)
  const [loading, setLoading]             = useState(false)
  const [feedback, setFeedback]           = useState(null)

  const fetchData = () => api.get('/permohonan')
    .then(r => setList(r.data.data || []))
    .catch(err => setFeedback({ type: 'error', text: getApiError(err, 'Gagal memuat permohonan') }))

  useEffect(() => {
    fetchData()
    api.get('/jenis-layanan')
      .then(r => setJenisLayanan(r.data.data || []))
      .catch(err => setFeedback({ type: 'error', text: getApiError(err, 'Gagal memuat jenis layanan') }))
  }, [])

  const handleOpenForm = () => {
    setForm(EMPTY_FORM)
    setSelectedJenis(null)
    setFormStep('pilih')
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setFormStep('pilih')
    setSelectedJenis(null)
    setForm(EMPTY_FORM)
  }

  // Pilih jenis → langsung pindah ke step isi
  const handlePilihJenis = (jenis) => {
    setSelectedJenis(jenis)
    setForm({ ...EMPTY_FORM, id_jenis_layanan: jenis.id })
    setFormStep('isi')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFeedback(null)
    setLoading(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v) })
      const res = await api.post('/permohonan', fd)
      handleCloseForm()
      await fetchData()
      setFeedback({ type: 'success', text: res.data.message || 'Permohonan berhasil disimpan' })
    } catch (err) {
      setFeedback({ type: 'error', text: getApiError(err, 'Gagal mengirim permohonan') })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Batalkan permohonan ini?')) return
    try {
      const res = await api.delete(`/permohonan/${id}`)
      await fetchData()
      setFeedback({ type: 'success', text: res.data.message || 'Permohonan berhasil dibatalkan' })
    } catch (err) {
      setFeedback({ type: 'error', text: getApiError(err, 'Gagal membatalkan permohonan') })
    }
  }

  const fileFields = getFileFields(selectedJenis?.nama_layanan)

  return (
    <UserLayout>
      <div className="space-y-5">
        {feedback && (
          <div className={`rounded-xl px-4 py-3 text-sm border ${
            feedback.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>{feedback.text}</div>
        )}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Permohonan Layanan</h1>
            <p className="text-gray-500 text-sm">Ajukan permohonan surat dan layanan kelurahan</p>
          </div>
          <button
            onClick={handleOpenForm}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2"
          >
            <span>+</span> Buat Permohonan
          </button>
        </div>

        {list.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <p className="text-5xl mb-3">📄</p>
            <p className="text-gray-600 font-medium">Belum ada permohonan</p>
            <p className="text-gray-400 text-sm mt-1">Klik tombol di atas untuk mengajukan permohonan</p>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map(p => (
              <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      {badge(p.status)}
                      <span className="text-xs text-gray-400">
                        {new Date(p.tgl_permohonan).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-800">{p.jenis_layanan?.nama_layanan}</h3>
                    {p.keterangan && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{p.keterangan}</p>
                    )}
                    {p.catatan_petugas && (
                      <div className="mt-2 bg-emerald-50 rounded-lg px-3 py-2">
                        <p className="text-xs text-emerald-700 font-medium">Catatan Petugas:</p>
                        <p className="text-xs text-emerald-800">{p.catatan_petugas}</p>
                      </div>
                    )}
                    {p.file_hasil && (
                      <a
                        href={getAssetUrl(p.file_hasil)}
                        target="_blank" rel="noreferrer"
                        className="text-emerald-600 text-xs underline mt-2 block"
                      >
                        📎 Download hasil / surat
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => setSelected(p)}
                      className="text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-lg text-xs font-medium border border-emerald-200"
                    >
                      Detail
                    </button>
                    {p.status === 'verifikasi_persyaratan' && (
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-200"
                      >
                        Batal
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal Form ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto">

            {/* Header modal */}
            <div className="p-5 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                {formStep === 'isi' && (
                  <button
                    type="button"
                    onClick={() => setFormStep('pilih')}
                    className="text-gray-400 hover:text-gray-600 text-sm border border-gray-200 rounded-lg px-2 py-1"
                  >
                    ← Ganti
                  </button>
                )}
                <div>
                  <h2 className="font-bold text-gray-800 text-sm">
                    {formStep === 'pilih' ? 'Pilih Jenis Layanan' : selectedJenis?.nama_layanan}
                  </h2>
                  {formStep === 'isi' && (
                    <p className="text-xs text-gray-400">Est. {selectedJenis?.estimasi_hari} hari kerja</p>
                  )}
                </div>
              </div>
              <button
                onClick={handleCloseForm}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>

            {/* Step 1 — Pilih Jenis */}
            {formStep === 'pilih' && (
              <div className="p-5 space-y-2">
                <p className="text-xs text-gray-400 mb-3">Pilih jenis layanan yang ingin Anda ajukan</p>
                {jenisLayanan.map(j => (
                  <button
                    key={j.id}
                    type="button"
                    onClick={() => handlePilihJenis(j)}
                    className="w-full text-left p-4 rounded-xl border border-gray-100 bg-gray-50 hover:border-emerald-400 hover:bg-emerald-50 transition group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-800 text-sm group-hover:text-emerald-700">
                          {j.nama_layanan}
                        </p>
                        <p className="text-gray-400 text-xs mt-0.5">Estimasi {j.estimasi_hari} hari kerja</p>
                      </div>
                      <span className="text-gray-300 group-hover:text-emerald-500 text-lg">→</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Step 2 — Form Isi */}
            {formStep === 'isi' && (
              <form onSubmit={handleSubmit} className="p-5 space-y-4">

                {/* Syarat */}
                {selectedJenis?.syarat && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="font-semibold text-amber-800 text-sm mb-2">📋 Syarat yang Diperlukan</p>
                    <p className="text-amber-700 text-sm whitespace-pre-line">{selectedJenis.syarat}</p>
                  </div>
                )}

                {/* Keterangan */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Keterangan Tambahan
                  </label>
                  <textarea
                    value={form.keterangan}
                    onChange={e => setForm({ ...form, keterangan: e.target.value })}
                    placeholder="Tambahkan keterangan jika diperlukan..."
                    rows={2}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Upload Dokumen */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-700">Upload Dokumen</p>
                    <span className="text-xs text-gray-400">
                      {fileFields.filter(f => f.required).length} wajib · 1 opsional
                    </span>
                  </div>
                  {fileFields.map(({ key, label, required }) => (
                    <div key={key}>
                      <label className="text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                        {label}
                        {required
                          ? <span className="text-red-500 font-bold">*</span>
                          : <span className="text-gray-400 font-normal">(opsional)</span>
                        }
                      </label>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={e => setForm({ ...form, [key]: e.target.files[0] })}
                        required={required}
                        className="w-full text-sm text-gray-500 border border-gray-200 rounded-xl px-3 py-2 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                      />
                    </div>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white py-2.5 rounded-xl text-sm font-semibold transition"
                >
                  {loading ? 'Mengirim...' : 'Kirim Permohonan'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Modal Detail ── */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex items-center justify-between">
              <h2 className="font-bold text-gray-800">Detail Permohonan</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div className="bg-emerald-50 rounded-xl p-4">
                <p className="font-bold text-emerald-800">{selected.jenis_layanan?.nama_layanan}</p>
                <div className="flex gap-2 mt-2">{badge(selected.status)}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Tgl Permohonan', new Date(selected.tgl_permohonan).toLocaleDateString('id-ID')],
                  ['Estimasi', `${selected.jenis_layanan?.estimasi_hari} hari kerja`],
                ].map(([l, v]) => (
                  <div key={l} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-gray-400 text-xs">{l}</p>
                    <p className="font-medium text-gray-800 mt-0.5">{v}</p>
                  </div>
                ))}
              </div>
              {selected.catatan_petugas && (
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="font-medium text-blue-800 text-xs mb-1">Catatan Petugas</p>
                  <p className="text-blue-700">{selected.catatan_petugas}</p>
                </div>
              )}
              {selected.file_hasil && (
                <div className="bg-green-50 rounded-xl p-3">
                  <p className="font-medium text-green-800 text-xs mb-1">Hasil / Surat</p>
                  <a href={getAssetUrl(selected.file_hasil)} target="_blank" rel="noreferrer"
                    className="text-green-700 underline">📄 Download file hasil</a>
                </div>
              )}
              <div>
                <p className="font-medium text-gray-700 mb-2">Dokumen yang Diupload</p>
                {[
                  ['KTP', selected.file_ktp],
                  ['KK', selected.file_kk],
                  ['Surat RT/RW', selected.file_surat_rtrw],
                  ['Foto Rumah', selected.file_foto_rumah],
                  ['Pendukung', selected.file_pendukung],
                ].map(([l, f]) => f && (
                  <div key={l} className="flex justify-between bg-gray-50 rounded-xl p-3 mb-1">
                    <span className="text-gray-600">{l}</span>
                    <a href={getAssetUrl(f)} target="_blank" rel="noreferrer"
                      className="text-emerald-600 text-xs underline">Lihat</a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </UserLayout>
  )
}
