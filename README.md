# GTFS AI Generator

Un generador avanzado de datos GTFS (General Transit Feed Specification) usando inteligencia artificial con modelos locales (Ollama) y MongoDB con Docker.

## 🚀 Características

- **Generación inteligente con IA**: Usa LangChain.js + Ollama para modelos locales
- **Datos realistas y coherentes**: Genera ciudades ficticias con lógica urbana real
- **Múltiples tipos de transporte**: Bus, metro, tranvía, ferry, etc.
- **Geografía realista**: Coordenadas y rutas que forman redes lógicas
- **Horarios coherentes**: Frecuencias y horarios basados en patrones reales
- **Base de datos MongoDB**: Almacenamiento escalable con Mongoose
- **API REST completa**: Endpoints para generación, consulta y exportación
- **Exportación GTFS**: Archivos CSV y ZIP listos para usar
- **Contenedores Docker**: Despliegue fácil con Ollama incluido
- **Interfaz web**: MongoDB Express para gestión de datos

## 📁 Estructura del Proyecto

```
gtfs-ai-generator/
├── src/
│   ├── config/          # Configuraciones de la aplicación
│   ├── models/          # Modelos de MongoDB/Mongoose
│   ├── controllers/     # Controladores de la API
│   ├── services/        # Lógica de negocio
│   └── generators/      # Generadores de datos GTFS
├── generated-gtfs/      # Archivos GTFS generados
├── mongo-init/          # Scripts de inicialización de MongoDB
├── docs/               # Documentación
├── docker-compose.yml  # Configuración de Docker Compose
├── Dockerfile          # Imagen de la aplicación
└── package.json        # Dependencias de Node.js
```

## 🛠️ Instalación

### Prerrequisitos

- Docker y Docker Compose
- Node.js 18+ (para desarrollo local)
- 8GB+ RAM recomendado (para modelos de IA)
- GPU opcional (para mejor rendimiento de IA)

### Configuración

1. Clona el repositorio:
```bash
git clone https://github.com/tu-usuario/gtfs-ai-generator.git
cd gtfs-ai-generator
```

2. Copia el archivo de variables de entorno:
```bash
cp env.example .env
```

3. Edita el archivo `.env` con tus configuraciones:
```bash
# Configuración de Ollama (modelo local)
OLLAMA_MODEL=llama2:7b
OLLAMA_BASE_URL=http://localhost:11434

# Configura las credenciales de MongoDB
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=tu-password-seguro

# Opcional: API Key de OpenAI como respaldo
OPENAI_API_KEY=sk-your-openai-api-key-here
```

## 🐳 Uso con Docker

### 1. Iniciar todos los servicios:
```bash
docker-compose up -d
```

### 2. Inicializar Ollama con modelos:
```bash
# Ejecutar script de inicialización
chmod +x scripts/init-ollama.sh
./scripts/init-ollama.sh

# O manualmente:
docker exec gtfs-ollama ollama pull llama2:7b
```

### 3. Ver logs:
```bash
docker-compose logs -f
```

### 4. Detener servicios:
```bash
docker-compose down
```

## 🚀 Desarrollo Local

### Instalar dependencias:
```bash
npm install
```

### Ejecutar en modo desarrollo:
```bash
npm run dev
```

### Ejecutar tests:
```bash
npm test
```

## 📊 Servicios Disponibles

- **API Principal**: http://localhost:3000
- **MongoDB Express**: http://localhost:8081
- **MongoDB**: localhost:27017
- **Ollama API**: http://localhost:11434

## 🔧 API Endpoints

### Generación de Ciudades
- `POST /api/cities/generate` - Generar nueva ciudad GTFS completa
- `GET /api/cities` - Listar ciudades generadas
- `GET /api/cities/:id` - Obtener ciudad específica
- `GET /api/cities/:id/preview` - Vista previa de datos
- `GET /api/cities/:id/export` - Exportar GTFS como ZIP
- `DELETE /api/cities/:id` - Eliminar ciudad

### Generación Individual (Legacy)
- `POST /api/generate/agency` - Generar datos de agencia
- `POST /api/generate/routes` - Generar rutas
- `POST /api/generate/stops` - Generar paradas
- `POST /api/generate/complete` - Generar feed GTFS completo

### Consulta de Datos
- `GET /api/gtfs/agencies` - Listar agencias
- `GET /api/gtfs/routes` - Listar rutas
- `GET /api/gtfs/stops` - Listar paradas
- `GET /api/gtfs/export` - Exportar datos GTFS

## 📝 Uso de la API

### Generar una ciudad completa:

```bash
curl -X POST http://localhost:3000/api/cities/generate \
  -H "Content-Type: application/json" \
  -d '{
    "cityName": "Valencia Ejemplo",
    "citySize": "medium",
    "cityType": "mixed",
    "populationDensity": "high",
    "transportTypes": ["bus", "subway", "tram"],
    "numberOfRoutes": 15,
    "operatingHours": {
      "start": "05:00",
      "end": "23:30"
    },
    "touristAreas": true,
    "industrialZones": true,
    "language": "es"
  }'
```

### Listar ciudades generadas:

```bash
curl http://localhost:3000/api/cities
```

### Obtener vista previa de una ciudad:

```bash
curl http://localhost:3000/api/cities/city_1234567890/preview
```

### Exportar GTFS de una ciudad:

```bash
curl http://localhost:3000/api/cities/city_1234567890/export?format=zip
```

## 🗄️ Estructura de la Base de Datos

El sistema utiliza las siguientes colecciones principales:

### Colecciones de Aplicación
- `cities` - Información de ciudades generadas
- `generation_requests` - Solicitudes de generación con logs
- `agencies` - Información de agencias de transporte
- `routes` - Rutas de transporte
- `stops` - Paradas de transporte

### Colecciones GTFS Estándar
- `trips` - Viajes específicos
- `stop_times` - Horarios de paradas
- `calendar` - Calendarios de servicio
- `shapes` - Geometría de rutas
- `feed_info` - Información del feed GTFS

## 🔒 Seguridad

- Variables de entorno para credenciales sensibles
- Rate limiting en la API
- Validación de entrada con Joi
- Headers de seguridad con Helmet
- Usuario no-root en contenedores Docker

## 📈 Monitoreo

- Logs estructurados con Winston
- Métricas de generación
- Estado de salud de la API
- Monitoreo de uso de OpenAI

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Autor

**Ai Ragare** - [ai.ragare@gmail.com](mailto:ai.ragare@gmail.com)

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 🆘 Soporte

Si tienes problemas o preguntas:

1. Revisa la documentación en `/docs`
2. Busca en los issues existentes
3. Crea un nuevo issue con detalles del problema

## 🔮 Roadmap

- [x] Sistema de generación con IA local (Ollama)
- [x] Generación completa de ciudades GTFS
- [x] API REST completa
- [x] Exportación a formato GTFS estándar
- [ ] Interfaz web para generación visual
- [ ] Soporte para más modelos de IA (GPT-4, Claude, etc.)
- [ ] Validación avanzada de GTFS
- [ ] Integración con APIs de transporte real
- [ ] Generación de mapas automática
- [ ] Soporte para múltiples idiomas
- [ ] Generación de datos históricos
- [ ] Análisis de patrones de movilidad
- [ ] Optimización de rutas con IA
