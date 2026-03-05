import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique } from 'typeorm';

/**
 * Persiste cada cambio de estado que Meta notifica por webhook.
 *
 * Idempotencia: la restricción única (messageId, status) garantiza que si Meta
 * reenvía el mismo evento (lo hace frecuentemente), la BD lo rechaza con
 * código 23505 y el handler lo ignora silenciosamente.
 *
 * Ciclo de vida de un mensaje:
 *   sent → delivered → read  (normal)
 *   sent → failed            (error de entrega)
 */
@Entity('whatsapp_message_statuses')
@Unique(['messageId', 'status'])
export class WhatsAppMessageStatus {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** wamid — identificador único del mensaje en Meta (ej: wamid.HBgL...) */
  @Column({ name: 'message_id' })
  messageId: string;

  /** sent | delivered | read | failed | warning */
  @Column({ length: 20 })
  status: string;

  /** Unix timestamp en segundos enviado por Meta */
  @Column({ type: 'bigint', name: 'status_timestamp' })
  statusTimestamp: string;

  /** Número E.164 del destinatario sin '+' (ej: 573001112233) */
  @Column({ name: 'recipient_id', type: 'varchar', length: 20, nullable: true })
  recipientId: string;

  /** Código de error Meta — solo presente cuando status = 'failed' */
  @Column({ name: 'error_code', type: 'int', nullable: true })
  errorCode: number;

  /** Título del error — solo presente cuando status = 'failed' */
  @Column({ name: 'error_title', type: 'text', nullable: true })
  errorTitle: string;

  /** SHA-256 hex del payload JSON crudo — para auditoría y trazabilidad */
  @Column({ name: 'raw_event_hash', length: 64 })
  rawEventHash: string;

  @CreateDateColumn({ name: 'received_at' })
  receivedAt: Date;
}
