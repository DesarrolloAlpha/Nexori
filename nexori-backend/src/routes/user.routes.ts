import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
} from '../controllers/user.controller';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// Obtener todos los usuarios (admin, coordinator)
router.get('/', authorize('admin', 'coordinator'), getAllUsers);

// Obtener usuario por ID
router.get('/:id', authorize('admin', 'coordinator'), getUserById);

// Crear nuevo usuario (solo admin)
router.post('/', authorize('admin'), createUser);

// Actualizar usuario (solo admin)
router.put('/:id', authorize('admin'), updateUser);

// Cambiar estado activo/inactivo (solo admin)
router.patch('/:id/toggle-status', authorize('admin'), toggleUserStatus);

// Eliminar usuario (solo admin)
router.delete('/:id', authorize('admin'), deleteUser);

export default router;