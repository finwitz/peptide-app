import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { Colors } from '../constants/theme';
import { ToastProvider } from '../components/Toast';
import { PremiumProvider } from '../lib/PremiumContext';

export default function RootLayout() {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? Colors.dark : Colors.light;

  return (
    <PremiumProvider>
      <ToastProvider>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            headerTitleStyle: { fontWeight: '600' },
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="paywall"
            options={{ headerShown: false, presentation: 'modal' }}
          />
          <Stack.Screen
            name="protocol/new"
            options={{ title: 'New Protocol', presentation: 'modal' }}
          />
          <Stack.Screen
            name="protocol/[id]"
            options={{ title: 'Protocol Details' }}
          />
          <Stack.Screen
            name="protocol/edit"
            options={{ title: 'Edit Protocol', presentation: 'modal' }}
          />
          <Stack.Screen
            name="log/[protocolId]"
            options={{ title: 'Log Dose', presentation: 'modal' }}
          />
          <Stack.Screen
            name="peptide/[id]"
            options={{ title: 'Peptide Info' }}
          />
          <Stack.Screen
            name="protocol/templates"
            options={{ title: 'Protocol Templates' }}
          />
          <Stack.Screen
            name="protocol/template-detail"
            options={{ title: 'Template Detail' }}
          />
          <Stack.Screen
            name="inventory/index"
            options={{ title: 'Inventory' }}
          />
          <Stack.Screen
            name="inventory/add"
            options={{ title: 'Add Vial', presentation: 'modal' }}
          />
          <Stack.Screen
            name="inventory/edit"
            options={{ title: 'Edit Vial', presentation: 'modal' }}
          />
          <Stack.Screen
            name="settings"
            options={{ title: 'Settings' }}
          />
        </Stack>
      </ToastProvider>
    </PremiumProvider>
  );
}
