# Usar imagen oficial de Node.js
FROM node:18-alpine

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install --only=production

# Copiar código fuente
COPY src/ ./src/

# Crear directorio para archivos GTFS generados
RUN mkdir -p generated-gtfs

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Cambiar propietario de archivos
RUN chown -R nodejs:nodejs /app
USER nodejs

# Exponer puerto
EXPOSE 3000

# Comando de inicio
CMD ["npm", "start"]
