package controllers

import (
	"errors"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"gorm.io/gorm"
	"pengaduan/config"
	"pengaduan/middleware"
	"pengaduan/models"
)

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
	Role     string `json:"role" binding:"required"` // "masyarakat" atau "petugas"
}

func generateToken(id, username, role string) (string, error) {
	claims := &middleware.Claims{
		ID:       id,
		Username: username,
		Role:     role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(os.Getenv("JWT_SECRET")))
}

// POST /api/auth/login
func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Username, password, dan role wajib diisi"})
		return
	}
	req.Username = trim(req.Username)
	if req.Role != "masyarakat" && req.Role != "petugas" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Role login tidak valid"})
		return
	}
	logAction(c, "login_attempt", "username", req.Username, "login_role", req.Role)

	if req.Role == "masyarakat" {
		var user models.Masyarakat
		if err := config.DB.Where("username = ?", req.Username).First(&user).Error; err != nil {
			if !errors.Is(err, gorm.ErrRecordNotFound) {
				respondDBError(c, "login_masyarakat_lookup", err)
				return
			}
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Username atau password salah"})
			return
		}
		if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Username atau password salah"})
			return
		}
		token, err := generateToken(user.NIK, user.Username, "masyarakat")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat token"})
			return
		}
		logAction(c, "login_success", "username", user.Username, "login_role", "masyarakat")
		c.JSON(http.StatusOK, gin.H{
			"token": token,
			"user":  user,
			"role":  "masyarakat",
		})
		return
	}

	// Login petugas/admin
	var petugas models.Petugas
	if err := config.DB.Where("username = ?", req.Username).First(&petugas).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			respondDBError(c, "login_petugas_lookup", err)
			return
		}
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Username atau password salah"})
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(petugas.Password), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Username atau password salah"})
		return
	}
	token, err := generateToken(strconv.FormatUint(petugas.IDPetugas, 10), petugas.Username, petugas.Roles)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat token"})
		return
	}
	logAction(c, "login_success", "username", petugas.Username, "actual_role", petugas.Roles)
	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user":  petugas,
		"role":  petugas.Roles,
	})
}

// POST /api/auth/register
func Register(c *gin.Context) {
	var req struct {
		NIK          string `json:"nik" binding:"required"`
		Name         string `json:"name" binding:"required"`
		Email        string `json:"email" binding:"required,email"`
		Username     string `json:"username" binding:"required"`
		JenisKelamin string `json:"jenis_kelamin" binding:"required"`
		Password     string `json:"password" binding:"required"`
		Telp         string `json:"telp" binding:"required"`
		Alamat       string `json:"alamat" binding:"required"`
		RT           string `json:"rt" binding:"required"`
		RW           string `json:"rw" binding:"required"`
		KodePos      string `json:"kode_pos" binding:"required"`
		ProvinceID   string `json:"province_id" binding:"required"`
		RegencyID    string `json:"regency_id" binding:"required"`
		DistrictID   string `json:"district_id" binding:"required"`
		VillageID    string `json:"village_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Semua data registrasi wajib diisi dengan format yang benar"})
		return
	}

	req.NIK = trim(req.NIK)
	req.Name = trim(req.Name)
	req.Email = strings.ToLower(trim(req.Email))
	req.Username = trim(req.Username)
	req.Telp = trim(req.Telp)
	if len(req.NIK) != 16 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "NIK harus tepat 16 digit"})
		return
	}
	if _, err := strconv.ParseUint(req.NIK, 10, 64); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "NIK hanya boleh berisi angka"})
		return
	}
	if len(req.Password) < 8 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password minimal 8 karakter"})
		return
	}
	if req.JenisKelamin != "Laki-laki" && req.JenisKelamin != "Perempuan" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Jenis kelamin tidak valid"})
		return
	}
	logAction(c, "register_attempt", "username", req.Username, "nik", maskIdentifier(req.NIK))

	var village models.Village
	if err := config.DB.Where("id = ? AND district_id = ?", req.VillageID, req.DistrictID).First(&village).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Kelurahan/desa tidak sesuai dengan kecamatan yang dipilih"})
			return
		}
		respondDBError(c, "register_validate_village", err)
		return
	}
	var district models.District
	if err := config.DB.Where("id = ? AND regency_id = ?", req.DistrictID, req.RegencyID).First(&district).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Kecamatan tidak sesuai dengan kabupaten/kota yang dipilih"})
			return
		}
		respondDBError(c, "register_validate_district", err)
		return
	}
	var regency models.Regency
	if err := config.DB.Where("id = ? AND province_id = ?", req.RegencyID, req.ProvinceID).First(&regency).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Kabupaten/kota tidak sesuai dengan provinsi yang dipilih"})
			return
		}
		respondDBError(c, "register_validate_regency", err)
		return
	}

	var existing models.Masyarakat
	err := config.DB.Where("nik = ? OR username = ? OR email = ?", req.NIK, req.Username, req.Email).First(&existing).Error
	if err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "NIK, username, atau email sudah terdaftar"})
		return
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		respondDBError(c, "register_duplicate_check", err)
		return
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memproses password"})
		return
	}
	now := time.Now()
	user := models.Masyarakat{
		NIK: req.NIK, Name: req.Name, Email: req.Email, Username: req.Username,
		JenisKelamin: req.JenisKelamin, Password: string(hashed), Telp: req.Telp,
		Alamat: trim(req.Alamat), RT: trim(req.RT), RW: trim(req.RW), KodePos: trim(req.KodePos),
		ProvinceID: req.ProvinceID, RegencyID: req.RegencyID, DistrictID: req.DistrictID,
		VillageID: req.VillageID, CreatedAt: &now, UpdatedAt: &now,
	}

	if err := config.DB.Create(&user).Error; err != nil {
		respondDBError(c, "register_create", err)
		return
	}

	logAction(c, "register_success", "username", user.Username, "nik", maskIdentifier(user.NIK))
	c.JSON(http.StatusCreated, gin.H{"message": "Registrasi berhasil"})
}

// GET /api/auth/me
func Me(c *gin.Context) {
	role, _ := c.Get("role")
	userID, _ := c.Get("user_id")

	if role == "masyarakat" {
		var user models.Masyarakat
		if err := config.DB.Where("nik = ?", userID).First(&user).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "Akun tidak ditemukan"})
				return
			}
			respondDBError(c, "auth_me_masyarakat", err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"user": user, "role": role})
		return
	}

	var petugas models.Petugas
	if err := config.DB.Where("id_petugas = ?", userID).First(&petugas).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Akun petugas tidak ditemukan"})
			return
		}
		respondDBError(c, "auth_me_petugas", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": petugas, "role": role})
}
