# 🍃 Instalación de MongoDB Local (Sin Docker)

## Opción 1: MongoDB Community Server

### Windows:
1. Descargar desde: https://www.mongodb.com/try/download/community
2. Instalar con configuración por defecto
3. MongoDB se ejecutará en `mongodb://localhost:27017`

### Configurar variables de entorno:
```bash
# En tu archivo .env
MONGO_URI=mongodb://localhost:27017/gtfs_generator
MONGO_ROOT_USERNAME=
MONGO_ROOT_PASSWORD=
MONGO_DATABASE=gtfs_generator
```

## Opción 2: MongoDB Atlas (Cloud)

1. Crear cuenta gratuita en: https://www.mongodb.com/atlas
2. Crear cluster gratuito
3. Obtener connection string
4. Configurar en .env:
```bash
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/gtfs_generator
```

## Opción 3: Usar solo OSM (Sin base de datos)

Si solo quieres probar la funcionalidad OSM, puedes modificar temporalmente el código para no usar MongoDB.
