import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { ActivityIndicator, View, Text, Platform } from 'react-native';
import { tw, designTokens, getBottomSafeArea, getColorWithOpacity } from '../utils/tw';
import { UserRole } from '../types';

import BikesScreen from '../screens/BikesScreen';
import PanicScreen from '../screens/PanicScreen';
import MinutesScreen from '../screens/MinutesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ReportsScreen from '../screens/ReportsScreen';
import TicketsScreen from '../screens/TicketsScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import PanicAttentionScreen from '../screens/PanicAttentionScreen';
import PanicSettingsScreen from '../screens/PanicSettingsScreen';
import UsersScreen from '../screens/UsersScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const { colors, spacing } = designTokens;

// Visibilidad de tabs por rol
type TabName = 'Dashboard' | 'Bicicletas' | 'Pánico' | 'Alertas' | 'Minutas' | 'Perfil';

const TAB_VISIBILITY: Record<TabName, UserRole[]> = {
  Dashboard:  ['admin', 'coordinator', 'supervisor'],
  Bicicletas: ['admin', 'coordinator', 'supervisor', 'guard'],
  Pánico:     ['admin', 'coordinator', 'locatario'],
  Alertas:    ['admin', 'coordinator', 'supervisor'],
  Minutas:    ['admin', 'coordinator', 'supervisor'],
  Perfil:     ['admin', 'coordinator', 'supervisor', 'operator', 'guard', 'locatario'],
};

function canSee(role: UserRole | undefined, tab: TabName): boolean {
  if (!role) return false;
  return TAB_VISIBILITY[tab].includes(role);
}

function LoadingScreen() {
  return (
    <View style={tw('flex-1 items-center justify-center bg-background')}>
      <View style={[tw('w-20 h-20 rounded-2xl items-center justify-center mb-6'), { backgroundColor: getColorWithOpacity(colors.accent, 0.15) }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
      <Text style={tw('text-primary text-base font-medium')}>Cargando aplicación...</Text>
    </View>
  );
}

function MainTabs() {
  const bottomSafeArea = getBottomSafeArea();
  const { user } = useAuth();
  const role = user?.role;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.text.secondary,
        tabBarStyle: {
          paddingBottom: Platform.select({ ios: spacing[3] + 34, android: spacing[2] + bottomSafeArea }),
          paddingTop: spacing[2],
          height: Platform.select({ ios: 80 + 34, android: 60 + bottomSafeArea }),
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border.light,
          ...Platform.select({
            ios: { shadowColor: colors.primary, shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 4 },
            android: { elevation: 8, borderTopWidth: 0 },
          }),
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500', marginBottom: Platform.select({ ios: spacing[1], android: 0 }) },
        tabBarItemStyle: { paddingVertical: spacing[1] },
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          switch (route.name) {
            case 'Dashboard': iconName = focused ? 'home' : 'home-outline'; break;
            case 'Bicicletas': iconName = focused ? 'bicycle' : 'bicycle-outline'; break;
            case 'Pánico': iconName = focused ? 'alert-circle' : 'alert-circle-outline'; break;
            case 'Alertas': iconName = focused ? 'shield-checkmark' : 'shield-checkmark-outline'; break;
            case 'Minutas': iconName = focused ? 'document-text' : 'document-text-outline'; break;
            case 'Perfil': iconName = focused ? 'person' : 'person-outline'; break;
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      {canSee(role, 'Dashboard') && (
        <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Inicio' }} />
      )}
      {canSee(role, 'Bicicletas') && (
        <Tab.Screen name="Bicicletas" component={BikesScreen} options={{ title: 'Bicicletas' }} />
      )}
      {canSee(role, 'Pánico') && (
        <Tab.Screen name="Pánico" component={PanicScreen} options={{ title: 'Pánico' }} />
      )}
      {canSee(role, 'Alertas') && (
        <Tab.Screen name="Alertas" component={PanicAttentionScreen} options={{ title: 'Alertas' }} />
      )}
      {canSee(role, 'Minutas') && (
        <Tab.Screen name="Minutas" component={MinutesScreen} options={{ title: 'Minutas' }} />
      )}
      <Tab.Screen name="Perfil" component={ProfileScreen} options={{ title: 'Perfil' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.surface,
        headerTitleStyle: { fontWeight: '600', fontSize: 18 },
        contentStyle: { backgroundColor: colors.background },
        animation: Platform.OS === 'ios' ? 'default' : 'slide_from_right',
      }}
      >
      {!user ? (
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ 
            headerShown: false, 
            animation: 'fade',
            animationDuration: 400
          }} 
        />
      ) : (
        <Stack.Group>
          <Stack.Screen 
            name="Main" 
            component={MainTabs} 
            options={{ headerShown: false, gestureEnabled: false }} 
          />
          
          <Stack.Screen 
            name="Reports" 
            component={ReportsScreen} 
            options={{ 
              headerShown: false,
              animation: 'slide_from_right',
            }} 
          />
          
          <Stack.Screen
            name="Tickets"
            component={TicketsScreen}
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />

          <Stack.Screen
            name="Users"
            component={UsersScreen}
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />

          <Stack.Screen
            name="PanicSettings"
            component={PanicSettingsScreen}
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}
