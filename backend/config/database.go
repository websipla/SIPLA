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
	}), &gorm.Config{})
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
	// Urutan model menjaga tabel referensi dibuat sebelum tabel yang bergantung padanya.
	return DB.AutoMigrate(
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
	)
}
