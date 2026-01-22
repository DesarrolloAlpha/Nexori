import { Request, Response } from 'express';
import jwt from 'jsonwebtoken'; // Añadir esta línea
import { AppDataSource } from '../config/database';
import { User } from '../models/User.entity';
import { generateToken, generateRefreshToken } from '../utils/jwt.utils';
import { registerSchema, loginSchema } from '../validations/auth.validations';
import { ApiResponse } from '../types';

const userRepository = AppDataSource.getRepository(User);

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validar entrada
    const validatedData = registerSchema.parse(req.body);
    
    // Verificar si el usuario ya existe
    const existingUser = await userRepository.findOne({ 
      where: { email: validatedData.email } 
    });
    
    if (existingUser) {
      const response: ApiResponse = {
        success: false,
        message: 'El usuario ya existe',
      };
      res.status(400).json(response);
      return;
    }

    // Crear nuevo usuario
    const user = userRepository.create({
      email: validatedData.email,
      password: validatedData.password,
      name: validatedData.name,
      role: validatedData.role,
    });

    await userRepository.save(user);

    // Generar tokens
    const token = generateToken(user.id, user.email, user.role);
    const refreshToken = generateRefreshToken(user.id);

    // Actualizar último login
    user.lastLogin = new Date();
    await userRepository.save(user);

    const response: ApiResponse = {
      success: true,
      message: 'Usuario registrado exitosamente',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isActive: user.isActive,
        },
        token,
        refreshToken,
      },
    };

    res.status(201).json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      message: error.message || 'Error en el registro',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    };
    res.status(500).json(response);
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validar entrada
    const validatedData = loginSchema.parse(req.body);
    
    // Buscar usuario
    const user = await userRepository.findOne({ 
      where: { email: validatedData.email } 
    });
    
    if (!user) {
      const response: ApiResponse = {
        success: false,
        message: 'Credenciales inválidas',
      };
      res.status(401).json(response);
      return;
    }

    // Verificar contraseña
    const isPasswordValid = await user.comparePassword(validatedData.password);
    if (!isPasswordValid) {
      const response: ApiResponse = {
        success: false,
        message: 'Credenciales inválidas',
      };
      res.status(401).json(response);
      return;
    }

    // Verificar si el usuario está activo
    if (!user.isActive) {
      const response: ApiResponse = {
        success: false,
        message: 'Usuario inactivo. Contacta al administrador.',
      };
      res.status(403).json(response);
      return;
    }

    // Generar tokens
    const token = generateToken(user.id, user.email, user.role);
    const refreshToken = generateRefreshToken(user.id);

    // Actualizar último login
    user.lastLogin = new Date();
    await userRepository.save(user);

    const response: ApiResponse = {
      success: true,
      message: 'Inicio de sesión exitoso',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
        },
        token,
        refreshToken,
      },
    };

    res.status(200).json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      message: error.message || 'Error en el inicio de sesión',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    };
    res.status(500).json(response);
  }
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      const response: ApiResponse = {
        success: false,
        message: 'Refresh token es requerido',
      };
      res.status(400).json(response);
      return;
    }

    // Verificar refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { userId: string };
    
    // Buscar usuario
    const user = await userRepository.findOne({ 
      where: { id: decoded.userId } 
    });
    
    if (!user || !user.isActive) {
      const response: ApiResponse = {
        success: false,
        message: 'Usuario no encontrado o inactivo',
      };
      res.status(404).json(response);
      return;
    }

    // Generar nuevo token
    const newToken = generateToken(user.id, user.email, user.role);
    const newRefreshToken = generateRefreshToken(user.id);

    const response: ApiResponse = {
      success: true,
      message: 'Token refrescado exitosamente',
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
      },
    };

    res.status(200).json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      message: 'Refresh token inválido o expirado',
    };
    res.status(401).json(response);
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  const response: ApiResponse = {
    success: true,
    message: 'Sesión cerrada exitosamente',
  };
  res.status(200).json(response);
};

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        message: 'Usuario no autenticado',
      };
      res.status(401).json(response);
      return;
    }

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

    const response: ApiResponse = {
      success: true,
      message: 'Perfil obtenido exitosamente',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
        },
      },
    };

    res.status(200).json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      message: error.message || 'Error al obtener perfil',
    };
    res.status(500).json(response);
  }
};