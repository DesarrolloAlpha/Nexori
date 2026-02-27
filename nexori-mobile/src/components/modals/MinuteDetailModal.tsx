import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  Platform,
  SafeAreaView,
  Image,
  Dimensions,
  ActivityIndicator,
  ImageStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tw, designTokens, getColorWithOpacity } from '../../utils/tw';
import type { Minute, Category, Status, Priority } from '../../types/minutes';
import minuteService from '../../services/minute.service';
import { API_BASE_URL } from '../../config/api.config';

const { colors, shadows } = designTokens;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MinuteDetailModalProps {
  visible: boolean;
  minute: Minute | null;
  onClose: () => void;
  onMarkAsReviewed: (id: string) => void;
  onCloseMinute: (id: string) => void;
  onUpdate?: () => void;
}

export default function MinuteDetailModal({
  visible,
  minute,
  onClose,
  onMarkAsReviewed,
  onCloseMinute,
  onUpdate,
}: MinuteDetailModalProps) {
  const [deletingImageIndex, setDeletingImageIndex] = useState<number | null>(null);

  if (!minute) return null;

  const getStatusConfig = (status: string) => {
    const configs = {
      pending: {
        label: 'PENDIENTE',
        color: colors.status.warning,
        bgColor: colors.status.warningLight,
        icon: 'time-outline' as const,
      },
      reviewed: {
        label: 'REVISADA',
        color: colors.status.info,
        bgColor: colors.status.infoLight,
        icon: 'eye-outline' as const,
      },
      closed: {
        label: 'CERRADA',
        color: colors.status.success,
        bgColor: colors.status.successLight,
        icon: 'checkmark-circle-outline' as const,
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

  const getCategoryConfig = (category: Category) => {
    const configs = {
      anotacion: { label: 'Anotación', icon: 'document-text' as const, color: colors.status.info },
      hurto: { label: 'Hurto', icon: 'alert-circle' as const, color: colors.status.error },
      novedad_vehiculo: { label: 'Novedad en Vehículo', icon: 'car' as const, color: colors.status.warning },
      objetos_abandonados: { label: 'Objetos Abandonados', icon: 'cube' as const, color: colors.status.info },
      novedad: { label: 'Novedad', icon: 'megaphone' as const, color: colors.accent },
      observacion: { label: 'Observación', icon: 'eye' as const, color: colors.status.info },
      recomendacion: { label: 'Recomendación', icon: 'bulb' as const, color: colors.status.success },
      nueva_marca: { label: 'Nueva Marca', icon: 'star' as const, color: colors.accent },
      incidente: { label: 'Incidente', icon: 'warning' as const, color: colors.status.warning },
      emergencia: { label: 'Emergencia', icon: 'alert' as const, color: colors.status.error },
      mantenimiento: { label: 'Mantenimiento', icon: 'construct' as const, color: colors.secondary },
      persona_sospechosa: { label: 'Persona Sospechosa', icon: 'person-circle' as const, color: colors.status.error },
    };
    return configs[category] || { label: category, icon: 'document-text' as const, color: colors.text.secondary };
  };

  const statusConfig = getStatusConfig(minute.status);
  const priorityConfig = getPriorityConfig(minute.priority);
  const categoryConfig = getCategoryConfig(minute.category);

  const handleMarkAsReviewed = () => {
    Alert.alert(
      'Marcar como Revisada',
      '¿Confirmas que has revisado esta minuta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Revisar',
          onPress: () => {
            onMarkAsReviewed(minute.id);
            onClose();
          },
        },
      ]
    );
  };

  const handleCloseMinute = () => {
    Alert.alert(
      'Cerrar Minuta',
      '¿Confirmas que deseas cerrar esta minuta? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar',
          style: 'destructive',
          onPress: () => {
            onCloseMinute(minute.id);
            onClose();
          },
        },
      ]
    );
  };

  const handleDeleteImage = async (imageIndex: number) => {
    Alert.alert(
      'Eliminar imagen',
      '¿Estás seguro de que deseas eliminar esta imagen?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingImageIndex(imageIndex);
              
              const result = await minuteService.deleteImage(minute.id, imageIndex);
              
              if (!result.success) {
                throw new Error(result.error || 'Error al eliminar imagen');
              }

              Alert.alert('Éxito', 'Imagen eliminada exitosamente');
              onUpdate?.();
            } catch (error: any) {
              console.error('Error al eliminar imagen:', error);
              Alert.alert('Error', error.message || 'No se pudo eliminar la imagen');
            } finally {
              setDeletingImageIndex(null);
            }
          },
        },
      ]
    );
  };

  const getImageUrl = (imagePath: string) => {
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    const baseUrl = API_BASE_URL.replace('/api', '');
    return `${baseUrl}${imagePath}`;
  };

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
                  { backgroundColor: statusConfig.bgColor }
                ]}>
                  <Ionicons name={statusConfig.icon} size={22} color={statusConfig.color} />
                </View>
                <Text style={[tw('text-lg font-bold'), { color: colors.primary }]}>
                  Detalle de Minuta
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
              {/* Badges de estado, prioridad y categoría */}
              <View style={tw('flex-row flex-wrap mb-5')}>
                {/* Estado */}
                <View style={[tw('px-3 py-2 rounded-lg mr-2 mb-2'), { backgroundColor: statusConfig.bgColor }]}>
                  <Text style={[tw('text-xs font-bold'), { color: statusConfig.color }]}>
                    {statusConfig.label}
                  </Text>
                </View>

                {/* Prioridad */}
                <View style={[tw('px-3 py-2 rounded-lg flex-row items-center mr-2 mb-2'), { backgroundColor: priorityConfig.bgColor }]}>
                  <Ionicons name={priorityConfig.icon} size={12} color={priorityConfig.color} style={tw('mr-1')} />
                  <Text style={[tw('text-xs font-bold'), { color: priorityConfig.color }]}>
                    {priorityConfig.label}
                  </Text>
                </View>

                {/* Categoría */}
                <View style={[tw('px-3 py-2 rounded-lg flex-row items-center mb-2'), { backgroundColor: getColorWithOpacity(categoryConfig.color, 0.15) }]}>
                  <Ionicons name={categoryConfig.icon} size={12} color={categoryConfig.color} style={tw('mr-1')} />
                  <Text style={[tw('text-xs font-bold'), { color: categoryConfig.color }]}>
                    {categoryConfig.label}
                  </Text>
                </View>
              </View>

              {/* Título */}
              <View style={tw('mb-5')}>
                <Text style={[tw('text-xs font-bold mb-2 uppercase tracking-wide'), { color: colors.text.secondary }]}>
                  Título
                </Text>
                <Text style={[tw('text-xl font-bold'), { color: colors.primary }]}>
                  {minute.title}
                </Text>
              </View>

              {/* Descripción */}
              <View style={tw('mb-5')}>
                <Text style={[tw('text-xs font-bold mb-2 uppercase tracking-wide'), { color: colors.text.secondary }]}>
                  Descripción
                </Text>
                <View style={[
                  tw('px-4 py-3 rounded-xl'),
                  { backgroundColor: getColorWithOpacity(colors.backgroundAlt, 0.3) }
                ]}>
                  <Text style={[tw('text-sm'), { color: colors.text.primary, lineHeight: 20 }]}>
                    {minute.description}
                  </Text>
                </View>
              </View>

              {/* 🆕 Imágenes adjuntas */}
              {minute.attachments && minute.attachments.length > 0 && (
                <View style={tw('mb-5')}>
                  <Text style={[tw('text-xs font-bold mb-3 uppercase tracking-wide'), { color: colors.text.secondary }]}>
                    Imágenes ({minute.attachments.length})
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={tw('pr-4')}
                  >
                    {minute.attachments.map((imagePath, index) => (
                      <View key={index} style={tw('mr-3 relative')}>
                        {/* ✅ CORREGIDO: Usar objeto de estilos en lugar de tw() para Image */}
                        <Image
                          source={{ uri: getImageUrl(imagePath) }}
                          style={{
                            width: SCREEN_WIDTH * 0.6,
                            height: SCREEN_WIDTH * 0.6,
                            borderRadius: 12,
                            backgroundColor: colors.backgroundAlt,
                          } as ImageStyle}
                          resizeMode="cover"
                        />
                        
                        {/* Botón eliminar imagen */}
                        <TouchableOpacity
                          onPress={() => handleDeleteImage(index)}
                          disabled={deletingImageIndex === index}
                          style={[
                            tw('absolute top-2 right-2 w-8 h-8 rounded-full items-center justify-center'),
                            { backgroundColor: colors.status.error },
                            shadows.md
                          ]}
                          activeOpacity={0.7}
                        >
                          {deletingImageIndex === index ? (
                            <ActivityIndicator size="small" color={colors.surface} />
                          ) : (
                            <Ionicons name="trash" size={16} color={colors.surface} />
                          )}
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* ── Línea de tiempo ── */}
              <View style={[tw('bg-surface rounded-2xl p-5 mb-5'), shadows.sm]}>
                <Text style={[tw('text-xs font-bold mb-4 uppercase tracking-wide'), { color: colors.text.secondary }]}>
                  Línea de tiempo
                </Text>

                {/* Creada */}
                <View style={tw('flex-row')}>
                  <View style={tw('items-center mr-4')}>
                    <View style={[
                      tw('w-8 h-8 rounded-full items-center justify-center'),
                      { backgroundColor: getColorWithOpacity(colors.accent, 0.15) }
                    ]}>
                      <Ionicons name="create-outline" size={16} color={colors.accent} />
                    </View>
                    {(minute.status === 'reviewed' || minute.status === 'closed') && (
                      <View style={[tw('w-0.5 flex-1 my-1'), { backgroundColor: colors.border.light, minHeight: 20 }]} />
                    )}
                  </View>
                  <View style={tw('flex-1 pb-4')}>
                    <Text style={[tw('text-sm font-bold'), { color: colors.text.primary }]}>
                      Creada
                    </Text>
                    <Text style={[tw('text-xs font-semibold mt-0.5'), { color: colors.accent }]}>
                      {minute.createdBy}
                    </Text>
                    <Text style={[tw('text-xs mt-0.5'), { color: colors.text.secondary }]}>
                      {new Date(minute.date).toLocaleString('es-ES', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </View>

                {/* Revisada */}
                {(minute.status === 'reviewed' || minute.status === 'closed') && (
                  <View style={tw('flex-row')}>
                    <View style={tw('items-center mr-4')}>
                      <View style={[
                        tw('w-8 h-8 rounded-full items-center justify-center'),
                        { backgroundColor: getColorWithOpacity(colors.status.info, 0.15) }
                      ]}>
                        <Ionicons name="eye-outline" size={16} color={colors.status.info} />
                      </View>
                      {minute.status === 'closed' && (
                        <View style={[tw('w-0.5 flex-1 my-1'), { backgroundColor: colors.border.light, minHeight: 20 }]} />
                      )}
                    </View>
                    <View style={tw('flex-1 pb-4')}>
                      <Text style={[tw('text-sm font-bold'), { color: colors.text.primary }]}>
                        Revisada
                      </Text>
                      {minute.reviewedBy ? (
                        <Text style={[tw('text-xs font-semibold mt-0.5'), { color: colors.status.info }]}>
                          {minute.reviewedBy}
                        </Text>
                      ) : null}
                      {minute.reviewedAt ? (
                        <Text style={[tw('text-xs mt-0.5'), { color: colors.text.secondary }]}>
                          {new Date(minute.reviewedAt).toLocaleString('es-ES', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                )}

                {/* Cerrada */}
                {minute.status === 'closed' && (
                  <View style={tw('flex-row')}>
                    <View style={tw('items-center mr-4')}>
                      <View style={[
                        tw('w-8 h-8 rounded-full items-center justify-center'),
                        { backgroundColor: getColorWithOpacity(colors.status.success, 0.15) }
                      ]}>
                        <Ionicons name="checkmark-circle-outline" size={16} color={colors.status.success} />
                      </View>
                    </View>
                    <View style={tw('flex-1')}>
                      <Text style={[tw('text-sm font-bold'), { color: colors.text.primary }]}>
                        Cerrada
                      </Text>
                      {minute.closedBy ? (
                        <Text style={[tw('text-xs font-semibold mt-0.5'), { color: colors.status.success }]}>
                          {minute.closedBy}
                        </Text>
                      ) : null}
                      {minute.closedAt ? (
                        <Text style={[tw('text-xs mt-0.5'), { color: colors.text.secondary }]}>
                          {new Date(minute.closedAt).toLocaleString('es-ES', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                )}

                {/* Pendiente — paso siguiente */}
                {minute.status === 'pending' && (
                  <View style={[
                    tw('flex-row items-center mt-2 p-3 rounded-xl'),
                    { backgroundColor: getColorWithOpacity(colors.status.warning, 0.08) }
                  ]}>
                    <Ionicons name="time-outline" size={14} color={colors.status.warning} style={tw('mr-2')} />
                    <Text style={[tw('text-xs'), { color: colors.status.warning }]}>
                      Pendiente de revisión
                    </Text>
                  </View>
                )}
              </View>

              {/* Información adicional */}
              <View style={[tw('bg-surface rounded-2xl p-5'), shadows.sm]}>
                <Text style={[tw('text-xs font-bold mb-4 uppercase tracking-wide'), { color: colors.text.secondary }]}>
                  Información
                </Text>

                {/* Categoría detallada */}
                <View style={tw('flex-row items-center mb-3')}>
                  <View style={[
                    tw('w-10 h-10 rounded-full items-center justify-center mr-3'),
                    { backgroundColor: getColorWithOpacity(categoryConfig.color, 0.15) }
                  ]}>
                    <Ionicons name={categoryConfig.icon} size={18} color={categoryConfig.color} />
                  </View>
                  <View style={tw('flex-1')}>
                    <Text style={[tw('text-xs'), { color: colors.text.secondary }]}>
                      Categoría
                    </Text>
                    <Text style={[tw('text-sm font-semibold'), { color: colors.primary }]}>
                      {categoryConfig.label}
                    </Text>
                  </View>
                </View>

                {/* Creado por */}
                <View style={tw('flex-row items-center mb-3')}>
                  <View style={[
                    tw('w-10 h-10 rounded-full items-center justify-center mr-3'),
                    { backgroundColor: getColorWithOpacity(colors.secondary, 0.15) }
                  ]}>
                    <Ionicons name="person" size={18} color={colors.secondary} />
                  </View>
                  <View style={tw('flex-1')}>
                    <Text style={[tw('text-xs'), { color: colors.text.secondary }]}>
                      Creado por
                    </Text>
                    <Text style={[tw('text-sm font-semibold'), { color: colors.primary }]}>
                      {minute.createdBy}
                    </Text>
                  </View>
                </View>

                {/* Fecha */}
                <View style={tw('flex-row items-center')}>
                  <View style={[
                    tw('w-10 h-10 rounded-full items-center justify-center mr-3'),
                    { backgroundColor: getColorWithOpacity(colors.accent, 0.15) }
                  ]}>
                    <Ionicons name="calendar" size={18} color={colors.accent} />
                  </View>
                  <View style={tw('flex-1')}>
                    <Text style={[tw('text-xs'), { color: colors.text.secondary }]}>
                      Fecha y hora
                    </Text>
                    <Text style={[tw('text-sm font-semibold'), { color: colors.primary }]}>
                      {new Date(minute.date).toLocaleString('es-ES', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Footer con acciones */}
            {minute.status !== 'closed' && (
              <View style={[tw('px-6 py-4 bg-surface'), shadows.lg, { borderTopWidth: 1, borderTopColor: colors.border.light }]}>
                {minute.status === 'pending' ? (
                  <View style={tw('flex-row')}>
                    <TouchableOpacity
                      onPress={handleCloseMinute}
                      style={[
                        tw('flex-1 rounded-xl items-center justify-center mr-2 py-4'),
                        { backgroundColor: getColorWithOpacity(colors.status.error, 0.1), borderWidth: 1, borderColor: colors.status.error }
                      ]}
                      activeOpacity={0.7}
                    >
                      <View style={tw('flex-row items-center')}>
                        <Ionicons name="close-circle" size={18} color={colors.status.error} style={tw('mr-2')} />
                        <Text style={[tw('text-sm font-bold'), { color: colors.status.error }]}>
                          Cerrar
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleMarkAsReviewed}
                      style={[
                        tw('flex-1 rounded-xl items-center justify-center ml-2 py-4'),
                        { backgroundColor: colors.status.info }
                      ]}
                      activeOpacity={0.8}
                    >
                      <View style={tw('flex-row items-center')}>
                        <Ionicons name="eye" size={18} color={colors.surface} style={tw('mr-2')} />
                        <Text style={[tw('text-sm font-bold'), { color: colors.surface }]}>
                          Marcar Revisada
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={handleCloseMinute}
                    style={[
                      tw('rounded-xl items-center justify-center py-4'),
                      { backgroundColor: colors.status.success }
                    ]}
                    activeOpacity={0.8}
                  >
                    <View style={tw('flex-row items-center')}>
                      <Ionicons name="checkmark-circle" size={20} color={colors.surface} style={tw('mr-2')} />
                      <Text style={[tw('text-base font-bold'), { color: colors.surface }]}>
                        Cerrar Minuta
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}