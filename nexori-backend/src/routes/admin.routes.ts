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

/**
 * POST /api/admin/whatsapp/test-template
 * Envía la plantilla registr_qr a un número de prueba con datos de ejemplo.
 * Body: { "to": "573001112233", "qrImageUrl": "https://..." }  (ambos opcionales)
 */
router.post('/whatsapp/test-template', authorize('admin'), async (req: Request, res: Response) => {
  const { to, qrImageUrl } = req.body as { to?: string; qrImageUrl?: string };

  const phone    = to || process.env.WHATSAPP_TEST_NUMBER;
  const template = process.env.WHATSAPP_TEMPLATE_NAME;
  const lang     = process.env.WHATSAPP_TEMPLATE_LANG || 'es';

  if (!phone) {
    res.status(400).json({ success: false, message: 'Proporciona "to" en el body o define WHATSAPP_TEST_NUMBER en .env.' });
    return;
  }
  if (!template) {
    res.status(400).json({ success: false, message: 'Define WHATSAPP_TEMPLATE_NAME en el .env.' });
    return;
  }

  // Imagen pública de prueba si no se proporciona una URL de QR
  const testQrUrl = qrImageUrl || 'https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg';

  // Componentes con la estructura exacta de registr_qr
  // Header: imagen · Body: {{1}} etiqueta · {{2}} nombre · {{3}} serie · {{4}} marca · {{5}} modelo
  const components = [
    {
      type: 'header' as const,
      parameters: [{ type: 'image' as const, image: { link: testQrUrl } }],
    },
    {
      type: 'body' as const,
      parameters: [
        { type: 'text' as const, text: 'Roca Mountain Bike' }, // {{1}}
        { type: 'text' as const, text: 'Carlos'              }, // {{2}}
        { type: 'text' as const, text: 'SN-001-TEST'         }, // {{3}}
        { type: 'text' as const, text: 'Roca'                }, // {{4}}
        { type: 'text' as const, text: 'Mountain Bike'       }, // {{5}}
      ],
    },
  ];

  const result = await whatsappService.sendTemplate(phone, template, lang, components);
  const response: ApiResponse = {
    success: !!result,
    message: result
      ? `Plantilla "${template}" enviada a ${phone}`
      : `Falló el envío — revisa la consola del servidor para detalles`,
    data: result ?? undefined,
  };
  res.status(result ? 200 : 500).json(response);
});

export default router;
