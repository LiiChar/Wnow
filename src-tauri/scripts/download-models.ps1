#!/usr/bin/env pwsh
# Download PaddleOCR ONNX models for paddle-ocr-rs

$modelsDir = Join-Path $PSScriptRoot "..\models"
New-Item -ItemType Directory -Force -Path $modelsDir | Out-Null

Write-Host "Downloading PaddleOCR models to $modelsDir..."

# PaddleOCR v4 mobile models from HuggingFace
$models = @{
    "ch_PP-OCRv4_det_infer.onnx" = "https://huggingface.co/SWHL/RapidOCR/resolve/main/PP-OCRv4/ch_PP-OCRv4_det_infer.onnx"
    "ch_PP-OCRv4_rec_infer.onnx" = "https://huggingface.co/SWHL/RapidOCR/resolve/main/PP-OCRv4/ch_PP-OCRv4_rec_infer.onnx"
    "ppocr_keys_v1.txt" = "https://raw.githubusercontent.com/RapidAI/RapidOcrOnnx/main/models/ppocr_keys_v1.txt"
}

foreach ($model in $models.GetEnumerator()) {
    $outputPath = Join-Path $modelsDir $model.Key
    if (Test-Path $outputPath) {
        Write-Host "Skipping $($model.Key) - already exists"
        continue
    }
    
    Write-Host "Downloading $($model.Key)..."
    try {
        Invoke-WebRequest -Uri $model.Value -OutFile $outputPath
        Write-Host "✓ Downloaded $($model.Key)"
    } catch {
        Write-Error "Failed to download $($model.Key): $_"
    }
}

Write-Host "`nModels downloaded to: $modelsDir"
Write-Host "Run 'cargo build' to compile with the new OCR backend"
