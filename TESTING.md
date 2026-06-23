# Checklist Testing SIPLA

## Persiapan

1. Untuk database dummy baru, jalankan `supabase/supabase_dummy.sql` di Supabase SQL Editor.
2. Untuk database yang sudah berisi data, jalankan `supabase/repair_schema.sql`.
3. Pastikan Railway/backend memiliki:

```env
DATABASE_URL=postgresql://...
JWT_SECRET=...
FRONTEND_URL=https://frontend.example.com
APP_ENV=production
AUTO_MIGRATE=false
UPLOAD_DIR=/app/assets
```

4. Pastikan Vercel/frontend memiliki:

```env
VITE_API_URL=https://backend.example.com/api
```

5. Pastikan Railway Volume di-mount ke `/app/assets` jika file masih disimpan lokal.

## Akun dummy

Semua password: `password123`

| Role | Username | Pilihan login |
|---|---|---|
| Admin | `admin` | Petugas / Admin |
| Petugas | `petugas1` | Petugas / Admin |
| Petugas | `petugas2` | Petugas / Admin |
| Masyarakat | `warga1` sampai `warga5` | Masyarakat |

## Health dan database

- [ ] `GET /health` menghasilkan HTTP 200.
- [ ] `GET /api/health` menghasilkan `database: connected`.
- [ ] Login admin, lalu `GET /api/debug/counts` menampilkan jumlah setiap tabel.
- [ ] Log backend tidak menampilkan password atau token mentah.
- [ ] Saat query database gagal, log Railway menampilkan `database_error operation=...`.

Contoh:

```bash
curl https://BACKEND/health
curl https://BACKEND/api/health
```

## Login semua role

- [ ] Login `admin/password123` sebagai Petugas/Admin.
- [ ] Login `petugas1/password123` sebagai Petugas/Admin.
- [ ] Login `warga1/password123` sebagai Masyarakat.
- [ ] Password salah menampilkan pesan yang jelas.
- [ ] Memilih role yang salah tidak membuat login berhasil.
- [ ] Refresh halaman setelah login tetap memuat profil dari `/api/auth/me`.

## Register masyarakat

- [ ] Dropdown provinsi terisi.
- [ ] Kabupaten hanya sesuai provinsi.
- [ ] Kecamatan hanya sesuai kabupaten.
- [ ] Kelurahan hanya sesuai kecamatan.
- [ ] NIK bukan 16 digit ditolak.
- [ ] Email tidak valid ditolak.
- [ ] Username/email/NIK duplikat menghasilkan HTTP 409.
- [ ] Registrasi valid menghasilkan notifikasi sukses.
- [ ] Akun baru dapat langsung login.
- [ ] Baris baru terlihat pada tabel `masyarakat`.

## Aspirasi/pengaduan

- [ ] Login sebagai `warga1`.
- [ ] Tambah aspirasi tanpa field wajib ditolak.
- [ ] Tambah aspirasi valid tanpa foto berhasil.
- [ ] Tambah aspirasi dengan JPG/PNG maksimal 5 MB berhasil.
- [ ] File PDF/EXE sebagai foto ditolak.
- [ ] Data baru tampil setelah submit tanpa refresh manual.
- [ ] Status awal adalah `verifikasi_lapangan`.
- [ ] Warga lain tidak dapat membuka/menghapus aspirasi tersebut.
- [ ] Aspirasi yang sudah diproses tidak dapat dihapus masyarakat.

## Tanggapan dan status aspirasi

- [ ] Login sebagai admin atau petugas.
- [ ] Detail aspirasi dapat dibuka.
- [ ] Tanggapan kosong ditolak.
- [ ] Tanggapan valid tersimpan.
- [ ] Lampiran JPG/PNG/PDF maksimal 10 MB tersimpan.
- [ ] Status aspirasi berubah bersama tanggapan.
- [ ] Jika update status gagal, tanggapan juga tidak tersimpan karena transaksi.
- [ ] Masyarakat dapat melihat tanggapan dan nama petugas.

## Permohonan layanan

- [ ] Dropdown jenis layanan menampilkan layanan aktif.
- [ ] KTP, KK, dan surat RT/RW wajib.
- [ ] Foto rumah wajib untuk Surat Keterangan Tidak Mampu.
- [ ] ID jenis layanan tidak valid ditolak.
- [ ] Submit valid menghasilkan status `verifikasi_persyaratan`.
- [ ] Dokumen tersimpan dan dapat dibuka.
- [ ] Warga lain tidak dapat membuka/menghapus permohonan.
- [ ] Admin/petugas dapat mengubah setiap status workflow.
- [ ] Status `selesai` atau `ditolak` mengisi `tgl_selesai`.
- [ ] Upload file hasil dapat diunduh masyarakat.

## Jenis layanan

- [ ] `GET /api/jenis-layanan` hanya menampilkan layanan aktif.
- [ ] Admin dapat `POST /api/jenis-layanan`.
- [ ] Admin dapat `PUT /api/jenis-layanan/:id`.
- [ ] Petugas biasa tidak dapat membuat/mengubah jenis layanan.
- [ ] Nama kosong dan estimasi negatif ditolak.

## Kelurahan dan wilayah

- [ ] Data profil kelurahan dapat dimuat.
- [ ] Admin/petugas dapat memperbarui statistik dan profil.
- [ ] Nilai statistik negatif ditolak.
- [ ] Pesan sukses tampil setelah penyimpanan.
- [ ] Error backend tampil di UI jika penyimpanan gagal.

## Dashboard

- [ ] Total masyarakat sesuai `SELECT COUNT(*) FROM masyarakat`.
- [ ] Total aspirasi sesuai `SELECT COUNT(*) FROM pengaduan`.
- [ ] Total permohonan sesuai `SELECT COUNT(*) FROM permohonan`.
- [ ] Jumlah selesai sesuai filter status.
- [ ] Lima data terbaru tampil berdasarkan `created_at DESC`.
- [ ] Marker hanya tampil untuk aspirasi aktif dengan latitude/longitude.

## Pemeriksaan SQL

```sql
SELECT COUNT(*) FROM masyarakat;
SELECT COUNT(*) FROM petugas;
SELECT COUNT(*) FROM jenis_layanan WHERE is_active = TRUE;
SELECT status, COUNT(*) FROM pengaduan GROUP BY status ORDER BY status;
SELECT status, COUNT(*) FROM permohonan GROUP BY status ORDER BY status;

SELECT p.id, p.nik, p.id_jenis_layanan
FROM permohonan p
LEFT JOIN masyarakat m ON m.nik = p.nik
LEFT JOIN jenis_layanan j ON j.id = p.id_jenis_layanan
WHERE m.nik IS NULL OR j.id IS NULL;

SELECT t.id_tanggapan
FROM tanggapan t
LEFT JOIN pengaduan p ON p.id_pengaduan = t.id_pengaduan
LEFT JOIN petugas pt ON pt.id_petugas = t.id_petugas
WHERE p.id_pengaduan IS NULL OR pt.id_petugas IS NULL;
```

Kedua query relasi terakhir harus menghasilkan nol baris.

## Automated checks

Backend:

```bash
cd backend
go mod tidy
go test ./...
go vet ./...
go build ./...
```

Frontend:

```bash
cd frontend
npm ci
npm audit
npm run build
```

Smoke test API deployment:

```powershell
.\scripts\smoke-api.ps1 -BaseUrl "https://BACKEND" -RunWriteTests
```
