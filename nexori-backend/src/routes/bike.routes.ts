import express, { Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  createBike,
  getAllBikes,
  getBikeById,
  updateBike,
  deleteBike,
  checkInBike,
  checkOutBike,
  getBikeHistory,
} from '../controllers/bike.controller';

const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    if (roles.length === 0 || roles.includes(user.role)) {
      return next();
    }
    return res.status(403).json({ message: 'Forbidden' });
  };
};

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// Rutas para operadores, coordinadores, supervisores y admins
router.get('/', getAllBikes);
router.get('/:id', getBikeById);
router.get('/:id/history', getBikeHistory);

// Solo operadores, coordinadores y admins pueden registrar bicicletas
router.post('/', authorize('admin', 'coordinator', 'operator'), createBike);

// Solo operadores, coordinadores y admins pueden actualizar
router.put('/:id', authorize('admin', 'coordinator', 'operator'), updateBike);

// Solo admins pueden eliminar
router.delete('/:id', authorize('admin'), deleteBike);

// Operaciones de ingreso/salida
router.post('/:id/check-in', authorize('admin', 'coordinator', 'operator', 'guard'), checkInBike);
router.post('/:id/check-out', authorize('admin', 'coordinator', 'operator', 'guard'), checkOutBike);

export default router;