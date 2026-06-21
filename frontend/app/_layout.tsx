import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import useAuth from "../hooks/useAuth";

export default function Layout() {
  const { loading } = useAuth();

  if (loading) return null;

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false, headerBackVisible: false }} />
    </SafeAreaProvider>
  );
}
