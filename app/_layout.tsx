import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { Colors } from '../constants/theme';

export default function RootLayout() {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? Colors.dark : Colors.light;

  return (
    <>
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
          name="protocol/new"
          options={{ title: 'New Protocol', presentation: 'modal' }}
        />
        <Stack.Screen
          name="protocol/[id]"
          options={{ title: 'Protocol Details' }}
        />
        <Stack.Screen
          name="log/[protocolId]"
          options={{ title: 'Log Dose', presentation: 'modal' }}
        />
        <Stack.Screen
          name="peptide/[id]"
          options={{ title: 'Peptide Info' }}
        />
      </Stack>
    </>
  );
}
