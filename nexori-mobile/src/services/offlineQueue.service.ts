/**
 * offlineQueue.service.ts
 *
 * Servicio singleton de cola offline para Nexori Mobile.
 *
 * Responsabilidades:
 *  - Detectar estado de red con NetInfo
 *  - Persistir operaciones pendientes en AsyncStorage
 *  - Cachear últimos datos conocidos por entidad
 *  - Procesar la cola automáticamente al restaurarse la conexión
 *  - Notificar a subscriptores cuando termina la sincronización
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import api from './api';

// ─── Tipos públicos ────────────────────────────────────────────────────────────

export type OfflineEntity = 'bike' | 'minute';
export type OfflineOp = 'create' | 'update' | 'delete' | 'checkIn' | 'checkOut';

export interface PendingOp {
  id: string;
  entity: OfflineEntity;
  op: OfflineOp;
  payload: any;
  /** ID temporal local para operaciones create — empieza con 'TEMP_' */
  tempId?: string;
  timestamp: number;
  retries: number;
}

// ─── Claves AsyncStorage ───────────────────────────────────────────────────────

const QUEUE_KEY = '@nexori:offline_queue';
const cacheKey = (entity: OfflineEntity) => `@nexori:cache:${entity}`;
const MAX_RETRIES = 3;

// ─── Servicio ──────────────────────────────────────────────────────────────────

class OfflineQueueService {
  private _online = true;
  private _initialized = false;
  private _flushing = false;
  private _netInfoUnsub: (() => void) | null = null;
  private _syncListeners = new Set<(entity: OfflineEntity) => void>();

  // ── Estado de red ────────────────────────────────────────────────────────────

  get isOnline(): boolean {
    return this._online;
  }

  /**
   * Inicializar una sola vez en la vida de la app.
   * Llamar desde App.tsx o desde el primer hook que lo necesite.
   */
  init(): void {
    if (this._initialized) return;
    this._initialized = true;

    // Estado inicial (síncrono desde última lectura de NetInfo)
    NetInfo.fetch().then(s => {
      this._online = !!(s.isConnected && s.isInternetReachable !== false);
    });

    // Suscripción reactiva
    this._netInfoUnsub = NetInfo.addEventListener(state => {
      const wasOnline = this._online;
      this._online = !!(state.isConnected && state.isInternetReachable !== false);

      if (!wasOnline && this._online) {
        console.log('📶 Nexori: conexión restaurada — sincronizando cola...');
        this.flush();
      }
    });
  }

  dispose(): void {
    this._netInfoUnsub?.();
    this._initialized = false;
  }

  // ── Subscripción a eventos de sync ───────────────────────────────────────────

  /**
   * Devuelve una función de cancelación (unsub).
   * El callback recibe la entidad que fue sincronizada.
   */
  onSync(cb: (entity: OfflineEntity) => void): () => void {
    this._syncListeners.add(cb);
    return () => this._syncListeners.delete(cb);
  }

  // ── Cola (queue) ─────────────────────────────────────────────────────────────

  private async readQueue(): Promise<PendingOp[]> {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private async writeQueue(q: PendingOp[]): Promise<void> {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  }

  /** Agrega una operación a la cola persistente. */
  async enqueue(item: Omit<PendingOp, 'id' | 'timestamp' | 'retries'>): Promise<void> {
    const q = await this.readQueue();
    q.push({
      ...item,
      id: `op_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      retries: 0,
    });
    await this.writeQueue(q);
  }

  /** Cuántas operaciones están pendientes en total. */
  async pendingCount(): Promise<number> {
    return (await this.readQueue()).length;
  }

  /** Operaciones pendientes filtradas por entidad. */
  async getQueueByEntity(entity: OfflineEntity): Promise<PendingOp[]> {
    const q = await this.readQueue();
    return q.filter(op => op.entity === entity);
  }

  // ── Caché ─────────────────────────────────────────────────────────────────────

  async getCache<T>(entity: OfflineEntity): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(cacheKey(entity));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  async setCache<T>(entity: OfflineEntity, data: T): Promise<void> {
    try {
      await AsyncStorage.setItem(cacheKey(entity), JSON.stringify(data));
    } catch (e) {
      console.warn('OfflineQueue: error escribiendo caché:', e);
    }
  }

  // ── Flush (procesamiento de la cola) ──────────────────────────────────────────

  /**
   * Procesa todas las operaciones pendientes en orden cronológico.
   * Se llama automáticamente al restaurarse la red.
   * También puede llamarse manualmente (pull-to-refresh, etc.).
   */
  async flush(): Promise<void> {
    if (this._flushing || !this._online) return;
    this._flushing = true;

    try {
      const all = await this.readQueue();
      if (all.length === 0) return;

      // Ordenar por timestamp para respetar el orden de creación
      const sorted = [...all].sort((a, b) => a.timestamp - b.timestamp);
      const synced = new Set<OfflineEntity>();

      for (const op of sorted) {
        try {
          await this.executeOp(op);

          // Eliminar de la cola tras éxito
          const current = await this.readQueue();
          await this.writeQueue(current.filter(o => o.id !== op.id));
          synced.add(op.entity);

          console.log(`✅ Op sincronizada: ${op.entity}:${op.op} (${op.id})`);
        } catch (err: any) {
          console.warn(`⚠️  Op falló: ${op.entity}:${op.op} — ${err?.message}`);

          const current = await this.readQueue();
          const i = current.findIndex(o => o.id === op.id);
          if (i >= 0) {
            current[i].retries += 1;
            if (current[i].retries >= MAX_RETRIES) {
              console.error(`❌ Op descartada tras ${MAX_RETRIES} intentos: ${op.id}`);
              current.splice(i, 1);
            }
            await this.writeQueue(current);
          }
        }
      }

      // Notificar a subscriptores para que recarguen datos desde el servidor
      synced.forEach(entity => {
        this._syncListeners.forEach(cb => cb(entity));
      });

    } finally {
      this._flushing = false;
    }
  }

  // ── Ejecución de operaciones individuales ─────────────────────────────────────

  private async executeOp(op: PendingOp): Promise<void> {
    switch (`${op.entity}:${op.op}`) {

      // Bicicletas
      case 'bike:create':
        await api.post('/bikes', op.payload);
        break;
      case 'bike:checkIn':
        await api.post(`/bikes/${op.payload.id}/check-in`, { notes: op.payload.notes });
        break;
      case 'bike:checkOut':
        await api.post(`/bikes/${op.payload.id}/check-out`, { notes: op.payload.notes });
        break;

      // Minutas
      case 'minute:create':
        await api.post('/minutes', op.payload);
        break;
      case 'minute:update':
        await api.put(`/minutes/${op.payload.id}`, op.payload);
        break;
      case 'minute:delete':
        await api.delete(`/minutes/${op.payload.id}`);
        break;

      default:
        throw new Error(`Operación desconocida: ${op.entity}:${op.op}`);
    }
  }
}

// ─── Exportar singleton ────────────────────────────────────────────────────────

export const offlineQueue = new OfflineQueueService();
