import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { tw, designTokens, getColorWithOpacity } from '../../utils/tw';

const { colors, shadows } = designTokens;

interface RegisterBikeModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (bike: {
    brand: string;
    model: string;
    color: string;
    ownerName: string;
    ownerDocument: string;
    ownerPhone: string;
    location: string;
  }) => Promise<{ serialNumber: string; qrCode: string }>;
}

export default function RegisterBikeModal({ visible, onClose, onSave }: RegisterBikeModalProps) {
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerDocument, setOwnerDocument] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [location, setLocation] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [generatedQRCode, setGeneratedQRCode] = useState('');
  const [isOfflineSave, setIsOfflineSave] = useState(false);
  const [loading, setLoading] = useState(false);

  const qrRef = useRef<any>(null);

  const validatePhoneNumber = (phone: string): boolean => {
    if (!phone) return true;
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    const phoneRegex = /^(\+?57)?3\d{9}$/;
    return phoneRegex.test(cleaned);
  };

  const handleSave = async () => {
    if (!brand.trim()) {
      Alert.alert('Error', 'Por favor ingresa la marca');
      return;
    }
    if (!ownerName.trim()) {
      Alert.alert('Error', 'Por favor ingresa el nombre del propietario');
      return;
    }
    if (!ownerDocument.trim()) {
      Alert.alert('Error', 'Por favor ingresa el documento del propietario');
      return;
    }

    if (ownerPhone && !validatePhoneNumber(ownerPhone)) {
      Alert.alert(
        'Teléfono inválido',
        '¿Deseas continuar sin enviar el QR por WhatsApp?',
        [
          { text: 'Corregir', style: 'cancel' },
          {
            text: 'Continuar sin WhatsApp',
            onPress: () => {
              setOwnerPhone('');
              handleSave();
            },
          },
        ]
      );
      return;
    }

    setLoading(true);
    try {
      const result = await onSave({
        brand: brand.trim(),
        model: model.trim(),
        color: color.trim(),
        ownerName: ownerName.trim(),
        ownerDocument: ownerDocument.trim(),
        ownerPhone: ownerPhone.trim(),
        location: location.trim(),
      });
      setIsOfflineSave(!!(result as any)._offline);
      setGeneratedQRCode(result.qrCode || result.serialNumber);
      setShowSuccess(true);
    } catch {
      Alert.alert('Error', 'No se pudo registrar la bicicleta');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setBrand('');
    setModel('');
    setColor('');
    setOwnerName('');
    setOwnerDocument('');
    setOwnerPhone('');
    setLocation('');
    setShowSuccess(false);
    setGeneratedQRCode('');
    setIsOfflineSave(false);
    onClose();
  };

  const handleShareQR = () => {
    if (!qrRef.current) return;
    qrRef.current.toDataURL(async (data: string) => {
      try {
        const fileUri = `${FileSystem.cacheDirectory}qr-bicicleta-${Date.now()}.png`;
        await FileSystem.writeAsStringAsync(fileUri, data, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'image/png',
            dialogTitle: 'Compartir QR Bicicleta',
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
      statusBarTranslucent={false}
    >
      <View style={[tw('flex-1'), { backgroundColor: colors.background }]}>
        <SafeAreaView style={tw('flex-1')}>
          <View style={tw('flex-1')}>
            {!showSuccess ? (
              /* ===== FORMULARIO DE REGISTRO ===== */
              <>
                {/* Header */}
                <View style={[tw('flex-row items-center justify-between px-6 py-5 bg-surface'), shadows.sm]}>
                  <View style={tw('flex-row items-center flex-1')}>
                    <View style={[
                      tw('w-10 h-10 rounded-xl items-center justify-center mr-3'),
                      { backgroundColor: getColorWithOpacity(colors.accent, 0.15) }
                    ]}>
                      <Ionicons name="bicycle" size={22} color={colors.accent} />
                    </View>
                    <Text style={[tw('text-lg font-bold'), { color: colors.primary }]}>
                      Registrar Bicicleta
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleClose}
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
                  {/* Info: ID Automático */}
                  <View style={[
                    tw('p-4 rounded-2xl mb-5'),
                    { backgroundColor: getColorWithOpacity(colors.status.success, 0.08), borderWidth: 1, borderColor: getColorWithOpacity(colors.status.success, 0.2) }
                  ]}>
                    <View style={tw('flex-row items-center mb-1')}>
                      <Ionicons name="checkmark-circle" size={18} color={colors.status.success} style={tw('mr-2')} />
                      <Text style={[tw('text-sm font-bold'), { color: colors.primary }]}>
                        ID Automático
                      </Text>
                    </View>
                    <Text style={[tw('text-xs'), { color: colors.text.secondary, lineHeight: 18 }]}>
                      El sistema asignará automáticamente un ID único (BIKE-001, BIKE-002, etc.) al registrar.
                    </Text>
                  </View>

                  {/* ─── Sección: Bicicleta ─── */}
                  <Text style={[tw('text-xs font-bold mb-3 uppercase tracking-wide'), { color: colors.text.secondary }]}>
                    Información de la Bicicleta
                  </Text>

                  {/* Marca */}
                  <View style={tw('mb-3')}>
                    <Text style={[tw('text-sm font-bold mb-2'), { color: colors.primary }]}>
                      Marca *
                    </Text>
                    <View style={[
                      tw('flex-row items-center rounded-xl px-4'),
                      { backgroundColor: colors.surface, height: 56, borderWidth: 1, borderColor: colors.border.light }
                    ]}>
                      <Ionicons name="ribbon" size={20} color={colors.text.secondary} style={tw('mr-3')} />
                      <TextInput
                        style={[tw('flex-1 text-base'), { color: colors.text.primary }]}
                        placeholder="Ej: TREK, GIANT, SPECIALIZED"
                        placeholderTextColor={colors.text.disabled}
                        value={brand}
                        onChangeText={(text) => setBrand(text.toUpperCase())}
                        autoCapitalize="characters"
                      />
                    </View>
                  </View>

                  {/* Modelo y Color en fila */}
                  <View style={tw('flex-row mb-3')}>
                    <View style={tw('flex-1 mr-2')}>
                      <Text style={[tw('text-sm font-bold mb-2'), { color: colors.primary }]}>
                        Modelo
                      </Text>
                      <View style={[
                        tw('flex-row items-center rounded-xl px-3'),
                        { backgroundColor: colors.surface, height: 56, borderWidth: 1, borderColor: colors.border.light }
                      ]}>
                        <TextInput
                          style={[tw('flex-1 text-base'), { color: colors.text.primary }]}
                          placeholder="FX 3"
                          placeholderTextColor={colors.text.disabled}
                          value={model}
                          onChangeText={(text) => setModel(text.toUpperCase())}
                          autoCapitalize="characters"
                        />
                      </View>
                    </View>
                    <View style={tw('flex-1 ml-2')}>
                      <Text style={[tw('text-sm font-bold mb-2'), { color: colors.primary }]}>
                        Color
                      </Text>
                      <View style={[
                        tw('flex-row items-center rounded-xl px-3'),
                        { backgroundColor: colors.surface, height: 56, borderWidth: 1, borderColor: colors.border.light }
                      ]}>
                        <TextInput
                          style={[tw('flex-1 text-base'), { color: colors.text.primary }]}
                          placeholder="AZUL"
                          placeholderTextColor={colors.text.disabled}
                          value={color}
                          onChangeText={(text) => setColor(text.toUpperCase())}
                          autoCapitalize="characters"
                        />
                      </View>
                    </View>
                  </View>

                  {/* Divider */}
                  <View style={[tw('h-px my-4'), { backgroundColor: colors.border.light }]} />

                  {/* ─── Sección: Propietario ─── */}
                  <Text style={[tw('text-xs font-bold mb-3 uppercase tracking-wide'), { color: colors.text.secondary }]}>
                    Datos del Propietario
                  </Text>

                  {/* Nombre del Propietario */}
                  <View style={tw('mb-3')}>
                    <Text style={[tw('text-sm font-bold mb-2'), { color: colors.primary }]}>
                      Nombre Completo *
                    </Text>
                    <View style={[
                      tw('flex-row items-center rounded-xl px-4'),
                      { backgroundColor: colors.surface, height: 56, borderWidth: 1, borderColor: colors.border.light }
                    ]}>
                      <Ionicons name="person" size={20} color={colors.text.secondary} style={tw('mr-3')} />
                      <TextInput
                        style={[tw('flex-1 text-base'), { color: colors.text.primary }]}
                        placeholder="Nombre completo"
                        placeholderTextColor={colors.text.disabled}
                        value={ownerName}
                        onChangeText={setOwnerName}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>

                  {/* Documento del Propietario */}
                  <View style={tw('mb-3')}>
                    <Text style={[tw('text-sm font-bold mb-2'), { color: colors.primary }]}>
                      Documento *
                    </Text>
                    <View style={[
                      tw('flex-row items-center rounded-xl px-4'),
                      { backgroundColor: colors.surface, height: 56, borderWidth: 1, borderColor: colors.border.light }
                    ]}>
                      <Ionicons name="card" size={20} color={colors.text.secondary} style={tw('mr-3')} />
                      <TextInput
                        style={[tw('flex-1 text-base'), { color: colors.text.primary }]}
                        placeholder="CC, CE, Pasaporte"
                        placeholderTextColor={colors.text.disabled}
                        value={ownerDocument}
                        onChangeText={setOwnerDocument}
                        keyboardType="default"
                      />
                    </View>
                  </View>

                  {/* Teléfono WhatsApp */}
                  <View style={tw('mb-3')}>
                    <Text style={[tw('text-sm font-bold mb-2'), { color: colors.primary }]}>
                      WhatsApp (opcional)
                    </Text>
                    <View style={[
                      tw('flex-row items-center rounded-xl px-4'),
                      { backgroundColor: colors.surface, height: 56, borderWidth: 1, borderColor: colors.border.light }
                    ]}>
                      <Ionicons name="logo-whatsapp" size={20} color="#25D366" style={tw('mr-3')} />
                      <TextInput
                        style={[tw('flex-1 text-base'), { color: colors.text.primary }]}
                        placeholder="Ej: 3166910645 o +573166910645"
                        placeholderTextColor={colors.text.disabled}
                        value={ownerPhone}
                        onChangeText={setOwnerPhone}
                        keyboardType="phone-pad"
                        maxLength={15}
                      />
                    </View>
                    <Text style={[tw('text-xs mt-1 ml-1'), { color: colors.text.secondary }]}>
                      Se enviará el código QR por WhatsApp a este número
                    </Text>
                  </View>

                  {/* Ubicación */}
                  <View style={tw('mb-3')}>
                    <Text style={[tw('text-sm font-bold mb-2'), { color: colors.primary }]}>
                      Ubicación de Estacionamiento
                    </Text>
                    <View style={[
                      tw('flex-row items-center rounded-xl px-4'),
                      { backgroundColor: colors.surface, height: 56, borderWidth: 1, borderColor: colors.border.light }
                    ]}>
                      <Ionicons name="location" size={20} color={colors.text.secondary} style={tw('mr-3')} />
                      <TextInput
                        style={[tw('flex-1 text-base'), { color: colors.text.primary }]}
                        placeholder="Ej: Parqueadero Sótano 2, Zona A"
                        placeholderTextColor={colors.text.disabled}
                        value={location}
                        onChangeText={setLocation}
                      />
                    </View>
                  </View>

                  {/* WhatsApp activado */}
                  {ownerPhone ? (
                    <View style={[
                      tw('p-4 rounded-2xl mt-2'),
                      { backgroundColor: getColorWithOpacity(colors.status.success, 0.08), borderWidth: 1, borderColor: getColorWithOpacity(colors.status.success, 0.2) }
                    ]}>
                      <View style={tw('flex-row items-center mb-1')}>
                        <Ionicons name="checkmark-circle" size={18} color={colors.status.success} style={tw('mr-2')} />
                        <Text style={[tw('text-sm font-bold'), { color: colors.primary }]}>
                          WhatsApp Activado
                        </Text>
                      </View>
                      <Text style={[tw('text-xs'), { color: colors.text.secondary, lineHeight: 18 }]}>
                        El código QR se enviará automáticamente por WhatsApp al número {ownerPhone}
                      </Text>
                    </View>
                  ) : null}
                </ScrollView>

                {/* Footer */}
                <View style={[tw('px-6 py-4 bg-surface'), shadows.lg, { borderTopWidth: 1, borderTopColor: colors.border.light }]}>
                  <View style={tw('flex-row')}>
                    <TouchableOpacity
                      style={[
                        tw('flex-1 mr-2 py-4 rounded-xl items-center justify-center'),
                        { backgroundColor: getColorWithOpacity(colors.text.secondary, 0.1) }
                      ]}
                      onPress={handleClose}
                      activeOpacity={0.7}
                      disabled={loading}
                    >
                      <Text style={[tw('text-base font-bold'), { color: colors.text.secondary }]}>
                        Cancelar
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        tw('flex-1 ml-2 py-4 rounded-xl items-center justify-center flex-row'),
                        { backgroundColor: loading ? getColorWithOpacity(colors.accent, 0.6) : colors.accent }
                      ]}
                      onPress={handleSave}
                      activeOpacity={0.8}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="white" style={tw('mr-2')} />
                      ) : (
                        <Ionicons name="checkmark-circle" size={20} color="white" style={tw('mr-2')} />
                      )}
                      <Text style={tw('text-base font-bold text-white')}>
                        {loading ? 'Registrando...' : 'Registrar'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            ) : (
              /* ===== PANTALLA DE ÉXITO ===== */
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[tw('items-center px-6 py-10'), { flexGrow: 1, justifyContent: 'center' }]}
              >
                {/* Ícono de éxito */}
                <View style={[
                  tw('w-20 h-20 rounded-full items-center justify-center mb-5'),
                  { backgroundColor: getColorWithOpacity(colors.status.success, 0.15) }
                ]}>
                  <Ionicons name="checkmark-circle" size={48} color={colors.status.success} />
                </View>

                <Text style={[tw('text-2xl font-bold text-center mb-2'), { color: colors.primary }]}>
                  ¡Bicicleta Registrada!
                </Text>
                <Text style={[tw('text-sm text-center mb-6'), { color: colors.text.secondary }]}>
                  La bicicleta ha sido registrada exitosamente en el sistema
                </Text>

                {/* WhatsApp enviado */}
                {ownerPhone ? (
                  <View style={[
                    tw('flex-row items-center px-4 py-3 rounded-xl mb-6 w-full'),
                    { backgroundColor: getColorWithOpacity('#25D366', 0.1), borderWidth: 1, borderColor: getColorWithOpacity('#25D366', 0.25) }
                  ]}>
                    <Ionicons name="logo-whatsapp" size={18} color="#25D366" style={tw('mr-2')} />
                    <Text style={[tw('text-xs flex-1'), { color: colors.text.secondary }]}>
                      QR enviado por WhatsApp al {ownerPhone}
                    </Text>
                  </View>
                ) : null}

                {/* QR Code / Placeholder offline */}
                {isOfflineSave ? (
                  <View style={[
                    tw('w-52 h-52 rounded-3xl items-center justify-center mb-3'),
                    { backgroundColor: getColorWithOpacity(colors.status.info, 0.08), borderWidth: 2, borderColor: getColorWithOpacity(colors.status.info, 0.2) }
                  ]}>
                    <Ionicons name="cloud-upload-outline" size={56} color={colors.status.info} />
                    <Text style={[tw('text-sm font-bold mt-3'), { color: colors.status.info }]}>
                      QR pendiente
                    </Text>
                    <Text style={[tw('text-xs text-center mt-1 px-4'), { color: colors.text.secondary }]}>
                      Se generará al sincronizar
                    </Text>
                  </View>
                ) : (
                  <View style={[tw('p-6 rounded-3xl mb-3'), { backgroundColor: 'white' }, shadows.md]}>
                    <QRCode
                      value={generatedQRCode || 'NEXORI'}
                      size={200}
                      backgroundColor="white"
                      getRef={(ref) => { qrRef.current = ref; }}
                    />
                  </View>
                )}
                <Text style={[tw('text-xs text-center mb-5'), { color: colors.text.secondary }]}>
                  {isOfflineSave
                    ? 'El QR se enviará por WhatsApp al sincronizar'
                    : 'Escanea este código para registrar entradas y salidas'}
                </Text>

                {/* Resumen bicicleta */}
                <View style={[tw('w-full p-4 rounded-2xl mb-6'), { backgroundColor: colors.surface }, shadows.sm]}>
                  <View style={tw('flex-row items-center mb-2')}>
                    <Text style={[tw('text-xs font-bold w-24'), { color: colors.text.secondary }]}>Marca</Text>
                    <Text style={[tw('text-sm font-bold flex-1'), { color: colors.primary }]}>{brand}</Text>
                  </View>
                  {model ? (
                    <View style={tw('flex-row items-center mb-2')}>
                      <Text style={[tw('text-xs font-bold w-24'), { color: colors.text.secondary }]}>Modelo</Text>
                      <Text style={[tw('text-sm flex-1'), { color: colors.primary }]}>{model}</Text>
                    </View>
                  ) : null}
                  {color ? (
                    <View style={tw('flex-row items-center mb-2')}>
                      <Text style={[tw('text-xs font-bold w-24'), { color: colors.text.secondary }]}>Color</Text>
                      <Text style={[tw('text-sm flex-1'), { color: colors.primary }]}>{color}</Text>
                    </View>
                  ) : null}
                  <View style={tw('flex-row items-center')}>
                    <Text style={[tw('text-xs font-bold w-24'), { color: colors.text.secondary }]}>Propietario</Text>
                    <Text style={[tw('text-sm flex-1'), { color: colors.primary }]}>{ownerName}</Text>
                  </View>
                </View>

                {/* Botones */}
                <View style={tw('flex-row w-full')}>
                  <TouchableOpacity
                    style={[
                      tw('flex-1 mr-2 py-4 rounded-xl items-center justify-center'),
                      {
                        backgroundColor: isOfflineSave
                          ? getColorWithOpacity(colors.text.secondary, 0.08)
                          : getColorWithOpacity(colors.accent, 0.1),
                        borderWidth: 1,
                        borderColor: isOfflineSave
                          ? colors.border.light
                          : getColorWithOpacity(colors.accent, 0.2),
                      }
                    ]}
                    onPress={isOfflineSave ? undefined : handleShareQR}
                    activeOpacity={isOfflineSave ? 1 : 0.7}
                    disabled={isOfflineSave}
                  >
                    <Ionicons
                      name="share-social"
                      size={20}
                      color={isOfflineSave ? colors.text.disabled : colors.accent}
                      style={tw('mb-1')}
                    />
                    <Text style={[tw('text-sm font-bold'), { color: isOfflineSave ? colors.text.disabled : colors.accent }]}>
                      Compartir QR
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      tw('flex-1 ml-2 py-4 rounded-xl items-center justify-center'),
                      { backgroundColor: colors.accent }
                    ]}
                    onPress={handleClose}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="checkmark-done" size={20} color="white" style={tw('mb-1')} />
                    <Text style={tw('text-sm font-bold text-white')}>
                      Finalizar
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
