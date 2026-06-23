package controllers

import (
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"

	"gorm.io/gorm"
	"pengaduan/config"
	"pengaduan/models"
)

// ─────────────────────────────────────────────────────────────
// PUBLIC — Masyarakat ajukan permintaan reset (tanpa login)
// POST /api/public/lupa-password
// ─────────────────────────────────────────────────────────────
func AjukanLupaPassword(c *gin.Context) {
	var req struct {
		NIK  string `json:"nik" binding:"required"`
		NoHP string `json:"no_hp" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "NIK dan no. HP wajib diisi"})
		return
	}
	req.NIK = trim(req.NIK)
	req.NoHP = trim(req.NoHP)

	// Verifikasi NIK + no HP cocok di database
	var user models.Masyarakat
	if err := config.DB.Where("nik = ?", req.NIK).First(&user).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			respondDBError(c, "password_reset_user_lookup", err)
			return
		}
		c.JSON(http.StatusNotFound, gin.H{"error": "NIK tidak ditemukan"})
		return
	}
	if user.Telp != req.NoHP {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No. HP tidak sesuai dengan data terdaftar"})
		return
	}

	// Cek apakah sudah ada permintaan yang masih menunggu
	var existing models.PermintaanResetPassword
	err := config.DB.Where("nik = ? AND status = 'menunggu'", req.NIK).First(&existing).Error
	if err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Permintaan reset password Anda sedang menunggu diproses oleh petugas"})
		return
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		respondDBError(c, "password_reset_duplicate_check", err)
		return
	}

	now := time.Now()
	permintaan := models.PermintaanResetPassword{
		NIK:       req.NIK,
		NoHP:      req.NoHP,
		Status:    "menunggu",
		Dibaca:    false,
		CreatedAt: &now,
		UpdatedAt: &now,
	}

	if err := config.DB.Create(&permintaan).Error; err != nil {
		respondDBError(c, "password_reset_request_create", err)
		return
	}
	logAction(c, "password_reset_request_success", "nik", maskIdentifier(req.NIK))

	c.JSON(http.StatusCreated, gin.H{
		"message": "Permintaan berhasil dikirim. Petugas akan segera memproses dan menghubungi Anda.",
		"nama":    user.Name,
	})
}

// ─────────────────────────────────────────────────────────────
// ADMIN — Ambil semua permintaan reset password
// GET /api/admin/lupa-password
// ─────────────────────────────────────────────────────────────
func GetPermintaanReset(c *gin.Context) {
	var list []models.PermintaanResetPassword
	query := config.DB.Preload("Masyarakat").Order("created_at DESC")

	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}
	if err := query.Find(&list).Error; err != nil {
		respondDBError(c, "password_reset_list", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": list})
}

// GET /api/admin/lupa-password/count — jumlah notif belum dibaca
func GetJumlahNotifReset(c *gin.Context) {
	var count int64
	if err := config.DB.Model(&models.PermintaanResetPassword{}).
		Where("status = ? AND dibaca = ?", "menunggu", false).
		Count(&count).Error; err != nil {
		respondDBError(c, "password_reset_count", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"count": count})
}

// PUT /api/admin/lupa-password/:id/baca — tandai sudah dibaca
func TandaiBaca(c *gin.Context) {
	id := c.Param("id")
	now := time.Now()
	result := config.DB.Model(&models.PermintaanResetPassword{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{"dibaca": true, "updated_at": now})
	if result.Error != nil {
		respondDBError(c, "password_reset_mark_read", result.Error)
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Permintaan tidak ditemukan"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "OK"})
}

// PUT /api/admin/lupa-password/:id/selesai — selesaikan + reset password sekaligus
func SelesaikanPermintaanReset(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		NewPassword string `json:"new_password" binding:"required"`
		Catatan     string `json:"catatan"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password baru wajib diisi"})
		return
	}
	if len(req.NewPassword) < 6 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password minimal 6 karakter"})
		return
	}

	// Ambil permintaan
	var permintaan models.PermintaanResetPassword
	if err := config.DB.First(&permintaan, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Permintaan tidak ditemukan"})
		return
	}
	if permintaan.Status == "selesai" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Permintaan sudah selesai diproses"})
		return
	}

	// Hash password baru
	hashed, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memproses password"})
		return
	}

	now := time.Now()
	err = config.DB.Transaction(func(tx *gorm.DB) error {
		result := tx.Model(&models.Masyarakat{}).
			Where("nik = ?", permintaan.NIK).
			Updates(map[string]interface{}{"password": string(hashed), "updated_at": now})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return gorm.ErrRecordNotFound
		}
		return tx.Model(&permintaan).Updates(map[string]interface{}{
			"status": "selesai", "dibaca": true, "catatan": trim(req.Catatan), "updated_at": now,
		}).Error
	})
	if err != nil {
		respondDBError(c, "password_reset_finish_transaction", err)
		return
	}

	// Ambil nama masyarakat untuk response
	var user models.Masyarakat
	if err := config.DB.Where("nik = ?", permintaan.NIK).First(&user).Error; err != nil {
		respondDBError(c, "password_reset_reload_user", err)
		return
	}
	logAction(c, "password_reset_finish_success", "request_id", permintaan.ID, "nik", maskIdentifier(permintaan.NIK))

	c.JSON(http.StatusOK, gin.H{
		"message": "Password berhasil direset untuk " + user.Name,
		"nama":    user.Name,
		"no_hp":   permintaan.NoHP,
	})
}

// GET /api/admin/masyarakat
func GetMasyarakat(c *gin.Context) {
	var list []models.Masyarakat
	if err := config.DB.Order("created_at DESC").Find(&list).Error; err != nil {
		respondDBError(c, "masyarakat_list", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": list})
}

// GET /api/admin/petugas
func GetPetugas(c *gin.Context) {
	var list []models.Petugas
	if err := config.DB.Order("created_at DESC").Find(&list).Error; err != nil {
		respondDBError(c, "petugas_list", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": list})
}

// PUT /api/admin/reset-password/masyarakat/:nik — manual reset oleh admin
func ResetPasswordMasyarakat(c *gin.Context) {
	nik := c.Param("nik")
	var req struct {
		NewPassword string `json:"new_password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password baru wajib diisi"})
		return
	}
	if len(req.NewPassword) < 6 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password minimal 6 karakter"})
		return
	}
	var user models.Masyarakat
	if err := config.DB.Where("nik = ?", nik).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Masyarakat tidak ditemukan"})
		return
	}
	hashed, _ := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	now := time.Now()
	if err := config.DB.Model(&user).Updates(map[string]interface{}{"password": string(hashed), "updated_at": now}).Error; err != nil {
		respondDBError(c, "masyarakat_password_reset", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Password berhasil direset untuk " + user.Name})
}

// PUT /api/admin/reset-password/petugas/:id
func ResetPasswordPetugas(c *gin.Context) {
	id := c.Param("id")
	role, _ := c.Get("role")
	if role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Hanya admin yang dapat mereset password petugas"})
		return
	}
	var req struct {
		NewPassword string `json:"new_password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password baru wajib diisi"})
		return
	}
	if len(req.NewPassword) < 6 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password minimal 6 karakter"})
		return
	}
	var petugas models.Petugas
	if err := config.DB.Where("id_petugas = ?", id).First(&petugas).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Petugas tidak ditemukan"})
		return
	}
	hashed, _ := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	now := time.Now()
	if err := config.DB.Model(&petugas).Updates(map[string]interface{}{"password": string(hashed), "updated_at": now}).Error; err != nil {
		respondDBError(c, "petugas_password_reset", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Password berhasil direset untuk " + petugas.NamaPetugas})
}

// PUT /api/auth/change-password
func ChangePassword(c *gin.Context) {
	role, _ := c.Get("role")
	userID, _ := c.Get("user_id")
	var req struct {
		OldPassword string `json:"old_password" binding:"required"`
		NewPassword string `json:"new_password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if len(req.NewPassword) < 6 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password baru minimal 6 karakter"})
		return
	}
	now := time.Now()
	if role == "masyarakat" {
		var user models.Masyarakat
		if err := config.DB.Where("nik = ?", userID).First(&user).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "User tidak ditemukan"})
			return
		}
		if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.OldPassword)); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Password lama tidak sesuai"})
			return
		}
		hashed, _ := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
		if err := config.DB.Model(&user).Updates(map[string]interface{}{"password": string(hashed), "updated_at": now}).Error; err != nil {
			respondDBError(c, "masyarakat_password_change", err)
			return
		}
	} else {
		var petugas models.Petugas
		if err := config.DB.Where("id_petugas = ?", userID).First(&petugas).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Petugas tidak ditemukan"})
			return
		}
		if err := bcrypt.CompareHashAndPassword([]byte(petugas.Password), []byte(req.OldPassword)); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Password lama tidak sesuai"})
			return
		}
		hashed, _ := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
		if err := config.DB.Model(&petugas).Updates(map[string]interface{}{"password": string(hashed), "updated_at": now}).Error; err != nil {
			respondDBError(c, "petugas_password_change", err)
			return
		}
	}
	c.JSON(http.StatusOK, gin.H{"message": "Password berhasil diubah"})
}

// POST /api/admin/petugas — tambah petugas baru
func CreatePetugas(c *gin.Context) {
	var req struct {
		NamaPetugas string `json:"nama_petugas" binding:"required"`
		Username    string `json:"username"     binding:"required"`
		Password    string `json:"password"     binding:"required"`
		Telp        string `json:"telp"`
		Roles       string `json:"roles"        binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nama, username, password, dan role wajib diisi"})
		return
	}
	req.NamaPetugas = trim(req.NamaPetugas)
	req.Username = trim(req.Username)
	req.Telp = trim(req.Telp)
	if req.NamaPetugas == "" || req.Username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nama dan username tidak boleh kosong"})
		return
	}
	if req.Roles != "admin" && req.Roles != "petugas" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Role harus 'admin' atau 'petugas'"})
		return
	}
	if len(req.Password) < 6 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password minimal 6 karakter"})
		return
	}

	// Cek username sudah ada
	var existing models.Petugas
	if err := config.DB.Where("username = ?", req.Username).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Username sudah digunakan"})
		return
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		respondDBError(c, "petugas_duplicate_check", err)
		return
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memproses password"})
		return
	}

	now := time.Now()
	p := models.Petugas{
		NamaPetugas: req.NamaPetugas,
		Username:    req.Username,
		Password:    string(hashed),
		Telp:        req.Telp,
		Roles:       req.Roles,
		CreatedAt:   &now,
		UpdatedAt:   &now,
	}
	if err := config.DB.Create(&p).Error; err != nil {
		respondDBError(c, "petugas_create", err)
		return
	}
	logAction(c, "petugas_create_success", "id", p.IDPetugas, "username", p.Username, "role", p.Roles)
	c.JSON(http.StatusCreated, gin.H{"message": "Petugas berhasil ditambahkan", "data": p})
}

// DELETE /api/admin/petugas/:id — hapus petugas
func DeletePetugas(c *gin.Context) {
	id := c.Param("id")
	username, _ := c.Get("username")

	var p models.Petugas
	if err := config.DB.Where("id_petugas = ?", id).First(&p).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Petugas tidak ditemukan"})
		return
	}
	// Tidak bisa hapus diri sendiri
	if p.Username == username.(string) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tidak dapat menghapus akun sendiri"})
		return
	}
	if err := config.DB.Delete(&p).Error; err != nil {
		respondDBError(c, "petugas_delete", err)
		return
	}
	logAction(c, "petugas_delete_success", "id", p.IDPetugas)
	c.JSON(http.StatusOK, gin.H{"message": "Petugas berhasil dihapus"})
}

// DELETE /api/admin/aspirasi/:id — admin hapus aspirasi (tanpa batasan status)
func AdminDeleteAspirasi(c *gin.Context) {
	id := c.Param("id")
	var p models.Pengaduan
	if err := config.DB.First(&p, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Aspirasi tidak ditemukan"})
		return
	}
	// Hapus juga tanggapan terkait
	if err := config.DB.Delete(&p).Error; err != nil {
		respondDBError(c, "admin_aspirasi_delete", err)
		return
	}
	logAction(c, "admin_aspirasi_delete_success", "id", p.IDPengaduan)
	c.JSON(http.StatusOK, gin.H{"message": "Aspirasi berhasil dihapus"})
}

// DELETE /api/admin/permohonan/:id — admin hapus permohonan (tanpa batasan status)
func AdminDeletePermohonan(c *gin.Context) {
	id := c.Param("id")
	var p models.Permohonan
	if err := config.DB.First(&p, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Permohonan tidak ditemukan"})
		return
	}
	if err := config.DB.Delete(&p).Error; err != nil {
		respondDBError(c, "admin_permohonan_delete", err)
		return
	}
	logAction(c, "admin_permohonan_delete_success", "id", p.ID)
	c.JSON(http.StatusOK, gin.H{"message": "Permohonan berhasil dihapus"})
}
