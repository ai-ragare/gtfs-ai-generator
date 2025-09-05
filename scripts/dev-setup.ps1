# Script de configuración para desarrollo local
# Ejecutar después de instalar Node.js

Write-Host "🚀 Configurando proyecto para desarrollo local..." -ForegroundColor Green

# Verificar Node.js
Write-Host "📋 Verificando Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    $npmVersion = npm --version
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
    Write-Host "✅ npm: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js no está instalado. Por favor instálalo desde https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Instalar dependencias
Write-Host "📦 Instalando dependencias..." -ForegroundColor Yellow
npm install

# Verificar que Ollama esté corriendo
Write-Host "🤖 Verificando Ollama..." -ForegroundColor Yellow
try {
    $ollamaPath = "C:\Users\$env:USERNAME\AppData\Local\Programs\Ollama\ollama.exe"
    if (Test-Path $ollamaPath) {
        & $ollamaPath list
        Write-Host "✅ Ollama está funcionando" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Ollama no encontrado en la ruta esperada" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  No se pudo verificar Ollama" -ForegroundColor Yellow
}

# Verificar Docker
Write-Host "🐳 Verificando Docker..." -ForegroundColor Yellow
try {
    docker --version
    Write-Host "✅ Docker está disponible" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker no está disponible" -ForegroundColor Red
}

# Crear archivo .env si no existe
if (-not (Test-Path ".env")) {
    Write-Host "📝 Creando archivo .env..." -ForegroundColor Yellow
    Copy-Item "env.example" ".env"
    Write-Host "✅ Archivo .env creado. Edítalo con tus configuraciones." -ForegroundColor Green
}

Write-Host "🎉 Configuración completada!" -ForegroundColor Green
Write-Host ""
Write-Host "Próximos pasos:" -ForegroundColor Cyan
Write-Host "1. Edita el archivo .env con tus configuraciones" -ForegroundColor White
Write-Host "2. Ejecuta: npm run dev (para desarrollo local)" -ForegroundColor White
Write-Host "3. O ejecuta: docker-compose up -d (para usar Docker)" -ForegroundColor White
