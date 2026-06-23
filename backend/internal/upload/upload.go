package upload

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

const (
	MaxImageSize    int64 = 5 << 20
	MaxDocumentSize int64 = 10 << 20
)

var (
	ErrNoFile = errors.New("file tidak dikirim")

	imageTypes = map[string]string{
		"image/jpeg": ".jpg",
		"image/png":  ".png",
		"image/webp": ".webp",
	}
	documentTypes = map[string]string{
		"image/jpeg":      ".jpg",
		"image/png":       ".png",
		"image/webp":      ".webp",
		"application/pdf": ".pdf",
	}
)

func BaseDir() string {
	if dir := strings.TrimSpace(os.Getenv("UPLOAD_DIR")); dir != "" {
		return dir
	}
	return "./assets"
}

func EnsureBaseDir() error {
	return os.MkdirAll(BaseDir(), 0o750)
}

func SaveImage(file *multipart.FileHeader, folder string) (string, error) {
	return save(file, folder, MaxImageSize, imageTypes)
}

func SaveDocument(file *multipart.FileHeader, folder string) (string, error) {
	return save(file, folder, MaxDocumentSize, documentTypes)
}

func save(header *multipart.FileHeader, folder string, maxSize int64, allowed map[string]string) (string, error) {
	if header == nil {
		return "", ErrNoFile
	}
	if header.Size <= 0 || header.Size > maxSize {
		return "", fmt.Errorf("ukuran file harus antara 1 byte dan %d MB", maxSize>>20)
	}

	source, err := header.Open()
	if err != nil {
		return "", fmt.Errorf("gagal membuka file: %w", err)
	}
	defer source.Close()

	sniff := make([]byte, 512)
	n, err := source.Read(sniff)
	if err != nil && !errors.Is(err, io.EOF) {
		return "", fmt.Errorf("gagal membaca file: %w", err)
	}
	contentType := http.DetectContentType(sniff[:n])
	extension, ok := allowed[contentType]
	if !ok {
		return "", fmt.Errorf("tipe file %q tidak diizinkan", contentType)
	}
	if _, err := source.Seek(0, io.SeekStart); err != nil {
		return "", fmt.Errorf("gagal membaca ulang file: %w", err)
	}

	token := make([]byte, 16)
	if _, err := rand.Read(token); err != nil {
		return "", fmt.Errorf("gagal membuat nama file aman: %w", err)
	}
	filename := hex.EncodeToString(token) + extension

	cleanFolder := filepath.Clean(filepath.FromSlash(folder))
	if cleanFolder == "." || filepath.IsAbs(cleanFolder) || strings.HasPrefix(cleanFolder, "..") {
		return "", errors.New("folder upload tidak valid")
	}
	targetDir := filepath.Join(BaseDir(), cleanFolder)
	if err := os.MkdirAll(targetDir, 0o750); err != nil {
		return "", fmt.Errorf("gagal membuat direktori upload: %w", err)
	}

	targetPath := filepath.Join(targetDir, filename)
	target, err := os.OpenFile(targetPath, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o640)
	if err != nil {
		return "", fmt.Errorf("gagal membuat file: %w", err)
	}
	defer target.Close()

	written, err := io.Copy(target, io.LimitReader(source, maxSize+1))
	if err != nil {
		_ = os.Remove(targetPath)
		return "", fmt.Errorf("gagal menyimpan file: %w", err)
	}
	if written > maxSize {
		_ = os.Remove(targetPath)
		return "", fmt.Errorf("ukuran file melebihi %d MB", maxSize>>20)
	}

	// Path publik tetap kompatibel dengan data lama dan route /assets.
	return filepath.ToSlash(filepath.Join("assets", cleanFolder, filename)), nil
}

// TODO: ganti implementasi penyimpanan lokal ini dengan Supabase Storage sebelum
// menjalankan backend pada platform tanpa persistent disk.
