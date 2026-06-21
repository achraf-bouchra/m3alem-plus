import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const icons = {
  "artisan-home": "home-outline",
  requests: "list-outline",
  messages: "chatbubble-outline",
  notifications: "notifications-outline",
  profile: "person-outline",
} as const;

export default function ArtisanTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        headerBackVisible: false,
        tabBarActiveTintColor: "#003f87",
        tabBarInactiveTintColor: "#7b8794",
        tabBarStyle: {
          height: 60 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 10),
          paddingTop: 5,
        },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={icons[route.name as keyof typeof icons] as any} size={size} color={color} />
        ),
      })}
    >
      <Tabs.Screen name="artisan-home" options={{ title: "Home" }} />
      <Tabs.Screen name="requests" options={{ title: "Orders" }} />
      <Tabs.Screen name="messages" options={{ title: "Messages" }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
