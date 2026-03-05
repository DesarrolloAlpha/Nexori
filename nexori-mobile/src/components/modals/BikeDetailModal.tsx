import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { Bike, BikeHistoryEntry } from '../../types/bikes';
import bikeService from '../../services/bike.service';
import { tw, designTokens, getColorWithOpacity } from '../../utils/tw';

const { colors, shadows } = designTokens;

interface EditData {
  ownerName: string;
  ownerDocument: string;
  ownerPhone: string;
  brand: string;
  model: string;
  color: string;
  location: string;
  notes: string;
}

interface BikeDetailModalProps {
  visible: boolean;
  bike: Bike | null;
  history: BikeHistoryEntry[];
  onClose: () => void;
  onCheckIn?: (bikeId: string) => void;
  onCheckOut?: (bikeId: string) => void;
  onUpdate?: (bike: Bike) => void;
}

// Campo de formulario reutilizable
function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: any;
  multiline?: boolean;
}) {
  return (
    <View style={tw('mb-4')}>
      <Text style={[tw('text-xs mb-1 font-medium'), { color: colors.text.secondary }]}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder || label}
        placeholderTextColor={colors.text.disabled}
        keyboardType={keyboardType || 'default'}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        style={[
          tw('rounded-xl px-4 py-3 text-sm'),
          {
            borderWidth: 1,
            borderColor: colors.border.medium,
            color: colors.primary,
            backgroundColor: colors.background,
            minHeight: multiline ? 80 : undefined,
            textAlignVertical: multiline ? 'top' : 'center',
          },
        ]}
      />
    </View>
  );
}

export default function BikeDetailModal({
  visible,
  bike,
  history,
  onClose,
  onCheckIn,
  onCheckOut,
  onUpdate,
}: BikeDetailModalProps) {
  const qrRef = useRef<any>(null);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<EditData>({
    ownerName: '', ownerDocument: '', ownerPhone: '',
    brand: '', model: '', color: '', location: '', notes: '',
  });

  // Resetear estado de edición cuando cambia la bici o se cierra el modal
  useEffect(() => {
    if (!visible) setIsEditing(false);
  }, [visible]);

  if (!bike) return null;

  const startEditing = () => {
    setEditData({
      ownerName:    bike.ownerName    || '',
      ownerDocument: bike.ownerDocument || '',
      ownerPhone:   bike.ownerPhone   || '',
      brand:        bike.brand        || '',
      model:        bike.model        || '',
      color:        bike.color        || '',
      location:     bike.location     || '',
      notes:        bike.notes        || '',
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!editData.ownerName.trim()) {
      Alert.alert('Campo requerido', 'El nombre del propietario es obligatorio.');
      return;
    }
    setSaving(true);
    try {
      const updated = await bikeService.update(bike.id, {
        ownerName:    editData.ownerName.trim(),
        ownerDocument: editData.ownerDocument.trim(),
        ownerPhone:   editData.ownerPhone.trim() || undefined,
        brand:        editData.brand.trim(),
        model:        editData.model.trim(),
        color:        editData.color.trim(),
        location:     editData.location.trim(),
        notes:        editData.notes.trim() || undefined,
      });
      setIsEditing(false);
      onUpdate?.(updated);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || e.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  // ── QR helpers ─────────────────────────────────────────────────────────────

  const shareQRImage = () => {
    if (!qrRef.current) return;
    qrRef.current.toDataURL(async (data: string) => {
      try {
        const fileUri = `${FileSystem.cacheDirectory}qr-${bike.serialNumber}-${Date.now()}.png`;
        await FileSystem.writeAsStringAsync(fileUri, data, { encoding: 'base64' as any });
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
        console.error('Error al compartir QR:', error);
        Alert.alert('Error', 'No se pudo compartir el QR');
      }
    });
  };

  const resendViaWhatsApp = async () => {
    if (!bike.ownerPhone) {
      Alert.alert('Sin teléfono', 'Esta bicicleta no tiene número de teléfono registrado.');
      return;
    }
    setSendingWhatsApp(true);
    try {
      const result = await bikeService.resendWhatsApp(bike.id);
      Alert.alert(result.success ? 'Enviado ✓' : 'Error', result.message);
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const handleSharePress = () => {
    if (!bike.qrCode) {
      Alert.alert('Información', 'Esta bicicleta no tiene código QR generado');
      return;
    }
    const buttons: any[] = [{ text: 'Compartir imagen', onPress: shareQRImage }];
    if (bike.ownerPhone) {
      buttons.push({ text: 'Reenviar por WhatsApp', onPress: resendViaWhatsApp });
    }
    buttons.push({ text: 'Cancelar', style: 'cancel' });
    Alert.alert('Código QR', '¿Qué deseas hacer?', buttons);
  };

  const bikeHistory = history.filter(h => h.bikeId === bike.id).slice(0, 5);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={isEditing ? () => setIsEditing(false) : onClose}
      statusBarTranslucent={false}
    >
      <KeyboardAvoidingView
        style={tw('flex-1')}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[tw('flex-1'), { backgroundColor: colors.background }]}>
          <SafeAreaView style={tw('flex-1')}>
            <View style={tw('flex-1')}>

              {/* ── Header ── */}
              <View style={[tw('flex-row items-center justify-between px-6 py-5 bg-surface'), shadows.sm]}>
                <View style={tw('flex-row items-center flex-1')}>
                  <View style={[
                    tw('w-10 h-10 rounded-xl items-center justify-center mr-3'),
                    {
                      backgroundColor: isEditing
                        ? getColorWithOpacity(colors.accent, 0.12)
                        : bike.status === 'inside' ? colors.status.successLight : colors.status.warningLight,
                    },
                  ]}>
                    <Ionicons
                      name={isEditing ? 'create' : 'bicycle'}
                      size={22}
                      color={isEditing ? colors.accent : bike.status === 'inside' ? colors.status.success : colors.status.warning}
                    />
                  </View>
                  <Text style={[tw('text-lg font-bold'), { color: colors.primary }]}>
                    {isEditing ? 'Editar Bicicleta' : 'Detalle de Bicicleta'}
                  </Text>
                </View>

                <View style={tw('flex-row items-center')}>
                  {/* Botón lápiz (solo en modo lectura) */}
                  {!isEditing && (
                    <TouchableOpacity
                      onPress={startEditing}
                      style={[
                        tw('w-10 h-10 rounded-xl items-center justify-center mr-2'),
                        { backgroundColor: getColorWithOpacity(colors.accent, 0.1) },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="pencil" size={18} color={colors.accent} />
                    </TouchableOpacity>
                  )}

                  {/* Botón cerrar / cancelar edición */}
                  <TouchableOpacity
                    onPress={isEditing ? () => setIsEditing(false) : onClose}
                    style={[
                      tw('w-10 h-10 rounded-xl items-center justify-center'),
                      { backgroundColor: getColorWithOpacity(colors.text.secondary, 0.1) },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close" size={24} color={colors.text.secondary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* ── Contenido ── */}
              {isEditing ? (
                /* ── Modo edición ── */
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={tw('px-6 py-6')}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Propietario */}
                  <View style={[tw('bg-surface rounded-2xl p-5 mb-5'), shadows.sm]}>
                    <Text style={[tw('text-xs font-bold mb-4 uppercase tracking-wide'), { color: colors.text.secondary }]}>
                      Propietario
                    </Text>
                    <Field
                      label="Nombre completo *"
                      value={editData.ownerName}
                      onChange={v => setEditData(d => ({ ...d, ownerName: v }))}
                    />
                    <Field
                      label="Documento de identidad"
                      value={editData.ownerDocument}
                      onChange={v => setEditData(d => ({ ...d, ownerDocument: v }))}
                      keyboardType="numeric"
                    />
                    <Field
                      label="Teléfono WhatsApp"
                      value={editData.ownerPhone}
                      onChange={v => setEditData(d => ({ ...d, ownerPhone: v }))}
                      placeholder="573001112233"
                      keyboardType="phone-pad"
                    />
                  </View>

                  {/* Bicicleta */}
                  <View style={[tw('bg-surface rounded-2xl p-5 mb-5'), shadows.sm]}>
                    <Text style={[tw('text-xs font-bold mb-4 uppercase tracking-wide'), { color: colors.text.secondary }]}>
                      Bicicleta
                    </Text>
                    <View style={tw('flex-row')}>
                      <View style={tw('flex-1 mr-2')}>
                        <Field
                          label="Marca"
                          value={editData.brand}
                          onChange={v => setEditData(d => ({ ...d, brand: v }))}
                        />
                      </View>
                      <View style={tw('flex-1 ml-2')}>
                        <Field
                          label="Modelo"
                          value={editData.model}
                          onChange={v => setEditData(d => ({ ...d, model: v }))}
                        />
                      </View>
                    </View>
                    <Field
                      label="Color"
                      value={editData.color}
                      onChange={v => setEditData(d => ({ ...d, color: v }))}
                    />
                    <Field
                      label="Ubicación"
                      value={editData.location}
                      onChange={v => setEditData(d => ({ ...d, location: v }))}
                    />
                    <Field
                      label="Notas"
                      value={editData.notes}
                      onChange={v => setEditData(d => ({ ...d, notes: v }))}
                      multiline
                    />
                  </View>
                </ScrollView>
              ) : (
                /* ── Modo lectura ── */
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={tw('px-6 py-6')}
                >
                  {/* Estado */}
                  <View style={tw('flex-row items-center justify-between mb-5')}>
                    <View style={[
                      tw('px-4 py-2 rounded-xl flex-row items-center'),
                      { backgroundColor: bike.status === 'inside' ? colors.status.successLight : colors.status.warningLight },
                    ]}>
                      <Ionicons
                        name={bike.status === 'inside' ? 'checkmark-circle' : 'exit'}
                        size={18}
                        color={bike.status === 'inside' ? colors.status.success : colors.status.warning}
                        style={tw('mr-2')}
                      />
                      <Text style={[tw('text-sm font-bold'), { color: bike.status === 'inside' ? colors.status.success : colors.status.warning }]}>
                        {bike.status === 'inside' ? 'DENTRO DEL ESTABLECIMIENTO' : 'FUERA DEL ESTABLECIMIENTO'}
                      </Text>
                    </View>
                  </View>

                  {/* Info bicicleta */}
                  <View style={[tw('bg-surface rounded-2xl p-5 mb-5'), shadows.sm]}>
                    <Text style={[tw('text-xs font-bold mb-4 uppercase tracking-wide'), { color: colors.text.secondary }]}>
                      Información de la Bicicleta
                    </Text>
                    <View style={tw('mb-3')}>
                      <Text style={[tw('text-xs mb-1'), { color: colors.text.secondary }]}>Número de Serie</Text>
                      <Text style={[tw('text-base font-bold'), { color: colors.primary }]}>{bike.serialNumber}</Text>
                    </View>
                    <View style={tw('flex-row mb-3')}>
                      <View style={tw('flex-1 mr-2')}>
                        <Text style={[tw('text-xs mb-1'), { color: colors.text.secondary }]}>Marca</Text>
                        <Text style={[tw('text-base font-semibold'), { color: colors.primary }]}>{bike.brand}</Text>
                      </View>
                      <View style={tw('flex-1 ml-2')}>
                        <Text style={[tw('text-xs mb-1'), { color: colors.text.secondary }]}>Modelo</Text>
                        <Text style={[tw('text-base font-semibold'), { color: colors.primary }]}>{bike.model || 'N/A'}</Text>
                      </View>
                    </View>
                    {bike.color && (
                      <View style={tw('mb-3')}>
                        <Text style={[tw('text-xs mb-1'), { color: colors.text.secondary }]}>Color</Text>
                        <Text style={[tw('text-base font-semibold'), { color: colors.primary }]}>{bike.color}</Text>
                      </View>
                    )}
                    {bike.location && (
                      <View>
                        <Text style={[tw('text-xs mb-1'), { color: colors.text.secondary }]}>Ubicación</Text>
                        <View style={[tw('flex-row items-center px-3 py-2 rounded-lg'), { backgroundColor: getColorWithOpacity(colors.backgroundAlt, 0.3) }]}>
                          <Ionicons name="location" size={14} color={colors.accent} style={tw('mr-2')} />
                          <Text style={[tw('text-sm font-medium'), { color: colors.primary }]}>{bike.location}</Text>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Info propietario */}
                  <View style={[tw('bg-surface rounded-2xl p-5 mb-5'), shadows.sm]}>
                    <Text style={[tw('text-xs font-bold mb-4 uppercase tracking-wide'), { color: colors.text.secondary }]}>
                      Propietario
                    </Text>
                    <View style={tw('flex-row items-center mb-2')}>
                      <View style={[tw('w-10 h-10 rounded-full items-center justify-center mr-3'), { backgroundColor: getColorWithOpacity(colors.secondary, 0.15) }]}>
                        <Ionicons name="person" size={20} color={colors.secondary} />
                      </View>
                      <View style={tw('flex-1')}>
                        <Text style={[tw('text-base font-bold'), { color: colors.primary }]}>{bike.ownerName}</Text>
                        <Text style={[tw('text-sm'), { color: colors.text.secondary }]}>Doc: {bike.ownerDocument}</Text>
                      </View>
                    </View>
                    {bike.ownerPhone ? (
                      <View style={[tw('flex-row items-center px-3 py-2 rounded-lg mt-1'), { backgroundColor: getColorWithOpacity(colors.backgroundAlt, 0.3) }]}>
                        <Ionicons name="logo-whatsapp" size={14} color="#25D366" style={tw('mr-2')} />
                        <Text style={[tw('text-sm font-medium'), { color: colors.primary }]}>{bike.ownerPhone}</Text>
                      </View>
                    ) : (
                      <TouchableOpacity onPress={startEditing} style={[tw('flex-row items-center px-3 py-2 rounded-lg mt-1'), { backgroundColor: getColorWithOpacity(colors.accent, 0.08) }]}>
                        <Ionicons name="add-circle-outline" size={14} color={colors.accent} style={tw('mr-2')} />
                        <Text style={[tw('text-sm'), { color: colors.accent }]}>Agregar teléfono WhatsApp</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Código QR */}
                  <View style={[tw('bg-surface rounded-2xl p-5 mb-5'), shadows.sm]}>
                    <View style={tw('flex-row items-center justify-between mb-4')}>
                      <Text style={[tw('text-xs font-bold uppercase tracking-wide'), { color: colors.text.secondary }]}>
                        Código QR
                      </Text>
                      <TouchableOpacity
                        onPress={handleSharePress}
                        disabled={sendingWhatsApp}
                        style={[
                          tw('px-3 py-2 rounded-lg flex-row items-center'),
                          { backgroundColor: getColorWithOpacity(colors.accent, 0.1) },
                          sendingWhatsApp && { opacity: 0.5 },
                        ]}
                        activeOpacity={0.7}
                      >
                        {sendingWhatsApp ? (
                          <ActivityIndicator size="small" color={colors.accent} style={tw('mr-1')} />
                        ) : (
                          <Ionicons name="share-social" size={14} color={colors.accent} style={tw('mr-1')} />
                        )}
                        <Text style={[tw('text-xs font-bold'), { color: colors.accent }]}>
                          {sendingWhatsApp ? 'Enviando…' : 'Compartir'}
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
                        <View style={[tw('w-48 h-48 items-center justify-center rounded-lg'), { backgroundColor: getColorWithOpacity(colors.text.disabled, 0.1) }]}>
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
                            index < bikeHistory.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border.light },
                          ]}
                        >
                          <View style={[
                            tw('w-10 h-10 rounded-xl items-center justify-center mr-3'),
                            { backgroundColor: entry.action === 'entry' ? colors.status.successLight : colors.status.warningLight },
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
                              {new Date(entry.date).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </Text>
                            <Text style={[tw('text-xs'), { color: colors.text.secondary }]}>Por: {entry.guardName}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </ScrollView>
              )}

              {/* ── Footer ── */}
              {isEditing ? (
                /* Footer edición: Cancelar + Guardar */
                <View style={[tw('px-6 py-4 bg-surface flex-row'), shadows.lg, { borderTopWidth: 1, borderTopColor: colors.border.light }]}>
                  <TouchableOpacity
                    onPress={() => setIsEditing(false)}
                    style={[tw('flex-1 rounded-xl items-center justify-center py-4 mr-3'), { backgroundColor: getColorWithOpacity(colors.text.secondary, 0.1) }]}
                    activeOpacity={0.8}
                  >
                    <Text style={[tw('text-base font-bold'), { color: colors.text.secondary }]}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSave}
                    disabled={saving}
                    style={[tw('flex-1 rounded-xl items-center justify-center py-4'), { backgroundColor: colors.accent }, saving && { opacity: 0.6 }]}
                    activeOpacity={0.8}
                  >
                    {saving ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={[tw('text-base font-bold'), { color: '#fff' }]}>Guardar</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                /* Footer normal: check-in / check-out */
                (onCheckIn || onCheckOut) && (
                  <View style={[tw('px-6 py-4 bg-surface'), shadows.lg, { borderTopWidth: 1, borderTopColor: colors.border.light }]}>
                    {bike.status === 'outside' && onCheckIn ? (
                      <TouchableOpacity
                        onPress={() => onCheckIn(bike.id)}
                        style={[tw('rounded-xl items-center justify-center py-4'), { backgroundColor: colors.status.success }]}
                        activeOpacity={0.8}
                      >
                        <View style={tw('flex-row items-center')}>
                          <Ionicons name="arrow-down-circle" size={22} color={colors.surface} style={tw('mr-2')} />
                          <Text style={[tw('text-base font-bold'), { color: colors.surface }]}>Registrar Entrada</Text>
                        </View>
                      </TouchableOpacity>
                    ) : onCheckOut ? (
                      <TouchableOpacity
                        onPress={() => onCheckOut(bike.id)}
                        style={[tw('rounded-xl items-center justify-center py-4'), { backgroundColor: colors.status.warning }]}
                        activeOpacity={0.8}
                      >
                        <View style={tw('flex-row items-center')}>
                          <Ionicons name="arrow-up-circle" size={22} color={colors.surface} style={tw('mr-2')} />
                          <Text style={[tw('text-base font-bold'), { color: colors.surface }]}>Registrar Salida</Text>
                        </View>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                )
              )}

            </View>
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
