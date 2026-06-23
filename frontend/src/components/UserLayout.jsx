import { useAuth } from '../context/AuthContext'
import { useNavigate, Link, useLocation } from 'react-router-dom'

export default function UserLayout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const handleLogout = () => { logout(); navigate('/login') }
  const navItems = [
    { path: '/user/aspirasi', label: '📢 Aspirasi Saya' },
    { path: '/user/permohonan', label: '📋 Permohonan Layanan' },
  ]
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm sticky top-0 z-10 border-b">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏛️</span>
              <div>
                <p className="text-blue-600 font-bold text-sm leading-none">SIPLA</p>
                <p className="text-gray-400 text-xs">Serua Indah</p>
              </div>
            </div>
            <div className="hidden md:flex gap-4">
              {navItems.map(n => (
                <Link key={n.path} to={n.path}
                  className={`text-sm font-medium transition pb-1 ${
                    location.pathname === n.path
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}>
                  {n.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 hidden md:block">👤 {user?.name || user?.username}</span>
            <button onClick={handleLogout} className="text-sm text-red-500 hover:text-red-700 transition">Keluar</button>
          </div>
        </div>
        <div className="md:hidden flex gap-4 px-4 pb-2">
          {navItems.map(n => (
            <Link key={n.path} to={n.path}
              className={`text-xs font-medium transition ${
                  location.pathname === n.path
                    ? 'text-blue-600'
                    : 'text-gray-500'
                }`}>
              {n.label}
            </Link>
          ))}
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
