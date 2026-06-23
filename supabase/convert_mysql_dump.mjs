import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const sourcePath = path.resolve(here, '..', 'pengaduan_masyarakat3.sql')
const sql = fs.readFileSync(sourcePath, 'utf8')

const allowedColumns = {
  failed_jobs: ['id', 'uuid', 'connection', 'queue', 'payload', 'exception', 'failed_at'],
  jenis_layanan: ['id', 'nama_layanan', 'deskripsi', 'syarat', 'estimasi_hari', 'is_active', 'created_at', 'updated_at'],
  kelurahan_info: [
    'id', 'nama', 'kecamatan', 'kota', 'provinsi', 'kode_pos', 'luas_wilayah',
    'jumlah_penduduk', 'jumlah_kk', 'visi', 'misi', 'sejarah', 'foto_kantor',
    'alamat_kantor', 'telp_kantor', 'email_kantor', 'jam_operasional',
    'created_at', 'updated_at',
  ],
  masyarakat: [
    'nik', 'name', 'email', 'email_verified_at', 'username', 'jenis_kelamin', 'password', 'telp',
    'alamat', 'rt', 'rw', 'kode_pos', 'province_id', 'regency_id', 'district_id',
    'village_id', 'remember_token', 'created_at', 'updated_at',
  ],
  migrations: ['id', 'migration', 'batch'],
  password_resets: ['email', 'token', 'created_at'],
  personal_access_tokens: [
    'id', 'tokenable_type', 'tokenable_id', 'name', 'token', 'abilities',
    'last_used_at', 'created_at', 'updated_at',
  ],
  petugas: ['id_petugas', 'nama_petugas', 'username', 'password', 'telp', 'roles', 'created_at', 'updated_at'],
  pengaduan: [
    'id_pengaduan', 'tgl_pengaduan', 'nik', 'tipe_aspirasi', 'judul_laporan',
    'isi_laporan', 'tgl_kejadian', 'lokasi_kejadian', 'latitude', 'longitude',
    'foto', 'status', 'created_at', 'updated_at',
  ],
  permohonan: [
    'id', 'nik', 'id_jenis_layanan', 'tgl_permohonan', 'keterangan', 'file_ktp',
    'file_kk', 'file_pendukung', 'status', 'catatan_petugas', 'file_hasil',
    'id_petugas', 'tgl_selesai', 'created_at', 'updated_at',
  ],
  tanggapan: [
    'id_tanggapan', 'id_pengaduan', 'tgl_tanggapan', 'tanggapan', 'file_bukti',
    'id_petugas', 'created_at', 'updated_at', 'file_bukti_2', 'file_bukti_3',
  ],
  provinces: ['id', 'name'],
  regencies: ['id', 'province_id', 'name'],
  districts: ['id', 'regency_id', 'name'],
  villages: ['id', 'district_id', 'name'],
}

function splitStatements(input) {
  const statements = []
  let start = 0
  let quote = false
  let escaped = false
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (quote) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === "'") quote = false
    } else if (ch === "'") {
      quote = true
    } else if (ch === ';') {
      statements.push(input.slice(start, i + 1))
      start = i + 1
    }
  }
  return statements
}

function splitTopLevel(input, delimiter = ',') {
  const parts = []
  let start = 0
  let quote = false
  let escaped = false
  let depth = 0
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (quote) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === "'") quote = false
    } else if (ch === "'") {
      quote = true
    } else if (ch === '(') {
      depth++
    } else if (ch === ')') {
      depth--
    } else if (ch === delimiter && depth === 0) {
      parts.push(input.slice(start, i).trim())
      start = i + 1
    }
  }
  parts.push(input.slice(start).trim())
  return parts
}

function parseTuples(valuesText) {
  const tuples = []
  let quote = false
  let escaped = false
  let depth = 0
  let start = -1
  for (let i = 0; i < valuesText.length; i++) {
    const ch = valuesText[i]
    if (quote) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === "'") quote = false
      continue
    }
    if (ch === "'") quote = true
    else if (ch === '(') {
      if (depth === 0) start = i + 1
      depth++
    } else if (ch === ')') {
      depth--
      if (depth === 0 && start >= 0) {
        tuples.push(splitTopLevel(valuesText.slice(start, i)))
        start = -1
      }
    }
  }
  return tuples
}

function postgresValue(raw, table, column) {
  const value = raw.trim()
  if (value.toUpperCase() === 'NULL') return 'NULL'
  if (table === 'jenis_layanan' && column === 'is_active') {
    return value === '1' ? 'TRUE' : 'FALSE'
  }
  if (!value.startsWith("'")) return value

  let body = value.slice(1, -1)
  body = body
    .replace(/\\\\/g, '\u0000')
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\u0000/g, '\\')
    .replace(/''/g, "'")

  return `'${body.replace(/'/g, "''")}'`
}

const converted = Object.fromEntries(Object.keys(allowedColumns).map((table) => [table, []]))

for (const statement of splitStatements(sql)) {
  const match = statement.match(
    /INSERT INTO\s+`([^`]+)`\s*\(([\s\S]*?)\)\s*VALUES\s*([\s\S]*);/i,
  )
  if (!match) continue
  const [, table, columnsText, valuesText] = match
  if (!allowedColumns[table]) continue

  const sourceColumns = [...columnsText.matchAll(/`([^`]+)`/g)].map((item) => item[1])
  const wantedColumns = allowedColumns[table].filter((column) => sourceColumns.includes(column))
  const indexes = wantedColumns.map((column) => sourceColumns.indexOf(column))

  for (const tuple of parseTuples(valuesText)) {
    if (tuple.length !== sourceColumns.length) {
      throw new Error(`Jumlah kolom tidak cocok pada tabel ${table}`)
    }
    const values = indexes.map((index, position) =>
      postgresValue(tuple[index], table, wantedColumns[position]),
    )
    converted[table].push({ columns: wantedColumns, values })
  }
}

const primaryKeys = {
  provinces: ['id'],
  regencies: ['id'],
  districts: ['id'],
  villages: ['id'],
  failed_jobs: ['id'],
  jenis_layanan: ['id'],
  kelurahan_info: ['id'],
  masyarakat: ['nik'],
  migrations: ['id'],
  personal_access_tokens: ['id'],
  petugas: ['id_petugas'],
  pengaduan: ['id_pengaduan'],
  permohonan: ['id'],
  tanggapan: ['id_tanggapan'],
}

function deduplicateRows(table, rows) {
  const keys = primaryKeys[table]
  if (!keys || !rows.length) return rows

  const indexes = keys.map((key) => rows[0].columns.indexOf(key))
  const unique = new Map()
  for (const row of rows) {
    const key = indexes.map((index) => row.values[index]).join('\u001f')
    const previous = unique.get(key)
    if (previous && previous.values.join('\u001f') !== row.values.join('\u001f')) {
      throw new Error(`Data duplikat dengan isi berbeda pada ${table}, key ${key}`)
    }
    unique.set(key, row)
  }
  return [...unique.values()]
}

for (const table of Object.keys(converted)) {
  converted[table] = deduplicateRows(table, converted[table])
}

function validateForeignKey(childTable, childColumn, parentTable, parentColumn) {
  const parentRows = converted[parentTable]
  const parentIndex = parentRows[0]?.columns.indexOf(parentColumn) ?? -1
  const childRows = converted[childTable]
  const childIndex = childRows[0]?.columns.indexOf(childColumn) ?? -1
  if (parentIndex < 0 || childIndex < 0) return

  const parentValues = new Set(parentRows.map((row) => row.values[parentIndex]))
  const missing = childRows
    .map((row) => row.values[childIndex])
    .filter((value) => value !== 'NULL' && !parentValues.has(value))
  if (missing.length) {
    throw new Error(
      `Foreign key ${childTable}.${childColumn} memiliki ${missing.length} parent yang tidak ditemukan`,
    )
  }
}

for (const relation of [
  ['regencies', 'province_id', 'provinces', 'id'],
  ['districts', 'regency_id', 'regencies', 'id'],
  ['villages', 'district_id', 'districts', 'id'],
  ['pengaduan', 'nik', 'masyarakat', 'nik'],
  ['permohonan', 'nik', 'masyarakat', 'nik'],
  ['permohonan', 'id_jenis_layanan', 'jenis_layanan', 'id'],
  ['permohonan', 'id_petugas', 'petugas', 'id_petugas'],
  ['tanggapan', 'id_pengaduan', 'pengaduan', 'id_pengaduan'],
  ['tanggapan', 'id_petugas', 'petugas', 'id_petugas'],
]) {
  validateForeignKey(...relation)
}

function renderInsert(table, rows) {
  if (!rows.length) return ''
  const columns = rows[0].columns.map((column) => `"${column}"`).join(', ')
  const chunks = []
  for (let i = 0; i < rows.length; i += 500) {
    const values = rows
      .slice(i, i + 500)
      .map((row) => `(${row.values.join(', ')})`)
      .join(',\n')
    chunks.push(
      `INSERT INTO "${table}" (${columns}) VALUES\n${values}\nON CONFLICT DO NOTHING;`,
    )
  }
  return chunks.join('\n\n')
}

function renderFile(tables, title) {
  const childFirst = [...tables].reverse()
  const sections = [
    `-- ${title}`,
    '-- Generated from pengaduan_masyarakat3.sql. Jalankan setelah supabase/schema.sql.',
    'BEGIN;',
    `TRUNCATE TABLE ${childFirst.map((table) => `"${table}"`).join(', ')} RESTART IDENTITY CASCADE;`,
  ]
  for (const table of tables) sections.push(renderInsert(table, converted[table]))

  for (const [table, id] of [
    ['jenis_layanan', 'id'],
    ['kelurahan_info', 'id'],
    ['failed_jobs', 'id'],
    ['migrations', 'id'],
    ['personal_access_tokens', 'id'],
    ['petugas', 'id_petugas'],
    ['pengaduan', 'id_pengaduan'],
    ['permohonan', 'id'],
    ['tanggapan', 'id_tanggapan'],
  ]) {
    if (tables.includes(table)) {
      sections.push(
        `SELECT setval(pg_get_serial_sequence('"${table}"', '${id}'), COALESCE(MAX("${id}"), 1), MAX("${id}") IS NOT NULL) FROM "${table}";`,
      )
    }
  }
  sections.push('COMMIT;')
  return sections.filter(Boolean).join('\n\n') + '\n'
}

const tables = [
  'provinces',
  'regencies',
  'districts',
  'villages',
  'jenis_layanan',
  'kelurahan_info',
  'masyarakat',
  'petugas',
  'pengaduan',
  'permohonan',
  'tanggapan',
  'failed_jobs',
  'migrations',
  'password_resets',
  'personal_access_tokens',
]

fs.writeFileSync(
  path.join(here, 'seed.sql'),
  renderFile(tables, 'SIPLA data import for Supabase PostgreSQL'),
)

for (const table of tables) {
  console.log(`${table}: ${converted[table].length} row(s)`)
}
