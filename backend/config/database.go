package config

import (
	"errors"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"pengaduan/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func ValidateRequiredEnv() error {
	var missing []string
	for _, key := range []string{"DATABASE_URL", "JWT_SECRET"} {
		if strings.TrimSpace(os.Getenv(key)) == "" {
			missing = append(missing, key)
		}
	}
	if len(missing) > 0 {
		return errors.New("environment variable wajib belum diisi: " + strings.Join(missing, ", "))
	}
	return nil
}

func InitDB() error {
	databaseURL := strings.TrimSpace(os.Getenv("DATABASE_URL"))

	db, err := gorm.Open(postgres.New(postgres.Config{
		DSN:                  databaseURL,
		PreferSimpleProtocol: true,
	}), &gorm.Config{
		// Relasi dibuat eksplisit setelah seluruh tabel tersedia. Ini mencegah
		// GORM membuat foreign key terbalik ketika model parent dimigrasikan dulu.
		DisableForeignKeyConstraintWhenMigrating: true,
		Logger:                                   logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		return err
	}

	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	sqlDB.SetMaxIdleConns(5)
	sqlDB.SetMaxOpenConns(10)
	sqlDB.SetConnMaxIdleTime(5 * time.Minute)
	sqlDB.SetConnMaxLifetime(30 * time.Minute)

	DB = db
	if autoMigrateEnabled() {
		if err := autoMigrate(); err != nil {
			return err
		}
		log.Println("Database PostgreSQL connected; AutoMigrate completed")
	} else {
		log.Println("Database PostgreSQL connected; AutoMigrate disabled")
	}
	if err := validateSchema(); err != nil {
		return err
	}

	return nil
}

func validateSchema() error {
	required := []struct {
		model   any
		table   string
		columns []string
	}{
		{&models.Province{}, "provinces", []string{"id", "name"}},
		{&models.Regency{}, "regencies", []string{"id", "province_id", "name"}},
		{&models.District{}, "districts", []string{"id", "regency_id", "name"}},
		{&models.Village{}, "villages", []string{"id", "district_id", "name"}},
		{&models.Masyarakat{}, "masyarakat", []string{"nik", "name", "email", "username", "jenis_kelamin", "password", "telp", "province_id", "regency_id", "district_id", "village_id"}},
		{&models.Petugas{}, "petugas", []string{"id_petugas", "nama_petugas", "username", "password", "roles"}},
		{&models.JenisLayanan{}, "jenis_layanan", []string{"id", "nama_layanan", "estimasi_hari", "is_active"}},
		{&models.KelurahanInfo{}, "kelurahan_info", []string{"id", "nama", "jumlah_penduduk", "jumlah_kk"}},
		{&models.Pengaduan{}, "pengaduan", []string{"id_pengaduan", "nik", "tipe_aspirasi", "judul_laporan", "isi_laporan", "tgl_kejadian", "lokasi_kejadian", "status"}},
		{&models.Tanggapan{}, "tanggapan", []string{"id_tanggapan", "id_pengaduan", "tanggapan", "id_petugas"}},
		{&models.Permohonan{}, "permohonan", []string{"id", "nik", "id_jenis_layanan", "file_ktp", "file_kk", "file_surat_rtrw", "file_foto_rumah", "status"}},
		{&models.PermintaanResetPassword{}, "permintaan_reset_password", []string{"id", "nik", "no_hp", "status", "dibaca"}},
	}

	var missing []string
	for _, item := range required {
		if !DB.Migrator().HasTable(item.model) {
			missing = append(missing, "table "+item.table)
			continue
		}
		for _, column := range item.columns {
			if !DB.Migrator().HasColumn(item.model, column) {
				missing = append(missing, item.table+"."+column)
			}
		}
	}
	if len(missing) > 0 {
		return fmt.Errorf("schema database tidak lengkap: %s; jalankan supabase/schema.sql atau supabase_dummy.sql", strings.Join(missing, ", "))
	}
	log.Println("Database schema validation passed")
	return nil
}

func autoMigrateEnabled() bool {
	value := strings.TrimSpace(strings.ToLower(os.Getenv("AUTO_MIGRATE")))
	return value == "true" || value == "1" || value == "yes"
}

func autoMigrate() error {
	if err := DB.AutoMigrate(
		&models.Province{},
		&models.Regency{},
		&models.District{},
		&models.Village{},
		&models.Masyarakat{},
		&models.Petugas{},
		&models.JenisLayanan{},
		&models.KelurahanInfo{},
		&models.Pengaduan{},
		&models.Tanggapan{},
		&models.Permohonan{},
		&models.PermintaanResetPassword{},
	); err != nil {
		return err
	}

	return createPostgresConstraints()
}

func createPostgresConstraints() error {
	constraints := []string{
		`ALTER TABLE regencies ADD CONSTRAINT regencies_province_id_foreign
			FOREIGN KEY (province_id) REFERENCES provinces(id)
			ON UPDATE CASCADE ON DELETE RESTRICT`,
		`ALTER TABLE districts ADD CONSTRAINT districts_regency_id_foreign
			FOREIGN KEY (regency_id) REFERENCES regencies(id)
			ON UPDATE CASCADE ON DELETE RESTRICT`,
		`ALTER TABLE villages ADD CONSTRAINT villages_district_id_foreign
			FOREIGN KEY (district_id) REFERENCES districts(id)
			ON UPDATE CASCADE ON DELETE RESTRICT`,
		`ALTER TABLE pengaduan ADD CONSTRAINT pengaduan_nik_foreign
			FOREIGN KEY (nik) REFERENCES masyarakat(nik)
			ON UPDATE CASCADE ON DELETE CASCADE`,
		`ALTER TABLE tanggapan ADD CONSTRAINT tanggapan_id_pengaduan_foreign
			FOREIGN KEY (id_pengaduan) REFERENCES pengaduan(id_pengaduan)
			ON UPDATE CASCADE ON DELETE CASCADE`,
		`ALTER TABLE tanggapan ADD CONSTRAINT tanggapan_id_petugas_foreign
			FOREIGN KEY (id_petugas) REFERENCES petugas(id_petugas)
			ON UPDATE CASCADE ON DELETE CASCADE`,
		`ALTER TABLE permohonan ADD CONSTRAINT permohonan_nik_foreign
			FOREIGN KEY (nik) REFERENCES masyarakat(nik)
			ON UPDATE CASCADE ON DELETE CASCADE`,
		`ALTER TABLE permohonan ADD CONSTRAINT permohonan_jenis_foreign
			FOREIGN KEY (id_jenis_layanan) REFERENCES jenis_layanan(id)
			ON UPDATE CASCADE ON DELETE RESTRICT`,
		`ALTER TABLE permohonan ADD CONSTRAINT permohonan_petugas_foreign
			FOREIGN KEY (id_petugas) REFERENCES petugas(id_petugas)
			ON UPDATE CASCADE ON DELETE SET NULL`,
		`ALTER TABLE permintaan_reset_password ADD CONSTRAINT permintaan_reset_password_nik_foreign
			FOREIGN KEY (nik) REFERENCES masyarakat(nik)
			ON UPDATE CASCADE ON DELETE CASCADE`,
	}

	for _, statement := range constraints {
		if err := DB.Exec(`
			DO $$
			BEGIN
				` + statement + `;
			EXCEPTION
				WHEN duplicate_object THEN NULL;
			END
			$$;
		`).Error; err != nil {
			return err
		}
	}
	return nil
}
