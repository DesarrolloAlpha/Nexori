import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  createPanicEvent,
  getAllPanicEvents,
  updatePanicEventStatus,
  uploadPanicImage,
} from '../controllers/panic.controller';
import { panicImageUpload } from '../config/multer.config';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// Crear nuevo evento de pánico (cualquier usuario autenticado)
router.post('/', createPanicEvent);

// Obtener todos los eventos (para coordinadores/admins/supervisores)
router.get('/', getAllPanicEvents);

// Actualizar estado de evento (atender/resolver)
router.put('/:id/status', updatePanicEventStatus);

// Subir imagen adjunta a un evento de pánico
router.post('/:id/images', panicImageUpload, uploadPanicImage);

export default router;