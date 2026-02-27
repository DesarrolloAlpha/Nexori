import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Alert,
  Platform,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import type { Bike } from '../../types/bikes';
import { tw, designTokens, getColorWithOpacity } from '../../utils/tw';

const { colors, shadows } = designTokens;

interface QRScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onBikeScanned: (qrCode: string) => void;
  bikes: Bike[];
}

export default function QRScannerModal({ visible, onClose, onBikeScanned, bikes }: QRScannerModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (visible) {
      setScanned(false);
    }
  }, [visible]);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;

    setScanned(true);

    // Verificar si el código pertenece a una bicicleta registrada
    const bike = bikes.find(b => b.qrCode === data);

    if (bike) {
      onBikeScanned(data);
      onClose();
    } else {
      Alert.alert(
        'Código no válido',
        'Este código QR no pertenece a ninguna bicicleta registrada.',
        [
          {
            text: 'Reintentar',
            onPress: () => setScanned(false),
          },
          {
            text: 'Cancelar',
            style: 'cancel',
            onPress: onClose,
          },
        ]
      );
    }
  };

  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent={false}
        onRequestClose={onClose}
        statusBarTranslucent={false}
      >
        <View style={[tw('flex-1'), { backgroundColor: colors.primary }]}>
          <SafeAreaView style={tw('flex-1')}>
            <View style={tw('flex-1 items-center justify-center px-6')}>
              <View style={[
                tw('w-20 h-20 rounded-full items-center justify-center mb-6'),
                { backgroundColor: getColorWithOpacity(colors.accent, 0.15) }
              ]}>
                <Ionicons name="camera" size={40} color={colors.accent} />
              </View>

            <Text style={[tw('text-2xl font-bold text-center mb-3'), { color: colors.surface }]}>
              Permiso de Cámara
            </Text>

            <Text style={[tw('text-base text-center mb-8'), { color: getColorWithOpacity(colors.text.light, 0.8) }]}>
              Necesitamos acceso a tu cámara para escanear códigos QR de las bicicletas.
            </Text>

            <TouchableOpacity
              onPress={requestPermission}
              style={[
                tw('w-full rounded-xl items-center justify-center py-4 mb-3'),
                { backgroundColor: colors.accent }
              ]}
              activeOpacity={0.8}
            >
              <View style={tw('flex-row items-center')}>
                <Ionicons name="camera" size={20} color={colors.surface} style={tw('mr-2')} />
                <Text style={[tw('text-base font-bold'), { color: colors.surface }]}>
                  Permitir Acceso
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onClose}
              style={[
                tw('w-full rounded-xl items-center justify-center py-4'),
                { backgroundColor: getColorWithOpacity(colors.surface, 0.15) }
              ]}
              activeOpacity={0.7}
            >
              <Text style={[tw('text-base font-bold'), { color: colors.surface }]}>
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent={false}
    >
      <View style={tw('flex-1 bg-primary')}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        />

        {/* Overlay con marco de escaneo */}
        <SafeAreaView style={tw('flex-1')}>
          {/* Header */}
          <View style={[tw('px-6 py-6'), { backgroundColor: getColorWithOpacity(colors.primary, 0.9) }]}>
            <View style={tw('flex-row items-center justify-between')}>
              <View>
                <Text style={[tw('text-2xl font-bold'), { color: colors.surface }]}>
                  Escanear QR
                </Text>
                <Text style={[tw('text-sm mt-1'), { color: getColorWithOpacity(colors.text.light, 0.8) }]}>
                  Apunta al código QR de la bicicleta
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={[
                  tw('w-12 h-12 rounded-xl items-center justify-center'),
                  { backgroundColor: getColorWithOpacity(colors.surface, 0.2) }
                ]}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={28} color={colors.surface} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Marco de escaneo */}
          <View style={tw('flex-1 items-center justify-center')}>
            <View style={styles.scanFrame}>
              {/* Esquinas del marco */}
              <View style={[styles.corner, styles.topLeft, { borderColor: colors.accent }]} />
              <View style={[styles.corner, styles.topRight, { borderColor: colors.accent }]} />
              <View style={[styles.corner, styles.bottomLeft, { borderColor: colors.accent }]} />
              <View style={[styles.corner, styles.bottomRight, { borderColor: colors.accent }]} />

              {/* Línea de escaneo animada (opcional) */}
              <View style={[styles.scanLine, { backgroundColor: colors.accent }]} />
            </View>

            {/* Instrucción */}
            <View style={[
              tw('px-6 py-4 rounded-2xl mt-8 mx-6'),
              { backgroundColor: getColorWithOpacity(colors.primary, 0.9) }
            ]}>
              <Text style={[tw('text-center text-sm font-semibold'), { color: colors.surface }]}>
                Centra el código QR dentro del marco
              </Text>
            </View>
          </View>

          {/* Footer con info */}
          <View style={[tw('px-6 pb-6'), { backgroundColor: getColorWithOpacity(colors.primary, 0.9) }]}>
            <View style={tw('flex-row items-center justify-center')}>
              <Ionicons name="information-circle" size={16} color={getColorWithOpacity(colors.text.light, 0.7)} style={tw('mr-2')} />
              <Text style={[tw('text-xs text-center'), { color: getColorWithOpacity(colors.text.light, 0.7) }]}>
                El QR se encuentra en el sticker de la bicicleta
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scanFrame: {
    width: 280,
    height: 280,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomRightRadius: 12,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    top: '50%',
    opacity: 0.7,
  },
});