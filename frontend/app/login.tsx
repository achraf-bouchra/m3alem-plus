import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { commonStyles, theme } from "../constants/appTheme";
import useAuth from "../hooks/useAuth";

import { login } from "../services/auth";
import { RemoteImage } from "../components/RemoteImage";
import { mediaUrl } from "../services/format";
import { showToast } from "../services/toast";

const HERO_IMAGE = mediaUrl("/media/app/login.png");

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { role: preferredRole } = useLocalSearchParams();
  const { saveAuth } = useAuth();

  const handleLogin = async () => {
    setSubmitting(true);
    try {
      const selectedRole = preferredRole === "client" ? "CLIENT" : preferredRole === "artisan" ? "ARTISAN" : undefined;
      const data = await login(email.trim().toLowerCase(), password, selectedRole);
      const role = data.role || data.user?.role;

      if (!role) {
        showToast("User role is missing.", "error");
        return;
      }

      await saveAuth(data.access, role, data.user_id || data.user?.id);
      showToast("Logged in.");

      if (role === "CLIENT") {
        router.replace("/(client-tabs)/home");
        return;
      }

      if (role === "ARTISAN") {
        router.replace("/(artisan-tabs)/artisan-home");
        return;
      }

      showToast("Unsupported user role.", "error");
    } catch (error: any) {
      console.log(error);
      const message = error?.response?.data?.detail || "Invalid email or password.";
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={commonStyles.safe} edges={["top", "left", "right"]}>
      <View style={[commonStyles.screen, styles.center]}>
        <View style={styles.brandBlock}>
          <RemoteImage sourceValue={HERO_IMAGE} resizeMode="contain" style={styles.heroImage} placeholderIcon="person-outline" />
          <Text style={styles.brand}>M3ALEM</Text>
          <Text style={styles.subtitle}>{preferredRole === "artisan" ? "Artisan account" : preferredRole === "client" ? "Client account" : "Marketplace account"}</Text>
        </View>

        <View style={[commonStyles.card, styles.form]}>
          <TextInput placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} style={commonStyles.input} />
          <TextInput placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} style={commonStyles.input} />

          <TouchableOpacity disabled={submitting || !email.trim() || !password} style={[commonStyles.primaryButton, (submitting || !email.trim() || !password) && commonStyles.disabled]} onPress={handleLogin}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Ionicons name="log-in-outline" size={18} color="#fff" />}
            <Text style={commonStyles.primaryButtonText}>Login</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push("/signup" as any)} style={styles.linkButton}>
            <Text style={styles.linkText}>Create a new account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: "center", gap: 18 },
  brandBlock: { alignItems: "center", gap: 8 },
  heroImage: { width: 118, height: 118, borderRadius: 8, backgroundColor: "#fff" },
  brand: { color: theme.text, fontSize: 34, fontWeight: "900", letterSpacing: 0 },
  subtitle: { color: theme.muted, fontWeight: "700", textAlign: "center" },
  form: { gap: 12, borderRadius: 8 },
  linkButton: { minHeight: 40, alignItems: "center", justifyContent: "center" },
  linkText: { color: theme.primary, fontWeight: "800" },
});