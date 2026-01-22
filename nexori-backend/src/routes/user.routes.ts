import express from 'express';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

// Ruta temporal para pruebas
router.get('/', authenticate, (req, res) => {
  // simple in-route admin check in place of missing authorize middleware
  if ((req as any).user?.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  res.json({ message: 'User routes working' });
});

export default router;