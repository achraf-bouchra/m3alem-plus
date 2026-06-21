import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { commonStyles, theme } from "../constants/appTheme";
import { RemoteImage } from "../components/RemoteImage";
import { mediaUrl } from "../services/format";

const HERO_IMAGE = mediaUrl("/media/app/marketplace.png");

export default function RoleSelection() {
  const router = useRouter();

  return (
    <SafeAreaView style={commonStyles.safe} edges={["top", "left", "right"]}>
      <View style={[commonStyles.screen, styles.center]}>
        <RemoteImage sourceValue={HERO_IMAGE} resizeMode="contain" style={styles.heroImage} placeholderIcon="briefcase-outline" />
        <Text style={styles.brand}>M3ALEM</Text>
        <Text style={styles.subtitle}>Choose your marketplace space.</Text>

        <View style={styles.roleGrid}>
          <TouchableOpacity style={styles.roleButton} onPress={() => router.push("/login?role=client")}>
            <Ionicons name="person-outline" size={28} color={theme.primary} />
            <Text style={styles.roleTitle}>CLIENT</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.roleButton} onPress={() => router.push("/login?role=artisan")}>
            <Ionicons name="hammer-outline" size={28} color={theme.accent} />
            <Text style={styles.roleTitle}>ARTISAN</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.signupButton} onPress={() => router.push("/signup" as any)}>
          <Ionicons name="person-add-outline" size={18} color={theme.primary} />
          <Text style={styles.signupText}>Create an account</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: "center", gap: 14 },
  heroImage: { width: 128, height: 128, borderRadius: 8, backgroundColor: "#fff", alignSelf: "center" },
  brand: { color: theme.text, fontSize: 36, fontWeight: "900", textAlign: "center", letterSpacing: 0 },
  subtitle: { color: theme.muted, textAlign: "center", fontWeight: "700", marginBottom: 8 },
  roleGrid: { flexDirection: "row", gap: 12 },
  roleButton: { flex: 1, minHeight: 116, borderRadius: 8, borderWidth: 1, borderColor: theme.border, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", gap: 10 },
  roleTitle: { color: theme.text, fontWeight: "900" },
  signupButton: { minHeight: 44, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  signupText: { color: theme.primary, fontWeight: "900" },
});