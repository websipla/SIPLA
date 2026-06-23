package controllers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"pengaduan/config"
	"pengaduan/models"
)

func GetJenisLayanan(c *gin.Context) {
	var list []models.JenisLayanan
	if err := config.DB.Where("is_active = ?", true).Order("nama_layanan").Find(&list).Error; err != nil {
		respondDBError(c, "jenis_layanan_list", err)
		return
	}
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
	if err := query.Find(&list).Error; err != nil {
		respondDBError(c, "permohonan_list", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": list})
}

func GetPermohonanByID(c *gin.Context) {
	id := c.Param("id")
	var p models.Permohonan
	if err := config.DB.Preload("Masyarakat").Preload("JenisLayanan").Preload("Petugas").First(&p, id).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			respondDBError(c, "permohonan_detail", err)
			return
		}
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
	if c.GetString("role") != "masyarakat" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Hanya masyarakat yang dapat membuat permohonan"})
		return
	}
	userID := c.GetString("user_id")
	idJenis := trim(c.PostForm("id_jenis_layanan"))
	keterangan := trim(c.PostForm("keterangan"))
	if idJenis == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Jenis layanan wajib dipilih"})
		return
	}
	jenisID, err := strconv.ParseUint(idJenis, 10, 64)
	if err != nil || jenisID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Jenis layanan tidak valid"})
		return
	}
	var jenis models.JenisLayanan
	if err := config.DB.Where("id = ? AND is_active = ?", jenisID, true).First(&jenis).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Jenis layanan tidak ditemukan atau sudah tidak aktif"})
			return
		}
		respondDBError(c, "permohonan_validate_jenis", err)
		return
	}
	if !requireFormFile(c, "file_ktp", "KTP") ||
		!requireFormFile(c, "file_kk", "Kartu Keluarga") ||
		!requireFormFile(c, "file_surat_rtrw", "Surat pengantar RT/RW") {
		return
	}
	if strings.Contains(strings.ToLower(jenis.NamaLayanan), "tidak mampu") &&
		!requireFormFile(c, "file_foto_rumah", "Foto rumah") {
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
		NIK: userID, IDJenisLayanan: jenisID, TglPermohonan: now,
		Keterangan: keterangan, FileKTP: fileKTP, FileKK: fileKK,
		FileSuratRTRW: fileSuratRTRW, FileFotoRumah: fileFotoRumah,
		FilePendukung: filePendukung,
		Status:        "verifikasi_persyaratan", CreatedAt: &now, UpdatedAt: &now,
	}
	if err := config.DB.Create(&p).Error; err != nil {
		respondDBError(c, "permohonan_create", err)
		return
	}
	logAction(c, "permohonan_create_success", "id", p.ID, "id_jenis_layanan", jenisID, "status", p.Status)
	c.JSON(http.StatusCreated, gin.H{"message": "Permohonan berhasil diajukan", "data": p})
}

func UpdatePermohonan(c *gin.Context) {
	id := c.Param("id")
	var p models.Permohonan
	if err := config.DB.First(&p, id).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			respondDBError(c, "permohonan_update_lookup", err)
			return
		}
		c.JSON(http.StatusNotFound, gin.H{"error": "Permohonan tidak ditemukan"})
		return
	}
	status := c.PostForm("status")
	catatan := c.PostForm("catatan_petugas")
	if status != "" {
		if !validPermohonanStatus(status) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Status permohonan tidak valid"})
			return
		}
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
	if err := config.DB.Save(&p).Error; err != nil {
		respondDBError(c, "permohonan_update", err)
		return
	}
	logAction(c, "permohonan_update_success", "id", p.ID, "status", p.Status)
	c.JSON(http.StatusOK, gin.H{"message": "Permohonan diperbarui", "data": p})
}

func DeletePermohonan(c *gin.Context) {
	id := c.Param("id")
	role := c.GetString("role")
	userID := c.GetString("user_id")
	var p models.Permohonan
	if err := config.DB.First(&p, id).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			respondDBError(c, "permohonan_delete_lookup", err)
			return
		}
		c.JSON(http.StatusNotFound, gin.H{"error": "Permohonan tidak ditemukan"})
		return
	}
	if role == "masyarakat" && p.NIK != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Akses ditolak"})
		return
	}
	if p.Status != "verifikasi_persyaratan" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Permohonan yang sudah diproses tidak dapat dihapus"})
		return
	}
	if err := config.DB.Delete(&p).Error; err != nil {
		respondDBError(c, "permohonan_delete", err)
		return
	}
	logAction(c, "permohonan_delete_success", "id", p.ID)
	c.JSON(http.StatusOK, gin.H{"message": "Permohonan dihapus"})
}

func GetKelurahanInfo(c *gin.Context) {
	var info models.KelurahanInfo
	if err := config.DB.First(&info).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			respondDBError(c, "kelurahan_detail", err)
			return
		}
		c.JSON(http.StatusNotFound, gin.H{"error": "Data kelurahan belum tersedia"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": info})
}

func UpdateKelurahanInfo(c *gin.Context) {
	// Ambil data existing dulu
	var info models.KelurahanInfo
	if err := config.DB.First(&info).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			respondDBError(c, "kelurahan_update_lookup", err)
			return
		}
		c.JSON(http.StatusNotFound, gin.H{"error": "Data kelurahan tidak ditemukan"})
		return
	}

	// Bind request ke struct sementara
	var req models.KelurahanInfo
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format data kelurahan tidak valid"})
		return
	}
	if req.JumlahPenduduk < 0 || req.JumlahKK < 0 || req.JumlahLakiLaki < 0 ||
		req.JumlahPerempuan < 0 || req.JmlPaudKbTk < 0 || req.JmlSekolahDasar < 0 ||
		req.JmlSltp < 0 || req.JmlSlta < 0 || req.JmlPerguruanTinggi < 0 ||
		req.JmlRumahSakit < 0 || req.JmlPuskesmas < 0 || req.JmlKlinik < 0 ||
		req.JmlKlinikTradisional < 0 || req.JmlPosyandu < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nilai statistik kelurahan tidak boleh negatif"})
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
		respondDBError(c, "kelurahan_update", err)
		return
	}
	logAction(c, "kelurahan_update_success", "id", info.ID)
	c.JSON(http.StatusOK, gin.H{"message": "Info kelurahan berhasil diperbarui", "data": info})
}

func CreateJenisLayanan(c *gin.Context) {
	var req struct {
		NamaLayanan  string `json:"nama_layanan" binding:"required"`
		Deskripsi    string `json:"deskripsi"`
		Syarat       string `json:"syarat"`
		EstimasiHari int    `json:"estimasi_hari"`
		IsActive     *bool  `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nama layanan wajib diisi"})
		return
	}
	req.NamaLayanan = trim(req.NamaLayanan)
	if req.NamaLayanan == "" || req.EstimasiHari < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nama layanan wajib diisi dan estimasi hari tidak boleh negatif"})
		return
	}
	active := true
	if req.IsActive != nil {
		active = *req.IsActive
	}
	now := time.Now()
	layanan := models.JenisLayanan{
		NamaLayanan: req.NamaLayanan, Deskripsi: trim(req.Deskripsi), Syarat: trim(req.Syarat),
		EstimasiHari: req.EstimasiHari, IsActive: active, CreatedAt: &now, UpdatedAt: &now,
	}
	if err := config.DB.Create(&layanan).Error; err != nil {
		respondDBError(c, "jenis_layanan_create", err)
		return
	}
	logAction(c, "jenis_layanan_create_success", "id", layanan.ID, "nama", layanan.NamaLayanan)
	c.JSON(http.StatusCreated, gin.H{"message": "Jenis layanan berhasil ditambahkan", "data": layanan})
}

func UpdateJenisLayanan(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID jenis layanan tidak valid"})
		return
	}
	var layanan models.JenisLayanan
	if err := config.DB.First(&layanan, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Jenis layanan tidak ditemukan"})
			return
		}
		respondDBError(c, "jenis_layanan_update_lookup", err)
		return
	}
	var req struct {
		NamaLayanan  string `json:"nama_layanan" binding:"required"`
		Deskripsi    string `json:"deskripsi"`
		Syarat       string `json:"syarat"`
		EstimasiHari int    `json:"estimasi_hari"`
		IsActive     *bool  `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || trim(req.NamaLayanan) == "" || req.EstimasiHari < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data jenis layanan tidak valid"})
		return
	}
	layanan.NamaLayanan = trim(req.NamaLayanan)
	layanan.Deskripsi = trim(req.Deskripsi)
	layanan.Syarat = trim(req.Syarat)
	layanan.EstimasiHari = req.EstimasiHari
	if req.IsActive != nil {
		layanan.IsActive = *req.IsActive
	}
	now := time.Now()
	layanan.UpdatedAt = &now
	if err := config.DB.Save(&layanan).Error; err != nil {
		respondDBError(c, "jenis_layanan_update", err)
		return
	}
	logAction(c, "jenis_layanan_update_success", "id", layanan.ID, "aktif", layanan.IsActive)
	c.JSON(http.StatusOK, gin.H{"message": "Jenis layanan berhasil diperbarui", "data": layanan})
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
		if !validPermohonanStatus(status) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Status permohonan tidak valid"})
			return
		}
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
		respondDBError(c, "permohonan_process", err)
		return
	}

	if err := config.DB.Preload("Masyarakat").Preload("JenisLayanan").Preload("Petugas").First(&p, p.ID).Error; err != nil {
		respondDBError(c, "permohonan_process_reload", err)
		return
	}
	logAction(c, "permohonan_process_success", "id", p.ID, "status", p.Status, "id_petugas", petugas.IDPetugas)
	c.JSON(http.StatusOK, gin.H{"message": "Permohonan berhasil diperbarui", "data": p})
}

// GET /api/public/statistik — tanpa auth, untuk landing page
func GetStatistikPublik(c *gin.Context) {
	var totalAsp, prosesAsp, selesaiAsp int64
	if err := config.DB.Model(&models.Pengaduan{}).Count(&totalAsp).Error; err != nil {
		respondDBError(c, "public_stats_total_aspirasi", err)
		return
	}
	if err := config.DB.Model(&models.Pengaduan{}).Where("status NOT IN ('selesai','ditolak')").Count(&prosesAsp).Error; err != nil {
		respondDBError(c, "public_stats_process_aspirasi", err)
		return
	}
	if err := config.DB.Model(&models.Pengaduan{}).Where("status = 'selesai'").Count(&selesaiAsp).Error; err != nil {
		respondDBError(c, "public_stats_done_aspirasi", err)
		return
	}

	var totalPer, prosesPer, selesaiPer int64
	if err := config.DB.Model(&models.Permohonan{}).Count(&totalPer).Error; err != nil {
		respondDBError(c, "public_stats_total_permohonan", err)
		return
	}
	if err := config.DB.Model(&models.Permohonan{}).Where("status NOT IN ('selesai','ditolak')").Count(&prosesPer).Error; err != nil {
		respondDBError(c, "public_stats_process_permohonan", err)
		return
	}
	if err := config.DB.Model(&models.Permohonan{}).Where("status = 'selesai'").Count(&selesaiPer).Error; err != nil {
		respondDBError(c, "public_stats_done_permohonan", err)
		return
	}

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
