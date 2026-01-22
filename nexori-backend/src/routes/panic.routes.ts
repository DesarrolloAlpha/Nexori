import express from 'express';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  res.json({ message: 'Panic routes working' });
});

export default router;