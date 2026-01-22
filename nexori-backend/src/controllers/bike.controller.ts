import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Bike } from '../models/Bike.entity';
import { User } from '../models/User.entity';
import { ApiResponse } from '../types';

const bikeRepository = AppDataSource.getRepository(Bike);
const userRepository = AppDataSource.getRepository(User);

export const createBike = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, brand, model, color, ownerName, ownerId, notes } = req.body;

    // Verificar si ya existe una bicicleta con el mismo código
    const existingBike = await bikeRepository.findOne({ where: { code } });
    if (existingBike) {
      const response: ApiResponse = {
        success: false,
        message: 'Ya existe una bicicleta con este código',
      };
      res.status(400).json(response);
      return;
    }

    // Crear nueva bicicleta
    const bike = bikeRepository.create({
      code,
      brand,
      model,
      color,
      ownerName,
      ownerId,
      notes,
      status: 'in',
      ...(req.user?.userId ? { registeredById: req.user.userId } : {}),
    });

    await bikeRepository.save(bike);

    const response: ApiResponse = {
      success: true,
      message: 'Bicicleta registrada exitosamente',
      data: { bike },
    };

    res.status(201).json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      message: error.message || 'Error al registrar bicicleta',
    };
    res.status(500).json(response);
  }
};

export const getAllBikes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, search } = req.query;
    
    let query = bikeRepository.createQueryBuilder('bike');
    
    // Filtrar por estado si se proporciona
    if (status) {
      query = query.where('bike.status = :status', { status });
    }
    
    // Buscar por código, marca, modelo o propietario
    if (search) {
      query = query.andWhere(
        '(bike.code ILIKE :search OR bike.brand ILIKE :search OR bike.model ILIKE :search OR bike.ownerName ILIKE :search)',
        { search: `%${search}%` }
      );
    }
    
    // Ordenar por fecha de creación descendente
    query = query.orderBy('bike.createdAt', 'DESC');
    
    const bikes = await query.getMany();
    
    const response: ApiResponse = {
      success: true,
      message: 'Bicicletas obtenidas exitosamente',
      data: { bikes },
    };
    
    res.status(200).json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      message: error.message || 'Error al obtener bicicletas',
    };
    res.status(500).json(response);
  }
};

export const getBikeById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const bike = await bikeRepository.findOne({ where: { id } });
    
    if (!bike) {
      const response: ApiResponse = {
        success: false,
        message: 'Bicicleta no encontrada',
      };
      res.status(404).json(response);
      return;
    }
    
    const response: ApiResponse = {
      success: true,
      message: 'Bicicleta obtenida exitosamente',
      data: { bike },
    };
    
    res.status(200).json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      message: error.message || 'Error al obtener bicicleta',
    };
    res.status(500).json(response);
  }
};

export const updateBike = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const bike = await bikeRepository.findOne({ where: { id } });
    
    if (!bike) {
      const response: ApiResponse = {
        success: false,
        message: 'Bicicleta no encontrada',
      };
      res.status(404).json(response);
      return;
    }
    
    // No permitir actualizar el código si ya existe otro con el mismo código
    if (updates.code && updates.code !== bike.code) {
      const existingBike = await bikeRepository.findOne({ 
        where: { code: updates.code } 
      });
      
      if (existingBike) {
        const response: ApiResponse = {
          success: false,
          message: 'Ya existe una bicicleta con este código',
        };
        res.status(400).json(response);
        return;
      }
    }
    
    // Actualizar bicicleta
    Object.assign(bike, updates);
    await bikeRepository.save(bike);
    
    const response: ApiResponse = {
      success: true,
      message: 'Bicicleta actualizada exitosamente',
      data: { bike },
    };
    
    res.status(200).json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      message: error.message || 'Error al actualizar bicicleta',
    };
    res.status(500).json(response);
  }
};

export const deleteBike = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const bike = await bikeRepository.findOne({ where: { id } });
    
    if (!bike) {
      const response: ApiResponse = {
        success: false,
        message: 'Bicicleta no encontrada',
      };
      res.status(404).json(response);
      return;
    }
    
    await bikeRepository.remove(bike);
    
    const response: ApiResponse = {
      success: true,
      message: 'Bicicleta eliminada exitosamente',
    };
    
    res.status(200).json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      message: error.message || 'Error al eliminar bicicleta',
    };
    res.status(500).json(response);
  }
};

export const checkInBike = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    
    const bike = await bikeRepository.findOne({ where: { id } });
    
    if (!bike) {
      const response: ApiResponse = {
        success: false,
        message: 'Bicicleta no encontrada',
      };
      res.status(404).json(response);
      return;
    }
    
    if (bike.status === 'in') {
      const response: ApiResponse = {
        success: false,
        message: 'La bicicleta ya está ingresada',
      };
      res.status(400).json(response);
      return;
    }
    
    // Actualizar estado a "in"
    bike.status = 'in';
    bike.lastCheckIn = new Date();
    if (req.user?.userId) bike.checkInBy = req.user.userId;
    if (notes) bike.notes = notes;
    
    await bikeRepository.save(bike);
    
    // Emitir evento WebSocket (si está configurado)
    // req.app.get('io').to('operators').emit('bike_checked_in', bike);
    
    const response: ApiResponse = {
      success: true,
      message: 'Bicicleta ingresada exitosamente',
      data: { bike },
    };
    
    res.status(200).json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      message: error.message || 'Error al ingresar bicicleta',
    };
    res.status(500).json(response);
  }
};

export const checkOutBike = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    
    const bike = await bikeRepository.findOne({ where: { id } });
    
    if (!bike) {
      const response: ApiResponse = {
        success: false,
        message: 'Bicicleta no encontrada',
      };
      res.status(404).json(response);
      return;
    }
    
    if (bike.status === 'out') {
      const response: ApiResponse = {
        success: false,
        message: 'La bicicleta ya está retirada',
      };
      res.status(400).json(response);
      return;
    }
    
    if (bike.status === 'maintenance') {
      const response: ApiResponse = {
        success: false,
        message: 'La bicicleta está en mantenimiento',
      };
      res.status(400).json(response);
      return;
    }
    
    // Actualizar estado a "out"
    bike.status = 'out';
    bike.lastCheckOut = new Date();
    if (req.user?.userId) bike.checkOutBy = req.user.userId;
    if (notes) bike.notes = notes;
    
    await bikeRepository.save(bike);
    
    // Emitir evento WebSocket
    // req.app.get('io').to('operators').emit('bike_checked_out', bike);
    
    const response: ApiResponse = {
      success: true,
      message: 'Bicicleta retirada exitosamente',
      data: { bike },
    };
    
    res.status(200).json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      message: error.message || 'Error al retirar bicicleta',
    };
    res.status(500).json(response);
  }
};

export const getBikeHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const bike = await bikeRepository.findOne({ where: { id } });
    
    if (!bike) {
      const response: ApiResponse = {
        success: false,
        message: 'Bicicleta no encontrada',
      };
      res.status(404).json(response);
      return;
    }
    
    // En una implementación real, podrías tener una tabla de historial
    const history = {
      bike,
      totalCheckIns: bike.lastCheckIn ? 1 : 0,
      totalCheckOuts: bike.lastCheckOut ? 1 : 0,
      lastCheckIn: bike.lastCheckIn,
      lastCheckOut: bike.lastCheckOut,
      registeredAt: bike.createdAt,
    };
    
    const response: ApiResponse = {
      success: true,
      message: 'Historial obtenido exitosamente',
      data: { history },
    };
    
    res.status(200).json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      message: error.message || 'Error al obtener historial',
    };
    res.status(500).json(response);
  }
};