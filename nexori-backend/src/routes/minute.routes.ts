import express from 'express';
import { MinuteController } from '../controllers/minute.controller';
import { authenticate } from '../middleware/auth.middleware';
// Importar la configuración mejorada de multer
import { minuteUpload } from '../config/multer.config';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// GET /api/minutes - Obtener todas las minutas
router.get('/', MinuteController.getAll);

// GET /api/minutes/statistics - Obtener estadísticas
router.get('/statistics', MinuteController.getStatistics);

// GET /api/minutes/:id - Obtener minuta por ID
router.get('/:id', MinuteController.getById);

// POST /api/minutes - Crear nueva minuta
router.post('/', MinuteController.create);

// PUT /api/minutes/:id - Actualizar minuta
router.put('/:id', MinuteController.update);

// DELETE /api/minutes/:id - Eliminar minuta
router.delete('/:id', MinuteController.delete);

// POST /api/minutes/:id/assign - Asignar minuta
router.post('/:id/assign', MinuteController.assign);

// POST /api/minutes/:id/attachments - Subir archivo adjunto
// Usamos minuteUpload que incluye validaciones de tipo y tamaño
router.post('/:id/attachments', minuteUpload, MinuteController.uploadAttachment);

// DELETE /api/minutes/:id/attachments/:attachmentIndex - Eliminar archivo adjunto
router.delete('/:id/attachments/:attachmentIndex', MinuteController.deleteAttachment);

export default router;