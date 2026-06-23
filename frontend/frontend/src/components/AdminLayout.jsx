import { useAuth } from '../context/AuthContext'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import api from '../services/api'

const ALL_NAV = [
  { path: '/admin/dashboard',  label: 'Dashboard',       icon: '📊', roles: ['admin','petugas'] },
  { path: '/admin/aspirasi',   label: 'Aspirasi',         icon: '📢', roles: ['admin','petugas'] },
  { path: '/admin/permohonan', label: 'Permohonan',       icon: '📄', roles: ['admin','petugas'] },
  { path: '/admin/masyarakat', label: 'Data Masyarakat',  icon: '👥', roles: ['admin','petugas'] },
  { path: '/admin/petugas',    label: 'Data Petugas',     icon: '🛡️', roles: ['admin'] },          // admin only
  { path: '/admin/kelurahan',  label: 'Info Kelurahan',   icon: '🏛️', roles: ['admin','petugas'] },
]

export default function AdminLayout({ children }) {
  const { user, role, logout } = useAuth()
  const navigate   = useNavigate()
  const location   = useLocation()
  const [notifCount, setNotifCount] = useState(0)

  // Filter menu sesuai role
  const navItems = ALL_NAV.filter(item => item.roles.includes(role))

  // Polling notifikasi lupa password setiap 30 detik
  useEffect(() => {
    const fetchCount = () => {
      api.get('/lupa-password/count')
        .then(r => setNotifCount(r.data.count || 0))
        .catch(() => {})
    }
    fetchCount()
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (location.pathname === '/admin/dashboard') setNotifCount(0)
  }, [location.pathname])

  return (
    <div className="flex h-screen bg-gray-50" style={{ fontFamily: "'Segoe UI', sans-serif" }}>

      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-emerald-800 to-teal-900 flex flex-col shadow-xl">
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-lg">🏛️</span>
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">SIPLA</p>
              <p className="text-emerald-300 text-xs">Serua Indah</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <Link key={item.path} to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                location.pathname === item.path
                  ? 'bg-white/20 text-white shadow'
                  : 'text-emerald-100/80 hover:bg-white/10 hover:text-white'
              }`}>
              <span>{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.path === '/admin/dashboard' && notifCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {notifCount > 99 ? '99+' : notifCount}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
              {user?.nama_petugas?.[0] || 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.nama_petugas}</p>
              <p className="text-xs text-emerald-300 capitalize">{user?.roles}</p>
            </div>
          </div>
          <button onClick={() => { logout(); navigate('/login') }}
            className="w-full text-left text-sm text-red-300 hover:text-red-200 px-3 py-2 rounded-xl hover:bg-white/10 transition">
            🚪 Keluar
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
