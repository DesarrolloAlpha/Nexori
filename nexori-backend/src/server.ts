import 'reflect-metadata'; // Añadir al inicio
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import os from 'os'; // ← AÑADIDO: Para obtener IPs de red

// Configurar variables de entorno
dotenv.config();

// Importar configuración de base de datos (PostgreSQL)
import { connectDB } from './config/database';

// Importar rutas
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import bikeRoutes from './routes/bike.routes';
import panicRoutes from './routes/panic.routes';
import minuteRoutes from './routes/minute.routes';

// Importar WebSocket service
import { setupWebSocket } from './sockets/webSocket';
import path from 'path'; // ← CORREGIDO: Quitar /win32

const app = express();
const httpServer = createServer(app);

// Obtener IPs de red disponibles
const getNetworkIPs = (): string[] => {
  const interfaces = os.networkInterfaces();
  const ips: string[] = ['localhost'];
  
  Object.values(interfaces).forEach((iface) => {
    iface?.forEach((details) => {
      if (details.family === 'IPv4' && !details.internal) {
        ips.push(details.address);
      }
    });
  });
  
  return ips;
};

const networkIPs = getNetworkIPs();
const mainIP = networkIPs.find(ip => ip.startsWith('192.168.')) || networkIPs[1] || 'localhost';

// Configurar Socket.IO con CORS mejorado
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // Permitir conexiones sin origin (mobile apps) y desde cualquier IP de la red local
      if (!origin || origin.includes('192.168.') || origin.includes('localhost')) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Configurar rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  message: 'Demasiadas peticiones desde esta IP, por favor intenta más tarde',
  standardHeaders: true,
  legacyHeaders: false,
});

// Middlewares
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Permitir:
    // 1. Requests sin origin (mobile apps, postman, curl)
    // 2. Cualquier IP local (192.168.x.x, 10.x.x.x, 172.x.x.x)
    // 3. localhost
    // 4. Expo URLs
    
    if (!origin) {
      return callback(null, true);
    }
    
    const allowedPatterns = [
      /^http:\/\/localhost(:\d+)?$/,
      /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/,
      /^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/,
      /^http:\/\/172\.\d+\.\d+\.\d+(:\d+)?$/,
      /^exp:\/\/.*$/,
    ];
    
    const isAllowed = allowedPatterns.some(pattern => pattern.test(origin));
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`🔒 CORS bloqueado para origen: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  credentials: true,
  exposedHeaders: ['Authorization', 'X-Total-Count']
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api', limiter);

// Conectar a PostgreSQL
connectDB();

// Configurar WebSocket
setupWebSocket(io);

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bikes', bikeRoutes);
app.use('/api/panic', panicRoutes);
app.use('/api/minutes', minuteRoutes);

// Ruta de salud MEJORADA
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Nexori API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database: 'PostgreSQL',
    environment: process.env.NODE_ENV,
    accessibleFrom: {
      localhost: `http://localhost:${process.env.PORT || 3000}/api`,
      network: `http://${mainIP}:${process.env.PORT || 3000}/api`,
      allIPs: networkIPs.map(ip => `http://${ip}:${process.env.PORT || 3000}`)
    }
  });
});

// Servir archivos estáticos desde la carpeta uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ruta para test de conexión simple (sin auth)
app.get('/api/ping', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'pong',
    clientIP: req.ip,
    timestamp: Date.now()
  });
});

// Manejo de errores 404
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Ruta ${req.originalUrl} no encontrada`,
    availableRoutes: [
      '/api/health',
      '/api/ping',
      '/api/auth/*',
      '/api/users/*',
      '/api/bikes/*',
      '/api/panic/*',
      '/api/minutes/*'
    ]
  });
});

// Manejo global de errores
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('🚨 Server Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });
  
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      path: req.path 
    }),
  });
});

const PORT = process.env.PORT || 3000;

// FORMA CORRECTA: Usar parámetros en el orden correcto
httpServer.listen({
  port: PORT,
  host: '0.0.0.0'  // ← Forma explícita con objeto
}, () => {
  console.log(`🚀 Servidor corriendo:`);
  console.log(`   🔌 Puerto: ${PORT}`);
  console.log(`   🌐 Host: 0.0.0.0 (escucha en todas las interfaces)`);
  
  // Obtener IPs de red para mostrar
  const interfaces = os.networkInterfaces();
  const networkIPs: string[] = [];
  
  Object.values(interfaces).forEach((iface) => {
    iface?.forEach((details) => {
      if (details.family === 'IPv4' && !details.internal) {
        networkIPs.push(details.address);
      }
    });
  });
  
  const mainIP = networkIPs.find(ip => ip.startsWith('192.168.')) || networkIPs[0] || 'localhost';
  
  console.log(`\n📡 URLs de acceso:`);
  console.log(`   💻 Local:     http://localhost:${PORT}/api/health`);
  console.log(`   📱 Móvil:     http://${mainIP}:${PORT}/api/health`);
  
  if (networkIPs.length > 0) {
    console.log(`   🔗 Red local: Cualquiera de estas IPs:`);
    networkIPs.forEach((ip, index) => {
      console.log(`        ${index + 1}. http://${ip}:${PORT}/api`);
    });
  }
  
  console.log(`\n🗄️  Base de datos: PostgreSQL`);
  console.log(`🔌 WebSocket disponible en puerto ${PORT}`);
  console.log(`📁 Archivos estáticos: http://localhost:${PORT}/uploads/`);
  console.log(`\n⚠️  IMPORTANTE para conexión móvil:`);
  console.log(`   1. Teléfono y PC deben estar en la MISMA red WiFi`);
  console.log(`   2. Usa la IP que comienza con 192.168.x.x`);
  console.log(`   3. URL en móvil: http://${mainIP}:${PORT}/api/health`);
});