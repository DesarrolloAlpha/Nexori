import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

/**
 * Utilidades para procesamiento de imágenes
 * Optimizado para comprimir imágenes al mínimo peso manteniendo calidad aceptable
 */

export interface ImageCompressionOptions {
  quality?: number; // Calidad WebP (1-100)
  maxWidth?: number; // Ancho máximo en píxeles
  maxHeight?: number; // Alto máximo en píxeles
}

export class ImageUtils {
  /**
   * Comprimir imagen a formato WebP con calidad reducida
   * Ideal para uso en aplicaciones móviles donde el peso es crítico
   */
  static async compressImage(
    inputPath: string,
    options: ImageCompressionOptions = {}
  ): Promise<string> {
    const {
      quality = 40, // Calidad baja para pruebas (reduce significativamente el peso)
      maxWidth = 800,
      maxHeight = 800
    } = options;

    try {
      // Generar nombre para archivo comprimido
      const ext = path.extname(inputPath);
      const baseName = path.basename(inputPath, ext);
      const dirName = path.dirname(inputPath);
      const compressedPath = path.join(dirName, `${baseName}-compressed.webp`);

      // Comprimir y convertir a WebP
      await sharp(inputPath)
        .resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ quality })
        .toFile(compressedPath);

      // Eliminar imagen original para ahorrar espacio
      fs.unlinkSync(inputPath);

      console.log(`✅ Imagen comprimida: ${path.basename(compressedPath)}`);
      
      return compressedPath;
    } catch (error) {
      console.error('❌ Error al comprimir imagen:', error);
      throw new Error('Error al procesar imagen');
    }
  }

  /**
   * Mover imagen a carpeta permanente de uploads
   */
  static async moveToUploads(
    tempPath: string,
    subfolder: string = 'minutes'
  ): Promise<string> {
    try {
      // Crear directorio de uploads si no existe
      const uploadsDir = path.join(process.cwd(), 'uploads', subfolder);
      
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Generar nombre final
      const fileName = path.basename(tempPath);
      const finalPath = path.join(uploadsDir, fileName);

      // Mover archivo
      fs.renameSync(tempPath, finalPath);

      // Retornar URL relativa
      return `/uploads/${subfolder}/${fileName}`;
    } catch (error) {
      console.error('❌ Error al mover imagen:', error);
      throw new Error('Error al guardar imagen');
    }
  }

  /**
   * Eliminar imagen del sistema de archivos
   */
  static deleteImage(imageUrl: string): void {
    try {
      // Convertir URL a ruta del sistema
      const imagePath = path.join(process.cwd(), imageUrl);
      
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        console.log(`🗑️ Imagen eliminada: ${imageUrl}`);
      }
    } catch (error) {
      console.error('❌ Error al eliminar imagen:', error);
      // No lanzar error, solo loguear
    }
  }

  /**
   * Obtener información de una imagen
   */
  static async getImageInfo(imagePath: string): Promise<sharp.Metadata> {
    try {
      const metadata = await sharp(imagePath).metadata();
      return metadata;
    } catch (error) {
      console.error('❌ Error al obtener info de imagen:', error);
      throw new Error('Error al leer imagen');
    }
  }

  /**
   * Validar que un archivo sea una imagen válida
   */
  static async validateImage(filePath: string): Promise<boolean> {
    try {
      await sharp(filePath).metadata();
      return true;
    } catch (error) {
      return false;
    }
  }
}