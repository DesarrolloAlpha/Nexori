import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tw, designTokens, getColorWithOpacity } from '../../utils/tw';
import { PanicEvent } from '../../types/panic';
import ImagePicker from '../ImagePicker.component';
import { API_BASE_URL } from '../../config/api.config';

const { colors, shadows } = designTokens;

interface PanicAlertModalProps {
  visible: boolean;
  panicAlert: PanicEvent | null;
  onClose: () => void;
  onAttend: (alertId: string, images?: string[]) => Promise<void>;
  onHold: (alertId: string, notes: string) => Promise<void>;
  onResolve: (alertId: string, notes: string, images?: string[]) => Promise<void>;
}

export default function PanicAlertModal({
  visible,
  panicAlert,
  onClose,
  onAttend,
  onHold,
  onResolve,
}: PanicAlertModalProps) {
  const [notes, setNotes] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAttended, setIsAttended] = useState(false);

  // Reset cuando se abre/cierra el modal
  useEffect(() => {
    if (visible && panicAlert) {
      setNotes(panicAlert.notes || '');
      setIsAttended(panicAlert.status === 'attended');
      setImages([]);
    } else {
      setNotes('');
      setImages([]);
      setIsAttended(false);
    }
  }, [visible, panicAlert]);

  if (!panicAlert) return null;

  const getStatusConfig = (status: string) => {
    const configs = {
      active: {
        label: 'ACTIVA',
        color: colors.status.error,
        bgColor: colors.status.errorLight,
        icon: 'warning' as const,
      },
      attended: {
        label: 'EN ATENCIÓN',
        color: colors.status.warning,
        bgColor: colors.status.warningLight,
        icon: 'time' as const,
      },
      resolved: {
        label: 'RESUELTA',
        color: colors.status.success,
        bgColor: colors.status.successLight,
        icon: 'checkmark-circle' as const,
      },
    };
    return configs[status as keyof typeof configs];
  };

  const getPriorityConfig = (priority: string) => {
    const configs = {
      high: {
        label: 'ALTA',
        color: colors.status.error,
        bgColor: getColorWithOpacity(colors.status.error, 0.15),
        icon: 'warning' as const,
      },
      medium: {
        label: 'MEDIA',
        color: colors.status.warning,
        bgColor: getColorWithOpacity(colors.status.warning, 0.15),
        icon: 'alert-circle' as const,
      },
      low: {
        label: 'BAJA',
        color: colors.status.success,
        bgColor: getColorWithOpacity(colors.status.success, 0.15),
        icon: 'information-circle' as const,
      },
    };
    return configs[priority as keyof typeof configs];
  };

  const statusConfig = getStatusConfig(panicAlert.status);
  const priorityConfig = getPriorityConfig(panicAlert.priority);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-CO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatElapsedTime = (dateString: string) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) {
      return `${diffMins} minutos`;
    } else {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${hours}h ${mins}min`;
    }
  };

  const handleAttend = async () => {
    setLoading(true);
    try {
      await onAttend(panicAlert.id, images.length > 0 ? images : undefined);
      setIsAttended(true);
    } catch (error) {
      console.error('Error attending alert:', error);
      Alert.alert('Error', 'No se pudo atender la alerta');
    } finally {
      setLoading(false);
    }
  };

  const handleHold = async () => {
    if (!notes.trim()) {
      Alert.alert('Nota Requerida', 'Por favor agrega una nota antes de poner en espera');
      return;
    }

    Alert.alert(
      '⏸️ Poner en Espera',
      '¿Deseas poner esta alerta en espera? Podrás continuar después.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Poner en Espera',
          onPress: async () => {
            setLoading(true);
            try {
              await onHold(panicAlert.id, notes);
              Alert.alert('✅ En Espera', 'La alerta ha sido puesta en espera');
              onClose();
            } catch (error) {
              console.error('Error putting alert on hold:', error);
              Alert.alert('Error', 'No se pudo poner en espera');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleResolve = async () => {
    if (!notes.trim()) {
      Alert.alert('Nota Requerida', 'Por favor agrega una nota de resolución');
      return;
    }

    Alert.alert(
      '✅ Resolver Alerta',
      '¿Confirmas que la situación ha sido resuelta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Resolver',
          style: 'default',
          onPress: async () => {
            setLoading(true);
            try {
              await onResolve(panicAlert.id, notes, images.length > 0 ? images : undefined);
            } catch (error) {
              console.error('Error resolving alert:', error);
              Alert.alert('Error', 'No se pudo resolver la alerta');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const isActive = panicAlert.status === 'active';
  const canEdit = isActive || isAttended || panicAlert.status === 'attended';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent={false}
    >
      <KeyboardAvoidingView
        style={tw('flex-1')}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[tw('flex-1'), { backgroundColor: colors.background }]}>
          <SafeAreaView style={tw('flex-1')}>
            <View style={tw('flex-1')}>
              {/* Header */}
              <View style={[tw('flex-row items-center justify-between px-6 py-5 bg-surface'), shadows.sm]}>
                <View style={tw('flex-row items-center flex-1')}>
                  <View
                    style={[
                      tw('w-10 h-10 rounded-xl items-center justify-center mr-3'),
                      { backgroundColor: statusConfig.bgColor },
                    ]}
                  >
                    <Ionicons name={statusConfig.icon} size={22} color={statusConfig.color} />
                  </View>
                  <Text style={[tw('text-lg font-bold'), { color: colors.primary }]}>
                    Alerta de Pánico
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  style={[
                    tw('w-10 h-10 rounded-xl items-center justify-center'),
                    { backgroundColor: getColorWithOpacity(colors.text.secondary, 0.1) },
                  ]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={24} color={colors.text.secondary} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={tw('px-6 py-6')}
                keyboardShouldPersistTaps="handled"
              >
                {/* Badges de estado y prioridad */}
                <View style={tw('flex-row flex-wrap mb-5')}>
                  {/* Estado */}
                  <View style={[tw('px-3 py-2 rounded-lg mr-2 mb-2'), { backgroundColor: statusConfig.bgColor }]}>
                    <Text style={[tw('text-xs font-bold'), { color: statusConfig.color }]}>
                      {statusConfig.label}
                    </Text>
                  </View>

                  {/* Prioridad */}
                  <View
                    style={[
                      tw('px-3 py-2 rounded-lg flex-row items-center mb-2'),
                      { backgroundColor: priorityConfig.bgColor },
                    ]}
                  >
                    <Ionicons name={priorityConfig.icon} size={12} color={priorityConfig.color} style={tw('mr-1')} />
                    <Text style={[tw('text-xs font-bold'), { color: priorityConfig.color }]}>
                      PRIORIDAD {priorityConfig.label}
                    </Text>
                  </View>
                </View>

                {/* Usuario que activó la alerta */}
                <View style={tw('mb-5')}>
                  <Text style={[tw('text-xs font-bold mb-2 uppercase tracking-wide'), { color: colors.text.secondary }]}>
                    Usuario
                  </Text>
                  <View style={[tw('bg-surface rounded-2xl p-4'), shadows.sm]}>
                    <View style={tw('flex-row items-center')}>
                      <View
                        style={[
                          tw('w-12 h-12 rounded-full items-center justify-center mr-3'),
                          { backgroundColor: getColorWithOpacity(colors.accent, 0.15) },
                        ]}
                      >
                        <Ionicons name="person" size={24} color={colors.accent} />
                      </View>
                      <View style={tw('flex-1')}>
                        <Text style={[tw('text-base font-bold'), { color: colors.primary }]}>
                          {panicAlert.userName}
                        </Text>
                        <Text style={[tw('text-xs'), { color: colors.text.secondary }]}>
                          Activó la alerta de pánico
                        </Text>
                      </View>
                    </View>

                    {(panicAlert.localName || panicAlert.adminName || panicAlert.localNumber) && (
                      <View style={[tw('mt-4 pt-3'), { borderTopWidth: 1, borderTopColor: colors.border.light }]}>
                        {panicAlert.localName && (
                          <View style={tw('flex-row items-center mb-2')}>
                            <Ionicons name="business" size={16} color={colors.text.secondary} />
                            <Text style={[tw('text-sm font-semibold ml-2'), { color: colors.text.primary }]}>
                              {panicAlert.localName}
                            </Text>
                          </View>
                        )}
                        {(panicAlert.adminName || panicAlert.localNumber) && (
                          <View style={tw('flex-row items-center flex-wrap')}>
                            {panicAlert.adminName && (
                              <Text style={[tw('text-xs font-semibold'), { color: colors.text.secondary }]}>
                                Responsable: {panicAlert.adminName}
                              </Text>
                            )}
                            {panicAlert.adminName && panicAlert.localNumber && (
                              <Text style={[tw('text-xs mx-1'), { color: colors.text.disabled }]}>•</Text>
                            )}
                            {panicAlert.localNumber && (
                              <Text style={[tw('text-xs font-semibold'), { color: colors.text.secondary }]}>
                                Local #{panicAlert.localNumber}
                              </Text>
                            )}
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                </View>

                {/* Información temporal */}
                <View style={[tw('bg-surface rounded-2xl p-5 mb-5'), shadows.sm]}>
                  <Text style={[tw('text-xs font-bold mb-4 uppercase tracking-wide'), { color: colors.text.secondary }]}>
                    Información Temporal
                  </Text>

                  {/* Fecha de activación */}
                  <View style={tw('flex-row items-center mb-3')}>
                    <View
                      style={[
                        tw('w-10 h-10 rounded-full items-center justify-center mr-3'),
                        { backgroundColor: getColorWithOpacity(colors.status.error, 0.15) },
                      ]}
                    >
                      <Ionicons name="calendar" size={18} color={colors.status.error} />
                    </View>
                    <View style={tw('flex-1')}>
                      <Text style={[tw('text-xs'), { color: colors.text.secondary }]}>Activada el</Text>
                      <Text style={[tw('text-sm font-semibold'), { color: colors.primary }]}>
                        {formatTime(panicAlert.timestamp)}
                      </Text>
                    </View>
                  </View>

                  {/* Tiempo transcurrido */}
                  <View style={tw('flex-row items-center')}>
                    <View
                      style={[
                        tw('w-10 h-10 rounded-full items-center justify-center mr-3'),
                        { backgroundColor: getColorWithOpacity(colors.status.warning, 0.15) },
                      ]}
                    >
                      <Ionicons name="hourglass" size={18} color={colors.status.warning} />
                    </View>
                    <View style={tw('flex-1')}>
                      <Text style={[tw('text-xs'), { color: colors.text.secondary }]}>Tiempo transcurrido</Text>
                      <Text style={[tw('text-sm font-semibold'), { color: colors.primary }]}>
                        {formatElapsedTime(panicAlert.timestamp)}
                      </Text>
                    </View>
                  </View>

                  {/* Info de atención si existe */}
                  {panicAlert.attendedBy && (
                    <>
                      <View style={[tw('my-3'), { height: 1, backgroundColor: colors.border.light }]} />
                      <View style={tw('flex-row items-center')}>
                        <View
                          style={[
                            tw('w-10 h-10 rounded-full items-center justify-center mr-3'),
                            { backgroundColor: getColorWithOpacity(colors.status.info, 0.15) },
                          ]}
                        >
                          <Ionicons name="person-circle" size={18} color={colors.status.info} />
                        </View>
                        <View style={tw('flex-1')}>
                          <Text style={[tw('text-xs'), { color: colors.text.secondary }]}>Atendida por</Text>
                          <Text style={[tw('text-sm font-semibold'), { color: colors.primary }]}>
                            {panicAlert.attendedBy}
                          </Text>
                        </View>
                      </View>
                    </>
                  )}
                </View>

                {/* Foto de evidencia (opcional) */}
                {canEdit && (
                  <View style={tw('mb-5')}>
                    <Text style={[tw('text-xs font-bold mb-2 uppercase tracking-wide'), { color: colors.text.secondary }]}>
                      Foto de evidencia (opcional)
                    </Text>
                    <ImagePicker
                      images={images}
                      onImagesChange={setImages}
                      maxImages={3}
                      disabled={loading}
                    />
                  </View>
                )}

                {panicAlert.attachments && panicAlert.attachments.length > 0 && (
                  <View style={tw('mb-5')}>
                    <Text style={[tw('text-xs font-bold mb-2 uppercase tracking-wide'), { color: colors.text.secondary }]}>
                      Evidencia registrada
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {panicAlert.attachments.map((imgPath, idx) => {
                        const imgUrl = imgPath.startsWith('http')
                          ? imgPath
                          : `${API_BASE_URL.replace('/api', '')}${imgPath}`;
                        return (
                          <Image
                            key={`${imgPath}-${idx}`}
                            source={{ uri: imgUrl }}
                            style={{ width: 120, height: 120, borderRadius: 12, marginRight: 12 }}
                            resizeMode="cover"
                          />
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {/* Campo de Notas */}
                {canEdit && (
                  <View style={tw('mb-5')}>
                    <Text style={[tw('text-xs font-bold mb-2 uppercase tracking-wide'), { color: colors.text.secondary }]}>
                      Notas y Observaciones
                    </Text>
                    <TextInput
                      style={[
                        tw('p-4 rounded-xl'),
                        {
                          backgroundColor: colors.surface,
                          borderWidth: 1,
                          borderColor: colors.border.light,
                          color: colors.text.primary,
                          minHeight: 120,
                          textAlignVertical: 'top',
                        },
                      ]}
                      placeholder="Escribe aquí las observaciones, acciones tomadas o detalles importantes..."
                      placeholderTextColor={colors.text.secondary}
                      multiline
                      value={notes}
                      onChangeText={setNotes}
                      editable={!loading}
                    />
                  </View>
                )}

                {/* Notas existentes (solo lectura para resueltas) */}
                {!canEdit && (
                  <View style={tw('mb-5')}>
                    <Text style={[tw('text-xs font-bold mb-2 uppercase tracking-wide'), { color: colors.text.secondary }]}>
                      Notas de resolución
                    </Text>
                    <View
                      style={[
                        tw('px-4 py-3 rounded-xl'),
                        { backgroundColor: getColorWithOpacity(colors.status.success, 0.1) },
                      ]}
                    >
                      <Text style={[tw('text-sm'), { color: colors.text.primary, lineHeight: 20 }]}>
                        {panicAlert.notes?.trim()?.length
                          ? panicAlert.notes
                          : 'Sin notas registradas para esta alerta'}
                      </Text>
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* Footer con acciones */}
              {panicAlert.status !== 'resolved' && (
                <View
                  style={[
                    tw('px-6 py-4 bg-surface'),
                    shadows.lg,
                    { borderTopWidth: 1, borderTopColor: colors.border.light },
                  ]}
                >
                  {isActive && !isAttended ? (
                    // Botón de Atender (solo cuando está activa)
                    <TouchableOpacity
                      onPress={handleAttend}
                      style={[tw('rounded-xl items-center justify-center py-4'), { backgroundColor: colors.accent }]}
                      activeOpacity={0.8}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color={colors.surface} />
                      ) : (
                        <View style={tw('flex-row items-center')}>
                          <Ionicons name="hand-left" size={20} color={colors.surface} style={tw('mr-2')} />
                          <Text style={[tw('text-base font-bold'), { color: colors.surface }]}>Atender Alerta</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ) : (
                    // Botones de Espera y Resolver (cuando está atendida)
                    <View style={tw('flex-row')}>
                      <TouchableOpacity
                        onPress={handleHold}
                        style={[
                          tw('flex-1 rounded-xl items-center justify-center mr-2 py-4'),
                          {
                            backgroundColor: getColorWithOpacity(colors.status.warning, 0.1),
                            borderWidth: 1,
                            borderColor: colors.status.warning,
                          },
                        ]}
                        activeOpacity={0.7}
                        disabled={loading}
                      >
                        {loading ? (
                          <ActivityIndicator color={colors.status.warning} />
                        ) : (
                          <View style={tw('flex-row items-center')}>
                            <Ionicons name="pause-circle" size={18} color={colors.status.warning} style={tw('mr-2')} />
                            <Text style={[tw('text-sm font-bold'), { color: colors.status.warning }]}>En Espera</Text>
                          </View>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={handleResolve}
                        style={[
                          tw('flex-1 rounded-xl items-center justify-center ml-2 py-4'),
                          { backgroundColor: colors.status.success },
                        ]}
                        activeOpacity={0.8}
                        disabled={loading}
                      >
                        {loading ? (
                          <ActivityIndicator color={colors.surface} />
                        ) : (
                          <View style={tw('flex-row items-center')}>
                            <Ionicons name="checkmark-circle" size={18} color={colors.surface} style={tw('mr-2')} />
                            <Text style={[tw('text-sm font-bold'), { color: colors.surface }]}>Resolver</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
