import axios from 'axios'

const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '')
const API_ORIGIN = API_URL.replace(/\/api$/, '')

export const getAssetUrl = (path) => {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  return `${API_ORIGIN}/${path.replace(/^\/+/, '')}`
}

export const getApiError = (error, fallback = 'Permintaan gagal diproses') =>
  error?.response?.data?.error ||
  error?.response?.data?.message ||
  (error?.request ? 'Server tidak dapat dihubungi. Periksa koneksi dan URL API.' : error?.message) ||
  fallback

const api = axios.create({ baseURL: API_URL })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const hasToken = Boolean(localStorage.getItem('token'))
    const isLoginRequest = err.config?.url?.includes('/auth/login')
    if (err.response?.status === 401 && hasToken && !isLoginRequest) {
      localStorage.clear()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
