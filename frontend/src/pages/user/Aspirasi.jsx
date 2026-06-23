import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Polygon, Marker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import api, { getAssetUrl } from '../../services/api'
import UserLayout from '../../components/UserLayout'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const SERUA_INDAH_POLYGON = [
  [-6.3050, 106.7180], [-6.3050, 106.7310], [-6.3100, 106.7340],
  [-6.3160, 106.7330], [-6.3200, 106.7290], [-6.3210, 106.7240],
  [-6.3180, 106.7190], [-6.3130, 106.7160], [-6.3080, 106.7165],
  [-6.3050, 106.7180],
]
const CENTER = [-6.3130, 106.7250]

const TIPE_ASPIRASI = [
  { id: 'ketentraman',  label: 'Ketentraman & Ketertiban Umum',      icon: '🛡️', desc: 'Gangguan keamanan, ketertiban, konflik warga' },
  { id: 'sarana',       label: 'Sarana, Prasarana & Mobilitas Umum', icon: '🏗️', desc: 'Jalan, jembatan, lampu jalan, drainase' },
  { id: 'sosial',       label: 'Sosial Kemasyarakatan',               icon: '🤝', desc: 'Bantuan sosial, kesehatan, pendidikan warga' },
  { id: 'lingkungan',   label: 'Lingkungan Hidup',                    icon: '🌿', desc: 'Sampah, pohon tumbang, pencemaran' },
  { id: 'administrasi', label: 'Administrasi & Pelayanan',            icon: '📋', desc: 'Keluhan pelayanan, dokumen kependudukan' },
  { id: 'lainnya',      label: 'Lainnya',                             icon: '💬', desc: 'Aspirasi di luar kategori di atas' },
]

// Status aspirasi baru
const STATUS_ASPIRASI = {
  verifikasi_lapangan:  { label: 'Verifikasi Lapangan',         cls: 'bg-blue-100 text-blue-700' },
  koordinasi:           { label: 'Koordinasi Perangkat Daerah', cls: 'bg-purple-100 text-purple-700' },
  proses_penyelesaian:  { label: 'Proses Penyelesaian',         cls: 'bg-orange-100 text-orange-700' },
  selesai:              { label: 'Selesai',                      cls: 'bg-green-100 text-green-700' },
  ditolak:              { label: 'Ditolak',                      cls: 'bg-red-100 text-red-700' },
  // Fallback status lama
  '0':      { label: 'Verifikasi Lapangan',  cls: 'bg-blue-100 text-blue-700' },
  menunggu: { label: 'Verifikasi Lapangan',  cls: 'bg-blue-100 text-blue-700' },
  proses:   { label: 'Proses Penyelesaian',  cls: 'bg-orange-100 text-orange-700' },
}
const statusBadge = (s) => {
  const st = STATUS_ASPIRASI[s] || STATUS_ASPIRASI.verifikasi_lapangan
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${st.cls}`}>{st.label}</span>
}
const _unused = (s) => {
  const m = {
    '0':    ['Menunggu', 'bg-yellow-100 text-yellow-700'],
    proses: ['Diproses', 'bg-blue-100 text-blue-700'],
    selesai:['Selesai',  'bg-green-100 text-green-700'],
  }
  const [label, cls] = m[s] || m['0']
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{label}</span>
}

function PinPicker({ onPick }) {
  useMapEvents({ click(e) { onPick(e.latlng) } })
  return null
}

const EMPTY_FORM = {
  tipe_aspirasi: '',
  judul_laporan: '', isi_laporan: '', tgl_kejadian: '',
  lokasi_kejadian: '', foto: null, latitude: null, longitude: null,
}

export default function UserAspirasi() {
  const [list, setList]       = useState([])
  const [showForm, setShowForm] = useState(false)
  const [formStep, setFormStep] = useState('pilih') // 'pilih' | 'isi'
  const [selectedTipe, setSelectedTipe] = useState(null)
  const [selected, setSelected] = useState(null)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [loading, setLoading]   = useState(false)

  const fetchData = () => api.get('/aspirasi').then(r => setList(r.data.data || []))
  useEffect(() => { fetchData() }, [])

  const handleOpenForm = () => {
    setForm(EMPTY_FORM)
    setSelectedTipe(null)
    setFormStep('pilih')
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setFormStep('pilih')
    setSelectedTipe(null)
    setForm(EMPTY_FORM)
  }

  // Pilih tipe → langsung ke form isi
  const handlePilihTipe = (tipe) => {
    setSelectedTipe(tipe)
    setForm({ ...EMPTY_FORM, tipe_aspirasi: tipe.label })
    setFormStep('isi')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => {
        if (v !== null && v !== '') fd.append(k, v)
      })
      await api.post('/aspirasi', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      handleCloseForm()
      fetchData()
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal mengirim aspirasi')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Hapus aspirasi ini?')) return
    await api.delete(`/aspirasi/${id}`)
    fetchData()
  }

  return (
    <UserLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Aspirasi Saya</h1>
            <p className="text-gray-500 text-sm">Sampaikan aspirasi dan pengaduan Anda</p>
          </div>
          <button
            onClick={handleOpenForm}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2"
          >
            <span>+</span> Buat Aspirasi
          </button>
        </div>

        {list.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <p className="text-5xl mb-3">📢</p>
            <p className="text-gray-600 font-medium">Belum ada aspirasi</p>
            <p className="text-gray-400 text-sm mt-1">Klik tombol di atas untuk menyampaikan aspirasi baru</p>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map(p => (
              <div key={p.id_pengaduan} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      {statusBadge(p.status)}
                      <span className="text-xs text-gray-400">
                        {new Date(p.tgl_pengaduan).toLocaleDateString('id-ID')}
                      </span>
                      {p.tipe_aspirasi && (
                        <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100">
                          {p.tipe_aspirasi}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-800 truncate">{p.judul_laporan}</h3>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{p.isi_laporan}</p>
                    <p className="text-xs text-gray-400 mt-1.5">📍 {p.lokasi_kejadian}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => setSelected(p)}
                      className="text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-lg text-xs font-medium border border-emerald-200"
                    >
                      Detail
                    </button>
                    {p.status === '0' && (
                      <button
                        onClick={() => handleDelete(p.id_pengaduan)}
                        className="text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-200"
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

      {/* ── Modal Form ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto">

            {/* Header */}
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
                    {formStep === 'pilih' ? 'Pilih Kategori Aspirasi' : 'Isi Detail Aspirasi'}
                  </h2>
                  {formStep === 'isi' && selectedTipe && (
                    <p className="text-xs text-emerald-600 font-medium">
                      {selectedTipe.icon} {selectedTipe.label}
                    </p>
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

            {/* Step 1 — Pilih Kategori */}
            {formStep === 'pilih' && (
              <div className="p-5 space-y-2">
                <p className="text-xs text-gray-400 mb-3">Pilih kategori yang sesuai dengan aspirasi Anda</p>
                {TIPE_ASPIRASI.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handlePilihTipe(t)}
                    className="w-full text-left p-4 rounded-xl border border-gray-100 bg-gray-50 hover:border-emerald-400 hover:bg-emerald-50 transition group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{t.icon}</span>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm group-hover:text-emerald-700">
                            {t.label}
                          </p>
                          <p className="text-gray-400 text-xs mt-0.5">{t.desc}</p>
                        </div>
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

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Judul Aspirasi</label>
                  <input
                    value={form.judul_laporan}
                    onChange={e => setForm({ ...form, judul_laporan: e.target.value })}
                    placeholder="Tulis judul singkat aspirasi Anda"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Isi Aspirasi</label>
                  <textarea
                    value={form.isi_laporan}
                    onChange={e => setForm({ ...form, isi_laporan: e.target.value })}
                    rows={4}
                    placeholder="Ceritakan aspirasi atau pengaduan Anda secara detail..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Tanggal Kejadian</label>
                  <input
                    type="date"
                    value={form.tgl_kejadian}
                    onChange={e => setForm({ ...form, tgl_kejadian: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Keterangan Lokasi Kejadian</label>
                  <input
                    value={form.lokasi_kejadian}
                    onChange={e => setForm({ ...form, lokasi_kejadian: e.target.value })}
                    placeholder="Contoh: Jl. Serua Raya No. 5"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                {/* Pin Lokasi Peta */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Pin Lokasi di Peta
                    <span className="text-gray-400 font-normal ml-1 text-xs">(klik pada peta)</span>
                  </label>
                  <div className="rounded-xl overflow-hidden border border-gray-200" style={{ height: 200 }}>
                    <MapContainer center={CENTER} zoom={14} style={{ height: '100%', width: '100%' }}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <Polygon
                        positions={SERUA_INDAH_POLYGON}
                        pathOptions={{ color: '#059669', fillColor: '#10b981', fillOpacity: 0.15, weight: 2 }}
                      />
                      <PinPicker onPick={ll => setForm(f => ({ ...f, latitude: ll.lat, longitude: ll.lng }))} />
                      {form.latitude && form.longitude && (
                        <Marker position={[form.latitude, form.longitude]} />
                      )}
                    </MapContainer>
                  </div>
                  {form.latitude ? (
                    <p className="text-xs text-emerald-600 mt-1">
                      ✅ Lokasi dipilih: {form.latitude.toFixed(6)}, {form.longitude.toFixed(6)}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-1">Belum ada pin lokasi</p>
                  )}
                </div>

                {/* Foto */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Foto Pendukung
                    <span className="text-gray-400 font-normal ml-1 text-xs">(opsional)</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => setForm({ ...form, foto: e.target.files[0] })}
                    className="w-full text-sm text-gray-500 border border-gray-200 rounded-xl px-3 py-2 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white py-2.5 rounded-xl text-sm font-semibold transition"
                >
                  {loading ? 'Mengirim...' : 'Kirim Aspirasi'}
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
              <h2 className="font-bold text-gray-800">Detail Aspirasi</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div className="flex gap-2 flex-wrap">
                {statusBadge(selected.status)}
                {selected.tipe_aspirasi && (
                  <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100">
                    {selected.tipe_aspirasi}
                  </span>
                )}
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <p className="font-semibold text-gray-800">{selected.judul_laporan}</p>
                <p className="text-gray-600">{selected.isi_laporan}</p>
                <p className="text-gray-500 text-xs">📍 {selected.lokasi_kejadian}</p>
                <p className="text-gray-400 text-xs">
                  📅 {new Date(selected.tgl_kejadian).toLocaleDateString('id-ID')}
                </p>
              </div>
              {selected.foto && (
                <img
                  src={getAssetUrl(selected.foto)}
                  alt="foto"
                  className="rounded-xl w-full object-cover max-h-48"
                />
              )}
              {selected.tanggapan?.length > 0 && (
                <div>
                  <p className="font-semibold text-gray-700 mb-2">Tanggapan Petugas</p>
                  {selected.tanggapan.map(t => (
                    <div key={t.id_tanggapan} className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 mb-2">
                      <p className="font-semibold text-emerald-800 text-xs">{t.petugas?.nama_petugas}</p>
                      <p className="text-gray-700 mt-1">{t.tanggapan}</p>
                      {t.file_bukti && (
                        <a
                          href={getAssetUrl(t.file_bukti)}
                          target="_blank" rel="noreferrer"
                          className="text-emerald-600 text-xs underline mt-1 block"
                        >
                          📎 Lihat bukti penanganan
                        </a>
                      )}
                      <p className="text-gray-400 text-xs mt-1">
                        {new Date(t.tgl_tanggapan).toLocaleString('id-ID')}
                      </p>
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
