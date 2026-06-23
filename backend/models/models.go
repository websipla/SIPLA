package models

import "time"

type Masyarakat struct {
	NIK          string     `gorm:"column:nik;type:char(16);primaryKey" json:"nik"`
	Name         string     `gorm:"column:name;size:100;not null" json:"name"`
	Email        string     `gorm:"column:email;size:255;not null;uniqueIndex" json:"email"`
	Username     string     `gorm:"column:username;size:50;not null;uniqueIndex" json:"username"`
	JenisKelamin string     `gorm:"column:jenis_kelamin;size:20;not null" json:"jenis_kelamin"`
	Password     string     `gorm:"column:password;size:255;not null" json:"-"`
	Telp         string     `gorm:"column:telp;size:20" json:"telp"`
	Alamat       string     `gorm:"column:alamat;type:text" json:"alamat"`
	RT           string     `gorm:"column:rt" json:"rt"`
	RW           string     `gorm:"column:rw" json:"rw"`
	KodePos      string     `gorm:"column:kode_pos" json:"kode_pos"`
	ProvinceID   string     `gorm:"column:province_id" json:"province_id"`
	RegencyID    string     `gorm:"column:regency_id" json:"regency_id"`
	DistrictID   string     `gorm:"column:district_id" json:"district_id"`
	VillageID    string     `gorm:"column:village_id" json:"village_id"`
	CreatedAt    *time.Time `gorm:"column:created_at" json:"created_at,omitempty"`
	UpdatedAt    *time.Time `gorm:"column:updated_at" json:"updated_at,omitempty"`
}

func (Masyarakat) TableName() string { return "masyarakat" }

type Petugas struct {
	IDPetugas   uint64     `gorm:"column:id_petugas;primaryKey;autoIncrement" json:"id_petugas"`
	NamaPetugas string     `gorm:"column:nama_petugas;size:100;not null" json:"nama_petugas"`
	Username    string     `gorm:"column:username;size:50;not null;uniqueIndex" json:"username"`
	Password    string     `gorm:"column:password;size:255;not null" json:"-"`
	Telp        string     `gorm:"column:telp;size:20" json:"telp"`
	Roles       string     `gorm:"column:roles;size:20;not null" json:"roles"`
	CreatedAt   *time.Time `gorm:"column:created_at" json:"created_at,omitempty"`
	UpdatedAt   *time.Time `gorm:"column:updated_at" json:"updated_at,omitempty"`
}

func (Petugas) TableName() string { return "petugas" }

// Pengaduan — tambah TipeAspirasi
type Pengaduan struct {
	IDPengaduan    uint64      `gorm:"column:id_pengaduan;primaryKey;autoIncrement" json:"id_pengaduan"`
	TglPengaduan   time.Time   `gorm:"column:tgl_pengaduan" json:"tgl_pengaduan"`
	NIK            string      `gorm:"column:nik;type:char(16);not null;index" json:"nik"`
	TipeAspirasi   string      `gorm:"column:tipe_aspirasi" json:"tipe_aspirasi"` // ← BARU
	JudulLaporan   string      `gorm:"column:judul_laporan;size:255;not null" json:"judul_laporan"`
	IsiLaporan     string      `gorm:"column:isi_laporan;type:text;not null" json:"isi_laporan"`
	TglKejadian    time.Time   `gorm:"column:tgl_kejadian" json:"tgl_kejadian"`
	LokasiKejadian string      `gorm:"column:lokasi_kejadian;type:text;not null" json:"lokasi_kejadian"`
	Latitude       *float64    `gorm:"column:latitude;type:numeric(10,8)" json:"latitude"`
	Longitude      *float64    `gorm:"column:longitude;type:numeric(11,8)" json:"longitude"`
	Foto           string      `gorm:"column:foto" json:"foto"`
	Status         string      `gorm:"column:status" json:"status"`
	CreatedAt      *time.Time  `gorm:"column:created_at" json:"created_at,omitempty"`
	UpdatedAt      *time.Time  `gorm:"column:updated_at" json:"updated_at,omitempty"`
	Masyarakat     *Masyarakat `gorm:"foreignKey:NIK;references:NIK;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"masyarakat,omitempty"`
	Tanggapan      []Tanggapan `gorm:"foreignKey:IDPengaduan;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"tanggapan,omitempty"`
}

func (Pengaduan) TableName() string { return "pengaduan" }

// Tanggapan — tambah FileBukti2, FileBukti3
type Tanggapan struct {
	IDTanggapan   uint64     `gorm:"column:id_tanggapan;primaryKey;autoIncrement" json:"id_tanggapan"`
	IDPengaduan   uint64     `gorm:"column:id_pengaduan;not null;index" json:"id_pengaduan"`
	TglTanggapan  time.Time  `gorm:"column:tgl_tanggapan" json:"tgl_tanggapan"`
	TanggapanTeks string     `gorm:"column:tanggapan" json:"tanggapan"`
	FileBukti     string     `gorm:"column:file_bukti" json:"file_bukti"`     // bukti ke-1
	FileBukti2    string     `gorm:"column:file_bukti_2" json:"file_bukti_2"` // ← BARU
	FileBukti3    string     `gorm:"column:file_bukti_3" json:"file_bukti_3"` // ← BARU
	IDPetugas     uint64     `gorm:"column:id_petugas;not null;index" json:"id_petugas"`
	CreatedAt     *time.Time `gorm:"column:created_at" json:"created_at,omitempty"`
	UpdatedAt     *time.Time `gorm:"column:updated_at" json:"updated_at,omitempty"`
	Petugas       *Petugas   `gorm:"foreignKey:IDPetugas;references:IDPetugas;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"petugas,omitempty"`
}

func (Tanggapan) TableName() string { return "tanggapan" }

// Permohonan — tambah FileSuratRTRW, FileFotoRumah
type Permohonan struct {
	ID             uint64        `gorm:"column:id;primaryKey;autoIncrement" json:"id"`
	NIK            string        `gorm:"column:nik;type:char(16);not null;index" json:"nik"`
	IDJenisLayanan uint64        `gorm:"column:id_jenis_layanan;not null;index" json:"id_jenis_layanan"`
	TglPermohonan  time.Time     `gorm:"column:tgl_permohonan" json:"tgl_permohonan"`
	Keterangan     string        `gorm:"column:keterangan;type:text" json:"keterangan"`
	FileKTP        string        `gorm:"column:file_ktp" json:"file_ktp"`
	FileKK         string        `gorm:"column:file_kk" json:"file_kk"`
	FileSuratRTRW  string        `gorm:"column:file_surat_rtrw" json:"file_surat_rtrw"` // ← BARU
	FileFotoRumah  string        `gorm:"column:file_foto_rumah" json:"file_foto_rumah"` // ← BARU
	FilePendukung  string        `gorm:"column:file_pendukung" json:"file_pendukung"`
	Status         string        `gorm:"column:status" json:"status"`
	CatatanPetugas string        `gorm:"column:catatan_petugas;type:text" json:"catatan_petugas"`
	FileHasil      string        `gorm:"column:file_hasil" json:"file_hasil"`
	IDPetugas      *uint64       `gorm:"column:id_petugas" json:"id_petugas"`
	TglSelesai     *time.Time    `gorm:"column:tgl_selesai" json:"tgl_selesai"`
	CreatedAt      *time.Time    `gorm:"column:created_at" json:"created_at,omitempty"`
	UpdatedAt      *time.Time    `gorm:"column:updated_at" json:"updated_at,omitempty"`
	Masyarakat     *Masyarakat   `gorm:"foreignKey:NIK;references:NIK;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"masyarakat,omitempty"`
	JenisLayanan   *JenisLayanan `gorm:"foreignKey:IDJenisLayanan;references:ID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"jenis_layanan,omitempty"`
	Petugas        *Petugas      `gorm:"foreignKey:IDPetugas;references:IDPetugas;constraint:OnUpdate:CASCADE,OnDelete:SET NULL" json:"petugas,omitempty"`
}

func (Permohonan) TableName() string { return "permohonan" }

type KelurahanInfo struct {
	ID          uint64 `gorm:"column:id;primaryKey;autoIncrement" json:"id"`
	Nama        string `gorm:"column:nama" json:"nama"`
	Kecamatan   string `gorm:"column:kecamatan" json:"kecamatan"`
	Kota        string `gorm:"column:kota" json:"kota"`
	Provinsi    string `gorm:"column:provinsi" json:"provinsi"`
	KodePos     string `gorm:"column:kode_pos" json:"kode_pos"`
	LuasWilayah string `gorm:"column:luas_wilayah" json:"luas_wilayah"`

	// Penduduk
	JumlahPenduduk  int `gorm:"column:jumlah_penduduk" json:"jumlah_penduduk"`
	JumlahKK        int `gorm:"column:jumlah_kk" json:"jumlah_kk"`
	JumlahLakiLaki  int `gorm:"column:jumlah_laki_laki" json:"jumlah_laki_laki"`
	JumlahPerempuan int `gorm:"column:jumlah_perempuan" json:"jumlah_perempuan"`

	// Sarana Pendidikan
	JmlPaudKbTk        int `gorm:"column:jml_paud_kb_tk" json:"jml_paud_kb_tk"`
	JmlSekolahDasar    int `gorm:"column:jml_sekolah_dasar" json:"jml_sekolah_dasar"`
	JmlSltp            int `gorm:"column:jml_sltp" json:"jml_sltp"`
	JmlSlta            int `gorm:"column:jml_slta" json:"jml_slta"`
	JmlPerguruanTinggi int `gorm:"column:jml_perguruan_tinggi" json:"jml_perguruan_tinggi"`

	// Sarana Kesehatan
	JmlRumahSakit        int `gorm:"column:jml_rumah_sakit" json:"jml_rumah_sakit"`
	JmlPuskesmas         int `gorm:"column:jml_puskesmas" json:"jml_puskesmas"`
	JmlKlinik            int `gorm:"column:jml_klinik" json:"jml_klinik"`
	JmlKlinikTradisional int `gorm:"column:jml_klinik_tradisional" json:"jml_klinik_tradisional"`
	JmlPosyandu          int `gorm:"column:jml_posyandu" json:"jml_posyandu"`

	Visi           string     `gorm:"column:visi" json:"visi"`
	Misi           string     `gorm:"column:misi" json:"misi"`
	Sejarah        string     `gorm:"column:sejarah" json:"sejarah"`
	FotoKantor     string     `gorm:"column:foto_kantor" json:"foto_kantor"`
	AlamatKantor   string     `gorm:"column:alamat_kantor" json:"alamat_kantor"`
	TelpKantor     string     `gorm:"column:telp_kantor" json:"telp_kantor"`
	EmailKantor    string     `gorm:"column:email_kantor" json:"email_kantor"`
	JamOperasional string     `gorm:"column:jam_operasional" json:"jam_operasional"`
	CreatedAt      *time.Time `gorm:"column:created_at" json:"created_at,omitempty"`
	UpdatedAt      *time.Time `gorm:"column:updated_at" json:"updated_at,omitempty"`
}

func (KelurahanInfo) TableName() string { return "kelurahan_info" }

type JenisLayanan struct {
	ID           uint64     `gorm:"column:id;primaryKey;autoIncrement" json:"id"`
	NamaLayanan  string     `gorm:"column:nama_layanan" json:"nama_layanan"`
	Deskripsi    string     `gorm:"column:deskripsi;type:text" json:"deskripsi"`
	Syarat       string     `gorm:"column:syarat;type:text" json:"syarat"`
	EstimasiHari int        `gorm:"column:estimasi_hari" json:"estimasi_hari"`
	IsActive     bool       `gorm:"column:is_active;not null;default:true" json:"is_active"`
	CreatedAt    *time.Time `gorm:"column:created_at" json:"created_at,omitempty"`
	UpdatedAt    *time.Time `gorm:"column:updated_at" json:"updated_at,omitempty"`
}

func (JenisLayanan) TableName() string { return "jenis_layanan" }

type Province struct {
	ID   string `gorm:"column:id;primaryKey" json:"id"`
	Name string `gorm:"column:name" json:"name"`
}

func (Province) TableName() string { return "provinces" }

type Regency struct {
	ID         string `gorm:"column:id;primaryKey" json:"id"`
	ProvinceID string `gorm:"column:province_id;index" json:"province_id"`
	Name       string `gorm:"column:name" json:"name"`
}

func (Regency) TableName() string { return "regencies" }

type District struct {
	ID        string `gorm:"column:id;primaryKey" json:"id"`
	RegencyID string `gorm:"column:regency_id;index" json:"regency_id"`
	Name      string `gorm:"column:name" json:"name"`
}

func (District) TableName() string { return "districts" }

type Village struct {
	ID         string `gorm:"column:id;primaryKey" json:"id"`
	DistrictID string `gorm:"column:district_id;index" json:"district_id"`
	Name       string `gorm:"column:name" json:"name"`
}

func (Village) TableName() string { return "villages" }
