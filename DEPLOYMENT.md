# Deployment SIPLA

## 1. Siapkan Supabase PostgreSQL

1. Buat project di Supabase dan simpan database password dengan aman.
2. Buka project dashboard, lalu klik **Connect**.
3. Untuk backend container/VM yang hidup lama, gunakan **Direct connection** bila host mendukung IPv6. Jika host hanya IPv4, gunakan **Session pooler** port `5432`.
4. Untuk platform serverless dengan koneksi singkat, gunakan **Transaction pooler** port `6543`. Backend sudah memakai `PreferSimpleProtocol`, sehingga prepared statement dimatikan dan kompatibel dengan transaction pooler.
5. Salin URI lengkap ke `DATABASE_URL` dan tambahkan `sslmode=require` jika belum ada.

Contoh:

```env
DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?sslmode=require
```

Jangan commit URI atau password ke Git. Referensi resmi: [Supabase database connections](https://supabase.com/docs/guides/database/connecting-to-postgres).

Saat backend pertama kali berjalan, GORM `AutoMigrate` membuat atau menambahkan tabel/kolom aplikasi. `AutoMigrate` tidak menghapus kolom lama.

### Memindahkan data MySQL lama

Jika hanya membutuhkan instalasi baru, jalankan backend terhadap database Supabase kosong dan biarkan `AutoMigrate` membuat skema.

Jika data MySQL lama harus dipertahankan, gunakan `pgloader` ke **Session pooler** Supabase, bukan transaction pooler:

```bash
pgloader \
  mysql://MYSQL_USER:MYSQL_PASSWORD@MYSQL_HOST:3306/pengaduan_masyarakat3 \
  postgresql://postgres.PROJECT_REF:SUPABASE_PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres?sslmode=require
```

Setelah import selesai:

1. Jalankan `supabase/post_import.sql` di Supabase SQL Editor agar kolom Laravel lama tidak memblokir registrasi pengguna baru.
2. Jalankan backend sekali agar `AutoMigrate` menambahkan kolom dan constraint terbaru.
3. Periksa data enum MySQL yang dikonversi. Model aplikasi sekarang menyimpan status dan role sebagai `varchar`, sehingga status workflow baru tetap dapat dipakai.

Panduan resmi: [Migrate from MySQL to Supabase](https://supabase.com/docs/guides/platform/migrating-to-supabase/mysql) dan [Import data with pgloader](https://supabase.com/docs/guides/database/import-data).

## 2. Environment backend

Salin `backend/.env.example` menjadi `backend/.env`:

```env
DATABASE_URL=
JWT_SECRET=
PORT=8080
FRONTEND_URL=http://localhost:5173
APP_ENV=development
UPLOAD_DIR=./assets
```

- `DATABASE_URL` wajib. Aplikasi menolak start jika kosong.
- `JWT_SECRET` wajib. Gunakan nilai acak panjang, misalnya hasil `openssl rand -base64 48`.
- `PORT` opsional; default `8080`.
- `FRONTEND_URL` adalah origin frontend tanpa trailing slash. Beberapa origin dapat dipisahkan koma.
- `APP_ENV=production` menonaktifkan origin localhost pada CORS.
- `UPLOAD_DIR` opsional; default `./assets`.

## 3. Jalankan lokal

Backend:

```bash
cd backend
cp .env.example .env
go mod download
go run .
```

Health check tersedia di `http://localhost:8080/health`.

Frontend:

```bash
cd frontend
cp .env.example .env
npm ci
npm run dev
```

Untuk build production:

```bash
VITE_API_URL=https://api.example.com/api npm run build
```

`VITE_API_URL` harus berakhir dengan `/api`. Nilai ini ditanam saat proses build Vite, bukan saat container sudah berjalan.

## 4. Deploy backend

Build dari direktori `backend`:

```bash
docker build -t sipla-api .
docker run --rm -p 8080:8080 \
  -e DATABASE_URL='...' \
  -e JWT_SECRET='...' \
  -e PORT=8080 \
  -e FRONTEND_URL='https://app.example.com' \
  -e APP_ENV=production \
  -v sipla-assets:/app/assets \
  sipla-api
```

Start command tanpa Docker:

```bash
go build -o sipla-api .
./sipla-api
```

Mount persistent disk ke `/app/assets` atau arahkan `UPLOAD_DIR` ke persistent disk milik provider. Filesystem ephemeral akan menghapus upload saat redeploy.

> TODO production: pindahkan penyimpanan file ke Supabase Storage. Struktur upload lokal saat ini sudah membatasi MIME/ukuran dan memakai nama acak, tetapi masih memerlukan persistent disk.

## 5. Deploy frontend

Build Docker dari direktori `frontend`:

```bash
docker build \
  --build-arg VITE_API_URL=https://api.example.com/api \
  -t sipla-web .
docker run --rm -p 8081:80 sipla-web
```

Untuk Vercel, Netlify, atau static hosting:

- Root directory: `frontend`
- Install command: `npm ci`
- Build command: `npm run build`
- Output directory: `dist`
- Environment build: `VITE_API_URL=https://api.example.com/api`
- Tambahkan SPA rewrite dari semua route ke `/index.html`.

Setelah URL frontend final tersedia, isi URL tersebut ke `FRONTEND_URL` backend dan redeploy backend.

## 6. Checklist production

- `DATABASE_URL` Supabase terisi dan tidak tersimpan di Git.
- `JWT_SECRET` acak dan berbeda dari development.
- `APP_ENV=production`.
- `FRONTEND_URL` cocok persis dengan origin frontend.
- `VITE_API_URL` menunjuk ke backend dan berakhir `/api`.
- Persistent disk terpasang untuk `UPLOAD_DIR`, atau upload sudah dipindahkan ke Supabase Storage.
- Endpoint backend `/health` mengembalikan HTTP 200.
- Login masyarakat, admin, dan petugas diuji kembali setelah migrasi data.
