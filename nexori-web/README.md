# 🚀 NexOff Web - Frontend con Liquid Glass

Frontend web moderno con efecto **Liquid Glass** (glassmorphism) conectado a tu backend PostgreSQL que corre en puerto 3000.

## ✨ Características Principales

### 🎨 Diseño Liquid Glass
- **Glassmorphism Premium**: Efecto de vidrio líquido con blur y transparencias
- **Animaciones Fluidas**: Orbes flotantes y gradientes animados
- **Totalmente Responsivo**: Adaptado a móvil, tablet y desktop
- **Sistema de Diseño Consistente**: Basado en tu paleta de colores

### 🔌 Integración con Backend
- Conectado a tu backend Express + PostgreSQL (puerto 3000)
- Autenticación con JWT
- Manejo de tokens y refresh tokens
- Interceptores de Axios para manejo automático de errores

### 📱 Páginas Implementadas
1. **Login con Liquid Glass**: Diseño premium con animaciones
2. **Dashboard**: Métricas en tiempo real
3. **Gestión de Bicicletas**: CRUD completo

## 🚀 Instalación Rápida

### 1. Clonar o Descomprimir

```bash
cd nexoff-web-v2
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Configurar Variables de Entorno

Crea un archivo `.env` en la raíz:

```bash
cp .env.example .env
```

Contenido del `.env`:

```env
VITE_API_URL=http://localhost:3000/api
VITE_ENV=development
```

### 4. Iniciar Backend (en otra terminal)

```bash
# En tu carpeta de backend
cd ../nexoff-backend
npm start

# El backend debe estar corriendo en http://localhost:3000
```

### 5. Iniciar Frontend

```bash
npm run dev
```

El frontend estará disponible en: **http://localhost:5173**

## 🔐 Autenticación

### Endpoints del Backend

El frontend se conecta a estos endpoints:

```
POST   http://localhost:3000/api/auth/login
POST   http://localhost:3000/api/auth/register
GET    http://localhost:3000/api/auth/profile
POST   http://localhost:3000/api/auth/refresh-token
POST   http://localhost:3000/api/auth/logout
```

### Estructura de Respuesta Esperada

**Login/Register exitoso:**

```json
{
  "success": true,
  "message": "Inicio de sesión exitoso",
  "data": {
    "user": {
      "id": "uuid",
      "email": "usuario@ejemplo.com",
      "name": "Nombre Usuario",
      "role": "admin",
      "isActive": true
    },
    "token": "jwt_token_aqui",
    "refreshToken": "refresh_token_aqui"
  }
}
```

**Error:**

```json
{
  "success": false,
  "message": "Credenciales inválidas"
}
```

## 🎨 Efecto Liquid Glass

El login incluye:

- ✅ **Fondo animado** con orbes flotantes
- ✅ **Glassmorphism** con `backdrop-filter: blur()`
- ✅ **Inputs de vidrio** con efectos hover y focus
- ✅ **Botón glass** con animación shimmer
- ✅ **Gradientes mesh** sutiles en el fondo
- ✅ **Animaciones suaves** en todos los elementos

## 📂 Estructura del Proyecto

```
nexoff-web-v2/
├── src/
│   ├── components/
│   │   └── common/          # Componentes reutilizables
│   ├── hooks/
│   │   └── useAuth.tsx      # Hook de autenticación (ACTUALIZADO)
│   ├── pages/
│   │   ├── Login.tsx        # Login con Liquid Glass (NUEVO)
│   │   ├── Login.css        # Estilos Liquid Glass (NUEVO)
│   │   ├── Dashboard.tsx
│   │   └── Bikes.tsx
│   ├── services/
│   │   └── api.ts           # Cliente API (ACTUALIZADO)
│   ├── styles/
│   │   └── globals.css      # Estilos globales
│   ├── types/
│   │   └── index.ts         # Tipos TypeScript (ACTUALIZADO)
│   ├── App.tsx
│   └── main.tsx
├── .env                     # Variables de entorno
├── vite.config.ts           # Configuración Vite (puerto 5173)
└── package.json
```

## 🔧 Configuración de Puertos

| Servicio  | Puerto | URL                           |
|-----------|--------|-------------------------------|
| Backend   | 3000   | http://localhost:3000/api     |
| Frontend  | 5173   | http://localhost:5173         |

## 🌐 Acceso desde la Red Local

### Configuración del Backend

Tu backend ya está configurado para aceptar conexiones desde la red local con CORS habilitado para IPs locales.

### Acceder desde otros dispositivos

1. **Obtén tu IP local:**
   ```bash
   # Windows
   ipconfig
   
   # Mac/Linux
   ifconfig
   
   # Busca algo como: 192.168.1.X
   ```

2. **Actualiza el `.env` del frontend:**
   ```env
   VITE_API_URL=http://192.168.1.X:3000/api
   ```

3. **Accede desde otro dispositivo:**
   ```
   http://192.168.1.X:5173
   ```

## 🎯 Flujo de Autenticación

1. Usuario ingresa credenciales en el Login
2. Frontend envía POST a `/auth/login`
3. Backend valida y retorna token + refreshToken
4. Frontend guarda tokens en localStorage
5. Todas las peticiones subsecuentes incluyen el token
6. Si token expira, se usa refreshToken automáticamente

## 🐛 Troubleshooting

### Backend no responde

```bash
# Verifica que el backend esté corriendo
curl http://localhost:3000/api/health

# Deberías ver:
# {"status":"success","message":"Nexori API is running",...}
```

### Error de CORS

Si ves errores de CORS, asegúrate de que tu backend tenga esta configuración:

```typescript
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || 
        origin.includes('localhost') || 
        origin.includes('192.168.')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
```

### Token inválido

Si te redirige constantemente al login:

1. Borra el localStorage del navegador
2. Verifica que el backend esté usando la misma `JWT_SECRET`
3. Revisa la consola del navegador para errores específicos

## 📊 Variables de Entorno Necesarias en el Backend

Tu backend necesita estas variables:

```env
# Backend .env
PORT=3000
NODE_ENV=development

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nexoff
DB_USER=postgres
DB_PASSWORD=tu_password

# JWT
JWT_SECRET=tu_secret_super_seguro
JWT_REFRESH_SECRET=tu_refresh_secret_super_seguro
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=1000
```

## 🎨 Personalización del Liquid Glass

Para ajustar el efecto glassmorphism, edita `/src/pages/Login.css`:

```css
.login-glass-container {
  background: rgba(255, 255, 255, 0.08);  /* Transparencia */
  backdrop-filter: blur(20px);             /* Blur */
  border: 1px solid rgba(255, 255, 255, 0.18);  /* Borde */
}
```

## 🚀 Comandos Útiles

```bash
# Desarrollo
npm run dev              # Iniciar servidor de desarrollo (puerto 5173)

# Producción
npm run build            # Compilar para producción
npm run preview          # Preview del build

# Linting
npm run lint             # Ejecutar ESLint (si está configurado)
```

## 📝 Próximas Implementaciones

- [ ] Página de Registro con Liquid Glass
- [ ] Gestión de Usuarios
- [ ] Eventos de Pánico con mapa
- [ ] Notificaciones en tiempo real con WebSocket
- [ ] Perfil de usuario
- [ ] Modo oscuro

## 🔗 Recursos

- **React**: https://react.dev/
- **Vite**: https://vitejs.dev/
- **TypeScript**: https://www.typescriptlang.org/
- **Glassmorphism**: https://glassmorphism.com/

## 💡 Tips

1. **Desarrollo**: Usa las DevTools del navegador para inspeccionar peticiones
2. **Console Logs**: El servicio API tiene logs habilitados para debugging
3. **Network Tab**: Monitorea las peticiones al backend
4. **React DevTools**: Instala la extensión para ver el estado de React

## ✅ Checklist de Verificación

- [ ] Backend corriendo en puerto 3000
- [ ] Frontend corriendo en puerto 5173
- [ ] Variables de entorno configuradas
- [ ] Base de datos PostgreSQL conectada
- [ ] Puedes hacer login con credenciales válidas
- [ ] El token se guarda en localStorage
- [ ] Dashboard carga correctamente después del login

---

**¿Problemas?** Revisa la consola del navegador (F12) y los logs del backend.

**Desarrollado con ❤️ por el equipo de NexOff**
