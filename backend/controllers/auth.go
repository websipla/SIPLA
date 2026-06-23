package controllers

import (
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

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
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Role == "masyarakat" {
		var user models.Masyarakat
		if err := config.DB.Where("username = ?", req.Username).First(&user).Error; err != nil {
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
	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user":  petugas,
		"role":  petugas.Roles,
	})
}

// POST /api/auth/register
func Register(c *gin.Context) {
	var user models.Masyarakat
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Cek NIK & username & email sudah ada
	var existing models.Masyarakat
	if err := config.DB.Where("nik = ? OR username = ? OR email = ?", user.NIK, user.Username, user.Email).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "NIK, username, atau email sudah terdaftar"})
		return
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal hash password"})
		return
	}
	user.Password = string(hashed)
	now := time.Now()
	user.CreatedAt = &now
	user.UpdatedAt = &now

	if err := config.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mendaftar"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Registrasi berhasil"})
}

// GET /api/auth/me
func Me(c *gin.Context) {
	role, _ := c.Get("role")
	userID, _ := c.Get("user_id")

	if role == "masyarakat" {
		var user models.Masyarakat
		config.DB.Where("nik = ?", userID).First(&user)
		c.JSON(http.StatusOK, gin.H{"user": user, "role": role})
		return
	}

	var petugas models.Petugas
	config.DB.Where("id_petugas = ?", userID).First(&petugas)
	c.JSON(http.StatusOK, gin.H{"user": petugas, "role": role})
}
