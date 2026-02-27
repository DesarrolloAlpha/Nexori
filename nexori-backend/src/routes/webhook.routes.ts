import { Router, Request, Response } from 'express';
import crypto from 'crypto';

const router = Router();

/**
 * GET /webhook
 * Meta llama este endpoint al configurar el webhook en el dashboard.
 * Responde con el challenge si el verify_token coincide.
 */
router.get('/', (req: Request, res: Response) => {
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('✅ WhatsApp webhook verificado por Meta');
    res.status(200).send(challenge);
    return;
  }

  console.warn('⚠️  WhatsApp webhook: token de verificación incorrecto (esperado vs recibido)');
  res.sendStatus(403);
});

/**
 * POST /webhook
 * Meta envía eventos aquí: mensajes entrantes, estados de entrega, etc.
 * Si WHATSAPP_APP_SECRET está configurado, se valida la firma HMAC-SHA256.
 */
router.post('/', (req: Request, res: Response) => {
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  if (appSecret) {
    const signature = req.headers['x-hub-signature-256'] as string | undefined;
    const rawBody   = (req as any).rawBody as Buffer | undefined;

    if (!signature || !rawBody) {
      console.warn('⚠️  Webhook POST: falta firma o cuerpo crudo — rechazado');
      res.sendStatus(403);
      return;
    }

    const expected = 'sha256=' + crypto
      .createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex');

    let signaturesMatch = false;
    try {
      signaturesMatch = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected)
      );
    } catch {
      signaturesMatch = false;
    }

    if (!signaturesMatch) {
      console.warn('⚠️  Webhook POST: firma inválida — rechazado');
      res.sendStatus(403);
      return;
    }
  }

  // Meta siempre debe recibir 200 rápidamente, aunque el procesamiento falle
  res.sendStatus(200);

  const body = req.body;

  if (body?.object !== 'whatsapp_business_account') return;

  body.entry?.forEach((entry: any) => {
    entry.changes?.forEach((change: any) => {
      const value = change.value;

      // Mensajes entrantes
      value.messages?.forEach((message: any) => {
        handleIncomingMessage(message, value.metadata);
      });

      // Estados de entrega / lectura
      value.statuses?.forEach((status: any) => {
        handleMessageStatus(status);
      });
    });
  });
});

// ── Handlers internos ──────────────────────────────────────────────────────

function handleIncomingMessage(message: any, _metadata: any): void {
  const from = message.from;
  const type = message.type;

  if (type === 'text') {
    console.log(`📨 WhatsApp de ${from}: "${message.text?.body}"`);
  } else {
    console.log(`📨 WhatsApp de ${from} (tipo: ${type})`);
  }

  // Aquí se puede extender: guardar en DB, responder automáticamente, etc.
}

function handleMessageStatus(status: any): void {
  // Estados posibles: sent | delivered | read | failed
  const emoji = status.status === 'read' ? '👁️' : status.status === 'delivered' ? '✅' : status.status === 'failed' ? '❌' : '📤';
  console.log(`${emoji} Mensaje ${status.id}: ${status.status}`);
}

export default router;
