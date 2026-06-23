package controllers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"

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

	// Verifikasi NIK + no HP cocok di database
	var user models.Masyarakat
	if err := config.DB.Where("nik = ?", req.NIK).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "NIK tidak ditemukan"})
		return
	}
	if user.Telp != req.NoHP {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No. HP tidak sesuai dengan data terdaftar"})
		return
	}

	// Cek apakah sudah ada permintaan yang masih menunggu
	var existing models.PermintaanResetPassword
	if err := config.DB.Where("nik = ? AND status = 'menunggu'", req.NIK).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Permintaan reset password Anda sedang menunggu diproses oleh petugas"})
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengirim permintaan"})
		return
	}

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
	query.Find(&list)
	c.JSON(http.StatusOK, gin.H{"data": list})
}

// GET /api/admin/lupa-password/count — jumlah notif belum dibaca
func GetJumlahNotifReset(c *gin.Context) {
	var count int64
	config.DB.Model(&models.PermintaanResetPassword{}).
		Where("status = ? AND dibaca = ?", "menunggu", false).
		Count(&count)
	c.JSON(http.StatusOK, gin.H{"count": count})
}

// PUT /api/admin/lupa-password/:id/baca — tandai sudah dibaca
func TandaiBaca(c *gin.Context) {
	id := c.Param("id")
	now := time.Now()
	config.DB.Model(&models.PermintaanResetPassword{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{"dibaca": true, "updated_at": now})
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

	// Update password masyarakat
	now := time.Now()
	if err := config.DB.Model(&models.Masyarakat{}).
		Where("nik = ?", permintaan.NIK).
		Updates(map[string]interface{}{
			"password":   string(hashed),
			"updated_at": now,
		}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mereset password"})
		return
	}

	// Tandai permintaan selesai
	config.DB.Model(&permintaan).Updates(map[string]interface{}{
		"status":     "selesai",
		"dibaca":     true,
		"catatan":    req.Catatan,
		"updated_at": now,
	})

	// Ambil nama masyarakat untuk response
	var user models.Masyarakat
	config.DB.Where("nik = ?", permintaan.NIK).First(&user)

	c.JSON(http.StatusOK, gin.H{
		"message": "Password berhasil direset untuk " + user.Name,
		"nama":    user.Name,
		"no_hp":   permintaan.NoHP,
	})
}

// GET /api/admin/masyarakat
func GetMasyarakat(c *gin.Context) {
	var list []models.Masyarakat
	config.DB.Find(&list)
	c.JSON(http.StatusOK, gin.H{"data": list})
}

// GET /api/admin/petugas
func GetPetugas(c *gin.Context) {
	var list []models.Petugas
	config.DB.Find(&list)
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
	config.DB.Model(&user).Updates(map[string]interface{}{"password": string(hashed), "updated_at": now})
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
	config.DB.Model(&petugas).Updates(map[string]interface{}{"password": string(hashed), "updated_at": now})
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
		config.DB.Model(&user).Updates(map[string]interface{}{"password": string(hashed), "updated_at": now})
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
		config.DB.Model(&petugas).Updates(map[string]interface{}{"password": string(hashed), "updated_at": now})
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
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menambah petugas"})
		return
	}
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
	config.DB.Delete(&p)
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
	config.DB.Where("id_pengaduan = ?", id).Delete(&models.Tanggapan{})
	config.DB.Delete(&p)
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
	config.DB.Delete(&p)
	c.JSON(http.StatusOK, gin.H{"message": "Permohonan berhasil dihapus"})
}
