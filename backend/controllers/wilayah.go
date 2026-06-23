package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"pengaduan/config"
	"pengaduan/models"
)

func GetProvinces(c *gin.Context) {
	var list []models.Province
	config.DB.Order("name").Find(&list)
	c.JSON(http.StatusOK, gin.H{"data": list})
}

func GetRegencies(c *gin.Context) {
	provinceID := c.Query("province_id")
	var list []models.Regency
	query := config.DB.Order("name")
	if provinceID != "" {
		query = query.Where("province_id = ?", provinceID)
	}
	query.Find(&list)
	c.JSON(http.StatusOK, gin.H{"data": list})
}

func GetDistricts(c *gin.Context) {
	regencyID := c.Query("regency_id")
	var list []models.District
	query := config.DB.Order("name")
	if regencyID != "" {
		query = query.Where("regency_id = ?", regencyID)
	}
	query.Find(&list)
	c.JSON(http.StatusOK, gin.H{"data": list})
}

func GetVillages(c *gin.Context) {
	districtID := c.Query("district_id")
	var list []models.Village
	query := config.DB.Order("name")
	if districtID != "" {
		query = query.Where("district_id = ?", districtID)
	}
	query.Find(&list)
	c.JSON(http.StatusOK, gin.H{"data": list})
}
