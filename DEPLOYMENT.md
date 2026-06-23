# Deployment SIPLA

## 1. Siapkan Supabase PostgreSQL

1. Buat project di Supabase dan simpan database password dengan aman.
2. Buka project dashboard, klik **Connect**, lalu pilih connection string URI.
3. Untuk backend container/VM yang hidup lama, gunakan **Direct connection** bila host mendukung IPv6. Jika host hanya IPv4, gunakan **Session pooler** port `5432`.
4. Untuk platform serverless dengan koneksi singkat, gunakan **Transaction pooler** port `6543`. Backend sudah memakai `PreferSimpleProtocol`, sehingga prepared statement dimatikan dan kompatibel dengan transaction pooler.
5. Salin URI lengkap ke `DATABASE_URL` dan tambahkan `sslmode=require` jika belum ada.

Contoh:

```env
DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?sslmode=require
```

Ganti placeholder password dengan database password project. Jika password berisi karakter khusus, gunakan versi URL-encoded. Jangan commit URI atau password ke Git. Referensi resmi: [Supabase database connections](https://supabase.com/docs/guides/database/connecting-to-postgres).

### Import schema dan data hasil konversi

File hasil migrasi:

- `supabase/schema.sql`: schema PostgreSQL, primary key, foreign key, index, identity, dan kolom aplikasi terbaru.
- `supabase/seed.sql`: seluruh data dari `pengaduan_masyarakat3.sql`, termasuk data wilayah.

Untuk project Supabase baru:

1. Buka **SQL Editor** di dashboard Supabase.
2. Buat query baru, salin seluruh isi `supabase/schema.sql`, lalu klik **Run**.
3. Pastikan query schema selesai tanpa error.
4. Buat query baru, salin seluruh isi `supabase/seed.sql`, lalu klik **Run**. File ini sekitar 3,5 MB karena berisi data wilayah, sehingga prosesnya dapat memerlukan beberapa saat.
5. Jalankan query pemeriksaan berikut:

```sql
SELECT 'provinces' AS tabel, count(*) FROM provinces
UNION ALL SELECT 'regencies', count(*) FROM regencies
UNION ALL SELECT 'districts', count(*) FROM districts
UNION ALL SELECT 'villages', count(*) FROM villages
UNION ALL SELECT 'masyarakat', count(*) FROM masyarakat
UNION ALL SELECT 'pengaduan', count(*) FROM pengaduan;
```

Dump lama mengandung beberapa blok wilayah berulang. Generator membuang duplikat berdasarkan primary key. Hasil akhirnya: 34 provinsi, 514 kabupaten/kota, 7.215 kecamatan, 80.534 desa/kelurahan, 1 masyarakat, 2 petugas, 3 pengaduan, 1 permohonan, dan 2 tanggapan.

Jika SQL Editor kesulitan menangani `seed.sql`, gunakan `psql` dengan direct connection atau session pooler:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/schema.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/seed.sql
```

`seed.sql` melakukan `TRUNCATE ... CASCADE` sebelum insert. Jalankan hanya pada database target yang memang boleh diganti datanya.

Jika dump MySQL diperbarui, generate ulang data PostgreSQL dengan:

```bash
node supabase/convert_mysql_dump.mjs
```

## 2. Environment backend

Salin `backend/.env.example` menjadi `backend/.env`:

```env
DATABASE_URL=
JWT_SECRET=
PORT=8080
FRONTEND_URL=http://localhost:5173
AUTO_MIGRATE=false
APP_ENV=development
UPLOAD_DIR=./assets
```

- `DATABASE_URL` wajib. Aplikasi menolak start jika kosong.
- `JWT_SECRET` wajib. Gunakan nilai acak panjang, misalnya hasil `openssl rand -base64 48`.
- `PORT` opsional; default `8080`.
- `FRONTEND_URL` adalah origin frontend tanpa trailing slash. Beberapa origin dapat dipisahkan koma.
- `AUTO_MIGRATE=false` direkomendasikan setelah `schema.sql` diimpor. Set `true` hanya untuk development atau ketika sengaja meminta GORM menambah schema.
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
  -e AUTO_MIGRATE=false \
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
- `AUTO_MIGRATE=false` setelah schema production selesai diimpor.
- `APP_ENV=production`.
- `FRONTEND_URL` cocok persis dengan origin frontend.
- `VITE_API_URL` menunjuk ke backend dan berakhir `/api`.
- Persistent disk terpasang untuk `UPLOAD_DIR`, atau upload sudah dipindahkan ke Supabase Storage.
- Endpoint backend `/health` mengembalikan HTTP 200.
- Login masyarakat, admin, dan petugas diuji kembali setelah migrasi data.
