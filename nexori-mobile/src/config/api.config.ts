/**
 * ========================================
 * CONFIGURACIÓN CENTRALIZADA DE API Y SOCKET
 * ========================================
 * 
 * Este archivo centraliza todas las URLs del proyecto.
 * Úsalo en api.ts, socket.ts, y cualquier otro servicio.
 */

// ========================================
// URL BASE DEL API
// ========================================
export const API_BASE_URL = __DEV__ 
  ? 'http://192.168.137.1:3000/api' // ✅ IP correcta
  : 'https://nexori-api.onrender.com/api'; // Producción

// ========================================
// URL DEL SOCKET (sin /api)
// ========================================
export const SOCKET_URL = API_BASE_URL.replace('/api', '');

// ========================================
// CONFIGURACIÓN DE AXIOS
// ========================================
export const API_CONFIG = {
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
} as const;

// ========================================
// CONFIGURACIÓN DE SOCKET.IO
// ========================================
// 🔥 CORREGIDO: Usar tipos mutables para evitar errores de TypeScript
export const SOCKET_CONFIG = {
  transports: ['websocket', 'polling'] as string[], // ✅ Cast a string[] mutable
  reconnection: true as boolean,
  reconnectionDelay: 1000 as number,
  reconnectionDelayMax: 5000 as number,
  reconnectionAttempts: 5 as number,
};

// ========================================
// LOGS DE DEBUG (solo en desarrollo)
// ========================================
if (__DEV__) {
  console.log('📡 Configuración centralizada:');
  console.log('  API_BASE_URL:', API_BASE_URL);
  console.log('  SOCKET_URL:', SOCKET_URL);
}