import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../models/User.entity';
import { ApiResponse } from '../types';

const userRepository = AppDataSource.getRepository(User);

export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await userRepository.find({
      select: ['id', 'email', 'name', 'localName', 'adminName', 'role', 'isActive', 'lastLogin', 'createdAt', 'updatedAt'],
      order: { createdAt: 'DESC' },
    });

    const response: ApiResponse = {
      success: true,
      message: 'Usuarios obtenidos exitosamente',
      data: { users },
    };

    res.status(200).json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      message: error.message || 'Error al obtener usuarios',
    };
    res.status(500).json(response);
  }
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await userRepository.findOne({
      where: { id },
      select: ['id', 'email', 'name', 'localName', 'adminName', 'role', 'isActive', 'lastLogin', 'createdAt', 'updatedAt'],
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
      message: 'Usuario obtenido exitosamente',
      data: { user },
    };

    res.status(200).json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      message: error.message || 'Error al obtener usuario',
    };
    res.status(500).json(response);
  }
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, localName, adminName, role } = req.body;

    // Verificar si el usuario ya existe
    const existingUser = await userRepository.findOne({ where: { email } });
    if (existingUser) {
      const response: ApiResponse = {
        success: false,
        message: 'El email ya está registrado',
      };
      res.status(400).json(response);
      return;
    }

    // Crear nuevo usuario
    const user = userRepository.create({
      email,
      password,
      name,
      localName,
      adminName,
      role: role || 'guard',
    });

    await userRepository.save(user);

    const response: ApiResponse = {
      success: true,
      message: 'Usuario creado exitosamente',
      data: { user },
    };

    res.status(201).json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      message: error.message || 'Error al crear usuario',
    };
    res.status(500).json(response);
  }
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const user = await userRepository.findOne({ where: { id } });

    if (!user) {
      const response: ApiResponse = {
        success: false,
        message: 'Usuario no encontrado',
      };
      res.status(404).json(response);
      return;
    }

    // Si se actualiza el email, verificar que no exista
    if (updates.email && updates.email !== user.email) {
      const existingUser = await userRepository.findOne({ 
        where: { email: updates.email } 
      });
      
      if (existingUser) {
        const response: ApiResponse = {
          success: false,
          message: 'El email ya está en uso',
        };
        res.status(400).json(response);
        return;
      }
    }

    // Actualizar usuario
    Object.assign(user, updates);
    await userRepository.save(user);

    const response: ApiResponse = {
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: { user },
    };

    res.status(200).json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      message: error.message || 'Error al actualizar usuario',
    };
    res.status(500).json(response);
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await userRepository.findOne({ where: { id } });

    if (!user) {
      const response: ApiResponse = {
        success: false,
        message: 'Usuario no encontrado',
      };
      res.status(404).json(response);
      return;
    }

    await userRepository.remove(user);

    const response: ApiResponse = {
      success: true,
      message: 'Usuario eliminado exitosamente',
    };

    res.status(200).json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      message: error.message || 'Error al eliminar usuario',
    };
    res.status(500).json(response);
  }
};

export const toggleUserStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await userRepository.findOne({ where: { id } });

    if (!user) {
      const response: ApiResponse = {
        success: false,
        message: 'Usuario no encontrado',
      };
      res.status(404).json(response);
      return;
    }

    user.isActive = !user.isActive;
    await userRepository.save(user);

    const response: ApiResponse = {
      success: true,
      message: `Usuario ${user.isActive ? 'activado' : 'desactivado'} exitosamente`,
      data: { user },
    };

    res.status(200).json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      message: error.message || 'Error al cambiar estado',
    };
    res.status(500).json(response);
  }
};