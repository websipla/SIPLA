-- Jalankan sekali di Supabase SQL Editor untuk database SIPLA yang sudah ada.
-- Script aman untuk data status workflow SIPLA saat ini dan tidak menghapus data.

BEGIN;

ALTER TABLE pengaduan
    ALTER COLUMN status SET DEFAULT 'verifikasi_lapangan',
    ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE permohonan
    ALTER COLUMN status SET DEFAULT 'verifikasi_persyaratan',
    ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE masyarakat
    ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE petugas
    ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE jenis_layanan
    ALTER COLUMN is_active SET DEFAULT TRUE,
    ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE kelurahan_info
    ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE tanggapan
    ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE permintaan_reset_password
    ALTER COLUMN status SET DEFAULT 'menunggu',
    ALTER COLUMN dibaca SET DEFAULT FALSE,
    ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pengaduan_status_check') THEN
        ALTER TABLE pengaduan ADD CONSTRAINT pengaduan_status_check CHECK (
            status IN ('verifikasi_lapangan', 'koordinasi', 'proses_penyelesaian', 'selesai', 'ditolak')
        ) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'permohonan_status_check') THEN
        ALTER TABLE permohonan ADD CONSTRAINT permohonan_status_check CHECK (
            status IN ('verifikasi_persyaratan', 'pembuatan_draft', 'penandatanganan', 'register_dokumen', 'selesai', 'ditolak')
        ) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'permintaan_reset_password_status_check') THEN
        ALTER TABLE permintaan_reset_password ADD CONSTRAINT permintaan_reset_password_status_check
            CHECK (status IN ('menunggu', 'selesai')) NOT VALID;
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS pengaduan_status_index ON pengaduan(status);
CREATE INDEX IF NOT EXISTS permohonan_status_index ON permohonan(status);
CREATE INDEX IF NOT EXISTS permintaan_reset_password_status_dibaca_index
    ON permintaan_reset_password(status, dibaca);

COMMIT;

-- Diagnostik setelah repair:
SELECT
    (SELECT COUNT(*) FROM masyarakat) AS masyarakat,
    (SELECT COUNT(*) FROM petugas) AS petugas,
    (SELECT COUNT(*) FROM jenis_layanan WHERE is_active = TRUE) AS layanan_aktif,
    (SELECT COUNT(*) FROM pengaduan) AS aspirasi,
    (SELECT COUNT(*) FROM tanggapan) AS tanggapan,
    (SELECT COUNT(*) FROM permohonan) AS permohonan;
