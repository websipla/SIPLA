param(
    [Parameter(Mandatory = $true)]
    [string]$BaseUrl,
    [switch]$RunWriteTests
)

$ErrorActionPreference = "Stop"
$BaseUrl = $BaseUrl.TrimEnd("/")
$Api = "$BaseUrl/api"

function Assert-True {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) { throw $Message }
}

function Login {
    param([string]$Username, [string]$Role)
    $body = @{
        username = $Username
        password = "password123"
        role = $Role
    } | ConvertTo-Json
    return Invoke-RestMethod -Method Post -Uri "$Api/auth/login" -ContentType "application/json" -Body $body
}

Write-Host "Checking health..."
try {
    $health = Invoke-RestMethod -Uri "$Api/health"
}
catch {
    try {
        $legacyHealth = Invoke-RestMethod -Uri "$BaseUrl/health"
    }
    catch {
        throw "Backend tidak dapat diakses melalui $BaseUrl/health maupun $Api/health."
    }

    if ($legacyHealth.status -eq "ok") {
        throw "Backend hidup, tetapi /api/health belum tersedia. Railway masih menjalankan versi lama. Commit dan push perubahan lokal ke branch yang dideploy, lalu redeploy sebelum menjalankan smoke test."
    }
    throw
}
Assert-True ($health.status -eq "ok") "API health failed"
Assert-True ($health.database -eq "connected") "Database is not connected"

Write-Host "Checking dummy logins..."
$admin = Login -Username "admin" -Role "petugas"
$petugas = Login -Username "petugas1" -Role "petugas"
$warga = Login -Username "warga1" -Role "masyarakat"
Assert-True ($admin.role -eq "admin") "Admin role mismatch"
Assert-True ($petugas.role -eq "petugas") "Petugas role mismatch"
Assert-True ($warga.role -eq "masyarakat") "Masyarakat role mismatch"

$adminHeaders = @{ Authorization = "Bearer $($admin.token)" }
$wargaHeaders = @{ Authorization = "Bearer $($warga.token)" }

$counts = Invoke-RestMethod -Uri "$Api/debug/counts" -Headers $adminHeaders
Write-Host "Current database counts:"
$counts.data | ConvertTo-Json

$layanan = Invoke-RestMethod -Uri "$Api/jenis-layanan"
Assert-True ($layanan.data.Count -gt 0) "Jenis layanan is empty"

if (-not $RunWriteTests) {
    Write-Host "Read-only smoke test passed. Add -RunWriteTests to test inserts."
    exit 0
}

Write-Host "Running write tests..."
$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$aspirasi = & curl.exe -sS -X POST "$Api/aspirasi" `
    -H "Authorization: Bearer $($warga.token)" `
    -F "tipe_aspirasi=Lingkungan Hidup" `
    -F "judul_laporan=Smoke test $stamp" `
    -F "isi_laporan=Data otomatis untuk verifikasi penyimpanan database" `
    -F "tgl_kejadian=$(Get-Date -Format yyyy-MM-dd)" `
    -F "lokasi_kejadian=Lokasi smoke test"
if ($LASTEXITCODE -ne 0) { throw "Failed to create aspirasi" }
$aspirasiJson = $aspirasi | ConvertFrom-Json
Assert-True ([bool]$aspirasiJson.data.id_pengaduan) "Aspirasi ID was not returned"

$detail = Invoke-RestMethod -Uri "$Api/aspirasi/$($aspirasiJson.data.id_pengaduan)" -Headers $wargaHeaders
Assert-True ($detail.data.judul_laporan -eq "Smoke test $stamp") "Created aspirasi was not persisted"

$after = Invoke-RestMethod -Uri "$Api/debug/counts" -Headers $adminHeaders
Assert-True ($after.data.aspirasi -gt $counts.data.aspirasi) "Aspirasi count did not increase"

Write-Host "Write smoke test passed. Created aspirasi ID $($aspirasiJson.data.id_pengaduan)."
