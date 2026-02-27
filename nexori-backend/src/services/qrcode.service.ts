// src/services/qrcode.service.ts
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';

export class QRCodeService {
  private uploadsDir: string;

  constructor() {
    // Directorio donde se guardarán los QR generados
    this.uploadsDir = path.join(__dirname, '../../uploads/qr-codes');
    
    // Crear directorio si no existe
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
      console.log('📁 Directorio de QR codes creado:', this.uploadsDir);
    }
  }

  /**
   * Generar código QR como imagen PNG y guardarlo en el servidor
   * @param data - Contenido del QR (ej: código único de la bicicleta)
   * @param filename - Nombre del archivo sin extensión
   * @returns Ruta del archivo generado
   */
  async generateQRImage(data: string, filename: string): Promise<string | null> {
    try {
      const filePath = path.join(this.uploadsDir, `${filename}.png`);
      
      // Generar QR code con configuración personalizada
      await QRCode.toFile(filePath, data, {
        errorCorrectionLevel: 'H', // Alto nivel de corrección de errores
        type: 'png',
        margin: 2,
        width: 400, // Tamaño del QR
        color: {
          dark: '#1a1a1a',  // Color del QR (casi negro)
          light: '#ffffff'  // Fondo blanco
        }
      });

      console.log(`✅ QR Code generado: ${filePath}`);
      return filePath;
    } catch (error) {
      console.error('❌ Error al generar QR Code:', error);
      return null;
    }
  }

  /**
   * Generar QR y retornar la URL pública
   * @param data - Contenido del QR
   * @param filename - Nombre del archivo
   * @param baseUrl - URL base del servidor (ej: http://localhost:3000)
   * @returns URL pública del QR
   */
  async generateQRWithPublicUrl(data: string, filename: string, baseUrl: string): Promise<string | null> {
    try {
      const filePath = await this.generateQRImage(data, filename);
      
      if (!filePath) {
        return null;
      }

      // Construir URL pública
      const publicUrl = `${baseUrl}/uploads/qr-codes/${filename}.png`;
      
      return publicUrl;
    } catch (error) {
      console.error('❌ Error al generar QR con URL pública:', error);
      return null;
    }
  }

  /**
   * Eliminar archivo de QR code
   * @param filename - Nombre del archivo sin extensión
   */
  deleteQRImage(filename: string): boolean {
    try {
      const filePath = path.join(this.uploadsDir, `${filename}.png`);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ QR Code eliminado: ${filePath}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error al eliminar QR Code:', error);
      return false;
    }
  }

  /**
   * Verificar si existe un archivo de QR
   * @param filename - Nombre del archivo sin extensión
   */
  qrExists(filename: string): boolean {
    const filePath = path.join(this.uploadsDir, `${filename}.png`);
    return fs.existsSync(filePath);
  }

  /**
   * 🆕 Generar URL pública usando API externa (para WhatsApp)
   * Útil cuando el servidor no tiene URL pública
   * @param data - Contenido del QR
   * @returns URL pública del QR
   */
  generatePublicQRUrl(data: string): string {
    // Usar API pública de QR codes (igual que el test exitoso)
    const encodedData = encodeURIComponent(data);
    return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodedData}`;
  }
}

// Exportar instancia única
export const qrCodeService = new QRCodeService();