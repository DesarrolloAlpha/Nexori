// routes/ticket.routes.ts

import express from 'express';
import { TicketController } from '../controllers/ticket.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// GET /api/tickets - Obtener todos los tickets
router.get('/', TicketController.getAll);

// GET /api/tickets/statistics - Obtener estadísticas
router.get('/statistics', TicketController.getStatistics);

// GET /api/tickets/:id - Obtener ticket por ID
router.get('/:id', TicketController.getById);

// POST /api/tickets - Crear nuevo ticket
router.post('/', TicketController.create);

// PUT /api/tickets/:id - Actualizar ticket
router.put('/:id', TicketController.update);

// DELETE /api/tickets/:id - Eliminar ticket
router.delete('/:id', TicketController.delete);

// POST /api/tickets/:id/comments - Agregar comentario
router.post('/:id/comments', TicketController.addComment);

export default router;