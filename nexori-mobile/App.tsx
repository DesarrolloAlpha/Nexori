import React, { useEffect, useRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { AuthProvider } from './src/contexts/AuthContext';
import { PanicProvider } from './src/contexts/PanicContext';
import AppNavigator from './src/navigation/AppNavigator';
import { notificationService } from './src/services/notification.service';

export default function App() {
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  useEffect(() => {
    // Registrar dispositivo para notificaciones push
    notificationService.registerForPushNotifications();

    // Navegar a la pantalla correcta al tocar una notificación
    const removeResponseListener = notificationService.onNotificationResponse((response) => {
      const data = response.notification.request.content.data as any;

      if (!navigationRef.current) return;

      switch (data?.type) {
        case 'panic':
        case 'panicShortcutAttention':
          navigationRef.current.navigate('Main', { screen: 'Alertas' });
          break;
        case 'panicShortcutTrigger':
          navigationRef.current.navigate('Main', { screen: 'Pánico' });
          break;
        case 'minute':
          navigationRef.current.navigate('Main', { screen: 'Minutas' });
          break;
        default:
          navigationRef.current.navigate('Main', { screen: 'Dashboard' });
      }
    });

    // Limpiar badge al abrir la app
    notificationService.clearBadge();

    return () => {
      removeResponseListener();
    };
  }, []);

  return (
    <AuthProvider>
      <PanicProvider>
        <NavigationContainer ref={navigationRef}>
          <AppNavigator />
        </NavigationContainer>
      </PanicProvider>
    </AuthProvider>
  );
}
