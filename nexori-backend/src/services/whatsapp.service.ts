// src/services/whatsapp.service.ts
import crypto from 'crypto';

// ── Tipos públicos ──────────────────────────────────────────────────────────

export interface WhatsAppTemplateComponent {
  type: 'header' | 'body' | 'button';
  sub_type?: 'url' | 'quick_reply';
  index?: number;
  parameters: Array<
    | { type: 'text'; text: string }
    | { type: 'image'; image: { link: string } }
    | { type: 'document'; document: { link: string; filename?: string } }
    | { type: 'payload'; payload: string }
  >;
}

export interface WhatsAppSendResult {
  messaging_product: string;
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

export interface PhoneNumberInfo {
  id: string;
  display_phone_number: string;
  verified_name: string;
  quality_rating: string;
}

// ── Tipos internos ──────────────────────────────────────────────────────────

interface WhatsAppTextPayload {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'text';
  text: { preview_url?: boolean; body: string };
}

interface WhatsAppImagePayload {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'image';
  image: { link: string; caption?: string };
}

interface WhatsAppTemplatePayload {
  messaging_product: 'whatsapp';
  to: string;
  type: 'template';
  template: {
    name: string;
    language: { code: string };
    components?: WhatsAppTemplateComponent[];
  };
}

interface MetaErrorBody {
  error?: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

// ── Constantes ──────────────────────────────────────────────────────────────

/** Códigos que indican token inválido/expirado — marcar como inválido, no reintentar */
const TOKEN_ERROR_CODES = new Set([190]);

/**
 * Códigos Meta que son errores de cliente (4xx semánticos) — no reintentar.
 * 100: parámetro inválido · 131030: límite de tasa de plantillas
 * 132000/132001: plantilla no encontrada o inactiva
 * 133010: número no registrado en WhatsApp
 */
const NO_RETRY_CODES = new Set([100, 131030, 132000, 132001, 133010, 190]);

const API_TIMEOUT_MS = 12_000;
const MAX_RETRIES    = 2;

// ── Clase ───────────────────────────────────────────────────────────────────

export class WhatsAppService {
  private readonly apiBase: string;
  private readonly phoneNumberId: string;
  private accessToken: string;

  private tokenValid           = true;
  private tokenInvalidSince: Date | null = null;
  private lastValidatedAt: Date | null   = null;

  constructor() {
    // Permitir override completo con WHATSAPP_API_URL; si no, construir desde versión.
    const version = process.env.WHATSAPP_API_VERSION || 'v25.0';
    this.apiBase = process.env.WHATSAPP_API_URL
      ? process.env.WHATSAPP_API_URL.replace(/\/$/, '')
      : `https://graph.facebook.com/${version}`;

    this.phoneNumberId = (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
    this.accessToken   = (process.env.WHATSAPP_ACCESS_TOKEN   || '').trim();

    if (!this.phoneNumberId || !this.accessToken) {
      console.warn('⚠️  WhatsApp: WHATSAPP_PHONE_NUMBER_ID o WHATSAPP_ACCESS_TOKEN no configurados.');
    }
  }

  // ── Helpers estáticos ─────────────────────────────────────────────────────

  /**
   * Valida y normaliza un número de teléfono a E.164 sin '+'.
   * Acepta: +573001112233, 573001112233, 3001112233 (asume Colombia).
   * Lanza Error si el formato es inválido.
   */
  static formatE164(phone: string): string {
    const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');

    if (!/^\d{7,15}$/.test(cleaned)) {
      throw new Error(
        `Número de teléfono inválido: "${phone}". ` +
        'Debe tener entre 7 y 15 dígitos (formato E.164, ej: 573001112233).'
      );
    }

    // Asumir Colombia (57) si tiene exactamente 10 dígitos sin código de país
    if (cleaned.length === 10 && !cleaned.startsWith('57')) {
      return '57' + cleaned;
    }

    return cleaned;
  }

  // ── Método centralizado de llamada a Graph API ────────────────────────────

  /**
   * Ejecuta una llamada autenticada a la Graph API de Meta.
   * - Añade Authorization header sin exponer el token en logs.
   * - Aplica timeout con AbortController.
   * - Reintenta errores transitorios (red, 429, 5xx) con backoff lineal.
   * - Para errores no recuperables (4xx Meta), lanza inmediatamente.
   */
  private async callMetaAPI<T>(
    endpoint: string,
    options: Omit<RequestInit, 'headers'> & { extraHeaders?: Record<string, string> } = {},
    retries = MAX_RETRIES
  ): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.apiBase}/${endpoint}`;
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    const { extraHeaders, ...fetchOptions } = options;

    let lastErr: unknown;

    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) {
        await new Promise(r => setTimeout(r, attempt * 1_000));
      }

      try {
        const response = await fetch(url, {
          ...fetchOptions,
          headers: {
            'Authorization': `Bearer ${this.accessToken}`, // token nunca se loggea
            'Content-Type': 'application/json',
            ...extraHeaders,
          },
          signal: controller.signal,
        });

        if (response.ok) {
          clearTimeout(timerId);
          return response.json() as Promise<T>;
        }

        const body = await response.json().catch(() => ({})) as MetaErrorBody;
        const code = body?.error?.code ?? 0;

        // Errores de cliente Meta — no reintentar
        if (NO_RETRY_CODES.has(code) || (response.status >= 400 && response.status < 500)) {
          clearTimeout(timerId);
          this.handleMetaError(body);
          const err: any = new Error(body?.error?.message ?? `HTTP ${response.status}`);
          err.metaCode = code;
          err.metaType = body?.error?.type;
          throw err;
        }

        // 5xx / 429 — transitorio, reintentar
        console.warn(
          `⚠️  WhatsApp API: ${response.status} (intento ${attempt + 1}/${retries + 1}) — ` +
          `${body?.error?.message ?? 'error transitorio'}`
        );
        lastErr = new Error(`HTTP ${response.status}: ${body?.error?.message}`);

      } catch (err: any) {
        if (err?.metaCode !== undefined) {
          clearTimeout(timerId);
          throw err; // error Meta ya procesado
        }
        const isTimeout = err?.name === 'AbortError';
        console.warn(
          `⚠️  WhatsApp API: ${isTimeout ? 'timeout' : 'error de red'} ` +
          `(intento ${attempt + 1}/${retries + 1})`
        );
        lastErr = err;
      }
    }

    clearTimeout(timerId);
    throw lastErr;
  }

  // ── Manejo de errores Meta ────────────────────────────────────────────────

  private handleMetaError(errorBody: MetaErrorBody): void {
    const err = errorBody?.error;
    if (!err) return;

    if (TOKEN_ERROR_CODES.has(err.code)) {
      this.tokenValid = false;
      this.tokenInvalidSince = this.tokenInvalidSince ?? new Date();

      console.error('');
      console.error('╔══════════════════════════════════════════════════════════════╗');
      console.error('║  ❌  TOKEN DE WHATSAPP INVÁLIDO O EXPIRADO                   ║');
      console.error('╠══════════════════════════════════════════════════════════════╣');
      console.error(`║  Código: ${err.code}  Subcódigo: ${String(err.error_subcode ?? 'N/A').padEnd(43)}║`);
      console.error('╠══════════════════════════════════════════════════════════════╣');
      console.error('║  Obtener token permanente (System User, nunca expira):       ║');
      console.error('║  1. business.facebook.com → Config → Usuarios del sistema   ║');
      console.error('║  2. Nuevo usuario → agregar app → generar token              ║');
      console.error('║  3. Permisos: whatsapp_business_messaging                    ║');
      console.error('║  4. Expiración: Nunca → copiar y actualizar .env             ║');
      console.error('║  O usa: PUT /api/admin/whatsapp/token { "token": "..." }     ║');
      console.error('╚══════════════════════════════════════════════════════════════╝');
      console.error('');
    } else {
      // Nunca loggear el token; solo datos seguros del error
      console.error('❌ Error de WhatsApp API:', {
        code:    err.code,
        type:    err.type,
        message: err.message,
        subcode: err.error_subcode,
        trace:   err.fbtrace_id,
      });
    }
  }

  // ── Métodos públicos ──────────────────────────────────────────────────────

  /**
   * Obtiene información del número de teléfono desde la Graph API.
   * Útil para healthchecks y validar que PHONE_NUMBER_ID corresponde al número real.
   */
  async getPhoneNumberInfo(): Promise<PhoneNumberInfo | null> {
    if (!this.phoneNumberId || !this.accessToken) return null;

    try {
      return await this.callMetaAPI<PhoneNumberInfo>(
        `${this.apiBase}/${this.phoneNumberId}` +
        '?fields=display_phone_number,verified_name,quality_rating',
        {},
        0 // sin reintentos para healthchecks
      );
    } catch {
      return null;
    }
  }

  async validateToken(): Promise<boolean> {
    if (!this.phoneNumberId || !this.accessToken) {
      this.tokenValid = false;
      return false;
    }

    this.lastValidatedAt = new Date();

    try {
      const info = await this.getPhoneNumberInfo();
      if (info) {
        this.tokenValid = true;
        this.tokenInvalidSince = null;
        console.log(
          `✅ WhatsApp token validado — ${info.display_phone_number} (${info.verified_name})`
        );
        return true;
      }
      this.tokenValid = false;
      return false;
    } catch {
      console.warn('⚠️  WhatsApp: no se pudo validar el token (posible error de red).');
      return false;
    }
  }

  async updateToken(newToken: string): Promise<{ success: boolean; message: string }> {
    if (!newToken?.trim()) {
      return { success: false, message: 'El token no puede estar vacío.' };
    }

    const oldToken = this.accessToken;
    this.accessToken = newToken.trim();

    const valid = await this.validateToken();
    if (valid) {
      console.log('🔑 WhatsApp token actualizado y validado');
      return { success: true, message: 'Token actualizado y validado correctamente.' };
    }

    this.accessToken = oldToken;
    return {
      success: false,
      message: 'El nuevo token es inválido o ha expirado. Se mantuvo el token anterior.',
    };
  }

  // ── Envío de mensajes ─────────────────────────────────────────────────────

  async sendTextMessage(to: string, message: string): Promise<WhatsAppSendResult | null> {
    if (!this.isConfigured()) {
      console.warn('⚠️  WhatsApp: servicio no disponible.');
      return null;
    }

    try {
      const formattedPhone = WhatsAppService.formatE164(to);
      const payload: WhatsAppTextPayload = {
        messaging_product: 'whatsapp',
        recipient_type:    'individual',
        to:                formattedPhone,
        type:              'text',
        text:              { preview_url: false, body: message },
      };

      const data = await this.callMetaAPI<WhatsAppSendResult>(
        `${this.apiBase}/${this.phoneNumberId}/messages`,
        { method: 'POST', body: JSON.stringify(payload) }
      );
      console.log(`✅ Texto enviado a ${formattedPhone} — wamid: ${data.messages?.[0]?.id}`);
      return data;
    } catch (err: any) {
      console.error('❌ sendTextMessage:', err?.message ?? err);
      return null;
    }
  }

  async sendImageMessage(
    to: string,
    imageUrl: string,
    caption?: string
  ): Promise<WhatsAppSendResult | null> {
    if (!this.isConfigured()) {
      console.warn('⚠️  WhatsApp: servicio no disponible.');
      return null;
    }

    try {
      const formattedPhone = WhatsAppService.formatE164(to);
      const payload: WhatsAppImagePayload = {
        messaging_product: 'whatsapp',
        recipient_type:    'individual',
        to:                formattedPhone,
        type:              'image',
        image:             { link: imageUrl, ...(caption ? { caption } : {}) },
      };

      const data = await this.callMetaAPI<WhatsAppSendResult>(
        `${this.apiBase}/${this.phoneNumberId}/messages`,
        { method: 'POST', body: JSON.stringify(payload) }
      );
      console.log(`✅ Imagen enviada a ${formattedPhone} — wamid: ${data.messages?.[0]?.id}`);
      return data;
    } catch (err: any) {
      console.error('❌ sendImageMessage:', err?.message ?? err);
      return null;
    }
  }

  /**
   * Envía un mensaje usando una plantilla aprobada por Meta.
   * @param to           Número en cualquier formato (se normaliza a E.164 sin '+')
   * @param templateName Nombre exacto de la plantilla (ej: "registr_qr")
   * @param languageCode Código de idioma aprobado (ej: "es", "es_CO", "en_US")
   * @param components   Variables opcionales (header, body, buttons)
   */
  async sendTemplate(
    to: string,
    templateName: string,
    languageCode: string,
    components?: WhatsAppTemplateComponent[]
  ): Promise<WhatsAppSendResult | null> {
    if (!this.isConfigured()) {
      console.warn('⚠️  WhatsApp: servicio no disponible.');
      return null;
    }

    if (!templateName?.trim()) throw new Error('templateName es requerido.');
    if (!languageCode?.trim()) throw new Error('languageCode es requerido.');

    try {
      const formattedPhone = WhatsAppService.formatE164(to);
      const payload: WhatsAppTemplatePayload = {
        messaging_product: 'whatsapp',
        to:                formattedPhone,
        type:              'template',
        template: {
          name:     templateName.trim(),
          language: { code: languageCode.trim() },
          ...(components?.length ? { components } : {}),
        },
      };

      const data = await this.callMetaAPI<WhatsAppSendResult>(
        `${this.apiBase}/${this.phoneNumberId}/messages`,
        { method: 'POST', body: JSON.stringify(payload) }
      );
      console.log(
        `✅ Plantilla "${templateName}" enviada a ${formattedPhone} — wamid: ${data.messages?.[0]?.id}`
      );
      return data;
    } catch (err: any) {
      console.error(`❌ sendTemplate("${templateName}"):`, err?.message ?? err);
      return null;
    }
  }

  /**
   * Envía el comprobante QR de registro de bicicleta por WhatsApp.
   * Usa la plantilla registr_qr si WHATSAPP_TEMPLATE_NAME está configurado;
   * de lo contrario, envía imagen con caption como fallback.
   *
   * Estructura de registr_qr:
   *   Header: imagen (QR)
   *   Body:   {{1}} etiqueta · {{2}} nombre dueño · {{3}} serie · {{4}} marca · {{5}} modelo
   *   Footer: estático "Nexori - Sistema de gestión en seguridad"
   */
  async sendBikeQRCode(
    phoneNumber: string,
    qrCodeUrl: string,
    bikeData: {
      serialNumber: string;
      brand: string;
      model: string;
      ownerName: string;
      qrCode: string;
    }
  ): Promise<boolean> {
    if (!this.isConfigured()) return false;

    try {
      const templateName = process.env.WHATSAPP_TEMPLATE_NAME;
      const templateLang = process.env.WHATSAPP_TEMPLATE_LANG || 'es';

      if (templateName) {
        const bikeLabel = `${bikeData.brand} ${bikeData.model}`.trim();
        const components: WhatsAppTemplateComponent[] = [
          {
            type:       'header',
            parameters: [{ type: 'image', image: { link: qrCodeUrl } }],
          },
          {
            type: 'body',
            parameters: [
              { type: 'text', text: bikeLabel            }, // {{1}} Comprobante de registro – X
              { type: 'text', text: bikeData.ownerName   }, // {{2}} Hola X
              { type: 'text', text: bikeData.serialNumber}, // {{3}} Serie
              { type: 'text', text: bikeData.brand       }, // {{4}} Marca
              { type: 'text', text: bikeData.model       }, // {{5}} Modelo
            ],
          },
        ];

        const result = await this.sendTemplate(phoneNumber, templateName, templateLang, components);
        if (result) {
          console.log(`✅ QR enviado vía plantilla "${templateName}" a ${phoneNumber}`);
          return true;
        }
        console.warn('⚠️  Plantilla falló — intentando fallback con imagen libre...');
      }

      // Fallback: imagen con caption (cuando la plantilla no está configurada o falla)
      const bikeLabel = `${bikeData.brand} ${bikeData.model}`.trim();
      const caption = `
*Comprobante de registro – ${bikeLabel}*

Hola ${bikeData.ownerName}, adjuntamos el comprobante QR correspondiente al registro exitoso de su bicicleta en el sistema Nexori.

📋 *Detalles del registro:*
- Serie: ${bikeData.serialNumber}
- Marca: ${bikeData.brand}
- Modelo: ${bikeData.model}

🔎 *Cómo usar tu comprobante:*
Presenta este QR en los puntos de control al ingresar o retirar tu bicicleta para validar tu registro.

ℹ️ Este comprobante es personal y está vinculado únicamente a la bicicleta registrada.
      `.trim();

      const result = await this.sendImageMessage(phoneNumber, qrCodeUrl, caption);
      if (!result) {
        console.error('❌ No se pudo enviar el comprobante QR a WhatsApp');
        return false;
      }

      console.log(`✅ QR Code enviado (fallback imagen) a ${phoneNumber}`);
      return true;
    } catch (err: any) {
      console.error('❌ sendBikeQRCode:', err?.message ?? err);
      return false;
    }
  }

  // ── Estado del servicio ───────────────────────────────────────────────────

  isConfigured(): boolean {
    return !!(this.phoneNumberId && this.accessToken && this.tokenValid);
  }

  getStatus() {
    return {
      configured:          !!(this.phoneNumberId && this.accessToken),
      tokenValid:          this.tokenValid,
      tokenInvalidSince:   this.tokenInvalidSince?.toISOString() ?? null,
      lastValidatedAt:     this.lastValidatedAt?.toISOString()   ?? null,
      phoneNumberId:       this.phoneNumberId || null,
      apiVersion:          this.apiBase.match(/v\d+\.\d+/)?.[0]  ?? 'unknown',
      ready:               this.isConfigured(),
    };
  }
}

// Exportar instancia única
export const whatsappService = new WhatsAppService();
