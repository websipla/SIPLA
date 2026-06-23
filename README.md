# SIPLA

Sistem Informasi Pelayanan dan Aspirasi masyarakat.

## Tech stack

- Backend: Go 1.21, Gin, GORM, JWT
- Database: Supabase PostgreSQL
- Frontend: React 18, Vite, Tailwind CSS

## Menjalankan lokal

Backend:

```bash
cd backend
cp .env.example .env
# Isi DATABASE_URL dan JWT_SECRET
go mod tidy
go run .
```

Frontend:

```bash
cd frontend
cp .env.example .env
npm ci
npm run dev
```

- Backend: `http://localhost:8080`
- Frontend: `http://localhost:5173`
- Health check: `http://localhost:8080/health`

Konfigurasi Supabase, migrasi data MySQL lama, environment production, Docker, dan panduan deployment lengkap tersedia di [DEPLOYMENT.md](DEPLOYMENT.md).

## Environment utama

Backend:

```env
DATABASE_URL=
JWT_SECRET=
PORT=8080
FRONTEND_URL=http://localhost:5173
```

Frontend:

```env
VITE_API_URL=http://localhost:8080/api
```

`DATABASE_URL` dan `JWT_SECRET` wajib; backend akan menolak start jika salah satunya kosong.
