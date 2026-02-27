import React, { useState } from 'react';
import {
  View,
  Text,
  StatusBar,
  ScrollView,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { tw, designTokens, getColorWithOpacity } from '../utils/tw';
import { usePanic } from '../hooks/usePanic';

const { colors, shadows } = designTokens;

interface SettingToggleProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  value: boolean;
  disabled?: boolean;
  loading?: boolean;
  accentColor: string;
  onValueChange: () => Promise<void> | void;
  warning?: string;
}

const SettingToggle = ({
  icon,
  title,
  description,
  value,
  disabled,
  loading,
  accentColor,
  onValueChange,
  warning,
}: SettingToggleProps) => (
  <View style={[tw('flex-row items-start py-3'), { opacity: disabled ? 0.5 : 1 }]}>
    <View
      style={[
        tw('w-12 h-12 rounded-2xl items-center justify-center mr-4'),
        { backgroundColor: getColorWithOpacity(accentColor, 0.12) },
      ]}
    >
      <Ionicons name={icon} size={24} color={accentColor} />
    </View>
    <View style={tw('flex-1 pr-3')}>
      <Text style={[tw('text-base font-semibold mb-1'), { color: colors.primary }]}>{title}</Text>
      <Text style={[tw('text-sm leading-5'), { color: colors.text.secondary }]}>{description}</Text>
      {warning && (
        <Text
          style={[
            tw('text-xs mt-2 font-medium'),
            { color: colors.status.warning },
          ]}
        >
          ⚠️ {warning}
        </Text>
      )}
    </View>
    <View style={tw('mt-1')}>
      <Switch
        value={value}
        onValueChange={() => {
          if (!disabled && !loading) {
            onValueChange();
          }
        }}
        disabled={disabled || loading}
        trackColor={{
          false: getColorWithOpacity(colors.text.secondary, 0.2),
          true: getColorWithOpacity(accentColor, 0.4),
        }}
        thumbColor={value ? accentColor : colors.surface}
        ios_backgroundColor={getColorWithOpacity(colors.text.secondary, 0.2)}
      />
    </View>
  </View>
);

export default function PanicSettingsScreen() {
  const navigation = useNavigation();
  const {
    backgroundMonitoringEnabled,
    quickAccessShortcutEnabled,
    setBackgroundMonitoring,
    setQuickAccessShortcut,
    canMonitorAlerts,
    canTriggerPanic,
    stats,
    isConnected,
    appIsInBackground,
  } = usePanic();

  const [saving, setSaving] = useState({ background: false, shortcut: false });

  const handleBackgroundToggle = async () => {
    if (!canMonitorAlerts) return;
    setSaving(prev => ({ ...prev, background: true }));
    await setBackgroundMonitoring(!backgroundMonitoringEnabled);
    setSaving(prev => ({ ...prev, background: false }));
  };

  const handleShortcutToggle = async () => {
    if (!canTriggerPanic) return;
    setSaving(prev => ({ ...prev, shortcut: true }));
    await setQuickAccessShortcut(!quickAccessShortcutEnabled);
    setSaving(prev => ({ ...prev, shortcut: false }));
  };

  const monitoringWarning = !canMonitorAlerts
    ? 'Tu rol no tiene acceso al monitoreo de alertas.'
    : undefined;

  const shortcutWarning = !canTriggerPanic
    ? 'Esta opción aparece solo para roles con botón de pánico.'
    : undefined;

  return (
    <SafeAreaView style={tw('flex-1 bg-primary')} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <View style={tw('flex-1 bg-background')}>
        <View style={tw('px-5 pt-2 pb-8 bg-primary')}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[
              tw('w-12 h-12 rounded-2xl items-center justify-center mb-4'),
              { backgroundColor: getColorWithOpacity(colors.surface, 0.15) },
            ]}
          >
            <Ionicons name="chevron-back" size={24} color={colors.surface} />
          </TouchableOpacity>
          <Text style={tw('text-white text-3xl font-bold tracking-tight mb-2')}>
            Configuración de Alertas
          </Text>
          <Text style={[tw('text-base leading-5'), { color: getColorWithOpacity(colors.surface, 0.9) }]}>
            Controla el monitoreo en segundo plano y los accesos rápidos relacionados con el
            módulo de pánico.
          </Text>
        </View>

        <ScrollView 
          style={tw('flex-1')} 
          contentContainerStyle={tw('pb-8 px-5 pt-4')}
          showsVerticalScrollIndicator={false}
        >
          <View style={[tw('rounded-3xl p-5 bg-surface'), shadows.lg]}>
            <Text style={[tw('text-xs font-semibold uppercase tracking-wider mb-5'), { color: colors.text.secondary }]}>
              Estado del monitor
            </Text>
            <View style={tw('flex-row')}>
              {[
                {
                  label: 'Conexión',
                  value: isConnected ? 'En línea' : 'Sin conexión',
                  color: isConnected ? colors.status.success : colors.status.error,
                  icon: isConnected ? 'wifi' : 'warning',
                },
                {
                  label: 'Alertas activas',
                  value: stats.active.toString(),
                  color: stats.active > 0 ? colors.status.error : colors.text.secondary,
                  icon: stats.active > 0 ? 'alert' : 'shield-checkmark',
                },
                {
                  label: 'App',
                  value: appIsInBackground ? '2º plano' : 'En uso',
                  color: appIsInBackground ? colors.status.warning : colors.status.info,
                  icon: appIsInBackground ? 'moon' : 'sunny',
                },
              ].map((item, index, arr) => (
                <View
                  key={index}
                  style={[
                    tw('flex-1 rounded-2xl p-3'),
                    { backgroundColor: getColorWithOpacity(item.color, 0.1) },
                    index !== arr.length - 1 ? tw('mr-2') : null
                  ]}
                >
                  <View style={tw('flex-row items-center mb-2.5')}>
                    <Ionicons name={item.icon as any} size={16} color={item.color} />
                    <Text
                      style={[
                        tw('text-2xs ml-1.5 font-semibold tracking-wide'),
                        { color: item.color },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </View>
                  <Text style={[tw('text-xl font-bold'), { color: colors.primary }]}>
                    {item.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={[tw('bg-surface rounded-3xl p-5 mt-5'), shadows.sm]}>
            <View style={tw('mb-4')}>
              <Text style={[tw('text-base font-semibold mb-1.5'), { color: colors.primary }]}>
                Monitoreo en segundo plano
              </Text>
              <Text style={[tw('text-sm leading-5'), { color: colors.text.secondary }]}>
                Si está activo, seguiremos sonando la alarma y mostrando notificaciones aunque no
                estés dentro de la pantalla de alertas.
              </Text>
            </View>
            <SettingToggle
              icon="volume-high"
              title="Sonar alarmas fuera de la pantalla"
              description="Mantiene el socket vivo y reproduce la sirena cuando haya alertas activas."
              value={backgroundMonitoringEnabled && canMonitorAlerts}
              disabled={!canMonitorAlerts}
              loading={saving.background}
              accentColor={colors.accent}
              onValueChange={handleBackgroundToggle}
              warning={monitoringWarning}
            />
          </View>

          <View style={[tw('bg-surface rounded-3xl p-5 mt-4'), shadows.sm]}>
            <View style={tw('mb-4')}>
              <Text style={[tw('text-base font-semibold mb-1.5'), { color: colors.primary }]}>
                Accesos rápidos
              </Text>
              <Text style={[tw('text-sm leading-5'), { color: colors.text.secondary }]}>
                Agrega accesos rápidos tanto para supervisar alertas como para abrir el botón de
                pánico cuando estás fuera de la app.
              </Text>
            </View>
            <SettingToggle
              icon="link"
              title="Botón para ir a centro de alertas"
              description="Coordinadores/Supervisores y locatarios recibirán una notificación fija para volver rápido."
              value={quickAccessShortcutEnabled && canTriggerPanic}
              disabled={!canTriggerPanic}
              loading={saving.shortcut}
              accentColor={colors.status.info}
              onValueChange={handleShortcutToggle}
              warning={shortcutWarning}
            />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}