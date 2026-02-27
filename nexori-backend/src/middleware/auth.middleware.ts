import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { User } from '../models/User.entity';
import { JwtPayload, UserRole } from '../types';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userName:string;
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
      userName: user.name,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({ success: false, message: 'Token expirado. Por favor inicia sesión nuevamente.' });
    } else if (error.name === 'JsonWebTokenError') {
      res.status(401).json({ success: false, message: 'Token inválido.' });
    } else {
      res.status(401).json({ success: false, message: 'No autorizado.' });
    }
  }
};

export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;
    
    if (!user) {
      res.status(401).json({ 
        success: false, 
        message: 'Usuario no autenticado' 
      });
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({ 
        success: false, 
        message: 'No tienes permisos para acceder a este recurso' 
      });
      return;
    }

    next();
  };
};