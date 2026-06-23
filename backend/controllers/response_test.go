package controllers

import "testing"

func TestStatusValidation(t *testing.T) {
	for _, status := range []string{"verifikasi_lapangan", "koordinasi", "proses_penyelesaian", "selesai", "ditolak"} {
		if !validAspirasiStatus(status) {
			t.Fatalf("expected valid aspirasi status: %s", status)
		}
	}
	if validAspirasiStatus("status_bebas") {
		t.Fatal("unexpected valid aspirasi status")
	}

	for _, status := range []string{"verifikasi_persyaratan", "pembuatan_draft", "penandatanganan", "register_dokumen", "selesai", "ditolak"} {
		if !validPermohonanStatus(status) {
			t.Fatalf("expected valid permohonan status: %s", status)
		}
	}
	if validPermohonanStatus("status_bebas") {
		t.Fatal("unexpected valid permohonan status")
	}
}

func TestMaskIdentifier(t *testing.T) {
	if got := maskIdentifier("3674010101010001"); got != "************0001" {
		t.Fatalf("unexpected masked identifier: %s", got)
	}
	if got := maskIdentifier("1234"); got != "1234" {
		t.Fatalf("short identifier should remain readable: %s", got)
	}
}
