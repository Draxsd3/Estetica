# ============================================================================
# Aurora — Backup do banco de dados (Windows PowerShell)
#
# Uso:
#   .\app\db\backup.ps1
#
# Deteta automaticamente:
#   • DATABASE_URL definida  → PostgreSQL via pg_dump
#   • Caso contrário         → cópia do arquivo SQLite (clinica.db)
#
# Os backups são gravados em ./backups com retenção configurável.
# ============================================================================

$ErrorActionPreference = "Stop"

$BackupDir = Join-Path (Get-Location) "backups"
$RetentionDays = 30
if ($env:BACKUP_RETENTION_DAYS) { $RetentionDays = [int]$env:BACKUP_RETENTION_DAYS }

if (-not (Test-Path $BackupDir)) { New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null }

$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupFile = Join-Path $BackupDir "aurora-$Timestamp"

if ($env:DATABASE_URL) {
    # -------------------- PostgreSQL via pg_dump --------------------
    $PgDump = $env:PG_DUMP_PATH
    if (-not $PgDump) {
        # Tenta localizar pg_dump no PATH
        $res = Get-Command pg_dump -ErrorAction SilentlyContinue
        if ($res) { $PgDump = "pg_dump" }
    }
    if (-not $PgDump) {
        Write-Error "DATABASE_URL está definida mas pg_dump não foi encontrado. Defina PG_DUMP_PATH ou instale o PostgreSQL Client."
    }
    $DumpFile = "$BackupFile.sql"
    Write-Host "[backup] Iniciando dump PostgreSQL → $DumpFile" -ForegroundColor Cyan
    & $PgDump $env:DATABASE_URL -f $DumpFile
    if ($LASTEXITCODE -ne 0) { Write-Error "pg_dump falhou com código $LASTEXITCODE" }
    Write-Host "[backup] Dump concluído: $DumpFile" -ForegroundColor Green
}
else {
    # -------------------- SQLite: cópia do arquivo --------------------
    $AppDir = Join-Path (Get-Location) "app"
    $DbFile = Join-Path $AppDir "data\clinica.db"
    if (-not (Test-Path $DbFile)) {
        Write-Error "Banco SQLite não encontrado em $DbFile. Rode o app ao menos uma vez para criá-lo."
    }
    $DumpFile = "$BackupFile.db"
    Copy-Item $DbFile $DumpFile -Force
    # Copia também WAL e SHM se existirem (consistência em tempo de execução não é garantida; ideal é parar o app antes)
    foreach ($ext in @("-wal","-shm")) {
        $f = $DbFile + $ext
        if (Test-Path $f) { Copy-Item $f ($DumpFile + $ext) -Force }
    }
    Write-Host "[backup] Cópia SQLite concluída: $DumpFile" -ForegroundColor Green
}

# -------------------- Retenção --------------------
$Cutoff = (Get-Date).AddDays(-$RetentionDays)
Get-ChildItem $BackupDir -File | Where-Object { $_.LastWriteTime -lt $Cutoff } | ForEach-Object {
    Write-Host "[backup] Removendo backup expirado: $($_.Name)" -ForegroundColor Yellow
    Remove-Item $_.FullName -Force
}

Write-Host "[backup] Processo finalizado. Backups em: $BackupDir" -ForegroundColor Green
