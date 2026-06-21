import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { commonStyles, theme } from "../../constants/appTheme";
import useAuth from "../../hooks/useAuth";
import API from "../../services/api";
import { displayName } from "../../services/format";
import { showToast } from "../../services/toast";

type ChatRoom = {
  id: string;
  artisan?: { email?: string; first_name?: string; last_name?: string; full_name?: string; role?: string };
  client?: { email?: string; first_name?: string; last_name?: string; full_name?: string; role?: string };
  artisan_profile?: { category?: { name?: string } };
  request_service_name?: string;
};

export default function MessagesScreen() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { role } = useAuth();

  useEffect(() => {
    const loadRooms = async () => {
      setLoading(true);
      try {
        const res = await API.get("/chat/rooms/");
        setRooms(Array.isArray(res.data) ? res.data : res.data.results || []);
      } catch (err) {
        console.log(err);
        showToast("Could not load chats.", "error");
      } finally {
        setLoading(false);
      }
    };

    loadRooms();
  }, []);

  return (
    <SafeAreaView style={commonStyles.safe} edges={["top", "left", "right"]}>
      <View style={commonStyles.screen}>
        <Text style={commonStyles.title}>Messages</Text>
        <Text style={commonStyles.subtitle}>Chat rooms appear after an offer is accepted.</Text>

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator color={theme.primary} />
            <Text style={styles.loaderText}>Loading chats...</Text>
          </View>
        ) : (
          <FlatList
            data={rooms}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const otherUser = role === "ARTISAN" ? item.client : item.artisan;
              const name = displayName(otherUser) || "Conversation";
              const meta = otherUser?.role === "ARTISAN" ? item.artisan_profile?.category?.name || "Artisan" : item.request_service_name || "Client";
              return (
                <TouchableOpacity
                  style={[commonStyles.card, styles.roomCard]}
                  onPress={() =>
                    router.push({
                      pathname: "/chat",
                      params: { name, roomId: item.id },
                    })
                  }
                >
                  <View style={styles.roomIcon}>
                    <Ionicons name="chatbubble-outline" size={20} color={theme.primary} />
                  </View>
                  <View style={styles.roomText}>
                    <Text style={styles.name}>{name}</Text>
                    <Text style={styles.meta}>{meta}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.muted} />
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={commonStyles.emptyCard}>
                <Text style={commonStyles.emptyText}>No conversations yet.</Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10, paddingBottom: 28 },
  roomCard: { flexDirection: "row", alignItems: "center", gap: 12 },
  roomIcon: { width: 40, height: 40, borderRadius: 8, backgroundColor: "#eaf2ff", alignItems: "center", justifyContent: "center" },
  roomText: { flex: 1 },
  name: { color: theme.text, fontWeight: "800" },
  meta: { color: theme.muted, marginTop: 2 },
  loader: { alignItems: "center", gap: 10, paddingTop: 30 },
  loaderText: { color: theme.muted, fontWeight: "600" },
});
