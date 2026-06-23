import { useEffect, useState } from 'react'
import api from '../../services/api'
import AdminLayout from '../../components/AdminLayout'

export default function AdminKelurahan() {
  const [info, setInfo]     = useState(null)
  const [form, setForm]     = useState(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]       = useState(null)
  const [edit, setEdit]     = useState(false)

  useEffect(() => {
    api.get('/kelurahan').then(r => {
      setInfo(r.data.data)
      setForm(r.data.data)
    })
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    try {
      await api.put('/kelurahan', form)
      setInfo(form)
      setEdit(false)
      setMsg({ type: 'success', text: 'Data kelurahan berhasil diperbarui' })
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Gagal menyimpan' })
    } finally {
      setLoading(false)
    }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition bg-gray-50'
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

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

        {/* View mode */}
        {!edit && (
          <div className="space-y-5">
            {/* Statistik */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                ['👥', 'Jumlah Penduduk', `${info.jumlah_penduduk?.toLocaleString('id-ID')} jiwa`],
                ['🏠', 'Jumlah KK',       `${info.jumlah_kk?.toLocaleString('id-ID')} KK`],
                ['📐', 'Luas Wilayah',    info.luas_wilayah],
                ['📮', 'Kode Pos',         info.kode_pos],
              ].map(([icon, label, val]) => (
                <div key={label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-center">
                  <div className="text-3xl mb-2">{icon}</div>
                  <p className="text-xl font-extrabold text-emerald-700">{val}</p>
                  <p className="text-xs text-gray-400 mt-1">{label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Visi & Misi */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
                <h2 className="font-bold text-gray-800">🎯 Visi & Misi</h2>
                <div className="bg-emerald-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">Visi</p>
                  <p className="text-gray-700 text-sm">{info.visi || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Misi</p>
                  <p className="text-gray-700 text-sm whitespace-pre-line">{info.misi || '-'}</p>
                </div>
              </div>

              {/* Info Kantor & Sejarah */}
              <div className="space-y-4">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <h2 className="font-bold text-gray-800 mb-3">📍 Info Kantor</h2>
                  <div className="space-y-2 text-sm">
                    {[
                      ['Alamat',         info.alamat_kantor],
                      ['Telepon',        info.telp_kantor],
                      ['Email',          info.email_kantor],
                      ['Jam Layanan',    info.jam_operasional],
                    ].map(([l, v]) => (
                      <div key={l} className="flex gap-3">
                        <span className="text-gray-400 w-24 shrink-0">{l}</span>
                        <span className="text-gray-700">{v || '-'}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <h2 className="font-bold text-gray-800 mb-2">📖 Sejarah Singkat</h2>
                  <p className="text-sm text-gray-600 leading-relaxed">{info.sejarah || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit mode */}
        {edit && (
          <form onSubmit={handleSave} className="space-y-5">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
              <h2 className="font-bold text-gray-800">Statistik Kelurahan</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  ['Jumlah Penduduk', 'jumlah_penduduk', 'number'],
                  ['Jumlah KK',       'jumlah_kk',       'number'],
                  ['Luas Wilayah',    'luas_wilayah',    'text'],
                  ['Kode Pos',        'kode_pos',        'text'],
                ].map(([label, key, type]) => (
                  <div key={key}>
                    <label className={labelCls}>{label}</label>
                    <input type={type} value={form[key] || ''} onChange={e => set(key, e.target.value)}
                      className={inputCls} />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
              <h2 className="font-bold text-gray-800">Visi, Misi & Sejarah</h2>
              <div>
                <label className={labelCls}>Visi</label>
                <input value={form.visi || ''} onChange={e => set('visi', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Misi</label>
                <textarea value={form.misi || ''} onChange={e => set('misi', e.target.value)}
                  rows={5} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Sejarah</label>
                <textarea value={form.sejarah || ''} onChange={e => set('sejarah', e.target.value)}
                  rows={4} className={inputCls} />
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
              <h2 className="font-bold text-gray-800">Info Kantor</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  ['Alamat Kantor',  'alamat_kantor',  'text'],
                  ['Telepon',        'telp_kantor',    'text'],
                  ['Email',          'email_kantor',   'email'],
                  ['Jam Operasional','jam_operasional','text'],
                ].map(([label, key, type]) => (
                  <div key={key}>
                    <label className={labelCls}>{label}</label>
                    <input type={type} value={form[key] || ''} onChange={e => set(key, e.target.value)}
                      className={inputCls} />
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
