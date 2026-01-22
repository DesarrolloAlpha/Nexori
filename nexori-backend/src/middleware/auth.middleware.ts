import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { User } from '../models/User.entity';
import { JwtPayload, UserRole } from '../types';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: UserRole;
      };
    }
  }
}

const userRepository = AppDataSource.getRepository(User);

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ 
        success: false, 
        message: 'Acceso denegado. No hay token proporcionado.' 
      });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    
    // Buscar usuario para verificar que existe y está activo
    const user = await userRepository.findOne({ 
      where: { id: decoded.userId } 
    });
    
    if (!user || !user.isActive) {
      res.status(401).json({ 
        success: false, 
        message: 'Usuario no encontrado o inactivo.' 
      });
      return;
    }

    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    // ... mismo manejo de errores
  }
};

// ... authorize function sigue igual