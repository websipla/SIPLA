package controllers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
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
	query.Find(&list)
	c.JSON(http.StatusOK, gin.H{"data": list})
}

func GetPengaduanByID(c *gin.Context) {
	id := c.Param("id")
	var p models.Pengaduan
	if err := config.DB.Preload("Masyarakat").Preload("Tanggapan.Petugas").First(&p, id).Error; err != nil {
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

	if judul == "" || isi == "" || tglKejadian == "" || lokasi == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Semua field wajib diisi"})
		return
	}
	tgl, err := time.Parse("2006-01-02", tglKejadian)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format tanggal tidak valid"})
		return
	}

	fotoPath, err := saveOptionalImage(c, "foto", "pengaduan")
	if err != nil {
		respondUploadError(c, "foto", err)
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
		Foto:           fotoPath,
		Status:         "verifikasi_lapangan",
		CreatedAt:      &now,
		UpdatedAt:      &now,
	}

	if lat, err := strconv.ParseFloat(latStr, 64); err == nil {
		p.Latitude = &lat
	}
	if lng, err := strconv.ParseFloat(lngStr, 64); err == nil {
		p.Longitude = &lng
	}

	if err := config.DB.Create(&p).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat aspirasi"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": "Aspirasi berhasil disampaikan", "data": p})
}

func UpdatePengaduan(c *gin.Context) {
	id := c.Param("id")
	role, _ := c.Get("role")
	userID, _ := c.Get("user_id")
	var p models.Pengaduan
	if err := config.DB.First(&p, id).Error; err != nil {
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
		c.ShouldBindJSON(&req)
		p.JudulLaporan = req.JudulLaporan
		p.IsiLaporan = req.IsiLaporan
		p.LokasiKejadian = req.LokasiKejadian
	} else {
		var req struct {
			Status string `json:"status"`
		}
		c.ShouldBindJSON(&req)
		p.Status = req.Status
	}
	now := time.Now()
	p.UpdatedAt = &now
	config.DB.Save(&p)
	c.JSON(http.StatusOK, gin.H{"message": "Berhasil diperbarui", "data": p})
}

func DeletePengaduan(c *gin.Context) {
	id := c.Param("id")
	role, _ := c.Get("role")
	userID, _ := c.Get("user_id")
	var p models.Pengaduan
	if err := config.DB.First(&p, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Aspirasi tidak ditemukan"})
		return
	}
	if role == "masyarakat" && p.NIK != userID.(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Akses ditolak"})
		return
	}
	config.DB.Delete(&p)
	c.JSON(http.StatusOK, gin.H{"message": "Aspirasi berhasil dihapus"})
}

func GetDashboard(c *gin.Context) {
	var totalAspirasi, menunggu, proses, selesai int64
	config.DB.Model(&models.Pengaduan{}).Count(&totalAspirasi)
	config.DB.Model(&models.Pengaduan{}).Where("status NOT IN ('selesai','ditolak')").Count(&menunggu)
	config.DB.Model(&models.Pengaduan{}).Where("status = 'proses_penyelesaian'").Count(&proses)
	config.DB.Model(&models.Pengaduan{}).Where("status = 'selesai'").Count(&selesai)

	var totalPermohonan, permMenunggu, permProses, permSelesai int64
	config.DB.Model(&models.Permohonan{}).Count(&totalPermohonan)
	config.DB.Model(&models.Permohonan{}).Where("status NOT IN ('selesai','ditolak')").Count(&permMenunggu)
	config.DB.Model(&models.Permohonan{}).Where("status = 'penandatanganan'").Count(&permProses)
	config.DB.Model(&models.Permohonan{}).Where("status = 'selesai'").Count(&permSelesai)

	var totalMasyarakat int64
	config.DB.Model(&models.Masyarakat{}).Count(&totalMasyarakat)

	var recentAspirasi []models.Pengaduan
	config.DB.Preload("Masyarakat").Order("created_at DESC").Limit(5).Find(&recentAspirasi)

	var recentPermohonan []models.Permohonan
	config.DB.Preload("Masyarakat").Preload("JenisLayanan").Order("created_at DESC").Limit(5).Find(&recentPermohonan)

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
