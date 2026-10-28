param(
    [string]$Unity = "C:\Program Files\Unity\Hub\Editor\6000.6.5f1\Editor\Unity.exe",
    [string]$Out = "Builds\Windows\CalamaCity.exe"
)

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$outPath = Join-Path $root $Out

if (-not (Test-Path $Unity)) {
    Write-Error "No se encontro Unity en '$Unity'. Pasa -Unity con la ruta correcta."
    exit 1
}

& $Unity -batchmode -projectPath $root -buildWindows64Player $outPath -quit
exit $LASTEXITCODE
