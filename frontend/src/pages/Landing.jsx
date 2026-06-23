import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

const stats = [
  { icon: '👥', label: 'Penduduk', value: '25.282', sub: 'jiwa' },
  { icon: '🏠', label: 'Kepala Keluarga', value: '4.969', sub: 'KK' },
  { icon: '📐', label: 'Luas Wilayah', value: '483', sub: 'Hektar' },
  { icon: '🕌', label: 'Mayoritas', value: 'Islam', sub: '86%' },
]

const layanan = [
  { icon: '📢', title: 'Aspirasi Masyarakat', desc: 'Sampaikan aspirasi, keluhan, dan pengaduan kepada kelurahan secara langsung.' },
  { icon: '📄', title: 'Permohonan Layanan', desc: 'Ajukan surat keterangan, surat domisili, SKTM, dan dokumen administrasi lainnya.' },
  { icon: '🗺️', title: 'Informasi Wilayah', desc: 'Lihat profil, visi misi, dan peta wilayah Kelurahan Serua Indah.' },
  { icon: '⚡', title: 'Proses Cepat', desc: 'Pantau status permohonan dan aspirasi Anda secara real-time online.' },
]

export default function Landing() {
  const [kelurahan, setKelurahan] = useState(null)
  const [statistik, setStatistik] = useState(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    api.get('/kelurahan').then(r => setKelurahan(r.data.data)).catch(() => {})
    api.get('/public/statistik').then(r => setStatistik(r.data)).catch(() => {})
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="min-h-screen bg-stone-50" style={{ fontFamily: "'Plus Jakarta Sans', 'Segoe UI', sans-serif" }}>

      {/* Sticky Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur shadow-md' : 'bg-transparent'}`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center shadow">
              <span className="text-white text-lg">🏛️</span>
            </div>
            <div>
              <p className={`font-bold text-sm leading-tight transition-colors ${scrolled ? 'text-gray-800' : 'text-white'}`}>Kelurahan Serua Indah</p>
              <p className={`text-xs transition-colors ${scrolled ? 'text-gray-400' : 'text-emerald-200'}`}>Ciputat · Tangerang Selatan</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login"
              className={`text-sm font-semibold px-4 py-2 rounded-xl transition-all ${scrolled ? 'text-emerald-700 hover:bg-emerald-50' : 'text-white hover:bg-white/10'}`}>
              Masuk
            </Link>
            <Link to="/login"
              className="text-sm font-semibold px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow transition-all">
              Buat Akun
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background foto kantor kelurahan */}
        <div className="absolute inset-0">
          <img
            src="/hero_bg.jpg"
            alt="Kantor Lurah Serua Indah"
            className="w-full h-full object-cover object-center"
          />
          {/* Overlay gradient gelap agar teks terbaca */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/30" />
          {/* Overlay warna emerald tipis agar tetap on-brand */}
          <div className="absolute inset-0 bg-emerald-900/40" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-32">
          <div className="max-w-3xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-200 text-sm font-medium">Sistem Pelayanan Digital Kelurahan</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-4">
              Pusat Layanan &<br />
              <span className="text-emerald-300">Aspirasi Masyarakat</span>
            </h1>
            <p className="text-lg text-white/70 mb-3 font-medium">Kelurahan Serua Indah · Kecamatan Ciputat · Kota Tangerang Selatan</p>
            <p className="text-white/50 text-sm mb-10 max-w-xl leading-relaxed">
              Platform digital untuk menyampaikan aspirasi, mengajukan permohonan layanan administrasi, dan memantau perkembangannya secara transparan.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link to="/login"
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-6 py-3.5 rounded-2xl shadow-lg shadow-emerald-900/40 transition-all hover:scale-105 active:scale-100">
                📢 Sampaikan Aspirasi
              </Link>
              <Link to="/login"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-sm text-white font-semibold px-6 py-3.5 rounded-2xl transition-all hover:scale-105 active:scale-100">
                📄 Ajukan Permohonan
              </Link>
            </div>

            {/* Login petugas */}
            <div className="mt-6">
              <Link to="/login" className="text-white/40 hover:text-white/70 text-sm transition-colors underline underline-offset-4">
                🛡️ Login sebagai Petugas / Admin
              </Link>
            </div>
          </div>
        </div>

        {/* Wave bottom */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 80L1440 80L1440 20C1200 80 960 0 720 40C480 80 240 0 0 20L0 80Z" fill="#f7f6f3"/>
          </svg>
        </div>
      </section>

      {/* ── Summary Kelurahan ── */}
      <section className="bg-stone-50 py-10">
        <div className="max-w-6xl mx-auto px-6 space-y-8">

          {/* PENDUDUK */}
          <div>
            <div className="text-center mb-5">
              <span className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest">
                👥 Penduduk
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: '🏘️', label: 'Jumlah Penduduk',        value: kelurahan?.jumlah_penduduk,  sub: 'jiwa' },
                { icon: '🏠', label: 'Jumlah Kepala Keluarga', value: kelurahan?.jumlah_kk,         sub: 'KK' },
                { icon: '👨', label: 'Penduduk Laki-laki',     value: kelurahan?.jumlah_laki_laki,  sub: 'jiwa' },
                { icon: '👩', label: 'Penduduk Perempuan',     value: kelurahan?.jumlah_perempuan,  sub: 'jiwa' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl shadow-sm border border-stone-100 p-5 text-center hover:shadow-md transition-shadow">
                  <div className="text-3xl mb-2">{s.icon}</div>
                  <p className="text-2xl font-extrabold text-emerald-700">
                    {s.value ? s.value.toLocaleString('id-ID') : '-'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.label}{s.sub && s.value ? ` (${s.sub})` : ''}</p>
                </div>
              ))}
            </div>
          </div>

          {/* SARANA PENDIDIKAN */}
          <div>
            <div className="text-center mb-5">
              <span className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest">
                🎓 Sarana Pendidikan
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { icon: '🧒', label: 'PAUD/KB/TK',       value: kelurahan?.jml_paud_kb_tk },
                { icon: '📚', label: 'Sekolah Dasar',    value: kelurahan?.jml_sekolah_dasar },
                { icon: '🏫', label: 'SLTP',             value: kelurahan?.jml_sltp },
                { icon: '🏛️', label: 'SLTA',             value: kelurahan?.jml_slta },
                { icon: '🎓', label: 'Perguruan Tinggi', value: kelurahan?.jml_perguruan_tinggi },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl shadow-sm border border-stone-100 p-4 text-center hover:shadow-md transition-shadow">
                  <div className="text-2xl mb-2">{s.icon}</div>
                  <p className="text-2xl font-extrabold text-blue-600">
                    {s.value != null ? s.value.toLocaleString('id-ID') : '-'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-tight">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* SARANA KESEHATAN */}
          <div>
            <div className="text-center mb-5">
              <span className="inline-flex items-center gap-2 bg-red-100 text-red-700 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest">
                🏥 Sarana Kesehatan
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { icon: '🏥', label: 'Rumah Sakit',                         value: kelurahan?.jml_rumah_sakit },
                { icon: '🩺', label: 'Puskesmas',                           value: kelurahan?.jml_puskesmas },
                { icon: '💊', label: 'Klinik/Balai Pengobatan',             value: kelurahan?.jml_klinik },
                { icon: '🌿', label: 'Klinik/Balai Pengobatan Tradisional', value: kelurahan?.jml_klinik_tradisional },
                { icon: '👶', label: 'Posyandu',                            value: kelurahan?.jml_posyandu },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl shadow-sm border border-stone-100 p-4 text-center hover:shadow-md transition-shadow">
                  <div className="text-2xl mb-2">{s.icon}</div>
                  <p className="text-2xl font-extrabold text-red-600">
                    {s.value != null ? s.value.toLocaleString('id-ID') : '-'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-tight">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* Layanan Section */}
      <section className="py-16 bg-stone-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-10">
            <span className="text-emerald-600 font-bold text-sm uppercase tracking-widest">Apa yang bisa kami bantu?</span>
            <h2 className="text-3xl font-extrabold text-gray-800 mt-2">Layanan Kami</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {layanan.map(l => (
              <div key={l.title} className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-2xl mb-4">{l.icon}</div>
                <h3 className="font-bold text-gray-800 mb-2">{l.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{l.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Statistik Aspirasi & Permohonan ── */}
      <section className="py-14 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-10">
            <span className="text-emerald-600 font-bold text-sm uppercase tracking-widest">Transparansi Layanan</span>
            <h2 className="text-2xl font-extrabold text-gray-800 mt-2">Statistik Penanganan</h2>
            <p className="text-gray-400 text-sm mt-1">Data real-time penanganan aspirasi dan permohonan masyarakat</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-stone-50 rounded-2xl p-6 border border-stone-100">
              <div className="flex items-center gap-2 mb-5">
                <span className="text-xl">📢</span>
                <h3 className="font-bold text-gray-800">Aspirasi Masyarakat</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  ['Total', statistik?.aspirasi?.total ?? '-', 'text-emerald-700'],
                  ['Aktif Diproses', statistik?.aspirasi?.menunggu ?? '-', 'text-blue-600'],
                  ['Proses Lanjut', statistik?.aspirasi?.proses ?? '-', 'text-orange-600'],
                  ['Selesai', statistik?.aspirasi?.selesai ?? '-', 'text-green-600'],
                ].map(([label, val, color]) => (
                  <div key={label} className="bg-white rounded-xl p-4 text-center border border-stone-100">
                    <p className={`text-2xl font-extrabold ${color}`}>{val}</p>
                    <p className="text-xs text-gray-400 mt-1">{label}</p>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Tingkat penyelesaian</span>
                <span className="font-semibold text-emerald-700">
                  {statistik?.aspirasi?.total ? Math.round((statistik.aspirasi.selesai / statistik.aspirasi.total) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full transition-all"
                  style={{ width: statistik?.aspirasi?.total ? `${(statistik.aspirasi.selesai / statistik.aspirasi.total) * 100}%` : '0%' }} />
              </div>
            </div>
            <div className="bg-stone-50 rounded-2xl p-6 border border-stone-100">
              <div className="flex items-center gap-2 mb-5">
                <span className="text-xl">📄</span>
                <h3 className="font-bold text-gray-800">Permohonan Layanan</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  ['Total', statistik?.permohonan?.total ?? '-', 'text-emerald-700'],
                  ['Aktif Diproses', statistik?.permohonan?.menunggu ?? '-', 'text-blue-600'],
                  ['Proses Lanjut', statistik?.permohonan?.proses ?? '-', 'text-orange-600'],
                  ['Selesai', statistik?.permohonan?.selesai ?? '-', 'text-green-600'],
                ].map(([label, val, color]) => (
                  <div key={label} className="bg-white rounded-xl p-4 text-center border border-stone-100">
                    <p className={`text-2xl font-extrabold ${color}`}>{val}</p>
                    <p className="text-xs text-gray-400 mt-1">{label}</p>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Tingkat penyelesaian</span>
                <span className="font-semibold text-emerald-700">
                  {statistik?.permohonan?.total ? Math.round((statistik.permohonan.selesai / statistik.permohonan.total) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full transition-all"
                  style={{ width: statistik?.permohonan?.total ? `${(statistik.permohonan.selesai / statistik.permohonan.total) * 100}%` : '0%' }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Profil Kelurahan */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div>
              <span className="text-emerald-600 font-bold text-sm uppercase tracking-widest">Tentang Kami</span>
              <h2 className="text-3xl font-extrabold text-gray-800 mt-2 mb-5">Profil Kelurahan Serua Indah</h2>
              <p className="text-gray-500 leading-relaxed mb-6">
                {kelurahan?.sejarah || 'Kelurahan Serua Indah merupakan salah satu kelurahan di Kecamatan Ciputat, Kota Tangerang Selatan, Provinsi Banten, Indonesia. Wilayah ini berkembang pesat sebagai kawasan perkotaan yang strategis berbatasan langsung dengan Jakarta.'}
              </p>

              {kelurahan?.visi && (
                <div className="bg-emerald-50 rounded-2xl p-5 mb-4 border border-emerald-100">
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-2">🎯 Visi</p>
                  <p className="text-gray-700 text-sm leading-relaxed">{kelurahan.visi}</p>
                </div>
              )}
              {kelurahan?.misi && (
                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">📌 Misi</p>
                  <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{kelurahan.misi}</p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="bg-gradient-to-br from-emerald-700 to-teal-800 rounded-2xl p-6 text-white">
                <h3 className="font-bold text-lg mb-4">📍 Informasi Kantor</h3>
                <div className="space-y-3 text-sm">
                  {[
                    ['Alamat', kelurahan?.alamat_kantor || 'Jl. Serua Indah, Ciputat, Tangerang Selatan 15414'],
                    ['Telepon', kelurahan?.telp_kantor || '021-7490xxx'],
                    ['Jam Layanan', kelurahan?.jam_operasional || 'Senin - Jumat: 08.00 - 16.00 WIB'],
                    ['Kode Pos', kelurahan?.kode_pos || '15414'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex gap-3">
                      <span className="text-emerald-300 shrink-0 w-24">{k}</span>
                      <span className="text-white/80">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA Card */}
              <div className="bg-stone-900 rounded-2xl p-6 text-white">
                <h3 className="font-bold text-lg mb-2">Mulai Sekarang</h3>
                <p className="text-stone-400 text-sm mb-5">Daftarkan akun Anda dan nikmati kemudahan layanan kelurahan secara online.</p>
                <div className="space-y-2">
                  <Link to="/login"
                    className="flex items-center justify-between bg-emerald-600 hover:bg-emerald-500 rounded-xl px-4 py-3 transition group">
                    <span className="font-semibold text-sm">👤 Login Masyarakat</span>
                    <span className="text-emerald-300 group-hover:translate-x-1 transition-transform">→</span>
                  </Link>
                  <Link to="/register"
                    className="flex items-center justify-between bg-white/10 hover:bg-white/20 rounded-xl px-4 py-3 transition group border border-white/10">
                    <span className="font-semibold text-sm">✍️ Daftar Akun Baru</span>
                    <span className="text-white/50 group-hover:translate-x-1 transition-transform">→</span>
                  </Link>
                  <Link to="/login"
                    className="flex items-center justify-between bg-white/5 hover:bg-white/10 rounded-xl px-4 py-3 transition group border border-white/10">
                    <span className="text-sm text-stone-400">🛡️ Login Petugas / Admin</span>
                    <span className="text-stone-500 group-hover:translate-x-1 transition-transform">→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-900 text-white py-10">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-sm">🏛️</div>
            <p className="font-bold">Kelurahan Serua Indah</p>
          </div>
          <p className="text-stone-400 text-sm">Kecamatan Ciputat · Kota Tangerang Selatan · Provinsi Banten</p>
          <p className="text-stone-600 text-xs mt-4">
            Sistem Informasi Pusat Layanan dan Aspirasi Masyarakat Berbasis Web · © 2026
          </p>
        </div>
      </footer>
    </div>
  )
}
