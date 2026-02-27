import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { Bike, BikeHistoryEntry } from '../../types/bikes';
import { tw, designTokens, getColorWithOpacity } from '../../utils/tw';

const { colors, shadows } = designTokens;

interface BikeDetailModalProps {
  visible: boolean;
  bike: Bike | null;
  history: BikeHistoryEntry[];
  onClose: () => void;
  onCheckIn?: (bikeId: string) => void;
  onCheckOut?: (bikeId: string) => void;
}

export default function BikeDetailModal({
  visible,
  bike,
  history,
  onClose,
  onCheckIn,
  onCheckOut,
}: BikeDetailModalProps) {
  const qrRef = useRef<any>(null);

  if (!bike) return null;

  const handleShareQR = () => {
    if (!bike.qrCode) {
      Alert.alert('Información', 'Esta bicicleta no tiene código QR generado');
      return;
    }
    if (!qrRef.current) return;
    qrRef.current.toDataURL(async (data: string) => {
      try {
        const fileUri = `${FileSystem.cacheDirectory}qr-${bike.serialNumber}-${Date.now()}.png`;
        await FileSystem.writeAsStringAsync(fileUri, data, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'image/png',
            dialogTitle: `QR - ${bike.serialNumber}`,
          });
        } else {
          Alert.alert('Error', 'La función de compartir no está disponible en este dispositivo');
        }
      } catch (error) {
        console.error('Error sharing QR:', error);
        Alert.alert('Error', 'No se pudo compartir el QR');
      }
    });
  };

  const bikeHistory = history.filter(h => h.bikeId === bike.id).slice(0, 5);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent={false}
    >
      <View style={[tw('flex-1'), { backgroundColor: colors.background }]}>
        <SafeAreaView style={tw('flex-1')}>
          <View style={tw('flex-1')}>
            {/* Header */}
            <View style={[tw('flex-row items-center justify-between px-6 py-5 bg-surface'), shadows.sm]}>
              <View style={tw('flex-row items-center flex-1')}>
                <View style={[
                  tw('w-10 h-10 rounded-xl items-center justify-center mr-3'),
                  { backgroundColor: bike.status === 'inside' ? colors.status.successLight : colors.status.warningLight }
                ]}>
                  <Ionicons 
                    name="bicycle" 
                    size={22} 
                    color={bike.status === 'inside' ? colors.status.success : colors.status.warning} 
                  />
                </View>
                <Text style={[tw('text-lg font-bold'), { color: colors.primary }]}>
                  Detalle de Bicicleta
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={[
                  tw('w-10 h-10 rounded-xl items-center justify-center'),
                  { backgroundColor: getColorWithOpacity(colors.text.secondary, 0.1) }
                ]}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={tw('px-6 py-6')}
            >
              {/* Estado actual */}
              <View style={tw('flex-row items-center justify-between mb-5')}>
                <View style={[
                  tw('px-4 py-2 rounded-xl flex-row items-center'),
                  { backgroundColor: bike.status === 'inside' ? colors.status.successLight : colors.status.warningLight }
                ]}>
                  <Ionicons 
                    name={bike.status === 'inside' ? 'checkmark-circle' : 'exit'} 
                    size={18} 
                    color={bike.status === 'inside' ? colors.status.success : colors.status.warning}
                    style={tw('mr-2')}
                  />
                  <Text style={[
                    tw('text-sm font-bold'),
                    { color: bike.status === 'inside' ? colors.status.success : colors.status.warning }
                  ]}>
                    {bike.status === 'inside' ? 'DENTRO DEL ESTABLECIMIENTO' : 'FUERA DEL ESTABLECIMIENTO'}
                  </Text>
                </View>
              </View>

              {/* Info de la bicicleta */}
              <View style={[tw('bg-surface rounded-2xl p-5 mb-5'), shadows.sm]}>
                <Text style={[tw('text-xs font-bold mb-4 uppercase tracking-wide'), { color: colors.text.secondary }]}>
                  Información de la Bicicleta
                </Text>

                <View style={tw('mb-3')}>
                  <Text style={[tw('text-xs mb-1'), { color: colors.text.secondary }]}>
                    Número de Serie
                  </Text>
                  <Text style={[tw('text-base font-bold'), { color: colors.primary }]}>
                    {bike.serialNumber}
                  </Text>
                </View>

                <View style={tw('flex-row mb-3')}>
                  <View style={tw('flex-1 mr-2')}>
                    <Text style={[tw('text-xs mb-1'), { color: colors.text.secondary }]}>
                      Marca
                    </Text>
                    <Text style={[tw('text-base font-semibold'), { color: colors.primary }]}>
                      {bike.brand}
                    </Text>
                  </View>
                  <View style={tw('flex-1 ml-2')}>
                    <Text style={[tw('text-xs mb-1'), { color: colors.text.secondary }]}>
                      Modelo
                    </Text>
                    <Text style={[tw('text-base font-semibold'), { color: colors.primary }]}>
                      {bike.model || 'N/A'}
                    </Text>
                  </View>
                </View>

                {bike.color && (
                  <View style={tw('mb-3')}>
                    <Text style={[tw('text-xs mb-1'), { color: colors.text.secondary }]}>
                      Color
                    </Text>
                    <Text style={[tw('text-base font-semibold'), { color: colors.primary }]}>
                      {bike.color}
                    </Text>
                  </View>
                )}

                {bike.location && (
                  <View>
                    <Text style={[tw('text-xs mb-1'), { color: colors.text.secondary }]}>
                      Ubicación
                    </Text>
                    <View style={[
                      tw('flex-row items-center px-3 py-2 rounded-lg'),
                      { backgroundColor: getColorWithOpacity(colors.backgroundAlt, 0.3) }
                    ]}>
                      <Ionicons name="location" size={14} color={colors.accent} style={tw('mr-2')} />
                      <Text style={[tw('text-sm font-medium'), { color: colors.primary }]}>
                        {bike.location}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Info del propietario */}
              <View style={[tw('bg-surface rounded-2xl p-5 mb-5'), shadows.sm]}>
                <Text style={[tw('text-xs font-bold mb-4 uppercase tracking-wide'), { color: colors.text.secondary }]}>
                  Propietario
                </Text>

                <View style={tw('flex-row items-center mb-3')}>
                  <View style={[
                    tw('w-10 h-10 rounded-full items-center justify-center mr-3'),
                    { backgroundColor: getColorWithOpacity(colors.secondary, 0.15) }
                  ]}>
                    <Ionicons name="person" size={20} color={colors.secondary} />
                  </View>
                  <View style={tw('flex-1')}>
                    <Text style={[tw('text-base font-bold'), { color: colors.primary }]}>
                      {bike.ownerName}
                    </Text>
                    <Text style={[tw('text-sm'), { color: colors.text.secondary }]}>
                      Doc: {bike.ownerDocument}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Código QR */}
              <View style={[tw('bg-surface rounded-2xl p-5 mb-5'), shadows.sm]}>
                <View style={tw('flex-row items-center justify-between mb-4')}>
                  <Text style={[tw('text-xs font-bold uppercase tracking-wide'), { color: colors.text.secondary }]}>
                    Código QR
                  </Text>
                  <TouchableOpacity
                    onPress={handleShareQR}
                    style={[
                      tw('px-3 py-2 rounded-lg flex-row items-center'),
                      { backgroundColor: getColorWithOpacity(colors.accent, 0.1) }
                    ]}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="share-social" size={14} color={colors.accent} style={tw('mr-1')} />
                    <Text style={[tw('text-xs font-bold'), { color: colors.accent }]}>
                      Compartir
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={tw('items-center')}>
                  {bike.qrCode ? (
                    <QRCode
                      value={bike.qrCode}
                      size={180}
                      backgroundColor="white"
                      color={colors.primary}
                      getRef={(ref) => { qrRef.current = ref; }}
                    />
                  ) : (
                    <View style={[
                      tw('w-48 h-48 items-center justify-center rounded-lg'),
                      { backgroundColor: getColorWithOpacity(colors.text.disabled, 0.1) }
                    ]}>
                      <Ionicons name="bicycle" size={64} color={colors.text.disabled} />
                      <Text style={[tw('text-sm mt-2 text-center'), { color: colors.text.secondary }]}>
                        Sin código QR generado
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Historial */}
              {bikeHistory.length > 0 && (
                <View style={[tw('bg-surface rounded-2xl p-5'), shadows.sm]}>
                  <Text style={[tw('text-xs font-bold mb-4 uppercase tracking-wide'), { color: colors.text.secondary }]}>
                    Historial Reciente
                  </Text>

                  {bikeHistory.map((entry, index) => (
                    <View
                      key={entry.id}
                      style={[
                        tw('flex-row items-center py-3'),
                        index < bikeHistory.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border.light }
                      ]}
                    >
                      <View style={[
                        tw('w-10 h-10 rounded-xl items-center justify-center mr-3'),
                        { 
                          backgroundColor: entry.action === 'entry' 
                            ? colors.status.successLight 
                            : colors.status.warningLight 
                        }
                      ]}>
                        <Ionicons 
                          name={entry.action === 'entry' ? 'arrow-down-circle' : 'arrow-up-circle'} 
                          size={20} 
                          color={entry.action === 'entry' ? colors.status.success : colors.status.warning}
                        />
                      </View>

                      <View style={tw('flex-1')}>
                        <Text style={[tw('text-sm font-semibold mb-1'), { color: colors.primary }]}>
                          {entry.action === 'entry' ? 'Entrada' : 'Salida'}
                        </Text>
                        <Text style={[tw('text-xs'), { color: colors.text.secondary }]}>
                          {new Date(entry.date).toLocaleString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                        <Text style={[tw('text-xs'), { color: colors.text.secondary }]}>
                          Por: {entry.guardName}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            {/* Footer con acción */}
            {(onCheckIn || onCheckOut) && (
              <View style={[tw('px-6 py-4 bg-surface'), shadows.lg, { borderTopWidth: 1, borderTopColor: colors.border.light }]}>
                {bike.status === 'outside' && onCheckIn ? (
                  <TouchableOpacity
                    onPress={() => onCheckIn(bike.id)}
                    style={[
                      tw('rounded-xl items-center justify-center py-4'),
                      { backgroundColor: colors.status.success }
                    ]}
                    activeOpacity={0.8}
                  >
                    <View style={tw('flex-row items-center')}>
                      <Ionicons name="arrow-down-circle" size={22} color={colors.surface} style={tw('mr-2')} />
                      <Text style={[tw('text-base font-bold'), { color: colors.surface }]}>
                        Registrar Entrada
                      </Text>
                    </View>
                  </TouchableOpacity>
                ) : onCheckOut ? (
                  <TouchableOpacity
                    onPress={() => onCheckOut(bike.id)}
                    style={[
                      tw('rounded-xl items-center justify-center py-4'),
                      { backgroundColor: colors.status.warning }
                    ]}
                    activeOpacity={0.8}
                  >
                    <View style={tw('flex-row items-center')}>
                      <Ionicons name="arrow-up-circle" size={22} color={colors.surface} style={tw('mr-2')} />
                      <Text style={[tw('text-base font-bold'), { color: colors.surface }]}>
                        Registrar Salida
                      </Text>
                    </View>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}