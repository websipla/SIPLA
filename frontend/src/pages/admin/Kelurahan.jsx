import { useEffect, useState } from 'react'
import api, { getApiError } from '../../services/api'
import AdminLayout from '../../components/AdminLayout'

const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition bg-gray-50'
const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

const NumField = ({ label, k, value, onChange }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-3">
    <label className="block text-xs text-gray-500 mb-1 text-center">{label}</label>
    <input
      type="number" min="0"
      value={value || 0}
      onChange={e => onChange(k, parseInt(e.target.value) || 0)}
      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:ring-2 focus:ring-emerald-500 outline-none bg-gray-50 font-semibold"
    />
  </div>
)

const StatBox = ({ label, value, icon }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-4 text-center hover:shadow-sm transition">
    {icon && <div className="text-2xl mb-1">{icon}</div>}
    <p className="text-xl font-extrabold text-emerald-700">{(value || 0).toLocaleString('id-ID')}</p>
    <p className="text-xs text-gray-400 mt-1 leading-tight">{label}</p>
  </div>
)

export default function AdminKelurahan() {
  const [info, setInfo]       = useState(null)
  const [form, setForm]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]         = useState(null)
  const [edit, setEdit]       = useState(false)

  useEffect(() => {
    api.get('/kelurahan').then(r => {
      setInfo(r.data.data)
      setForm(r.data.data)
    }).catch(err => setMsg({ type: 'error', text: getApiError(err, 'Gagal memuat data kelurahan') }))
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    try {
      const res = await api.put('/kelurahan', form)
      setInfo(res.data.data)
      setForm(res.data.data)
      setEdit(false)
      setMsg({ type: 'success', text: res.data.message || 'Data kelurahan berhasil diperbarui' })
    } catch (err) {
      setMsg({ type: 'error', text: getApiError(err, 'Gagal menyimpan data kelurahan') })
    } finally {
      setLoading(false)
    }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  if (!info) return (
    <AdminLayout>
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" />
      </div>
    </AdminLayout>
  )

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Info Kelurahan</h1>
            <p className="text-gray-500 text-sm">Profil dan informasi Kelurahan Serua Indah</p>
          </div>
          {!edit && (
            <button onClick={() => setEdit(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition">
              ✏️ Edit Info
            </button>
          )}
        </div>

        {msg && (
          <div className={`rounded-xl px-4 py-3 text-sm flex items-center gap-2 ${
            msg.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-600'
          }`}>
            <span>{msg.type === 'success' ? '✅' : '⚠️'}</span><span>{msg.text}</span>
          </div>
        )}

        {/* ── VIEW MODE ── */}
        {!edit && (
          <div className="space-y-5">

            {/* PENDUDUK */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h2 className="font-bold text-gray-800 text-base mb-4 flex items-center gap-2">
                <span className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center text-sm">👥</span>
                Penduduk
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatBox label="Jumlah Penduduk"          value={info.jumlah_penduduk}  icon="🏘️" />
                <StatBox label="Jumlah Kepala Keluarga"   value={info.jumlah_kk}         icon="🏠" />
                <StatBox label="Penduduk Laki-laki"       value={info.jumlah_laki_laki}  icon="👨" />
                <StatBox label="Penduduk Perempuan"       value={info.jumlah_perempuan}  icon="👩" />
              </div>
            </div>

            {/* SARANA PENDIDIKAN */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h2 className="font-bold text-gray-800 text-base mb-4 flex items-center gap-2">
                <span className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center text-sm">🎓</span>
                Sarana Pendidikan
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <StatBox label="PAUD/KB/TK"        value={info.jml_paud_kb_tk}        icon="🧒" />
                <StatBox label="Sekolah Dasar"     value={info.jml_sekolah_dasar}     icon="📚" />
                <StatBox label="SLTP"              value={info.jml_sltp}              icon="🏫" />
                <StatBox label="SLTA"              value={info.jml_slta}              icon="🏛️" />
                <StatBox label="Perguruan Tinggi"  value={info.jml_perguruan_tinggi}  icon="🎓" />
              </div>
            </div>

            {/* SARANA KESEHATAN */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h2 className="font-bold text-gray-800 text-base mb-4 flex items-center gap-2">
                <span className="w-7 h-7 bg-red-100 rounded-lg flex items-center justify-center text-sm">🏥</span>
                Sarana Kesehatan
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <StatBox label="Rumah Sakit"                    value={info.jml_rumah_sakit}         icon="🏥" />
                <StatBox label="Puskesmas"                      value={info.jml_puskesmas}           icon="🩺" />
                <StatBox label="Klinik/Balai Pengobatan"        value={info.jml_klinik}              icon="💊" />
                <StatBox label="Klinik/Balai Pengobatan Tradisional" value={info.jml_klinik_tradisional} icon="🌿" />
                <StatBox label="Posyandu"                       value={info.jml_posyandu}            icon="👶" />
              </div>
            </div>

            {/* Visi & Misi */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
                <h2 className="font-bold text-gray-800">🎯 Visi & Misi</h2>
                {info.visi && (
                  <div className="bg-emerald-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">Visi</p>
                    <p className="text-gray-700 text-sm">{info.visi}</p>
                  </div>
                )}
                {info.misi && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Misi</p>
                    <p className="text-gray-700 text-sm whitespace-pre-line">{info.misi}</p>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <h2 className="font-bold text-gray-800 mb-3">📍 Info Kantor</h2>
                  <div className="space-y-2 text-sm">
                    {[['Alamat', info.alamat_kantor],['Telepon', info.telp_kantor],['Email', info.email_kantor],['Jam Layanan', info.jam_operasional]].map(([l,v]) => (
                      <div key={l} className="flex gap-3">
                        <span className="text-gray-400 w-24 shrink-0">{l}</span>
                        <span className="text-gray-700">{v || '-'}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {info.sejarah && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                    <h2 className="font-bold text-gray-800 mb-2">📖 Sejarah Singkat</h2>
                    <p className="text-sm text-gray-600 leading-relaxed">{info.sejarah}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── EDIT MODE ── */}
        {edit && (
          <form onSubmit={handleSave} className="space-y-5">

            {/* PENDUDUK */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h2 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
                <span className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center text-sm">👥</span>
                Penduduk
              </h2>
              <p className="text-xs text-gray-400 mb-4">Isi jumlah masing-masing</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <NumField label="Jumlah Penduduk"        k="jumlah_penduduk"  value={form.jumlah_penduduk}  onChange={set} />
                <NumField label="Jumlah Kepala Keluarga" k="jumlah_kk"        value={form.jumlah_kk}         onChange={set} />
                <NumField label="Penduduk Laki-laki"     k="jumlah_laki_laki" value={form.jumlah_laki_laki}  onChange={set} />
                <NumField label="Penduduk Perempuan"     k="jumlah_perempuan" value={form.jumlah_perempuan}  onChange={set} />
              </div>
            </div>

            {/* SARANA PENDIDIKAN */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h2 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
                <span className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center text-sm">🎓</span>
                Sarana Pendidikan
              </h2>
              <p className="text-xs text-gray-400 mb-4">Jumlah fasilitas pendidikan di wilayah kelurahan</p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <NumField label="PAUD/KB/TK"        k="jml_paud_kb_tk"        value={form.jml_paud_kb_tk}        onChange={set} />
                <NumField label="Sekolah Dasar"     k="jml_sekolah_dasar"     value={form.jml_sekolah_dasar}     onChange={set} />
                <NumField label="SLTP"              k="jml_sltp"              value={form.jml_sltp}              onChange={set} />
                <NumField label="SLTA"              k="jml_slta"              value={form.jml_slta}              onChange={set} />
                <NumField label="Perguruan Tinggi"  k="jml_perguruan_tinggi"  value={form.jml_perguruan_tinggi}  onChange={set} />
              </div>
            </div>

            {/* SARANA KESEHATAN */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h2 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
                <span className="w-7 h-7 bg-red-100 rounded-lg flex items-center justify-center text-sm">🏥</span>
                Sarana Kesehatan
              </h2>
              <p className="text-xs text-gray-400 mb-4">Jumlah fasilitas kesehatan di wilayah kelurahan</p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <NumField label="Rumah Sakit"                         k="jml_rumah_sakit"          value={form.jml_rumah_sakit}          onChange={set} />
                <NumField label="Puskesmas"                           k="jml_puskesmas"            value={form.jml_puskesmas}            onChange={set} />
                <NumField label="Klinik/Balai Pengobatan"            k="jml_klinik"               value={form.jml_klinik}               onChange={set} />
                <NumField label="Klinik/Balai Pengobatan Tradisional" k="jml_klinik_tradisional"   value={form.jml_klinik_tradisional}   onChange={set} />
                <NumField label="Posyandu"                            k="jml_posyandu"             value={form.jml_posyandu}             onChange={set} />
              </div>
            </div>

            {/* Visi Misi Sejarah */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
              <h2 className="font-bold text-gray-800">Visi, Misi & Sejarah</h2>
              <div>
                <label className={labelCls}>Visi</label>
                <input value={form.visi || ''} onChange={e => set('visi', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Misi</label>
                <textarea value={form.misi || ''} onChange={e => set('misi', e.target.value)} rows={5} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Sejarah</label>
                <textarea value={form.sejarah || ''} onChange={e => set('sejarah', e.target.value)} rows={4} className={inputCls} />
              </div>
            </div>

            {/* Info Kantor */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
              <h2 className="font-bold text-gray-800">Info Kantor</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[['Alamat Kantor','alamat_kantor','text'],['Telepon','telp_kantor','text'],['Email','email_kantor','email'],['Jam Operasional','jam_operasional','text'],['Luas Wilayah','luas_wilayah','text'],['Kode Pos','kode_pos','text']].map(([label,key,type]) => (
                  <div key={key}>
                    <label className={labelCls}>{label}</label>
                    <input type={type} value={form[key] || ''} onChange={e => set(key, e.target.value)} className={inputCls} />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => { setEdit(false); setForm(info) }}
                className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 py-3 rounded-xl text-sm font-semibold transition">
                Batal
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white py-3 rounded-xl text-sm font-semibold transition">
                {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        )}
      </div>
    </AdminLayout>
  )
}
