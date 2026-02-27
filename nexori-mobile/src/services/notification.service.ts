import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PUSH_TOKEN_KEY = 'push_token';
const PANIC_SHORTCUT_CATEGORY = 'PANIC_SHORTCUT';
const PANIC_SHORTCUT_ACTION = 'PANIC_SHORTCUT_OPEN';

// Comportamiento de las notificaciones cuando la app está en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

type PanicShortcutTarget = 'attention' | 'panic';

class NotificationService {
  private static instance: NotificationService;
  private categoriesConfigured = false;
  private shortcutNotificationId: string | null = null;
  private shortcutTarget: PanicShortcutTarget | null = null;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private async ensureShortcutCategory(): Promise<void> {
    if (this.categoriesConfigured) return;
    try {
      await Notifications.setNotificationCategoryAsync(PANIC_SHORTCUT_CATEGORY, [
        {
          identifier: PANIC_SHORTCUT_ACTION,
          buttonTitle: 'Abrir centro de alertas',
          options: { opensAppToForeground: true },
        },
      ]);
      this.categoriesConfigured = true;
    } catch (error) {
      console.error('Error registrando categoría de accesos rápidos:', error);
    }
  }

  /**
   * Solicitar permisos y registrar el dispositivo para notificaciones push.
   * Retorna el Expo Push Token o null si no se conceden permisos.
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      // En Android se requiere crear el canal antes de solicitar permisos
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('panic', {
          name: 'Alertas de pánico',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 500, 250, 500],
          lightColor: '#FF0000',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
        });

        await Notifications.setNotificationChannelAsync('minutes', {
          name: 'Minutas',
          importance: Notifications.AndroidImportance.DEFAULT,
          sound: 'default',
        });

        await Notifications.setNotificationChannelAsync('general', {
          name: 'General',
          importance: Notifications.AndroidImportance.DEFAULT,
          sound: 'default',
        });
      }

      // Verificar permisos actuales
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Solicitar si no están concedidos
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('⚠️ Permisos de notificaciones denegados');
        return null;
      }

      await this.ensureShortcutCategory();

      // Obtener Expo Push Token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'com.nexori.mobile',
      });

      const token = tokenData.data;
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
      console.log('✅ Push Token registrado:', token);
      return token;

    } catch (error) {
      console.error('❌ Error registrando notificaciones:', error);
      return null;
    }
  }

  async showPanicShortcutNotification(target: PanicShortcutTarget): Promise<void> {
    await this.ensureShortcutCategory();
    if (this.shortcutNotificationId && this.shortcutTarget === target) {
      return;
    }
    await this.dismissPanicShortcutNotification();

    const content =
      target === 'attention'
        ? {
            title: 'Acceso rápido al centro de alertas',
            body: 'Toca para abrir el módulo de atención de pánico.',
            data: { type: 'panicShortcutAttention' },
          }
        : {
            title: 'Botón de pánico disponible',
            body: 'Toca para abrir el botón de pánico y activar la alerta.',
            data: { type: 'panicShortcutTrigger' },
          };

    try {
      this.shortcutNotificationId = await Notifications.scheduleNotificationAsync({
        content: {
          ...content,
          sound: false,
          categoryIdentifier: PANIC_SHORTCUT_CATEGORY,
          ...(Platform.OS === 'android' && { channelId: 'panic' }),
        },
        trigger: null,
      });
      this.shortcutTarget = target;
    } catch (error) {
      console.error('Error mostrando acceso rápido de pánico:', error);
    }
  }

  async dismissPanicShortcutNotification(): Promise<void> {
    if (!this.shortcutNotificationId) {
      return;
    }

    try {
      await Notifications.dismissNotificationAsync(this.shortcutNotificationId);
      this.shortcutNotificationId = null;
      this.shortcutTarget = null;
    } catch (error) {
      console.error('Error ocultando acceso rápido de pánico:', error);
    }
  }

  /**
   * Mostrar notificación local inmediata para alertas de pánico
   */
  async sendPanicNotification(userName: string, priority: 'low' | 'medium' | 'high' = 'high'): Promise<void> {
    const priorityLabels = { low: 'Baja', medium: 'Media', high: 'Alta' };

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🚨 ALERTA DE PÁNICO',
        body: `${userName} ha activado el botón de emergencia — Prioridad ${priorityLabels[priority]}`,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        data: { type: 'panic', userName, priority },
        ...(Platform.OS === 'android' && { channelId: 'panic' }),
      },
      trigger: null, // Inmediata
    });
  }

  /**
   * Notificación para nueva minuta de alta prioridad
   */
  async sendMinuteNotification(title: string, priority: string): Promise<void> {
    if (priority !== 'high') return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📋 Nueva minuta urgente',
        body: title,
        sound: 'default',
        data: { type: 'minute', priority },
        ...(Platform.OS === 'android' && { channelId: 'minutes' }),
      },
      trigger: null,
    });
  }

  /**
   * Notificación general
   */
  async sendGeneral(title: string, body: string, data?: Record<string, any>): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        data: data || {},
        ...(Platform.OS === 'android' && { channelId: 'general' }),
      },
      trigger: null,
    });
  }

  /**
   * Obtener el token guardado
   */
  async getSavedToken(): Promise<string | null> {
    return AsyncStorage.getItem(PUSH_TOKEN_KEY);
  }

  /**
   * Limpiar el badge de la app
   */
  async clearBadge(): Promise<void> {
    await Notifications.setBadgeCountAsync(0);
  }

  /**
   * Registrar un listener para cuando se toca una notificación
   */
  onNotificationResponse(callback: (response: Notifications.NotificationResponse) => void): () => void {
    const subscription = Notifications.addNotificationResponseReceivedListener(callback);
    return () => subscription.remove();
  }

  /**
   * Registrar un listener para notificaciones recibidas en primer plano
   */
  onNotificationReceived(callback: (notification: Notifications.Notification) => void): () => void {
    const subscription = Notifications.addNotificationReceivedListener(callback);
    return () => subscription.remove();
  }
}

export const notificationService = NotificationService.getInstance();
