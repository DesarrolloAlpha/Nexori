import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { AppDataSource } from '../config/database';
import { WhatsAppMessageStatus } from '../models/WhatsAppMessageStatus.entity';

const router = Router();

// ── GET /webhook — verificación de Meta ─────────────────────────────────────

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

  console.warn('⚠️  WhatsApp webhook: token de verificación incorrecto');
  res.sendStatus(403);
});

// ── POST /webhook — eventos entrantes de Meta ────────────────────────────────

router.post('/', (req: Request, res: Response) => {
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  // Validación HMAC-SHA256 (obligatoria en producción si WHATSAPP_APP_SECRET está definido)
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
      console.warn('⚠️  Webhook POST: firma HMAC inválida — rechazado');
      res.sendStatus(403);
      return;
    }
  }

  // Meta SIEMPRE debe recibir 200 rápidamente (< 20 s), antes de cualquier procesamiento
  res.sendStatus(200);

  const body = req.body;
  if (body?.object !== 'whatsapp_business_account') return;

  // Hash del payload completo para auditoría — se almacena en cada registro de status
  const rawEventHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(body))
    .digest('hex');

  body.entry?.forEach((entry: any) => {
    entry.changes?.forEach((change: any) => {
      const value = change.value;

      // Mensajes entrantes (texto, imagen, audio, etc.)
      value.messages?.forEach((message: any) => {
        handleIncomingMessage(message, value.metadata);
      });

      // Cambios de estado de mensajes enviados (sent, delivered, read, failed)
      value.statuses?.forEach((status: any) => {
        persistMessageStatus(status, rawEventHash).catch(err =>
          console.error('❌ Error persistiendo status WhatsApp:', err?.message ?? err)
        );
      });
    });
  });
});

// ── Handlers internos ────────────────────────────────────────────────────────

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

/**
 * Persiste un evento de status de mensaje en la BD.
 *
 * Idempotencia: la restricción única (messageId, status) en la tabla asegura que
 * si Meta reenvía el mismo evento, el INSERT falla con código 23505 (unique_violation)
 * y se ignora silenciosamente — sin generar duplicados ni errores visibles.
 */
async function persistMessageStatus(status: any, rawEventHash: string): Promise<void> {
  const statusEmoji: Record<string, string> = {
    sent:      '📤',
    delivered: '✅',
    read:      '👁️',
    failed:    '❌',
    warning:   '⚠️',
  };
  const emoji = statusEmoji[status.status as string] ?? '📡';
  console.log(`${emoji} wamid ${status.id}: ${status.status} (ts: ${status.timestamp})`);

  if (!AppDataSource.isInitialized) {
    console.warn('⚠️  BD no inicializada — status no persistido');
    return;
  }

  const repo   = AppDataSource.getRepository(WhatsAppMessageStatus);
  const record = repo.create({
    messageId:       status.id,
    status:          status.status,
    statusTimestamp: status.timestamp,
    recipientId:     status.recipient_id ?? null,
    errorCode:       status.errors?.[0]?.code  ?? null,
    errorTitle:      status.errors?.[0]?.title ?? null,
    rawEventHash,
  });

  try {
    await repo.save(record);
    console.log(`💾 Status "${status.status}" guardado — wamid: ${status.id}`);
  } catch (err: any) {
    if (err?.code === '23505') {
      // Evento duplicado — Meta lo reenvía con frecuencia, es normal
      console.debug(`ℹ️  Status duplicado ignorado: ${status.id} / ${status.status}`);
    } else {
      throw err;
    }
  }
}

export default router;
