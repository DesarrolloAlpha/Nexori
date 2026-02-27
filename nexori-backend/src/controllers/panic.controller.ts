import { Request, Response } from 'express';
import { panicService } from '../services/panic.service';
import { ApiResponse } from '../types';

export const createPanicEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        message: 'Usuario no autenticado',
      };
      res.status(401).json(response);
      return;
    }
    
    // ✅ Usar el servicio - él se encarga del socket
    const panicEvent = await panicService.createPanicEvent(
      req.user.userId,
      req.user.userName
    );
    
    const response: ApiResponse = {
      success: true,
      message: 'Alerta de pánico enviada exitosamente',
      data: { panicEvent },
    };
    
    res.status(201).json(response);
  } catch (error: any) {
    console.error('❌ Error en createPanicEvent:', error);
    const response: ApiResponse = {
      success: false,
      message: error.message || 'Error al enviar alerta',
    };
    res.status(500).json(response);
  }
};

export const getAllPanicEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, startDate, endDate } = req.query;

    // ✅ Usar el servicio con filtros
    const events = await panicService.getAllPanicEvents({
      status: status as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    });
    
    const response: ApiResponse = {
      success: true,
      message: 'Eventos de pánico obtenidos exitosamente',
      data: { events },
    };
    
    res.status(200).json(response);
  } catch (error: any) {
    console.error('❌ Error en getAllPanicEvents:', error);
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
    
    // Validar que el estado sea válido
    const validStatuses = ['active', 'attended', 'resolved'];
    if (!validStatuses.includes(status)) {
      const response: ApiResponse = {
        success: false,
        message: 'Estado inválido',
      };
      res.status(400).json(response);
      return;
    }
    
    // ✅ Usar el servicio - él se encarga del socket
    const panicEvent = await panicService.updatePanicStatus(
      id,
      status as 'active' | 'attended' | 'resolved',
      notes,
      req.user.userId,
      req.user.userName
    );
    
    const response: ApiResponse = {
      success: true,
      message: 'Estado actualizado exitosamente',
      data: { panicEvent },
    };
    
    res.status(200).json(response);
  } catch (error: any) {
    console.error('❌ Error en updatePanicEventStatus:', error);
    
    // Manejar error específico de "no encontrado"
    if (error.message === 'Evento de pánico no encontrado') {
      const response: ApiResponse = {
        success: false,
        message: error.message,
      };
      res.status(404).json(response);
      return;
    }
    
    const response: ApiResponse = {
      success: false,
      message: error.message || 'Error al actualizar estado',
    };
    res.status(500).json(response);
  }
};

export const getPanicStatistics = async (req: Request, res: Response): Promise<void> => {
  try {
    // ✅ Usar el servicio para estadísticas
    const statistics = await panicService.getPanicStatistics();
    
    const response: ApiResponse = {
      success: true,
      message: 'Estadísticas obtenidas exitosamente',
      data: statistics,
    };
    
    res.status(200).json(response);
  } catch (error: any) {
    console.error('❌ Error en getPanicStatistics:', error);
    const response: ApiResponse = {
      success: false,
      message: error.message || 'Error al obtener estadísticas',
    };
    res.status(500).json(response);
  }
};

export const uploadPanicImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const file = (req as any).file;

    if (!req.user) {
      res.status(401).json({ success: false, message: 'Usuario no autenticado' });
      return;
    }

    if (!file) {
      res.status(400).json({ success: false, message: 'Imagen es requerida' });
      return;
    }

    const result = await panicService.uploadPanicImage(id, file, req.user.userId);
    res.json(result);
  } catch (error: any) {
    console.error('❌ Error en uploadPanicImage:', error);
    const statusCode = error.message === 'Evento de pánico no encontrado' ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error al subir imagen',
    });
  }
};

export const getPanicEventById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // ✅ Usar el servicio
    const panicEvent = await panicService.getPanicEventById(id);
    
    const response: ApiResponse = {
      success: true,
      message: 'Evento obtenido exitosamente',
      data: { panicEvent },
    };
    
    res.status(200).json(response);
  } catch (error: any) {
    console.error('❌ Error en getPanicEventById:', error);
    
    if (error.message === 'Evento de pánico no encontrado') {
      const response: ApiResponse = {
        success: false,
        message: error.message,
      };
      res.status(404).json(response);
      return;
    }
    
    const response: ApiResponse = {
      success: false,
      message: error.message || 'Error al obtener evento',
    };
    res.status(500).json(response);
  }
};