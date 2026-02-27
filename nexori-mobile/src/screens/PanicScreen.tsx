import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StatusBar,
  Alert,
  Animated,
  Easing,
  Vibration,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { usePanic } from '../hooks/usePanic';
import { useAuth } from '../contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedTabScreen } from '@/components/AnimatedTabScreen';
import { tw, designTokens, getColorWithOpacity } from '../utils/tw';
import { useNavigation } from '@react-navigation/native';

const { colors, shadows } = designTokens;

export default function PanicScreen() {
  const [isPanicActive, setIsPanicActive] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [panicTimer, setPanicTimer] = useState(0);

  const navigation = useNavigation();
  const { user } = useAuth();
  const {
    createPanic,
    isConnected,
    quickAccessShortcutEnabled,
    canMonitorAlerts,
    canTriggerPanic,
  } = usePanic();

  // ── Animaciones del botón ──────────────────────────────────────────────────
  const pulseScale = useRef(new Animated.Value(1)).current;
  const iconScale  = useRef(new Animated.Value(1)).current;
  const colorValue = useRef(new Animated.Value(0)).current;

  // Timer de desactivación automática
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPanicActive && panicTimer < 5) {
      interval = setInterval(() => {
        setPanicTimer(prev => {
          if (prev >= 5) { clearInterval(interval); return 5; }
          return prev + 1;
        });
      }, 1000);
    } else if (!isPanicActive) {
      setPanicTimer(0);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isPanicActive, panicTimer]);

  // ── Lógica del botón ───────────────────────────────────────────────────────
  const handlePanicButton = () => {
    if (isPanicActive) return;
    Alert.alert(
      '🚨 ALERTA DE EMERGENCIA',
      '¿Estás seguro de activar el botón de pánico?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'ACTIVAR', style: 'destructive', onPress: activatePanicAlert },
      ]
    );
  };

  const activatePanicAlert = async () => {
    try {
      setIsPanicActive(true);
      startAnimations();
      Vibration.vibrate([0, 1000, 500, 1000, 500, 1000]);

      const result = await createPanic('high');

      if (result) {
        Alert.alert('✅ Alerta Enviada', 'El personal de seguridad ha sido notificado y está en camino');
      } else {
        Alert.alert('Error', 'No se pudo enviar la alerta');
      }

      setTimeout(() => {
        setIsPanicActive(false);
        stopAnimations();
        Vibration.cancel();
      }, 5000);

    } catch (error) {
      console.error('Error activating panic:', error);
      Alert.alert('Error', 'Ocurrió un error al enviar la alerta');
      setIsPanicActive(false);
      stopAnimations();
    }
  };

  // ── Animaciones ────────────────────────────────────────────────────────────
  const startAnimations = () => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulseScale, { toValue: 1.08, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulseScale, { toValue: 1,    duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();

    Animated.loop(Animated.sequence([
      Animated.timing(iconScale, { toValue: 1.2, duration: 400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(iconScale, { toValue: 1,   duration: 400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();

    Animated.loop(Animated.sequence([
      Animated.timing(colorValue, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      Animated.timing(colorValue, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
    ])).start();
  };

  const stopAnimations = () => {
    pulseScale.stopAnimation();
    iconScale.stopAnimation();
    Animated.parallel([
      Animated.timing(pulseScale, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(iconScale,  { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
    colorValue.stopAnimation();
    Animated.timing(colorValue, { toValue: 0, duration: 300, useNativeDriver: false }).start();
  };

  // Interpolaciones de color
  const buttonBgColor   = colorValue.interpolate({ inputRange: [0, 1], outputRange: [colors.accent, colors.status.error] });
  const innerCircleColor = colorValue.interpolate({ inputRange: [0, 1], outputRange: ['#00D4F5', '#FF8A8A'] });
  const shadowOpacity   = colorValue.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0.8] });
  const shadowRadius    = colorValue.interpolate({ inputRange: [0, 1], outputRange: [40, 50] });

  // Datos del locatario
  const localName = user?.localName ?? user?.name ?? '—';
  const adminName = user?.adminName ?? 'Administrador Nexori';
  const headerBg      = isPanicActive ? colors.status.error : colors.primary;
  const showAttentionShortcut =
    quickAccessShortcutEnabled && canMonitorAlerts && canTriggerPanic;
  const showPanicQuickAccess =
    quickAccessShortcutEnabled && !canMonitorAlerts && canTriggerPanic;

  const handleGoToAttention = () => {
    navigation.navigate('Main' as never, { screen: 'Alertas' } as never);
  };

  return (
    <AnimatedTabScreen>
      <>
        <StatusBar barStyle="light-content" backgroundColor={headerBg} animated />

        <SafeAreaView style={[tw('flex-1'), { backgroundColor: headerBg }]} edges={['top']}>
          <View style={tw('flex-1 bg-background')}>

            {/* ── Header ──────────────────────────────────────────────────── */}
            <View style={[tw('px-6 pb-4 pt-3'), { backgroundColor: headerBg }]}>
              <View style={tw('flex-row items-center justify-between')}>
                <View>
                  <Text style={tw('text-white text-2xl font-bold')}>
                    {isPanicActive ? '🚨 ALERTA ACTIVA' : 'Emergencias'}
                  </Text>
                  <Text style={[tw('text-sm mt-1'), { color: colors.surface, opacity: 0.9 }]}>
                    {isPanicActive ? 'Personal notificado — ayuda en camino' : 'Sistema de pánico'}
                  </Text>
                </View>

                {/* Indicador de conexión */}
                <View style={[
                  tw('flex-row items-center px-3 py-1.5 rounded-xl'),
                  { backgroundColor: getColorWithOpacity(colors.surface, 0.15) }
                ]}>
                  <View style={[
                    tw('w-2 h-2 rounded-full mr-1.5'),
                    { backgroundColor: isConnected ? '#4ADE80' : '#F87171' }
                  ]} />
                  <Text style={[tw('text-xs font-semibold'), { color: colors.surface }]}>
                    {isConnected ? 'En línea' : 'Sin conexión'}
                  </Text>
                </View>
              </View>

              {showAttentionShortcut && (
                <TouchableOpacity
                  onPress={handleGoToAttention}
                  activeOpacity={0.75}
                  style={[
                    tw('flex-row items-center px-4 py-3 rounded-2xl mt-4'),
                    {
                      backgroundColor: getColorWithOpacity(colors.surface, 0.15),
                      borderWidth: 1,
                      borderColor: getColorWithOpacity(colors.surface, 0.3),
                    },
                  ]}
                >
                  <View
                    style={[
                      tw('w-9 h-9 rounded-full items-center justify-center mr-3'),
                      { backgroundColor: getColorWithOpacity(colors.surface, 0.15) },
                    ]}
                  >
                    <Ionicons name="shield-checkmark" size={20} color={colors.surface} />
                  </View>
                  <View style={tw('flex-1')}>
                    <Text style={[tw('text-sm font-bold'), { color: colors.surface }]}>
                      Ir al centro de alertas
                    </Text>
                    <Text style={[tw('text-xs'), { color: getColorWithOpacity(colors.surface, 0.8) }]}>
                      Supervisa las alarmas activas en tiempo real
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.surface} />
                </TouchableOpacity>
              )}

              {showPanicQuickAccess && (
                <View
                  style={[
                    tw('flex-row items-center px-4 py-3 rounded-2xl mt-4'),
                    {
                      backgroundColor: getColorWithOpacity(colors.surface, 0.15),
                      borderWidth: 1,
                      borderColor: getColorWithOpacity(colors.surface, 0.25),
                    },
                  ]}
                >
                  <View
                    style={[
                      tw('w-9 h-9 rounded-full items-center justify-center mr-3'),
                      { backgroundColor: getColorWithOpacity(colors.surface, 0.15) },
                    ]}
                  >
                    <Ionicons name="notifications" size={20} color={colors.surface} />
                  </View>
                  <View style={tw('flex-1')}>
                    <Text style={[tw('text-sm font-bold'), { color: colors.surface }]}>
                      Acceso rápido activo
                    </Text>
                    <Text style={[tw('text-xs'), { color: getColorWithOpacity(colors.surface, 0.85) }]}>
                      Cuando salgas de la app verás una notificación para volver aquí en un toque.
                    </Text>
                  </View>
                </View>
              )}
            </View>

            <ScrollView
              style={tw('flex-1')}
              contentContainerStyle={{ paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
            >
              {/* ── Tarjeta de bienvenida ──────────────────────────────────── */}
              <View style={tw('px-5 pt-5')}>
                <View style={[
                  tw('rounded-2xl p-5'),
                  shadows.sm,
                  {
                    backgroundColor: colors.surface,
                    borderLeftWidth: 4,
                    borderLeftColor: isPanicActive ? colors.status.error : colors.accent,
                  }
                ]}>
                  {/* Saludo */}
                  <Text style={[tw('text-xs font-bold uppercase tracking-wide mb-1'), { color: colors.text.secondary }]}>
                    Bienvenido
                  </Text>
                  <Text style={[tw('text-xl font-bold mb-4'), { color: colors.primary }]}>
                    {user?.name ?? 'Locatario'}
                  </Text>

                  <View style={[tw('h-px mb-4'), { backgroundColor: colors.border.light }]} />

                  {/* Nombre del local */}
                  <View style={tw('flex-row items-center mb-3')}>
                    <View style={[
                      tw('w-9 h-9 rounded-xl items-center justify-center mr-3'),
                      { backgroundColor: getColorWithOpacity(colors.accent, 0.12) }
                    ]}>
                      <Ionicons name="storefront-outline" size={18} color={colors.accent} />
                    </View>
                    <View>
                      <Text style={[tw('text-xs'), { color: colors.text.secondary }]}>
                        Nombre del local
                      </Text>
                      <Text style={[tw('text-sm font-bold'), { color: colors.primary }]}>
                        {localName}
                      </Text>
                    </View>
                  </View>

                  {/* Administrador responsable */}
                  <View style={tw('flex-row items-center')}>
                    <View style={[
                      tw('w-9 h-9 rounded-xl items-center justify-center mr-3'),
                      { backgroundColor: getColorWithOpacity(colors.secondary, 0.12) }
                    ]}>
                      <Ionicons name="person-circle-outline" size={18} color={colors.secondary} />
                    </View>
                    <View>
                      <Text style={[tw('text-xs'), { color: colors.text.secondary }]}>
                        Administrador responsable
                      </Text>
                      <Text style={[tw('text-sm font-bold'), { color: colors.primary }]}>
                        {adminName}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* ── Botón de pánico ───────────────────────────────────────── */}
              <View style={tw('items-center justify-center py-8')}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPressIn={() => setIsPressed(true)}
                  onPressOut={() => setIsPressed(false)}
                  onPress={handlePanicButton}
                  disabled={isPanicActive}
                >
                  <Animated.View style={[
                    tw('items-center justify-center'),
                    {
                      width: 280,
                      height: 280,
                      transform: [{ scale: isPressed && !isPanicActive ? 0.95 : pulseScale }],
                    }
                  ]}>
                    {/* Fondo exterior */}
                    <Animated.View style={[
                      tw('absolute items-center justify-center'),
                      {
                        width: 280, height: 280, borderRadius: 140,
                        backgroundColor: buttonBgColor,
                        shadowColor: colors.status.error,
                        shadowOffset: { width: 0, height: 20 },
                        shadowOpacity, shadowRadius,
                        elevation: isPanicActive ? 25 : 20,
                      }
                    ]} />

                    {/* Círculo interior */}
                    <Animated.View style={[
                      tw('absolute items-center justify-center'),
                      { width: 240, height: 240, borderRadius: 120, backgroundColor: innerCircleColor }
                    ]} />

                    {/* Círculo central */}
                    <Animated.View style={[
                      tw('absolute items-center justify-center'),
                      { width: 200, height: 200, borderRadius: 100, backgroundColor: buttonBgColor }
                    ]} />

                    {/* Icono + texto */}
                    <View style={tw('items-center')}>
                      <Animated.View style={[
                        tw('w-20 h-20 rounded-full items-center justify-center mb-4'),
                        {
                          backgroundColor: colors.surface,
                          transform: [{ scale: isPanicActive ? iconScale : 1 }]
                        }
                      ]}>
                        <Ionicons
                          name="warning"
                          size={48}
                          color={isPanicActive ? colors.status.error : colors.accent}
                        />
                      </Animated.View>

                      <Text style={tw('text-white text-2xl font-bold')}>
                        {isPanicActive ? '🚨 ALERTA' : 'EMERGENCIA'}
                      </Text>
                      <Text style={[tw('text-sm mt-2'), { color: colors.surface, opacity: 0.9 }]}>
                        {isPanicActive ? 'Alerta activada' : 'Presiona en caso de'}
                      </Text>
                      <Text style={[tw('text-sm'), { color: colors.surface, opacity: 0.9 }]}>
                        {isPanicActive ? 'Personal notificado' : 'emergencia real'}
                      </Text>
                    </View>
                  </Animated.View>
                </TouchableOpacity>

                {/* Estado cuando está activo */}
                {isPanicActive && (
                  <View style={[
                    tw('mt-6 px-6 py-4 rounded-2xl items-center'),
                    {
                      backgroundColor: getColorWithOpacity(colors.status.error, 0.1),
                      borderWidth: 1,
                      borderColor: getColorWithOpacity(colors.status.error, 0.3),
                      minWidth: 240,
                    }
                  ]}>
                    <Text style={[tw('text-base font-bold mb-1'), { color: colors.status.error }]}>
                      ⏱️ Alerta activa: {panicTimer}/5 seg
                    </Text>
                    <Text style={[tw('text-xs text-center'), { color: colors.text.secondary }]}>
                      El personal está siendo notificado.{'\n'}Se desactivará automáticamente.
                    </Text>
                  </View>
                )}
              </View>

              {/* ── Nota de uso ───────────────────────────────────────────── */}
              {!isPanicActive && (
                <View style={tw('px-5')}>
                  <View style={[
                    tw('flex-row items-center rounded-xl px-4 py-3'),
                    { backgroundColor: getColorWithOpacity(colors.status.info, 0.08) }
                  ]}>
                    <Ionicons name="information-circle-outline" size={16} color={colors.status.info} style={tw('mr-2')} />
                    <Text style={[tw('text-xs flex-1'), { color: colors.text.secondary }]}>
                      Usa este botón solo en casos de emergencia real. El personal de seguridad responderá de inmediato.
                    </Text>
                  </View>
                </View>
              )}

            </ScrollView>
          </View>
        </SafeAreaView>
      </>
    </AnimatedTabScreen>
  );
}
