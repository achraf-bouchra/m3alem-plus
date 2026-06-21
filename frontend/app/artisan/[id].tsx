import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { RemoteImage } from "../../components/RemoteImage";
import { commonStyles, theme } from "../../constants/appTheme";

const firstParam = (value: string | string[] | undefined, fallback = "") => {
  if (Array.isArray(value)) return value[0] || fallback;
  return value || fallback;
};

export default function ArtisanDetails() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const image = firstParam(params.image, "https://i.pravatar.cc/300?img=5");
  const available = firstParam(params.available) === "true";

  return (
    <SafeAreaView style={commonStyles.safe} edges={["top", "left", "right"]}>
      <View style={commonStyles.screen}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={theme.primary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <RemoteImage sourceValue={image} style={styles.image} placeholderIcon="person-outline" />

        <View style={[commonStyles.card, styles.card]}>
          <Text style={styles.name}>{firstParam(params.name, "Artisan")}</Text>
          <Text style={styles.job}>{firstParam(params.job, "Service professional")}</Text>
          <Text style={styles.info}>Distance: {firstParam(params.distance, "Not available")}</Text>
          <Text style={styles.info}>Rating: {firstParam(params.rating, "0")}</Text>
          <Text style={[styles.status, available ? styles.available : styles.busy]}>
            {available ? "Available" : "Unavailable"}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backButton: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 12 },
  backText: { color: theme.primary, fontWeight: "800" },
  image: { width: "100%", height: 220, borderRadius: 8, marginBottom: 14 },
  card: { gap: 6 },
  name: { fontSize: 22, fontWeight: "800", color: theme.text },
  job: { color: theme.muted, fontWeight: "700" },
  info: { color: theme.text },
  status: { fontWeight: "800", marginTop: 4 },
  available: { color: theme.success },
  busy: { color: theme.danger },
});
