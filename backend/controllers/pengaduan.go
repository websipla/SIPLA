package controllers

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"pengaduan/config"
	"pengaduan/models"
)

func GetPengaduan(c *gin.Context) {
	role, _ := c.Get("role")
	userID, _ := c.Get("user_id")
	var list []models.Pengaduan
	query := config.DB.Preload("Masyarakat").Preload("Tanggapan.Petugas").Order("created_at DESC")
	if role == "masyarakat" {
		query = query.Where("nik = ?", userID)
	}
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}
	if err := query.Find(&list).Error; err != nil {
		respondDBError(c, "aspirasi_list", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": list})
}

func GetPengaduanByID(c *gin.Context) {
	id := c.Param("id")
	var p models.Pengaduan
	if err := config.DB.Preload("Masyarakat").Preload("Tanggapan.Petugas").First(&p, id).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			respondDBError(c, "aspirasi_detail", err)
			return
		}
		c.JSON(http.StatusNotFound, gin.H{"error": "Aspirasi tidak ditemukan"})
		return
	}
	role, _ := c.Get("role")
	userID, _ := c.Get("user_id")
	if role == "masyarakat" && p.NIK != userID.(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Akses ditolak"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": p})
}

func CreatePengaduan(c *gin.Context) {
	userID, _ := c.Get("user_id")
	tipeAspirasi := c.PostForm("tipe_aspirasi") // ← BARU
	judul := c.PostForm("judul_laporan")
	isi := c.PostForm("isi_laporan")
	tglKejadian := c.PostForm("tgl_kejadian")
	lokasi := c.PostForm("lokasi_kejadian")
	latStr := c.PostForm("latitude")
	lngStr := c.PostForm("longitude")

	tipeAspirasi = trim(tipeAspirasi)
	judul = trim(judul)
	isi = trim(isi)
	lokasi = trim(lokasi)
	if tipeAspirasi == "" || judul == "" || isi == "" || tglKejadian == "" || lokasi == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tipe aspirasi, judul, isi, tanggal, dan lokasi wajib diisi"})
		return
	}
	tgl, err := time.Parse("2006-01-02", tglKejadian)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format tanggal tidak valid"})
		return
	}

	now := time.Now()
	p := models.Pengaduan{
		TglPengaduan:   now,
		NIK:            userID.(string),
		TipeAspirasi:   tipeAspirasi, // ← BARU
		JudulLaporan:   judul,
		IsiLaporan:     isi,
		TglKejadian:    tgl,
		LokasiKejadian: lokasi,
		Foto:           "",
		Status:         "verifikasi_lapangan",
		CreatedAt:      &now,
		UpdatedAt:      &now,
	}

	if latStr != "" {
		lat, err := strconv.ParseFloat(latStr, 64)
		if err != nil || lat < -90 || lat > 90 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Latitude tidak valid"})
			return
		}
		p.Latitude = &lat
	}
	if lngStr != "" {
		lng, err := strconv.ParseFloat(lngStr, 64)
		if err != nil || lng < -180 || lng > 180 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Longitude tidak valid"})
			return
		}
		p.Longitude = &lng
	}

	fotoPath, err := saveOptionalImage(c, "foto", "pengaduan")
	if err != nil {
		respondUploadError(c, "foto", err)
		return
	}
	p.Foto = fotoPath

	if err := config.DB.Create(&p).Error; err != nil {
		respondDBError(c, "aspirasi_create", err)
		return
	}
	logAction(c, "aspirasi_create_success", "id", p.IDPengaduan, "status", p.Status, "tipe", p.TipeAspirasi)
	c.JSON(http.StatusCreated, gin.H{"message": "Aspirasi berhasil disampaikan", "data": p})
}

func UpdatePengaduan(c *gin.Context) {
	id := c.Param("id")
	role, _ := c.Get("role")
	userID, _ := c.Get("user_id")
	var p models.Pengaduan
	if err := config.DB.First(&p, id).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			respondDBError(c, "aspirasi_update_lookup", err)
			return
		}
		c.JSON(http.StatusNotFound, gin.H{"error": "Aspirasi tidak ditemukan"})
		return
	}
	if role == "masyarakat" {
		if p.NIK != userID.(string) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Akses ditolak"})
			return
		}
		if p.Status != "verifikasi_lapangan" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Aspirasi yang sudah diproses tidak dapat diubah"})
			return
		}
		var req struct {
			JudulLaporan   string `json:"judul_laporan"`
			IsiLaporan     string `json:"isi_laporan"`
			LokasiKejadian string `json:"lokasi_kejadian"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Data perubahan aspirasi tidak valid"})
			return
		}
		req.JudulLaporan = trim(req.JudulLaporan)
		req.IsiLaporan = trim(req.IsiLaporan)
		req.LokasiKejadian = trim(req.LokasiKejadian)
		if req.JudulLaporan == "" || req.IsiLaporan == "" || req.LokasiKejadian == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Judul, isi, dan lokasi tidak boleh kosong"})
			return
		}
		p.JudulLaporan = req.JudulLaporan
		p.IsiLaporan = req.IsiLaporan
		p.LokasiKejadian = req.LokasiKejadian
	} else {
		var req struct {
			Status string `json:"status"`
		}
		if err := c.ShouldBindJSON(&req); err != nil || !validAspirasiStatus(req.Status) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Status aspirasi tidak valid"})
			return
		}
		p.Status = req.Status
	}
	now := time.Now()
	p.UpdatedAt = &now
	if err := config.DB.Save(&p).Error; err != nil {
		respondDBError(c, "aspirasi_update", err)
		return
	}
	logAction(c, "aspirasi_update_success", "id", p.IDPengaduan, "status", p.Status)
	c.JSON(http.StatusOK, gin.H{"message": "Berhasil diperbarui", "data": p})
}

func DeletePengaduan(c *gin.Context) {
	id := c.Param("id")
	role, _ := c.Get("role")
	userID, _ := c.Get("user_id")
	var p models.Pengaduan
	if err := config.DB.First(&p, id).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			respondDBError(c, "aspirasi_delete_lookup", err)
			return
		}
		c.JSON(http.StatusNotFound, gin.H{"error": "Aspirasi tidak ditemukan"})
		return
	}
	if role == "masyarakat" && p.NIK != userID.(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Akses ditolak"})
		return
	}
	if role == "masyarakat" && p.Status != "verifikasi_lapangan" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Aspirasi yang sudah diproses tidak dapat dihapus"})
		return
	}
	if err := config.DB.Delete(&p).Error; err != nil {
		respondDBError(c, "aspirasi_delete", err)
		return
	}
	logAction(c, "aspirasi_delete_success", "id", p.IDPengaduan)
	c.JSON(http.StatusOK, gin.H{"message": "Aspirasi berhasil dihapus"})
}

func GetDashboard(c *gin.Context) {
	var totalAspirasi, menunggu, proses, selesai int64
	queries := []struct {
		name string
		tx   *gorm.DB
	}{
		{"total_aspirasi", config.DB.Model(&models.Pengaduan{}).Count(&totalAspirasi)},
		{"aspirasi_menunggu", config.DB.Model(&models.Pengaduan{}).Where("status NOT IN ('selesai','ditolak')").Count(&menunggu)},
		{"aspirasi_proses", config.DB.Model(&models.Pengaduan{}).Where("status = 'proses_penyelesaian'").Count(&proses)},
		{"aspirasi_selesai", config.DB.Model(&models.Pengaduan{}).Where("status = 'selesai'").Count(&selesai)},
	}

	var totalPermohonan, permMenunggu, permProses, permSelesai int64
	queries = append(queries,
		struct {
			name string
			tx   *gorm.DB
		}{"total_permohonan", config.DB.Model(&models.Permohonan{}).Count(&totalPermohonan)},
		struct {
			name string
			tx   *gorm.DB
		}{"permohonan_menunggu", config.DB.Model(&models.Permohonan{}).Where("status NOT IN ('selesai','ditolak')").Count(&permMenunggu)},
		struct {
			name string
			tx   *gorm.DB
		}{"permohonan_proses", config.DB.Model(&models.Permohonan{}).Where("status = 'penandatanganan'").Count(&permProses)},
		struct {
			name string
			tx   *gorm.DB
		}{"permohonan_selesai", config.DB.Model(&models.Permohonan{}).Where("status = 'selesai'").Count(&permSelesai)},
	)

	var totalMasyarakat int64
	queries = append(queries, struct {
		name string
		tx   *gorm.DB
	}{"total_masyarakat", config.DB.Model(&models.Masyarakat{}).Count(&totalMasyarakat)})
	for _, query := range queries {
		if query.tx.Error != nil {
			respondDBError(c, "dashboard_"+query.name, query.tx.Error)
			return
		}
	}

	var recentAspirasi []models.Pengaduan
	if err := config.DB.Preload("Masyarakat").Order("created_at DESC").Limit(5).Find(&recentAspirasi).Error; err != nil {
		respondDBError(c, "dashboard_recent_aspirasi", err)
		return
	}

	var recentPermohonan []models.Permohonan
	if err := config.DB.Preload("Masyarakat").Preload("JenisLayanan").Order("created_at DESC").Limit(5).Find(&recentPermohonan).Error; err != nil {
		respondDBError(c, "dashboard_recent_permohonan", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"total_aspirasi":    totalAspirasi,
		"menunggu":          menunggu,
		"proses":            proses,
		"selesai":           selesai,
		"total_permohonan":  totalPermohonan,
		"perm_menunggu":     permMenunggu,
		"perm_proses":       permProses,
		"perm_selesai":      permSelesai,
		"total_masyarakat":  totalMasyarakat,
		"recent_aspirasi":   recentAspirasi,
		"recent_permohonan": recentPermohonan,
	})
}
