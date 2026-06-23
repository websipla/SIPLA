package models

import "time"

type PermintaanResetPassword struct {
	ID         uint64      `gorm:"column:id;primaryKey;autoIncrement" json:"id"`
	NIK        string      `gorm:"column:nik;type:char(16);not null;index" json:"nik"`
	NoHP       string      `gorm:"column:no_hp" json:"no_hp"`
	Status     string      `gorm:"column:status" json:"status"` // menunggu | selesai
	Dibaca     bool        `gorm:"column:dibaca" json:"dibaca"`
	Catatan    string      `gorm:"column:catatan" json:"catatan"`
	CreatedAt  *time.Time  `gorm:"column:created_at" json:"created_at,omitempty"`
	UpdatedAt  *time.Time  `gorm:"column:updated_at" json:"updated_at,omitempty"`
	Masyarakat *Masyarakat `gorm:"foreignKey:NIK;references:NIK;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"masyarakat,omitempty"`
}

func (PermintaanResetPassword) TableName() string { return "permintaan_reset_password" }
