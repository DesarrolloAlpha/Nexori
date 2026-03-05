import { Request, Response } from 'express';
import { bikeService } from '../services/bike.service';
import { whatsappService } from '../services/whatsapp.service';
import { qrCodeService } from '../services/qrcode.service';
import { ApiResponse } from '../types';

export const createBike = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    
    if (!userId) {
      const response: ApiResponse = {
        success: false,
        message: 'Usuario no autenticado',
      };
      res.status(401).json(response);
      return;
    }

    const bike = await bikeService.createBike(req.body, userId);

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
    res.status(error.message.includes('Ya existe') ? 400 : 500).json(response);
  }
};

export const getAllBikes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, search } = req.query;
    
    const bikes = await bikeService.getAllBikes({
      status: status as string,
      search: search as string
    });
    
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
    
    const bike = await bikeService.getBikeById(id);
    
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
    res.status(error.message.includes('no encontrada') ? 404 : 500).json(response);
  }
};

export const updateBike = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId;
    
    if (!userId) {
      const response: ApiResponse = {
        success: false,
        message: 'Usuario no autenticado',
      };
      res.status(401).json(response);
      return;
    }
    
    const bike = await bikeService.updateBike(id, req.body, userId);
    
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
    res.status(error.message.includes('no encontrada') ? 404 : 
             error.message.includes('Ya existe') ? 400 : 500).json(response);
  }
};

export const deleteBike = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId;
    
    if (!userId) {
      const response: ApiResponse = {
        success: false,
        message: 'Usuario no autenticado',
      };
      res.status(401).json(response);
      return;
    }
    
    await bikeService.deleteBike(id, userId);
    
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
    res.status(error.message.includes('no encontrada') ? 404 : 500).json(response);
  }
};

export const checkInBike = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const userId = (req as any).user?.userId;
    
    if (!userId) {
      const response: ApiResponse = {
        success: false,
        message: 'Usuario no autenticado',
      };
      res.status(401).json(response);
      return;
    }
    
    const bike = await bikeService.checkInBike(id, notes, userId);
    
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
    res.status(error.message.includes('no encontrada') ? 404 : 
             error.message.includes('ya está ingresada') ? 400 : 500).json(response);
  }
};

export const checkOutBike = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const userId = (req as any).user?.userId;
    
    if (!userId) {
      const response: ApiResponse = {
        success: false,
        message: 'Usuario no autenticado',
      };
      res.status(401).json(response);
      return;
    }
    
    const bike = await bikeService.checkOutBike(id, notes, userId);
    
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
    res.status(error.message.includes('no encontrada') ? 404 : 
             error.message.includes('ya está retirada') ? 400 : 
             error.message.includes('mantenimiento') ? 400 : 500).json(response);
  }
};

export const resendWhatsApp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const bike = await bikeService.getBikeById(id);

    if (!(bike as any).ownerPhone) {
      res.status(400).json({
        success: false,
        message: 'Esta bicicleta no tiene número de teléfono registrado.',
      });
      return;
    }

    const qrUrl = qrCodeService.generatePublicQRUrl(bike.qrCode);
    const sent  = await whatsappService.sendBikeQRCode(
      (bike as any).ownerPhone,
      qrUrl,
      {
        serialNumber: bike.serialNumber,
        brand:        bike.brand,
        model:        bike.model,
        ownerName:    bike.ownerName,
        qrCode:       bike.qrCode,
      }
    );

    const response: ApiResponse = {
      success: sent,
      message: sent
        ? `QR reenviado a ${(bike as any).ownerPhone}`
        : 'No se pudo reenviar el QR — revisa la configuración de WhatsApp en el servidor.',
    };
    res.status(sent ? 200 : 500).json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      message: error.message || 'Error al reenviar QR por WhatsApp',
    };
    res.status(error.message?.includes('no encontrada') ? 404 : 500).json(response);
  }
};

export const getBikeHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const history = await bikeService.getBikeHistory(id);
    
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
    res.status(error.message.includes('no encontrada') ? 404 : 500).json(response);
  }
};