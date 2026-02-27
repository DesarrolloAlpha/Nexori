import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnUI,
} from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';

interface AnimatedTabScreenProps {
  children: React.ReactNode;
}

export const AnimatedTabScreen: React.FC<AnimatedTabScreenProps> = ({ children }) => {
  const [isMounted, setIsMounted] = useState(false);
  const opacity = useSharedValue(1); // Empieza en 1, no en 0
  const translateY = useSharedValue(0);

  useEffect(() => {
    // Marcar como montado después de un frame
    requestAnimationFrame(() => {
      setIsMounted(true);
    });
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (!isMounted) return; // No animar si no está montado

      opacity.value = 0;
      translateY.value = 10;

      requestAnimationFrame(() => {
        opacity.value = withTiming(1, {
          duration: 200,
          easing: Easing.out(Easing.ease),
        });
        translateY.value = withTiming(0, {
          duration: 200,
          easing: Easing.out(Easing.ease),
        });
      });

      return () => {
        opacity.value = 1;
        translateY.value = 0;
      };
    }, [isMounted])
  );

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    };
  });

  // Si no está montado, mostrar sin animación
  if (!isMounted) {
    return (
      <View style={styles.container}>
        {children}
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});