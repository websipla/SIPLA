package upload

import (
	"bytes"
	"mime/multipart"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func multipartFileHeader(t *testing.T, name string, content []byte) *multipart.FileHeader {
	t.Helper()
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, err := writer.CreateFormFile("file", name)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := part.Write(content); err != nil {
		t.Fatal(err)
	}
	if err := writer.Close(); err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest("POST", "/", &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	if err := req.ParseMultipartForm(1 << 20); err != nil {
		t.Fatal(err)
	}
	return req.MultipartForm.File["file"][0]
}

func TestSaveImageUsesDetectedTypeAndRandomName(t *testing.T) {
	dir := t.TempDir()
	t.Setenv("UPLOAD_DIR", dir)
	png := []byte{0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52}
	header := multipartFileHeader(t, "../../dangerous.exe", png)

	publicPath, err := SaveImage(header, "pengaduan")
	if err != nil {
		t.Fatal(err)
	}
	if filepath.Ext(publicPath) != ".png" {
		t.Fatalf("expected detected .png extension, got %s", publicPath)
	}
	files, err := os.ReadDir(filepath.Join(dir, "pengaduan"))
	if err != nil {
		t.Fatal(err)
	}
	if len(files) != 1 || files[0].Name() == "dangerous.exe" {
		t.Fatalf("unsafe or missing saved file: %#v", files)
	}
}

func TestSaveDocumentRejectsUnknownType(t *testing.T) {
	t.Setenv("UPLOAD_DIR", t.TempDir())
	header := multipartFileHeader(t, "malware.exe", []byte("MZ-not-a-supported-document"))
	if _, err := SaveDocument(header, "bukti"); err == nil {
		t.Fatal("expected unsupported file type error")
	}
}
