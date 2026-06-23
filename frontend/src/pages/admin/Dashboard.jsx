import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Polygon, Popup, Marker, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import api, { getApiError } from '../../services/api'
import AdminLayout from '../../components/AdminLayout'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Status aspirasi baru
const STATUS_ASPIRASI = {
  verifikasi_lapangan:  { label: 'Verifikasi Lapangan',         color: '#D97706' },
  koordinasi:           { label: 'Koordinasi Perangkat Daerah', color: '#7C3AED' },
  proses_penyelesaian:  { label: 'Proses Penyelesaian',         color: '#2563EB' },
  selesai:              { label: 'Selesai',                      color: '#059669' },
  ditolak:              { label: 'Ditolak',                      color: '#DC2626' },
}

const makeIcon = (color) => L.divIcon({
  className: '',
  html: `<div style="width:24px;height:24px;border-radius:50% 50% 50% 0;background:${color};border:2px solid white;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
  iconSize: [24, 24], iconAnchor: [12, 24], popupAnchor: [0, -24],
})

// Buat icon untuk setiap status
const ICONS = Object.fromEntries(
  Object.entries(STATUS_ASPIRASI).map(([k, v]) => [k, makeIcon(v.color)])
)
const getMarkerIcon = (status) => ICONS[status] || makeIcon('#D97706')

const SERUA_INDAH_POLYGON = [
  [-6.3050, 106.7180], [-6.3050, 106.7310], [-6.3100, 106.7340],
  [-6.3160, 106.7330], [-6.3200, 106.7290], [-6.3210, 106.7240],
  [-6.3180, 106.7190], [-6.3130, 106.7160], [-6.3080, 106.7165],
  [-6.3050, 106.7180],
]
const CENTER = [-6.3130, 106.7250]

function MapBounds({ polygon }) {
  const map = useMap()
  useEffect(() => {
    if (polygon.length) map.fitBounds(L.latLngBounds(polygon), { padding: [30, 30] })
  }, [polygon, map])
  return null
}

const statusBadge = (status) => {
  const st = STATUS_ASPIRASI[status]
  if (!st) return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">{status}</span>
  const clsMap = {
    verifikasi_lapangan: 'bg-yellow-100 text-yellow-700',
    koordinasi:          'bg-purple-100 text-purple-700',
    proses_penyelesaian: 'bg-blue-100 text-blue-700',
    selesai:             'bg-green-100 text-green-700',
    ditolak:             'bg-red-100 text-red-700',
  }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${clsMap[status]}`}>{st.label}</span>
}

const StatCard = ({ label, value, color, icon, sub }) => (
  <div className={`bg-white rounded-2xl shadow-sm p-4 border-l-4 ${color}`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide leading-tight">{label}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
        <p className="text-3xl font-bold text-gray-800 mt-1">{value ?? '-'}</p>
      </div>
      <span className="text-3xl opacity-80">{icon}</span>
    </div>
  </div>
)

export default function AdminDashboard() {
  const [stats, setStats]         = useState(null)
  const [kelurahan, setKelurahan] = useState(null)
  const [aspirasi, setAspirasi]   = useState([])
  const [showKelurahan, setShowKelurahan] = useState(false)

  // Notifikasi lupa password
  const [notifList, setNotifList]         = useState([])
  const [resetModal, setResetModal]       = useState(null)
  const [newPassword, setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass, setShowPass]           = useState(false)
  const [resetMsg, setResetMsg]           = useState(null)
  const [resetLoading, setResetLoading]   = useState(false)
  const [feedback, setFeedback]           = useState(null)

  const fetchAll = async () => {
    try {
      const [dashboardRes, kelurahanRes, aspirasiRes] = await Promise.all([
        api.get('/dashboard'),
        api.get('/kelurahan'),
        api.get('/aspirasi'),
      ])
      setStats(dashboardRes.data)
      setKelurahan(kelurahanRes.data.data)
      setAspirasi((aspirasiRes.data.data || []).filter(a =>
        a.latitude && a.longitude && a.status !== 'selesai' && a.status !== 'ditolak'
      ))
      await fetchNotif()
    } catch (err) {
      setFeedback({ type: 'error', text: getApiError(err, 'Gagal memuat dashboard') })
    }
  }

  const fetchNotif = () => api.get('/lupa-password?status=menunggu')
    .then(r => setNotifList(r.data.data || []))

  useEffect(() => { fetchAll() }, [])

  const handleBaca = async (id) => {
    try {
      await api.put(`/lupa-password/${id}/baca`)
      setNotifList(prev => prev.map(n => n.id === id ? { ...n, dibaca: true } : n))
    } catch (err) {
      setFeedback({ type: 'error', text: getApiError(err, 'Gagal menandai notifikasi') })
    }
  }

  const openResetModal = (notif) => {
    handleBaca(notif.id)
    setResetModal(notif)
    setNewPassword('')
    setConfirmPassword('')
    setShowPass(false)
    setResetMsg(null)
  }

  const handleSelesaikan = async (e) => {
    e.preventDefault()
    setResetMsg(null)
    if (newPassword.length < 6) { setResetMsg({ type: 'error', text: 'Password minimal 6 karakter' }); return }
    if (newPassword !== confirmPassword) { setResetMsg({ type: 'error', text: 'Konfirmasi password tidak cocok' }); return }
    setResetLoading(true)
    try {
      const res = await api.put(`/lupa-password/${resetModal.id}/selesai`, {
        new_password: newPassword,
        catatan: `Direset oleh petugas. Hubungi ${resetModal.no_hp}`,
      })
      setResetMsg({ type: 'success', text: res.data.message })
      fetchNotif()
      setTimeout(() => setResetModal(null), 2000)
    } catch (err) {
      setResetMsg({ type: 'error', text: getApiError(err, 'Gagal mereset password') })
    } finally {
      setResetLoading(false)
    }
  }

  const unreadCount = notifList.filter(n => !n.dibaca).length

  // Hitung statistik dari data yang ada
  const totalAspirasi  = stats?.total_aspirasi   ?? stats?.total_pengaduan ?? 0
  const selesaiAsp     = stats?.selesai           ?? 0
  const prosesAsp      = stats?.proses            ?? 0
  const totalPerm      = stats?.total_permohonan  ?? 0
  const selesaiPerm    = stats?.perm_selesai      ?? 0
  const prosesPerm     = stats?.perm_proses       ?? 0

  // Aktif = belum selesai/ditolak
  const aktifAsp  = totalAspirasi - selesaiAsp
  const aktifPerm = totalPerm - selesaiPerm

  // Status aktif di peta per jenis
  const aspByStatus = Object.entries(STATUS_ASPIRASI).filter(([k]) => k !== 'selesai' && k !== 'ditolak').map(([k]) => ({
    key: k,
    label: STATUS_ASPIRASI[k].label,
    color: STATUS_ASPIRASI[k].color,
    count: aspirasi.filter(a => a.status === k).length,
  })).filter(s => s.count > 0)

  return (
    <AdminLayout>
      <div className="space-y-6">
        {feedback && (
          <div className={`rounded-xl px-4 py-3 text-sm border ${
            feedback.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>{feedback.text}</div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500 text-sm">Kelurahan Serua Indah — Kecamatan Ciputat</p>
        </div>

        {/* Notifikasi Lupa Password */}
        {notifList.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden">
            <div className="px-5 py-4 bg-orange-50 border-b border-orange-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔑</span>
                <h2 className="font-bold text-orange-800 text-sm">Permintaan Reset Password</h2>
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount} baru</span>
                )}
              </div>
              <span className="text-xs text-orange-600">{notifList.length} menunggu</span>
            </div>
            <div className="divide-y divide-gray-50">
              {notifList.map(n => (
                <div key={n.id}
                  className={`px-5 py-3 flex items-center justify-between gap-4 hover:bg-gray-50 transition ${!n.dibaca ? 'bg-orange-50/40' : ''}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    {!n.dibaca && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />}
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">{n.masyarakat?.name || n.nik}</p>
                      <p className="text-xs text-gray-400">
                        NIK: {n.nik} · HP: {n.no_hp}
                        <span className="mx-1">·</span>
                        {new Date(n.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => openResetModal(n)}
                    className="shrink-0 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition">
                    Proses →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Stat Cards — Aspirasi ── */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">📢 Aspirasi Masyarakat</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Aspirasi"  value={totalAspirasi} color="border-emerald-500" icon="📋" />
            <StatCard label="Aktif Diproses"  value={aktifAsp}      color="border-blue-500"    icon="🔄" sub="Belum selesai" />
            <StatCard label="Selesai"          value={selesaiAsp}    color="border-green-500"   icon="✅" />
            <StatCard label="Total Masyarakat" value={stats?.total_masyarakat} color="border-purple-500" icon="👥" />
          </div>
        </div>

        {/* ── Stat Cards — Permohonan ── */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">📄 Permohonan Layanan</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Permohonan" value={totalPerm}    color="border-emerald-500" icon="📋" />
            <StatCard label="Aktif Diproses"   value={aktifPerm}   color="border-orange-500"  icon="🔄" sub="Belum selesai" />
            <StatCard label="Selesai"           value={selesaiPerm} color="border-green-500"   icon="✅" />
            <StatCard label="Total Layanan"     value={stats?.total_permohonan ?? 0} color="border-teal-500" icon="📄" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Peta */}
          <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-800">Peta Wilayah Serua Indah</h2>
                <p className="text-xs text-gray-400">Marker = aspirasi aktif (belum selesai/ditolak)</p>
              </div>
              <button onClick={() => setShowKelurahan(true)}
                className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg font-medium hover:bg-emerald-100 transition">
                Info Kelurahan
              </button>
            </div>

            {/* Map container dengan z-index override via style */}
            <div style={{ height: 340, position: 'relative', zIndex: 0 }}>
              <MapContainer center={CENTER} zoom={14} style={{ height: '100%', width: '100%', zIndex: 0 }}>
                <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapBounds polygon={SERUA_INDAH_POLYGON} />
                <Polygon positions={SERUA_INDAH_POLYGON}
                  pathOptions={{ color: '#059669', fillColor: '#10b981', fillOpacity: 0.25, weight: 2.5 }}
                  eventHandlers={{ click: () => setShowKelurahan(true) }}>
                  <Popup>
                    <div className="text-sm">
                      <p className="font-bold text-emerald-700">Kelurahan Serua Indah</p>
                      <p className="text-gray-500">Kec. Ciputat, Tangerang Selatan</p>
                      {kelurahan && <p className="mt-1">👥 {kelurahan.jumlah_penduduk?.toLocaleString()} jiwa</p>}
                    </div>
                  </Popup>
                </Polygon>
                {aspirasi.map(a => (
                  <Marker key={a.id_pengaduan} position={[a.latitude, a.longitude]} icon={getMarkerIcon(a.status)}>
                    <Popup>
                      <div className="text-xs" style={{ minWidth: 160 }}>
                        <p className="font-semibold mb-1">{a.judul_laporan}</p>
                        <p className="text-gray-500 mb-1">📍 {a.lokasi_kejadian}</p>
                        {a.tipe_aspirasi && <p className="text-gray-400 mb-1">🏷️ {a.tipe_aspirasi}</p>}
                        {statusBadge(a.status)}
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>

            {/* Legend */}
            {aspirasi.length > 0 && (
              <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 border-t text-xs text-gray-500 flex-wrap">
                <span className="font-medium">Keterangan:</span>
                {aspByStatus.map(s => (
                  <span key={s.key} className="flex items-center gap-1.5">
                    <span style={{ width:10, height:10, borderRadius:'50%', background: s.color, display:'inline-block', flexShrink: 0 }} />
                    {s.label} ({s.count})
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Aspirasi terbaru */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-base font-bold text-gray-800 mb-3">Aspirasi Terbaru</h2>
              <div className="space-y-2">
                {(stats?.recent_aspirasi || stats?.recent || []).slice(0, 4).map(p => (
                  <div key={p.id_pengaduan} className="flex items-start gap-3 pb-2 border-b last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{p.judul_laporan}</p>
                      <p className="text-xs text-gray-400">{p.masyarakat?.name}</p>
                    </div>
                    {statusBadge(p.status)}
                  </div>
                ))}
              </div>
              <a href="/admin/aspirasi" className="text-emerald-600 text-xs hover:underline mt-3 block">Lihat semua →</a>
            </div>

            {/* Permohonan terbaru */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-base font-bold text-gray-800 mb-3">Permohonan Terbaru</h2>
              <div className="space-y-2">
                {(stats?.recent_permohonan || []).slice(0, 3).map(p => {
                  const st = {
                    verifikasi_persyaratan: ['Verifikasi', 'bg-blue-100 text-blue-700'],
                    pembuatan_draft:        ['Draft Surat','bg-purple-100 text-purple-700'],
                    penandatanganan:        ['Tanda Tangan','bg-yellow-100 text-yellow-700'],
                    register_dokumen:       ['Register','bg-orange-100 text-orange-700'],
                    selesai:                ['Selesai','bg-green-100 text-green-700'],
                    ditolak:                ['Ditolak','bg-red-100 text-red-700'],
                  }[p.status] || [p.status, 'bg-gray-100 text-gray-600']
                  return (
                    <div key={p.id} className="flex items-start gap-3 pb-2 border-b last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">{p.jenis_layanan?.nama_layanan}</p>
                        <p className="text-xs text-gray-400">{p.masyarakat?.name}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${st[1]}`}>{st[0]}</span>
                    </div>
                  )
                })}
                {(!stats?.recent_permohonan?.length) && (
                  <p className="text-xs text-gray-400 text-center py-2">Belum ada permohonan</p>
                )}
              </div>
              <a href="/admin/permohonan" className="text-emerald-600 text-xs hover:underline mt-3 block">Lihat semua →</a>
            </div>

            {/* Ringkasan progress */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-sm font-bold text-gray-700 mb-3">Tingkat Penyelesaian</h2>
              <div className="space-y-3">
                {[
                  { label: 'Aspirasi', selesai: selesaiAsp, total: totalAspirasi, color: 'bg-emerald-500' },
                  { label: 'Permohonan', selesai: selesaiPerm, total: totalPerm, color: 'bg-teal-500' },
                ].map(s => {
                  const pct = s.total ? Math.round((s.selesai / s.total) * 100) : 0
                  return (
                    <div key={s.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">{s.label}</span>
                        <span className="font-semibold text-gray-700">{s.selesai}/{s.total} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className={`${s.color} h-2 rounded-full transition-all`}
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-3 pt-3 border-t flex justify-between text-xs text-gray-500">
                <span>Total Masyarakat Terdaftar</span>
                <span className="font-bold text-gray-700">{stats?.total_masyarakat ?? '-'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal Info Kelurahan — z-[1000] agar di atas peta ── */}
      {showKelurahan && kelurahan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="p-5 border-b flex items-center justify-between bg-gradient-to-r from-emerald-600 to-teal-700 rounded-t-2xl">
              <div>
                <h2 className="text-lg font-bold text-white">{kelurahan.nama}</h2>
                <p className="text-emerald-200 text-xs">Kec. {kelurahan.kecamatan} · {kelurahan.kota}</p>
              </div>
              <button onClick={() => setShowKelurahan(false)} className="text-white/70 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-5 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Jumlah Penduduk', `${kelurahan.jumlah_penduduk?.toLocaleString()} jiwa`],
                  ['Jumlah KK', `${kelurahan.jumlah_kk?.toLocaleString()} KK`],
                  ['Luas Wilayah', kelurahan.luas_wilayah],
                  ['Kode Pos', kelurahan.kode_pos],
                ].map(([l, v]) => (
                  <div key={l} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-gray-400 text-xs">{l}</p>
                    <p className="font-semibold text-gray-800 mt-0.5">{v}</p>
                  </div>
                ))}
              </div>
              {kelurahan.visi && (
                <div className="bg-emerald-50 rounded-xl p-3">
                  <p className="font-semibold text-gray-700 mb-1">🎯 Visi</p>
                  <p className="text-gray-600 text-xs">{kelurahan.visi}</p>
                </div>
              )}
              {kelurahan.misi && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="font-semibold text-gray-700 mb-1">📌 Misi</p>
                  <p className="text-gray-600 text-xs whitespace-pre-line">{kelurahan.misi}</p>
                </div>
              )}
              <div className="border-t pt-3 space-y-1 text-gray-600 text-xs">
                <p>📍 {kelurahan.alamat_kantor}</p>
                <p>📞 {kelurahan.telp_kantor}</p>
                <p>🕐 {kelurahan.jam_operasional}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Proses Reset Password — z-[1000] ── */}
      {resetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-800">Proses Reset Password</h2>
                <p className="text-gray-400 text-xs mt-0.5">
                  <span className="font-medium text-gray-600">{resetModal.masyarakat?.name || resetModal.nik}</span>
                  <span className="mx-1">·</span>HP: {resetModal.no_hp}
                </p>
              </div>
              <button onClick={() => setResetModal(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleSelesaikan} className="p-5 space-y-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                ℹ️ Set password baru, lalu hubungi <strong>{resetModal.no_hp}</strong> untuk memberitahu password barunya.
              </div>
              {resetMsg && (
                <div className={`rounded-xl px-4 py-3 text-sm flex items-center gap-2 ${
                  resetMsg.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-600'
                }`}>
                  <span>{resetMsg.type === 'success' ? '✅' : '⚠️'}</span>
                  <span>{resetMsg.text}</span>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password Baru</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none pr-10" required />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                    {showPass ? '🙈' : '👁️'}
                  </button>
                </div>
                {newPassword && (
                  <div className="mt-1.5 flex gap-1 items-center">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all ${
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
                <input type={showPass ? 'text' : 'password'} value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password baru"
                  className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition ${
                    confirmPassword && confirmPassword !== newPassword ? 'border-red-300 bg-red-50'
                    : confirmPassword && confirmPassword === newPassword ? 'border-green-300 bg-green-50'
                    : 'border-gray-200'
                  }`} required />
                {confirmPassword && confirmPassword !== newPassword && <p className="text-xs text-red-500 mt-1">Password tidak cocok</p>}
                {confirmPassword && confirmPassword === newPassword && <p className="text-xs text-green-600 mt-1">✓ Password cocok</p>}
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setResetModal(null)}
                  className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 py-2.5 rounded-xl text-sm font-semibold transition">
                  Batal
                </button>
                <button type="submit"
                  disabled={resetLoading || newPassword !== confirmPassword || newPassword.length < 6}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white py-2.5 rounded-xl text-sm font-semibold transition disabled:cursor-not-allowed">
                  {resetLoading ? 'Menyimpan...' : '✓ Reset & Selesaikan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
