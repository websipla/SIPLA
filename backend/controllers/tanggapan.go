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

// POST /api/tanggapan - maksimal 3 file bukti.
func CreateTanggapan(c *gin.Context) {
	username, _ := c.Get("username")

	var petugas models.Petugas
	if err := config.DB.Where("username = ?", username).First(&petugas).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Petugas tidak ditemukan"})
		return
	}

	idPengaduanStr := c.PostForm("id_pengaduan")
	tanggapanTeks := trim(c.PostForm("tanggapan"))
	status := trim(c.PostForm("status"))

	if idPengaduanStr == "" || tanggapanTeks == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id_pengaduan dan tanggapan wajib diisi"})
		return
	}
	idP, err := strconv.ParseUint(idPengaduanStr, 10, 64)
	if err != nil || idP == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id_pengaduan tidak valid"})
		return
	}
	if status != "" && !validAspirasiStatus(status) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Status aspirasi tidak valid"})
		return
	}
	var pengaduan models.Pengaduan
	if err := config.DB.First(&pengaduan, idP).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Aspirasi tidak ditemukan"})
			return
		}
		respondDBError(c, "tanggapan_validate_aspirasi", err)
		return
	}

	fileBukti1, err := saveOptionalDocument(c, "file_bukti_1", "bukti")
	if err != nil {
		respondUploadError(c, "file_bukti_1", err)
		return
	}
	fileBukti2, err := saveOptionalDocument(c, "file_bukti_2", "bukti")
	if err != nil {
		respondUploadError(c, "file_bukti_2", err)
		return
	}
	fileBukti3, err := saveOptionalDocument(c, "file_bukti_3", "bukti")
	if err != nil {
		respondUploadError(c, "file_bukti_3", err)
		return
	}

	now := time.Now()
	t := models.Tanggapan{
		IDPengaduan:   idP,
		TglTanggapan:  now,
		TanggapanTeks: tanggapanTeks,
		FileBukti:     fileBukti1,
		FileBukti2:    fileBukti2,
		FileBukti3:    fileBukti3,
		IDPetugas:     petugas.IDPetugas,
		CreatedAt:     &now,
		UpdatedAt:     &now,
	}

	err = config.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&t).Error; err != nil {
			return err
		}
		if status != "" {
			if err := tx.Model(&models.Pengaduan{}).
				Where("id_pengaduan = ?", idP).
				Updates(map[string]any{"status": status, "updated_at": now}).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		respondDBError(c, "tanggapan_create_transaction", err)
		return
	}
	logAction(c, "tanggapan_create_success", "id", t.IDTanggapan, "id_pengaduan", idP, "status", status)
	c.JSON(http.StatusCreated, gin.H{"message": "Tanggapan berhasil dikirim", "data": t})
}

func UpdateTanggapan(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tanggapan tidak valid"})
		return
	}
	var t models.Tanggapan
	if err := config.DB.First(&t, id).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			respondDBError(c, "tanggapan_update_lookup", err)
			return
		}
		c.JSON(http.StatusNotFound, gin.H{"error": "Tanggapan tidak ditemukan"})
		return
	}
	var req struct {
		Tanggapan string `json:"tanggapan"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || trim(req.Tanggapan) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Isi tanggapan wajib diisi"})
		return
	}
	t.TanggapanTeks = trim(req.Tanggapan)
	now := time.Now()
	t.UpdatedAt = &now
	if err := config.DB.Save(&t).Error; err != nil {
		respondDBError(c, "tanggapan_update", err)
		return
	}
	logAction(c, "tanggapan_update_success", "id", t.IDTanggapan)
	c.JSON(http.StatusOK, gin.H{"message": "Tanggapan diperbarui", "data": t})
}

func DeleteTanggapan(c *gin.Context) {
	id := c.Param("id")
	var t models.Tanggapan
	if err := config.DB.First(&t, id).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			respondDBError(c, "tanggapan_delete_lookup", err)
			return
		}
		c.JSON(http.StatusNotFound, gin.H{"error": "Tanggapan tidak ditemukan"})
		return
	}
	if err := config.DB.Delete(&t).Error; err != nil {
		respondDBError(c, "tanggapan_delete", err)
		return
	}
	logAction(c, "tanggapan_delete_success", "id", t.IDTanggapan)
	c.JSON(http.StatusOK, gin.H{"message": "Tanggapan dihapus"})
}
