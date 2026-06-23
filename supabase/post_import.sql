-- Jalankan hanya setelah memindahkan database MySQL lama dengan pgloader.
-- Kolom Laravel lama ini tidak dipakai SIPLA Go. Membuatnya nullable menjaga
-- endpoint register tetap dapat menambah masyarakat baru.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'masyarakat'
          AND column_name = 'email_verified_at'
    ) THEN
        ALTER TABLE public.masyarakat
            ALTER COLUMN email_verified_at DROP NOT NULL;
    END IF;
END
$$;
