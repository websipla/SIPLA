package controllers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"pengaduan/config"
	"pengaduan/models"
)

func Health(c *gin.Context) {
	sqlDB, err := config.DB.DB()
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"status": "error", "database": "unavailable"})
		return
	}

	ctx, cancel := timeoutContext(c, 3*time.Second)
	defer cancel()
	if err := sqlDB.PingContext(ctx); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"status": "error", "database": "unavailable"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok", "database": "connected"})
}

func DebugCounts(c *gin.Context) {
	counts := map[string]int64{}
	tables := []struct {
		name  string
		model any
	}{
		{"masyarakat", &models.Masyarakat{}},
		{"petugas", &models.Petugas{}},
		{"aspirasi", &models.Pengaduan{}},
		{"tanggapan", &models.Tanggapan{}},
		{"permohonan", &models.Permohonan{}},
		{"jenis_layanan", &models.JenisLayanan{}},
	}

	for _, table := range tables {
		var count int64
		if err := config.DB.Model(table.model).Count(&count).Error; err != nil {
			respondDBError(c, "debug_count_"+table.name, err)
			return
		}
		counts[table.name] = count
	}
	c.JSON(http.StatusOK, gin.H{"data": counts})
}
