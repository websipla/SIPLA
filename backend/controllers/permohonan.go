package controllers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"pengaduan/config"
	"pengaduan/models"
)

func GetJenisLayanan(c *gin.Context) {
	var list []models.JenisLayanan
	config.DB.Where("is_active = ?", true).Find(&list)
	c.JSON(http.StatusOK, gin.H{"data": list})
}

func GetPermohonan(c *gin.Context) {
	role, _ := c.Get("role")
	userID, _ := c.Get("user_id")
	var list []models.Permohonan
	query := config.DB.Preload("Masyarakat").Preload("JenisLayanan").Preload("Petugas").Order("created_at DESC")
	if role == "masyarakat" {
		query = query.Where("nik = ?", userID)
	}
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}
	query.Find(&list)
	c.JSON(http.StatusOK, gin.H{"data": list})
}

func GetPermohonanByID(c *gin.Context) {
	id := c.Param("id")
	var p models.Permohonan
	if err := config.DB.Preload("Masyarakat").Preload("JenisLayanan").Preload("Petugas").First(&p, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Permohonan tidak ditemukan"})
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

func CreatePermohonan(c *gin.Context) {
	userID, _ := c.Get("user_id")
	idJenis := c.PostForm("id_jenis_layanan")
	keterangan := c.PostForm("keterangan")
	if idJenis == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Jenis layanan wajib dipilih"})
		return
	}
	jenisID, err := strconv.ParseUint(idJenis, 10, 64)
	if err != nil || jenisID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Jenis layanan tidak valid"})
		return
	}

	fileKTP, err := saveOptionalDocument(c, "file_ktp", "permohonan/ktp")
	if err != nil {
		respondUploadError(c, "file_ktp", err)
		return
	}
	fileKK, err := saveOptionalDocument(c, "file_kk", "permohonan/kk")
	if err != nil {
		respondUploadError(c, "file_kk", err)
		return
	}
	fileSuratRTRW, err := saveOptionalDocument(c, "file_surat_rtrw", "permohonan/surat-rtrw")
	if err != nil {
		respondUploadError(c, "file_surat_rtrw", err)
		return
	}
	fileFotoRumah, err := saveOptionalImage(c, "file_foto_rumah", "permohonan/foto-rumah")
	if err != nil {
		respondUploadError(c, "file_foto_rumah", err)
		return
	}
	filePendukung, err := saveOptionalDocument(c, "file_pendukung", "permohonan/pendukung")
	if err != nil {
		respondUploadError(c, "file_pendukung", err)
		return
	}

	now := time.Now()
	p := models.Permohonan{
		NIK: userID.(string), IDJenisLayanan: jenisID, TglPermohonan: now,
		Keterangan: keterangan, FileKTP: fileKTP, FileKK: fileKK,
		FileSuratRTRW: fileSuratRTRW, FileFotoRumah: fileFotoRumah,
		FilePendukung: filePendukung,
		Status:        "verifikasi_persyaratan", CreatedAt: &now, UpdatedAt: &now,
	}
	if err := config.DB.Create(&p).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat permohonan"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": "Permohonan berhasil diajukan", "data": p})
}

func UpdatePermohonan(c *gin.Context) {
	id := c.Param("id")
	var p models.Permohonan
	if err := config.DB.First(&p, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Permohonan tidak ditemukan"})
		return
	}
	status := c.PostForm("status")
	catatan := c.PostForm("catatan_petugas")
	if status != "" {
		p.Status = status
	}
	if catatan != "" {
		p.CatatanPetugas = catatan
	}
	fileHasil, err := saveOptionalDocument(c, "file_hasil", "permohonan/hasil")
	if err != nil {
		respondUploadError(c, "file_hasil", err)
		return
	}
	if fileHasil != "" {
		p.FileHasil = fileHasil
	}
	username, _ := c.Get("username")
	var petugas models.Petugas
	if err := config.DB.Where("username = ?", username).First(&petugas).Error; err == nil {
		p.IDPetugas = &petugas.IDPetugas
	}
	if status == "selesai" || status == "ditolak" {
		now := time.Now()
		p.TglSelesai = &now
	}
	now := time.Now()
	p.UpdatedAt = &now
	config.DB.Save(&p)
	c.JSON(http.StatusOK, gin.H{"message": "Permohonan diperbarui", "data": p})
}

func DeletePermohonan(c *gin.Context) {
	id := c.Param("id")
	var p models.Permohonan
	if err := config.DB.First(&p, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Permohonan tidak ditemukan"})
		return
	}
	if p.Status != "verifikasi_persyaratan" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Permohonan yang sudah diproses tidak dapat dihapus"})
		return
	}
	config.DB.Delete(&p)
	c.JSON(http.StatusOK, gin.H{"message": "Permohonan dihapus"})
}

func GetKelurahanInfo(c *gin.Context) {
	var info models.KelurahanInfo
	if err := config.DB.First(&info).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Data kelurahan belum tersedia"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": info})
}

func UpdateKelurahanInfo(c *gin.Context) {
	// Ambil data existing dulu
	var info models.KelurahanInfo
	if err := config.DB.First(&info).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Data kelurahan tidak ditemukan"})
		return
	}

	// Bind request ke struct sementara
	var req models.KelurahanInfo
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update semua field yang bisa diedit
	now := time.Now()
	info.Visi = req.Visi
	info.Misi = req.Misi
	info.Sejarah = req.Sejarah
	info.JumlahPenduduk = req.JumlahPenduduk
	info.JumlahKK = req.JumlahKK
	info.LuasWilayah = req.LuasWilayah
	info.KodePos = req.KodePos
	info.AlamatKantor = req.AlamatKantor
	info.TelpKantor = req.TelpKantor
	info.EmailKantor = req.EmailKantor
	info.JamOperasional = req.JamOperasional
	// Penduduk
	info.JumlahLakiLaki = req.JumlahLakiLaki
	info.JumlahPerempuan = req.JumlahPerempuan
	// Sarana Pendidikan
	info.JmlPaudKbTk = req.JmlPaudKbTk
	info.JmlSekolahDasar = req.JmlSekolahDasar
	info.JmlSltp = req.JmlSltp
	info.JmlSlta = req.JmlSlta
	info.JmlPerguruanTinggi = req.JmlPerguruanTinggi
	// Sarana Kesehatan
	info.JmlRumahSakit = req.JmlRumahSakit
	info.JmlPuskesmas = req.JmlPuskesmas
	info.JmlKlinik = req.JmlKlinik
	info.JmlKlinikTradisional = req.JmlKlinikTradisional
	info.JmlPosyandu = req.JmlPosyandu
	info.UpdatedAt = &now

	if err := config.DB.Save(&info).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan data kelurahan"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Info kelurahan berhasil diperbarui", "data": info})
}

// PUT /api/permohonan/:id/proses — admin/petugas update status + upload hasil
func ProsesPermohonan(c *gin.Context) {
	id := c.Param("id")
	username, _ := c.Get("username")

	var petugas models.Petugas
	if err := config.DB.Where("username = ?", username).First(&petugas).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Petugas tidak ditemukan"})
		return
	}

	var p models.Permohonan
	if err := config.DB.First(&p, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Permohonan tidak ditemukan"})
		return
	}

	if status := c.PostForm("status"); status != "" {
		p.Status = status
	}
	if catatan := c.PostForm("catatan_petugas"); catatan != "" {
		p.CatatanPetugas = catatan
	}

	fileHasil, err := saveOptionalDocument(c, "file_hasil", "permohonan/hasil")
	if err != nil {
		respondUploadError(c, "file_hasil", err)
		return
	}
	if fileHasil != "" {
		p.FileHasil = fileHasil
	}

	p.IDPetugas = &petugas.IDPetugas
	now := time.Now()
	p.UpdatedAt = &now
	if p.Status == "selesai" || p.Status == "ditolak" {
		p.TglSelesai = &now
	}

	if err := config.DB.Save(&p).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan permohonan"})
		return
	}

	config.DB.Preload("Masyarakat").Preload("JenisLayanan").Preload("Petugas").First(&p, p.ID)
	c.JSON(http.StatusOK, gin.H{"message": "Permohonan berhasil diperbarui", "data": p})
}

// GET /api/public/statistik — tanpa auth, untuk landing page
func GetStatistikPublik(c *gin.Context) {
	var totalAsp, prosesAsp, selesaiAsp int64
	config.DB.Model(&models.Pengaduan{}).Count(&totalAsp)
	config.DB.Model(&models.Pengaduan{}).Where("status NOT IN ('selesai','ditolak')").Count(&prosesAsp)
	config.DB.Model(&models.Pengaduan{}).Where("status = 'selesai'").Count(&selesaiAsp)

	var totalPer, prosesPer, selesaiPer int64
	config.DB.Model(&models.Permohonan{}).Count(&totalPer)
	config.DB.Model(&models.Permohonan{}).Where("status NOT IN ('selesai','ditolak')").Count(&prosesPer)
	config.DB.Model(&models.Permohonan{}).Where("status = 'selesai'").Count(&selesaiPer)

	c.JSON(http.StatusOK, gin.H{
		"aspirasi": gin.H{
			"total":    totalAsp,
			"menunggu": prosesAsp,
			"proses":   prosesAsp,
			"selesai":  selesaiAsp,
		},
		"permohonan": gin.H{
			"total":    totalPer,
			"menunggu": prosesPer,
			"proses":   prosesPer,
			"selesai":  selesaiPer,
		},
	})
}
