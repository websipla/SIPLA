import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import AdminDashboard from './pages/admin/Dashboard'
import AdminAspirasi from './pages/admin/Aspirasi'
import AdminPermohonan from './pages/admin/Permohonan'
import AdminMasyarakat from './pages/admin/Masyarakat'
import UserAspirasi from './pages/user/Aspirasi'
import UserPermohonan from './pages/user/Permohonan'

function ProtectedRoute({ children, allowedRoles }) {
  const { user, role, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mx-auto" />
        <p className="text-gray-500 text-sm mt-3">Memuat...</p>
      </div>
    </div>
  )
  if (!user) return <Navigate to="/login" />
  if (allowedRoles && !allowedRoles.includes(role)) return <Navigate to="/login" />
  return children
}

function AppRoutes() {
  const { user, role } = useAuth()
  return (
    <Routes>
      {/* Landing page — selalu bisa diakses */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Admin routes */}
      <Route path="/admin/dashboard" element={
        <ProtectedRoute allowedRoles={['admin','petugas']}><AdminDashboard /></ProtectedRoute>
      } />
      <Route path="/admin/aspirasi" element={
        <ProtectedRoute allowedRoles={['admin','petugas']}><AdminAspirasi /></ProtectedRoute>
      } />
      <Route path="/admin/permohonan" element={
        <ProtectedRoute allowedRoles={['admin','petugas']}><AdminPermohonan /></ProtectedRoute>
      } />
      <Route path="/admin/masyarakat" element={
        <ProtectedRoute allowedRoles={['admin','petugas']}><AdminMasyarakat /></ProtectedRoute>
      } />

      {/* User routes */}
      <Route path="/user/aspirasi" element={
        <ProtectedRoute allowedRoles={['masyarakat']}><UserAspirasi /></ProtectedRoute>
      } />
      <Route path="/user/permohonan" element={
        <ProtectedRoute allowedRoles={['masyarakat']}><UserPermohonan /></ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
