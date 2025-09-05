#!/bin/bash

# Script para inicializar Ollama con modelos necesarios
echo "🚀 Inicializando Ollama para GTFS AI Generator..."

# Verificar si Ollama está corriendo
if ! curl -s http://localhost:11434/api/tags > /dev/null; then
    echo "❌ Ollama no está corriendo. Iniciando Ollama..."
    docker-compose up -d ollama
    sleep 10
fi

# Lista de modelos recomendados (de menor a mayor tamaño)
MODELS=(
    "llama2:7b"      # Modelo base recomendado
    "llama2:13b"     # Modelo más grande para mejor calidad
    "codellama:7b"   # Modelo especializado en código
    "mistral:7b"     # Alternativa eficiente
)

echo "📥 Descargando modelos de Ollama..."

for model in "${MODELS[@]}"; do
    echo "Descargando $model..."
    docker exec gtfs-ollama ollama pull $model
    
    if [ $? -eq 0 ]; then
        echo "✅ $model descargado exitosamente"
    else
        echo "❌ Error descargando $model"
    fi
done

echo "🔧 Configurando modelo por defecto..."
docker exec gtfs-ollama ollama list

echo "✅ Inicialización de Ollama completada!"
echo ""
echo "Modelos disponibles:"
docker exec gtfs-ollama ollama list

echo ""
echo "Para usar un modelo específico, actualiza la variable OLLAMA_MODEL en tu archivo .env"
echo "Ejemplo: OLLAMA_MODEL=llama2:7b"
