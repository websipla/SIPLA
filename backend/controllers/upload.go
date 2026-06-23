package controllers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"pengaduan/internal/upload"
)

func saveOptionalImage(c *gin.Context, fieldName, folder string) (string, error) {
	file, err := c.FormFile(fieldName)
	if errors.Is(err, http.ErrMissingFile) {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	return upload.SaveImage(file, folder)
}

func saveOptionalDocument(c *gin.Context, fieldName, folder string) (string, error) {
	file, err := c.FormFile(fieldName)
	if errors.Is(err, http.ErrMissingFile) {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	return upload.SaveDocument(file, folder)
}

func respondUploadError(c *gin.Context, fieldName string, err error) {
	c.JSON(http.StatusBadRequest, gin.H{
		"error": "File " + fieldName + " tidak valid: " + err.Error(),
	})
}
