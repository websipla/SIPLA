package config

import (
	"errors"
	"log"
	"os"
	"strings"
	"time"

	"pengaduan/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
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
	if err := autoMigrate(); err != nil {
		return err
	}

	log.Println("Database PostgreSQL connected and migrated successfully")
	return nil
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
		`ALTER TABLE regencies ADD CONSTRAINT fk_regencies_province
			FOREIGN KEY (province_id) REFERENCES provinces(id)
			ON UPDATE CASCADE ON DELETE RESTRICT`,
		`ALTER TABLE districts ADD CONSTRAINT fk_districts_regency
			FOREIGN KEY (regency_id) REFERENCES regencies(id)
			ON UPDATE CASCADE ON DELETE RESTRICT`,
		`ALTER TABLE villages ADD CONSTRAINT fk_villages_district
			FOREIGN KEY (district_id) REFERENCES districts(id)
			ON UPDATE CASCADE ON DELETE RESTRICT`,
		`ALTER TABLE pengaduan ADD CONSTRAINT fk_pengaduan_masyarakat
			FOREIGN KEY (nik) REFERENCES masyarakat(nik)
			ON UPDATE CASCADE ON DELETE CASCADE`,
		`ALTER TABLE tanggapan ADD CONSTRAINT fk_tanggapan_pengaduan
			FOREIGN KEY (id_pengaduan) REFERENCES pengaduan(id_pengaduan)
			ON UPDATE CASCADE ON DELETE CASCADE`,
		`ALTER TABLE tanggapan ADD CONSTRAINT fk_tanggapan_petugas
			FOREIGN KEY (id_petugas) REFERENCES petugas(id_petugas)
			ON UPDATE CASCADE ON DELETE CASCADE`,
		`ALTER TABLE permohonan ADD CONSTRAINT fk_permohonan_masyarakat
			FOREIGN KEY (nik) REFERENCES masyarakat(nik)
			ON UPDATE CASCADE ON DELETE CASCADE`,
		`ALTER TABLE permohonan ADD CONSTRAINT fk_permohonan_jenis_layanan
			FOREIGN KEY (id_jenis_layanan) REFERENCES jenis_layanan(id)
			ON UPDATE CASCADE ON DELETE RESTRICT`,
		`ALTER TABLE permohonan ADD CONSTRAINT fk_permohonan_petugas
			FOREIGN KEY (id_petugas) REFERENCES petugas(id_petugas)
			ON UPDATE CASCADE ON DELETE SET NULL`,
		`ALTER TABLE permintaan_reset_password ADD CONSTRAINT fk_reset_masyarakat
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
