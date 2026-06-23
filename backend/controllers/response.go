package controllers

import (
	"errors"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgconn"
	"gorm.io/gorm"
)

func logAction(c *gin.Context, action string, fields ...any) {
	log.Printf("action=%s method=%s path=%s user_id=%s role=%s details=%v",
		action,
		c.Request.Method,
		c.FullPath(),
		maskIdentifier(c.GetString("user_id")),
		c.GetString("role"),
		fields,
	)
}

func maskIdentifier(value string) string {
	if len(value) <= 4 {
		return value
	}
	return strings.Repeat("*", len(value)-4) + value[len(value)-4:]
}

func respondDBError(c *gin.Context, operation string, err error) {
	log.Printf("database_error operation=%s method=%s path=%s user_id=%s role=%s error=%v",
		operation,
		c.Request.Method,
		c.FullPath(),
		maskIdentifier(c.GetString("user_id")),
		c.GetString("role"),
		err,
	)

	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		switch pgErr.Code {
		case "23505":
			c.JSON(http.StatusConflict, gin.H{"error": "Data sudah terdaftar atau menggunakan nilai yang sama"})
			return
		case "23503":
			c.JSON(http.StatusBadRequest, gin.H{"error": "Data relasi tidak ditemukan atau masih digunakan oleh data lain"})
			return
		case "23502":
			c.JSON(http.StatusBadRequest, gin.H{"error": "Ada field wajib yang belum diisi"})
			return
		case "23514":
			c.JSON(http.StatusBadRequest, gin.H{"error": "Nilai data tidak sesuai aturan database"})
			return
		}
	}

	c.JSON(http.StatusInternalServerError, gin.H{
		"error": "Database gagal memproses permintaan. Silakan coba lagi atau hubungi administrator.",
	})
}

func respondQueryError(c *gin.Context, operation string, err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return false
	}
	respondDBError(c, operation, err)
	return true
}

func trim(value string) string {
	return strings.TrimSpace(value)
}

func validAspirasiStatus(status string) bool {
	switch status {
	case "verifikasi_lapangan", "koordinasi", "proses_penyelesaian", "selesai", "ditolak":
		return true
	default:
		return false
	}
}

func validPermohonanStatus(status string) bool {
	switch status {
	case "verifikasi_persyaratan", "pembuatan_draft", "penandatanganan", "register_dokumen", "selesai", "ditolak":
		return true
	default:
		return false
	}
}
