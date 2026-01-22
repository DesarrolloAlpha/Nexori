import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { PanicEvent } from '../models/PanicEvent.entity';
import { User } from '../models/User.entity';
import { ApiResponse } from '../types';

const panicRepository = AppDataSource.getRepository(PanicEvent);
const userRepository = AppDataSource.getRepository(User);

export const createPanicEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { latitude, longitude, address, priority } = req.body;
    
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        message: 'Usuario no autenticado',
      };
      res.status(401).json(response);
      return;
    }
    
    // Obtener usuario
    const user = await userRepository.findOne({ 
      where: { id: req.user.userId } 
    });
    
    if (!user) {
      const response: ApiResponse = {
        success: false,
        message: 'Usuario no encontrado',
      };
      res.status(404).json(response);
      return;
    }
    
    // Crear evento de pánico
    const panicEvent = panicRepository.create({
      userId: user.id,
      userName: user.name,
      latitude,
      longitude,
      address,
      priority: priority || 'medium',
      status: 'active',
      timestamp: new Date(),
    });
    
    await panicRepository.save(panicEvent);
    
    // Emitir evento WebSocket (en tiempo real)
    // req.app.get('io').to('coordinators').to('admins').emit('new_panic_alert', panicEvent);
    
    const response: ApiResponse = {
      success: true,
      message: 'Alerta de pánico enviada exitosamente',
      data: { panicEvent },
    };
    
    res.status(201).json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      message: error.message || 'Error al enviar alerta',
    };
    res.status(500).json(response);
  }
};

export const getAllPanicEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, priority, startDate, endDate } = req.query;
    
    let query = panicRepository.createQueryBuilder('panic');
    
    // Aplicar filtros
    if (status) {
      query = query.where('panic.status = :status', { status });
    }
    
    if (priority) {
      query = query.andWhere('panic.priority = :priority', { priority });
    }
    
    if (startDate) {
      query = query.andWhere('panic.timestamp >= :startDate', { 
        startDate: new Date(startDate as string) 
      });
    }
    
    if (endDate) {
      query = query.andWhere('panic.timestamp <= :endDate', { 
        endDate: new Date(endDate as string) 
      });
    }
    
    // Ordenar por fecha descendente (los más recientes primero)
    query = query.orderBy('panic.timestamp', 'DESC');
    
    const events = await query.getMany();
    
    const response: ApiResponse = {
      success: true,
      message: 'Eventos de pánico obtenidos exitosamente',
      data: { events },
    };
    
    res.status(200).json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      message: error.message || 'Error al obtener eventos',
    };
    res.status(500).json(response);
  }
};

export const updatePanicEventStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        message: 'Usuario no autenticado',
      };
      res.status(401).json(response);
      return;
    }
    
    const panicEvent = await panicRepository.findOne({ where: { id } });
    
    if (!panicEvent) {
      const response: ApiResponse = {
        success: false,
        message: 'Evento de pánico no encontrado',
      };
      res.status(404).json(response);
      return;
    }
    
    // Actualizar estado
    panicEvent.status = status;
    panicEvent.attendedBy = req.user.userId;
    panicEvent.attendedAt = new Date();
    
    if (notes) panicEvent.notes = notes;
    
    // Si el estado es "resolved", marcar fecha de resolución
    if (status === 'resolved') {
      panicEvent.resolvedAt = new Date();
    }
    
    await panicRepository.save(panicEvent);
    
    const response: ApiResponse = {
      success: true,
      message: 'Estado actualizado exitosamente',
      data: { panicEvent },
    };
    
    res.status(200).json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      message: error.message || 'Error al actualizar estado',
    };
    res.status(500).json(response);
  }
};