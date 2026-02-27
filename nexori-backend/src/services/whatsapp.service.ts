// src/services/whatsapp.service.ts
import dotenv from 'dotenv';

dotenv.config();

// ── Tipos ──────────────────────────────────────────────────────────────────

interface WhatsAppTextMessage {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'text';
  text: {
    preview_url?: boolean;
    body: string;
  };
}

interface WhatsAppImageMessage {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'image';
  image: {
    link: string;
    caption?: string;
  };
}

interface WhatsAppResponse {
  messaging_product: string;
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
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

// ── Códigos de error Meta que indican token inválido/expirado ──────────────
// https://developers.facebook.com/docs/graph-api/guides/error-handling/
const TOKEN_ERROR_CODES = new Set([190]); // OAuthException — token inválido, expirado o revocado

// ── Clase ──────────────────────────────────────────────────────────────────

export class WhatsAppService {
  private apiUrl: string;
  private phoneNumberId: string;
  private accessToken: string;

  /** true = token válido en el último chequeo; false = expirado o inválido */
  private tokenValid = true;
  /** Fecha en la que se detectó por primera vez que el token era inválido */
  private tokenInvalidSince: Date | null = null;
  /** Fecha del último intento de validación */
  private lastValidatedAt: Date | null = null;

  constructor() {
    this.apiUrl         = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v21.0';
    this.phoneNumberId  = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.accessToken    = process.env.WHATSAPP_ACCESS_TOKEN || '';

    if (!this.phoneNumberId || !this.accessToken) {
      console.warn('⚠️  WhatsApp: WHATSAPP_PHONE_NUMBER_ID o WHATSAPP_ACCESS_TOKEN no configurados.');
    }
  }

  // ── Helpers privados ──────────────────────────────────────────────────────

  private formatPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/[\s\-\(\)]/g, '');
    if (cleaned.startsWith('+')) cleaned = cleaned.substring(1);
    if (!cleaned.startsWith('57') && cleaned.length === 10) cleaned = '57' + cleaned;
    return cleaned;
  }

  /**
   * Analiza la respuesta de la API de Meta.
   * Si detecta un error de token (código 190), marca el token como inválido
   * y emite instrucciones claras en la consola.
   */
  private handleMetaError(errorBody: MetaErrorBody): void {
    const err = errorBody?.error;
    if (!err) return;

    if (TOKEN_ERROR_CODES.has(err.code)) {
      // Token expirado/inválido/revocado
      this.tokenValid = false;
      this.tokenInvalidSince = this.tokenInvalidSince ?? new Date();

      console.error('');
      console.error('╔══════════════════════════════════════════════════════════════╗');
      console.error('║  ❌  TOKEN DE WHATSAPP INVÁLIDO O EXPIRADO                   ║');
      console.error('╠══════════════════════════════════════════════════════════════╣');
      console.error(`║  Código:    ${err.code}  Subcódigo: ${err.error_subcode ?? 'N/A'}                           ║`);
      console.error(`║  Mensaje:   ${(err.message ?? '').substring(0, 54).padEnd(54)}  ║`);
      console.error('╠══════════════════════════════════════════════════════════════╣');
      console.error('║  CÓMO OBTENER UN TOKEN PERMANENTE (nunca expira):            ║');
      console.error('║  1. Meta Business Manager → Configuración → Usuarios del    ║');
      console.error('║     sistema → Crear usuario del sistema                      ║');
      console.error('║  2. Asignar el rol "Empleado" + agregar app de WhatsApp      ║');
      console.error('║  3. Generar token → seleccionar "whatsapp_business_messaging"║');
      console.error('║  4. Elegir expiración: "Nunca"                               ║');
      console.error('║  5. Copiar token y actualizar WHATSAPP_ACCESS_TOKEN en .env  ║');
      console.error('║  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  ║');
      console.error('║  O usa el endpoint (solo admin):                             ║');
      console.error('║  PUT /api/admin/whatsapp/token  { "token": "NUEVO_TOKEN" }  ║');
      console.error('╚══════════════════════════════════════════════════════════════╝');
      console.error('');
    } else {
      console.error('❌ Error de WhatsApp API:', err);
    }
  }

  /**
   * Llama a la API de Meta para verificar si el token actual es válido.
   * Se ejecuta automáticamente al iniciar el servidor.
   */
  async validateToken(): Promise<boolean> {
    if (!this.phoneNumberId || !this.accessToken) {
      this.tokenValid = false;
      return false;
    }

    this.lastValidatedAt = new Date();

    try {
      const response = await fetch(
        `${this.apiUrl}/${this.phoneNumberId}?fields=display_phone_number,verified_name`,
        {
          headers: { 'Authorization': `Bearer ${this.accessToken}` },
        }
      );

      if (response.ok) {
        this.tokenValid = true;
        this.tokenInvalidSince = null;
        console.log('✅ WhatsApp token validado correctamente');
        return true;
      }

      const errorBody = await response.json().catch(() => ({})) as MetaErrorBody;
      this.handleMetaError(errorBody);
      return false;
    } catch (err) {
      console.warn('⚠️  WhatsApp: No se pudo validar el token (posible problema de red):', err);
      // No marcar como inválido por problemas de red
      return false;
    }
  }

  /**
   * Actualiza el access token en memoria sin necesitar reiniciar el servidor.
   * El token nuevo es validado antes de aceptarse.
   */
  async updateToken(newToken: string): Promise<{ success: boolean; message: string }> {
    if (!newToken?.trim()) {
      return { success: false, message: 'El token no puede estar vacío.' };
    }

    const oldToken = this.accessToken;
    this.accessToken = newToken.trim();

    const valid = await this.validateToken();
    if (valid) {
      console.log('🔑 WhatsApp token actualizado y validado correctamente');
      return { success: true, message: 'Token actualizado y validado correctamente.' };
    }

    // Si el token nuevo tampoco es válido, restaurar el anterior
    this.accessToken = oldToken;
    return { success: false, message: 'El nuevo token es inválido o ha expirado. Se mantuvo el token anterior.' };
  }

  // ── Métodos públicos de envío ─────────────────────────────────────────────

  async sendTextMessage(to: string, message: string): Promise<WhatsAppResponse | null> {
    if (!this.isConfigured()) {
      console.warn('⚠️  WhatsApp: Servicio no disponible (token inválido o no configurado).');
      return null;
    }

    try {
      const formattedPhone = this.formatPhoneNumber(to);
      const payload: WhatsAppTextMessage = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'text',
        text: { preview_url: false, body: message },
      };

      const response = await fetch(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({})) as MetaErrorBody;
        this.handleMetaError(errorBody);
        return null;
      }

      const data = await response.json() as WhatsAppResponse;
      console.log('✅ Mensaje de WhatsApp enviado:', data);
      return data;
    } catch (error) {
      console.error('❌ Error en WhatsAppService.sendTextMessage:', error);
      return null;
    }
  }

  async sendImageMessage(to: string, imageUrl: string, caption?: string): Promise<WhatsAppResponse | null> {
    if (!this.isConfigured()) {
      console.warn('⚠️  WhatsApp: Servicio no disponible (token inválido o no configurado).');
      return null;
    }

    try {
      const formattedPhone = this.formatPhoneNumber(to);
      const payload: WhatsAppImageMessage = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'image',
        image: { link: imageUrl, caption: caption || undefined },
      };

      const response = await fetch(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({})) as MetaErrorBody;
        this.handleMetaError(errorBody);
        return null;
      }

      const data = await response.json() as WhatsAppResponse;
      console.log('✅ Imagen de WhatsApp enviada:', data);
      return data;
    } catch (error) {
      console.error('❌ Error en WhatsAppService.sendImageMessage:', error);
      return null;
    }
  }

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
      const bikeLabel = `${bikeData.brand} ${bikeData.model}`.trim();
      const imageCaption = `
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

      const imageResult = await this.sendImageMessage(phoneNumber, qrCodeUrl, imageCaption);
      if (!imageResult) {
        console.error('❌ No se pudo enviar el comprobante con QR a WhatsApp');
        return false;
      }

      console.log(`✅ QR Code enviado exitosamente a ${phoneNumber}`);
      return true;
    } catch (error) {
      console.error('❌ Error en WhatsAppService.sendBikeQRCode:', error);
      return false;
    }
  }

  // ── Consultas de estado ───────────────────────────────────────────────────

  /** El servicio está listo para enviar mensajes */
  isConfigured(): boolean {
    return !!(this.phoneNumberId && this.accessToken && this.tokenValid);
  }

  /** Devuelve un resumen del estado del servicio para el endpoint de admin */
  getStatus() {
    return {
      configured: !!(this.phoneNumberId && this.accessToken),
      tokenValid: this.tokenValid,
      tokenInvalidSince: this.tokenInvalidSince?.toISOString() ?? null,
      lastValidatedAt: this.lastValidatedAt?.toISOString() ?? null,
      phoneNumberId: this.phoneNumberId || null,
      ready: this.isConfigured(),
    };
  }
}

// Exportar instancia única
export const whatsappService = new WhatsAppService();
