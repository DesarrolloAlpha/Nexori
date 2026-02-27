import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import os from 'os';
import path from 'path';

// Configurar variables de entorno
dotenv.config();

// Importar configuración de base de datos
import { connectDB } from './config/database';

// 🔥 IMPORTAR SOCKET MANAGER
import { socketManager } from './config/socket.manager';

// Importar rutas
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import bikeRoutes from './routes/bike.routes';
import panicRoutes from './routes/panic.routes';
import minuteRoutes from './routes/minute.routes';
import ticketRoutes from './routes/ticket.routes';
import adminRoutes from './routes/admin.routes';
import webhookRoutes from './routes/webhook.routes';
import { whatsappService } from './services/whatsapp.service';
const app = express();
const httpServer = createServer(app);

// 🔥 INICIALIZAR SOCKET MANAGER
socketManager.initialize(httpServer);

// Obtener IPs de red
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

// Configurar rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX || '1000'),
  message: 'Demasiadas peticiones desde esta IP, por favor intenta más tarde',
  standardHeaders: true,
  legacyHeaders: false,
});

// Middlewares
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    if (allowedOrigins.includes(origin)) {
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
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({
  // Captura el cuerpo crudo para validar la firma HMAC-SHA256 del webhook de Meta
  verify: (req: any, _res, buf) => { req.rawBody = buf; },
}));
app.use(express.urlencoded({ extended: true }));
app.use('/api', limiter);

// Conectar a PostgreSQL
connectDB();

// 🔥 LOS SERVICIOS YA ESTÁN CONFIGURADOS CON SOCKET MANAGER
console.log('✅ Servicios configurados con SocketManager:');
console.log('   - MinuteService');
console.log('   - BikeService');
console.log('   - PanicService');

// Webhook de WhatsApp/Meta — fuera de /api y sin autenticación
app.use('/webhook', webhookRoutes);

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bikes', bikeRoutes);
app.use('/api/panic', panicRoutes);
app.use('/api/minutes', minuteRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/admin', adminRoutes);

// Ruta de salud
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Nexori API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database: 'PostgreSQL',
    environment: process.env.NODE_ENV,
    websocket: {
      connected: socketManager.getStats().totalConnected,
      status: 'active'
    },
    whatsapp: whatsappService.getStatus(),
    accessibleFrom: {
      localhost: `http://localhost:${process.env.PORT || 3000}/api`,
      network: `http://${mainIP}:${process.env.PORT || 3000}/api`,
      allIPs: networkIPs.map(ip => `http://${ip}:${process.env.PORT || 3000}`)
    }
  });
});

// 🔧 SERVIR ARCHIVOS ESTÁTICOS
// process.cwd() siempre apunta a la raíz del proyecto, tanto en dev como en producción
const uploadsPath = path.join(process.cwd(), 'uploads');

app.use('/uploads', express.static(uploadsPath));

console.log('📁 Sirviendo archivos estáticos desde:', uploadsPath);

// Ruta de ping
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
      '/api/minutes/*',
      '/api/tickets/*',
      '/uploads/*',
      '/webhook'
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

httpServer.listen({
  port: PORT,
  host: '0.0.0.0'
}, () => {
  console.log('\n=================================');
  console.log('🚀 SERVIDOR NEXORI INICIADO');
  console.log('=================================');
  console.log(`🔌 Puerto: ${PORT}`);
  console.log(`🌐 Host: 0.0.0.0 (todas las interfaces)`);
  
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
  
  console.log('\n📡 URLs de acceso:');
  console.log(`   💻 Local:     http://localhost:${PORT}/api/health`);
  console.log(`   📱 Móvil:     http://${mainIP}:${PORT}/api/health`);
  
  if (networkIPs.length > 0) {
    console.log(`   🔗 Red local: Cualquiera de estas IPs:`);
    networkIPs.forEach((ip, index) => {
      console.log(`        ${index + 1}. http://${ip}:${PORT}/api`);
    });
  }
  
  console.log(`\n🗄️ Base de datos: PostgreSQL`);
  console.log(`🔌 WebSocket Manager activo en puerto ${PORT}`);
  console.log(`📁 Archivos estáticos: http://localhost:${PORT}/uploads/`);
  console.log(`   📂 Ruta del sistema: ${uploadsPath}`);
  console.log(`✅ Servicios con WebSocket en tiempo real:`);
  console.log(`   - MinuteService (minutas)`);
  console.log(`   - BikeService (bicicletas)`);
  console.log(`   - PanicService (alertas de pánico)`);
  console.log('\n=================================\n');

  // Validar token de WhatsApp en background (sin bloquear el arranque)
  whatsappService.validateToken().catch(() => {
    // El método ya imprime los errores internamente
  });
});