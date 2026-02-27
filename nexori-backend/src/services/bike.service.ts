// src/services/bike.service.ts
import { AppDataSource } from '../config/database';
import { Bike } from '../models/Bike.entity';
import { User } from '../models/User.entity';
import { socketManager, SocketEvents } from '../config/socket.manager';
import { ApiResponse } from '../types';
import { whatsappService } from './whatsapp.service';
import { qrCodeService } from './qrcode.service';
import dotenv from 'dotenv';
import os from 'os';

dotenv.config();

/**
 * Obtener URL base del servidor
 */
function getServerBaseUrl(): string {
  const port = process.env.PORT || 3000;
  
  // Si está en producción, usar la URL de producción
  if (process.env.NODE_ENV === 'production' && process.env.SERVER_URL) {
    return process.env.SERVER_URL;
  }
  
  // En desarrollo, obtener IP de red local
  const interfaces = os.networkInterfaces();
  let localIP = 'localhost';
  
  for (const iface of Object.values(interfaces)) {
    if (!iface) continue;
    
    for (const details of iface) {
      if (details.family === 'IPv4' && !details.internal && details.address.startsWith('192.168.')) {
        localIP = details.address;
        break;
      }
    }
  }
  
  return `http://${localIP}:${port}`;
}

export class BikeService {
  private bikeRepository = AppDataSource.getRepository(Bike);
  private userRepository = AppDataSource.getRepository(User);
  private socketManager = socketManager;

  /**
   * Generar el siguiente ID autoincremental BIKE-001, BIKE-002, etc.
   */
  private async generateBikeId(): Promise<string> {
    // Obtener todos los bikes y ordenarlos por serialNumber descendente
    const bikes = await this.bikeRepository.find({
      order: { serialNumber: 'DESC' },
      take: 1 // Solo obtener el último
    });

    // Si no hay bikes, empezar desde BIKE-001
    if (!bikes || bikes.length === 0) {
      return 'BIKE-001';
    }

    const lastBike = bikes[0];

    // Extraer el número del último serialNumber (BIKE-001 -> 001 -> 1)
    const match = lastBike.serialNumber.match(/BIKE-(\d+)/);
    
    if (!match) {
      // Si por alguna razón el formato no coincide, empezar desde 001
      return 'BIKE-001';
    }

    const lastNumber = parseInt(match[1], 10);
    const nextNumber = lastNumber + 1;

    // Formatear con ceros a la izquierda (001, 002, etc.)
    return `BIKE-${String(nextNumber).padStart(3, '0')}`;
  }

  /**
   * Crear nueva bicicleta
   */
  async createBike(data: any, userId: string): Promise<any> {
    try {
      const { 
        brand, 
        model, 
        color, 
        ownerName, 
        ownerDocument, 
        location, 
        notes, 
        ownerPhone // 🆕 Número de teléfono del propietario
      } = data;

      // 🆕 Generar ID autoincremental BIKE-001, BIKE-002, etc.
      const bikeId = await this.generateBikeId();
      
      // El serialNumber ahora ES el ID autoincremental
      const serialNumber = bikeId;

      // Verificar si ya existe (por seguridad, aunque no debería pasar)
      const existingBike = await this.bikeRepository.findOne({ where: { serialNumber } });
      if (existingBike) {
        // Si existe, generar uno nuevo recursivamente
        return this.createBike(data, userId);
      }

      // Generar código QR único
      const qrCodeData = serialNumber; // BIKE-001, BIKE-002, etc.

      // Crear nueva bicicleta
      const bike = this.bikeRepository.create({
        serialNumber,
        brand,
        model,
        color,
        ownerName,
        ownerDocument,
        location,
        notes,
        qrCode: qrCodeData,
        status: 'inside',
        registeredById: userId,
      });

      await this.bikeRepository.save(bike);

      // 🔥 GENERAR CÓDIGO QR COMO IMAGEN (local, para la app)
      let qrImageUrl: string | null = null;
      let qrImageUrlForWhatsApp: string | null = null;
      
      try {
        const baseUrl = getServerBaseUrl();
        const filename = `bike-${bike.id}`;
        
        // Generar QR local (para usar en la app)
        qrImageUrl = await qrCodeService.generateQRWithPublicUrl(qrCodeData, filename, baseUrl);
        
        if (qrImageUrl) {
          console.log(`✅ QR Code local generado para bicicleta ${bike.id}: ${qrImageUrl}`);
        }

        // 🆕 Para WhatsApp, usar URL pública de API externa (funciona sin ngrok)
        qrImageUrlForWhatsApp = qrCodeService.generatePublicQRUrl(qrCodeData);
        console.log(`✅ QR Code público generado para WhatsApp: ${qrImageUrlForWhatsApp}`);
        
      } catch (qrError) {
        console.error('⚠️ Error al generar QR Code:', qrError);
      }

      // 🔥 ENVIAR CÓDIGO QR POR WHATSAPP SI HAY TELÉFONO
      if (ownerPhone && qrImageUrlForWhatsApp && whatsappService.isConfigured()) {
        try {
          // En desarrollo, enviar al número de prueba configurado
          const phoneToSend = process.env.NODE_ENV === 'development' 
            ? (process.env.WHATSAPP_TEST_NUMBER || ownerPhone)
            : ownerPhone;

          const whatsappSent = await whatsappService.sendBikeQRCode(
            phoneToSend,
            qrImageUrlForWhatsApp, // ✅ Ya verificamos que no es null arriba
            {
              serialNumber: bike.serialNumber,
              brand: bike.brand,
              model: bike.model,
              ownerName: bike.ownerName,
              qrCode: qrCodeData
            }
          );

          if (whatsappSent) {
            console.log(`✅ QR Code enviado por WhatsApp a ${phoneToSend}`);
          } else {
            console.warn(`⚠️ No se pudo enviar QR por WhatsApp a ${phoneToSend}`);
          }
        } catch (whatsappError) {
          console.error('⚠️ Error al enviar WhatsApp:', whatsappError);
          // No lanzar error, continuar con el proceso
        }
      } else if (ownerPhone && !whatsappService.isConfigured()) {
        console.warn('⚠️ Servicio de WhatsApp no configurado. No se enviará el QR.');
      }

      // 🔥 EMITIR EVENTO WEBSOCKET
      this.socketManager.emitBikeEvent(SocketEvents.BIKE_CREATED, {
        ...bike,
        qrImageUrl, // Incluir URL de la imagen del QR
        action: 'created',
        timestamp: new Date().toISOString()
      });

      console.log('✅ Bike creada y evento emitido:', bike.id);

      return {
        ...bike,
        qrImageUrl // Devolver también la URL del QR al frontend
      };
    } catch (error) {
      console.error('❌ Error en BikeService.createBike:', error);
      throw error;
    }
  }

  /**
   * Obtener todas las bicicletas
   */
  async getAllBikes(filters: { status?: string; search?: string }): Promise<Bike[]> {
    try {
      const { status, search } = filters;
      
      let query = this.bikeRepository.createQueryBuilder('bike');
      
      if (status) {
        query = query.where('bike.status = :status', { status });
      }
      
      if (search) {
        query = query.andWhere(
          '(bike.serialNumber ILIKE :search OR bike.brand ILIKE :search OR bike.model ILIKE :search OR bike.ownerName ILIKE :search OR bike.ownerDocument ILIKE :search)',
          { search: `%${search}%` }
        );
      }
      
      query = query.orderBy('bike.createdAt', 'DESC');
      
      return await query.getMany();
    } catch (error) {
      console.error('❌ Error en BikeService.getAllBikes:', error);
      throw error;
    }
  }

  /**
   * Obtener bicicleta por ID
   */
  async getBikeById(id: string): Promise<Bike> {
    try {
      const bike = await this.bikeRepository.findOne({ where: { id } });
      
      if (!bike) {
        throw new Error('Bicicleta no encontrada');
      }
      
      return bike;
    } catch (error) {
      console.error('❌ Error en BikeService.getBikeById:', error);
      throw error;
    }
  }

  /**
   * Actualizar bicicleta
   */
  async updateBike(id: string, updates: any, userId: string): Promise<Bike> {
    try {
      const bike = await this.bikeRepository.findOne({ where: { id } });
      
      if (!bike) {
        throw new Error('Bicicleta no encontrada');
      }
      
      // No permitir actualizar el número de serie si ya existe otro con el mismo
      if (updates.serialNumber && updates.serialNumber !== bike.serialNumber) {
        const existingBike = await this.bikeRepository.findOne({ 
          where: { serialNumber: updates.serialNumber } 
        });
        
        if (existingBike) {
          throw new Error('Ya existe una bicicleta con este número de serie');
        }
      }
      
      // Guardar estado anterior para eventos
      const previousStatus = bike.status;
      
      // Actualizar bicicleta
      Object.assign(bike, updates);
      await this.bikeRepository.save(bike);
      
      // 🔥 EMITIR EVENTO WEBSOCKET
      this.socketManager.emitBikeEvent(SocketEvents.BIKE_UPDATED, {
        ...bike,
        previousStatus,
        action: 'updated',
        updatedBy: userId,
        timestamp: new Date().toISOString()
      });
      
      // Si cambió el estado, emitir evento específico
      if (previousStatus !== bike.status) {
        this.socketManager.emitBikeEvent(SocketEvents.BIKE_STATUS_CHANGED, {
          ...bike,
          previousStatus,
          newStatus: bike.status,
          timestamp: new Date().toISOString()
        });
      }
      
      return bike;
    } catch (error) {
      console.error('❌ Error en BikeService.updateBike:', error);
      throw error;
    }
  }

  /**
   * Eliminar bicicleta
   */
  async deleteBike(id: string, userId: string): Promise<void> {
    try {
      const bike = await this.bikeRepository.findOne({ where: { id } });
      
      if (!bike) {
        throw new Error('Bicicleta no encontrada');
      }
      
      // 🗑️ ELIMINAR IMAGEN DE QR CODE SI EXISTE
      try {
        qrCodeService.deleteQRImage(`bike-${id}`);
      } catch (qrError) {
        console.warn('⚠️ No se pudo eliminar el QR Code:', qrError);
      }
      
      await this.bikeRepository.remove(bike);
      
      // 🔥 EMITIR EVENTO WEBSOCKET
      this.socketManager.emitBikeEvent(SocketEvents.BIKE_DELETED, {
        id,
        deletedBy: userId,
        serialNumber: bike.serialNumber,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Error en BikeService.deleteBike:', error);
      throw error;
    }
  }

  /**
   * Check-in de bicicleta
   */
  async checkInBike(id: string, notes: string | undefined, userId: string): Promise<Bike> {
    try {
      const bike = await this.bikeRepository.findOne({ where: { id } });
      
      if (!bike) {
        throw new Error('Bicicleta no encontrada');
      }
      
      if (bike.status === 'inside') {
        throw new Error('La bicicleta ya está ingresada');
      }
      
      const previousStatus = bike.status;
      
      // Actualizar estado a "inside"
      bike.status = 'inside';
      bike.lastCheckIn = new Date();
      bike.checkInBy = userId;
      if (notes) bike.notes = notes;
      
      await this.bikeRepository.save(bike);
      
      // 🔥 EMITIR EVENTO WEBSOCKET
      this.socketManager.emitBikeEvent(SocketEvents.BIKE_STATUS_CHANGED, {
        ...bike,
        previousStatus,
        newStatus: 'inside',
        action: 'check_in',
        userId,
        timestamp: new Date().toISOString()
      });
      
      return bike;
    } catch (error) {
      console.error('❌ Error en BikeService.checkInBike:', error);
      throw error;
    }
  }

  /**
   * Check-out de bicicleta
   */
  async checkOutBike(id: string, notes: string | undefined, userId: string): Promise<Bike> {
    try {
      const bike = await this.bikeRepository.findOne({ where: { id } });
      
      if (!bike) {
        throw new Error('Bicicleta no encontrada');
      }
      
      if (bike.status === 'outside') {
        throw new Error('La bicicleta ya está retirada');
      }
      
      if (bike.status === 'maintenance') {
        throw new Error('La bicicleta está en mantenimiento');
      }
      
      const previousStatus = bike.status;
      
      // Actualizar estado a "outside"
      bike.status = 'outside';
      bike.lastCheckOut = new Date();
      bike.checkOutBy = userId;
      if (notes) bike.notes = notes;
      
      await this.bikeRepository.save(bike);
      
      // 🔥 EMITIR EVENTO WEBSOCKET
      this.socketManager.emitBikeEvent(SocketEvents.BIKE_STATUS_CHANGED, {
        ...bike,
        previousStatus,
        newStatus: 'outside',
        action: 'check_out',
        userId,
        timestamp: new Date().toISOString()
      });
      
      return bike;
    } catch (error) {
      console.error('❌ Error en BikeService.checkOutBike:', error);
      throw error;
    }
  }

  /**
   * Obtener historial de bicicleta
   */
  async getBikeHistory(id: string): Promise<any> {
    try {
      const bike = await this.bikeRepository.findOne({ where: { id } });
      
      if (!bike) {
        throw new Error('Bicicleta no encontrada');
      }
      
      // En una implementación real, podrías tener una tabla de historial
      return {
        bike,
        totalCheckIns: bike.lastCheckIn ? 1 : 0,
        totalCheckOuts: bike.lastCheckOut ? 1 : 0,
        lastCheckIn: bike.lastCheckIn,
        lastCheckOut: bike.lastCheckOut,
        registeredAt: bike.createdAt,
      };
    } catch (error) {
      console.error('❌ Error en BikeService.getBikeHistory:', error);
      throw error;
    }
  }
}

// Exportar instancia única
export const bikeService = new BikeService();