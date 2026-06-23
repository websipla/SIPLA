import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../services/api'

// ── Di luar komponen agar tidak re-render setiap ketik ──
const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition bg-gray-50'
const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

const Field = ({ label, k, type = 'text', placeholder = '', value, onChange, required = true }) => (
  <div>
    <label className={labelCls}>{label}</label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(k, e.target.value)}
      placeholder={placeholder}
      className={inputCls}
      required={required}
    />
  </div>
)

const SelectField = ({ label, k, options, value, onChange, onChangeExtra }) => (
  <div>
    <label className={labelCls}>{label}</label>
    <select
      value={value}
      onChange={e => { onChange(k, e.target.value); onChangeExtra && onChangeExtra() }}
      className={inputCls}
      required
    >
      <option value="">-- Pilih --</option>
      {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
    </select>
  </div>
)

const StepBadge = ({ n }) => (
  <span className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
    {n}
  </span>
)
// ────────────────────────────────────────────────────────────

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    nik: '', name: '', email: '', username: '', password: '',
    jenis_kelamin: 'Laki-laki', telp: '', alamat: '', rt: '', rw: '',
    kode_pos: '', province_id: '', regency_id: '', district_id: '', village_id: '',
  })
  const [provinces, setProvinces] = useState([])
  const [regencies, setRegencies] = useState([])
  const [districts, setDistricts] = useState([])
  const [villages, setVillages]   = useState([])
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [step, setStep]           = useState(1)

  useEffect(() => {
    api.get('/provinces').then(r => setProvinces(r.data.data || [])).catch(() => {})
  }, [])
  useEffect(() => {
    if (form.province_id) {
      setRegencies([]); setDistricts([]); setVillages([])
      api.get(`/regencies?province_id=${form.province_id}`).then(r => setRegencies(r.data.data || []))
    }
  }, [form.province_id])
  useEffect(() => {
    if (form.regency_id) {
      setDistricts([]); setVillages([])
      api.get(`/districts?regency_id=${form.regency_id}`).then(r => setDistricts(r.data.data || []))
    }
  }, [form.regency_id])
  useEffect(() => {
    if (form.district_id) {
      setVillages([])
      api.get(`/villages?district_id=${form.district_id}`).then(r => setVillages(r.data.data || []))
    }
  }, [form.district_id])

  const handleChange = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/register', form)
      navigate('/login')
    } catch (err) {
      setError(err.response?.data?.error || 'Registrasi gagal, coba lagi')
      setStep(1)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-800 to-emerald-800 py-8 px-4"
      style={{ fontFamily: "'Segoe UI', sans-serif" }}>

      <div className="text-center mb-6">
        <Link to="/" className="inline-flex items-center gap-2 mb-4">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <span className="text-xl">🏛️</span>
          </div>
          <div className="text-left">
            <p className="text-white font-bold text-sm">SIPLA Kelurahan Serua Indah</p>
            <p className="text-emerald-300 text-xs">Kecamatan Ciputat · Tangerang Selatan</p>
          </div>
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-auto overflow-hidden">

        {/* Progress */}
        <div className="bg-emerald-600 px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-white font-semibold text-sm">Daftar Akun Baru</p>
            <p className="text-emerald-200 text-xs">Langkah {step} dari 3</p>
          </div>
          <div className="flex gap-2">
            {[1,2,3].map(s => (
              <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${s <= step ? 'bg-white' : 'bg-white/30'}`} />
            ))}
          </div>
          <div className="flex justify-between mt-1">
            {['Data Akun','Kontak & Alamat','Wilayah'].map((label, i) => (
              <p key={label} className={`text-xs ${i+1 <= step ? 'text-white' : 'text-emerald-300/60'}`}>{label}</p>
            ))}
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm mb-4 flex items-center gap-2">
              <span>⚠️</span><span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>

            {/* Step 1 */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <StepBadge n={1} /> Data Akun
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="NIK (16 digit)"  k="nik"      value={form.nik}      onChange={handleChange} placeholder="3271xxxxxxxxxx" />
                  <Field label="Nama Lengkap"     k="name"     value={form.name}     onChange={handleChange} placeholder="Nama sesuai KTP" />
                  <Field label="Email"            k="email"    value={form.email}    onChange={handleChange} type="email" placeholder="email@gmail.com" />
                  <Field label="Username"         k="username" value={form.username} onChange={handleChange} placeholder="username unik" />
                  <Field label="Password"         k="password" value={form.password} onChange={handleChange} type="password" placeholder="Min. 8 karakter" />
                  <div>
                    <label className={labelCls}>Jenis Kelamin</label>
                    <select value={form.jenis_kelamin} onChange={e => handleChange('jenis_kelamin', e.target.value)} className={inputCls}>
                      <option>Laki-laki</option>
                      <option>Perempuan</option>
                    </select>
                  </div>
                </div>
                <button type="button" onClick={() => setStep(2)}
                  disabled={!form.nik || !form.name || !form.email || !form.username || !form.password}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition text-sm mt-2">
                  Lanjut →
                </button>
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <StepBadge n={2} /> Kontak &amp; Alamat
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="No. Telepon"    k="telp"     value={form.telp}     onChange={handleChange} type="tel" placeholder="08xxxxxxxxxx" />
                  <Field label="Kode Pos"       k="kode_pos" value={form.kode_pos} onChange={handleChange} placeholder="15414" />
                  <div className="md:col-span-2">
                    <Field label="Alamat Lengkap" k="alamat" value={form.alamat}   onChange={handleChange} placeholder="Jl. Serua Indah No. xx" />
                  </div>
                  <Field label="RT" k="rt" value={form.rt} onChange={handleChange} placeholder="001" />
                  <Field label="RW" k="rw" value={form.rw} onChange={handleChange} placeholder="010" />
                </div>
                <div className="flex gap-3 mt-2">
                  <button type="button" onClick={() => setStep(1)}
                    className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold py-3 rounded-xl transition text-sm">
                    ← Kembali
                  </button>
                  <button type="button" onClick={() => setStep(3)}
                    disabled={!form.telp || !form.alamat || !form.rt || !form.rw || !form.kode_pos}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition text-sm">
                    Lanjut →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <div className="space-y-4">
                <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <StepBadge n={3} /> Wilayah Tempat Tinggal
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SelectField label="Provinsi" k="province_id" options={provinces}
                    value={form.province_id} onChange={handleChange}
                    onChangeExtra={() => setForm(f => ({ ...f, regency_id: '', district_id: '', village_id: '' }))}
                  />
                  <SelectField label="Kabupaten / Kota" k="regency_id" options={regencies}
                    value={form.regency_id} onChange={handleChange}
                    onChangeExtra={() => setForm(f => ({ ...f, district_id: '', village_id: '' }))}
                  />
                  <SelectField label="Kecamatan" k="district_id" options={districts}
                    value={form.district_id} onChange={handleChange}
                    onChangeExtra={() => setForm(f => ({ ...f, village_id: '' }))}
                  />
                  <SelectField label="Desa / Kelurahan" k="village_id" options={villages}
                    value={form.village_id} onChange={handleChange}
                  />
                </div>
                <div className="flex gap-3 mt-2">
                  <button type="button" onClick={() => setStep(2)}
                    className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold py-3 rounded-xl transition text-sm">
                    ← Kembali
                  </button>
                  <button type="submit"
                    disabled={loading || !form.province_id || !form.regency_id || !form.district_id || !form.village_id}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition text-sm">
                    {loading ? 'Mendaftarkan...' : 'Daftar Sekarang'}
                  </button>
                </div>
              </div>
            )}

          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Sudah punya akun?{' '}
            <Link to="/login" className="text-emerald-600 hover:underline font-semibold">Masuk di sini</Link>
          </p>
        </div>
      </div>

      <p className="text-center text-emerald-300/60 text-xs mt-4">
        © 2026 Kelurahan Serua Indah · Sistem Informasi Pusat Layanan dan Aspirasi Masyarakat
      </p>
    </div>
  )
}
