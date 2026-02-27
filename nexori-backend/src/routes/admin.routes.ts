import express, { Request, Response } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { whatsappService } from '../services/whatsapp.service';
import { ApiResponse } from '../types';

const router = express.Router();

router.use(authenticate);

/**
 * GET /api/admin/whatsapp/status
 * Devuelve el estado actual del servicio de WhatsApp (token válido, fecha, etc.)
 */
router.get('/whatsapp/status', authorize('admin'), async (_req: Request, res: Response) => {
  const status = whatsappService.getStatus();
  const response: ApiResponse = {
    success: true,
    message: status.ready
      ? 'Servicio de WhatsApp operativo'
      : status.tokenValid
        ? 'WhatsApp configurado pero sin credenciales completas'
        : 'Token de WhatsApp inválido o expirado',
    data: { whatsapp: status },
  };
  res.status(200).json(response);
});

/**
 * POST /api/admin/whatsapp/validate
 * Fuerza una validación del token actual contra la API de Meta.
 */
router.post('/whatsapp/validate', authorize('admin'), async (_req: Request, res: Response) => {
  const valid = await whatsappService.validateToken();
  const status = whatsappService.getStatus();
  const response: ApiResponse = {
    success: valid,
    message: valid ? 'Token válido y operativo' : 'Token inválido o expirado — revisa la consola para instrucciones',
    data: { whatsapp: status },
  };
  res.status(valid ? 200 : 400).json(response);
});

/**
 * PUT /api/admin/whatsapp/token
 * Actualiza el access token de WhatsApp en memoria sin reiniciar el servidor.
 * Body: { "token": "NUEVO_TOKEN_PERMANENTE" }
 *
 * NOTA: Este cambio es en memoria. Para que sea permanente, actualiza también
 * WHATSAPP_ACCESS_TOKEN en el archivo .env.
 */
router.put('/whatsapp/token', authorize('admin'), async (req: Request, res: Response) => {
  const { token } = req.body as { token?: string };

  if (!token?.trim()) {
    const response: ApiResponse = {
      success: false,
      message: 'Se requiere el campo "token" en el body.',
    };
    res.status(400).json(response);
    return;
  }

  const result = await whatsappService.updateToken(token.trim());
  const status = whatsappService.getStatus();
  const response: ApiResponse = {
    success: result.success,
    message: result.message,
    data: { whatsapp: status },
  };
  res.status(result.success ? 200 : 400).json(response);
});

export default router;
