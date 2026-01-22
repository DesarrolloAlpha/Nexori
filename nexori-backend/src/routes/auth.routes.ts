import express from 'express';
import {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

// Rutas públicas
router.post('/register', register);
router.post('/login', login);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);

// Ruta protegida
router.get('/profile', authenticate, getProfile);

export default router;