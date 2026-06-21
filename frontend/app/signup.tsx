import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { commonStyles, theme } from "../constants/appTheme";
import { getCategories, register } from "../services/api";
import { RemoteImage } from "../components/RemoteImage";
import { mediaUrl } from "../services/format";
import { showToast } from "../services/toast";

type Category = { id: number | string; name: string };
type Role = "CLIENT" | "ARTISAN";

const HERO_IMAGE = mediaUrl("/media/app/signup.png");

export default function SignupScreen() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("CLIENT");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [location, setLocation] = useState<{ latitude: number; longitude: number; address: string } | null>(null);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    name: "",
    email: "",
    phone: "",
    password: "",
    confirm_password: "",
  });

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await getCategories();
        const data = Array.isArray(res.data) ? res.data : res.data.results || [];
        setCategories(data);
      } catch (err) {
        console.log(err);
      }
    };
    loadCategories();
  }, []);

  const loadLocation = async () => {
    setLoadingLocation(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        showToast("Location permission is required.", "error");
        return;
      }
      const current = await Location.getCurrentPositionAsync({});
      const places = await Location.reverseGeocodeAsync({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      });
      const place = places[0];
      const address = place
        ? [place.name, place.street, place.city, place.region].filter(Boolean).join(", ")
        : `${current.coords.latitude.toFixed(5)}, ${current.coords.longitude.toFixed(5)}`;
      setLocation({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        address,
      });
    } catch (err) {
      console.log(err);
      showToast("Could not get your GPS location.", "error");
    } finally {
      setLoadingLocation(false);
    }
  };

  useEffect(() => {
    loadLocation();
  }, []);

  const canSubmit = useMemo(() => {
    const base = form.first_name.trim() && form.last_name.trim() && form.email.trim() && form.phone.trim() && form.password && form.confirm_password && location;
    const artisanReady = role === "CLIENT" || selectedCategory;
    return Boolean(base && artisanReady && !submitting);
  }, [form, location, role, selectedCategory, submitting]);

  const setField = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    if (!canSubmit) return;
    if (form.password !== form.confirm_password) {
      showToast("Passwords do not match.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const name = `${form.first_name.trim()} ${form.last_name.trim()}`.trim();
      await register({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        confirm_password: form.confirm_password,
        role,
        name,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim(),
        address: location?.address,
        latitude: location?.latitude,
        longitude: location?.longitude,
        category: role === "ARTISAN" ? selectedCategory : undefined,
      });
      showToast("Account created. Please log in.");
      router.replace("/login");
    } catch (err: any) {
      const data = err?.response?.data;
      console.log(data || err);
      showToast(errorMessage(data) || "Could not create account.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={commonStyles.safe} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.screen}>
        <View style={styles.brandBlock}>
          <RemoteImage sourceValue={HERO_IMAGE} resizeMode="contain" style={styles.heroImage} placeholderIcon="person-add-outline" />
          <Text style={styles.brand}>M3ALEM</Text>
          <Text style={styles.subtitle}>Choose a role and complete your profile.</Text>
        </View>

        <View style={styles.roleRow}>
          {(["CLIENT", "ARTISAN"] as Role[]).map((item) => {
            const active = role === item;
            return (
              <TouchableOpacity key={item} style={[styles.roleButton, active && styles.roleActive]} onPress={() => setRole(item)}>
                <Ionicons name={item === "CLIENT" ? "person-outline" : "hammer-outline"} size={18} color={active ? "#fff" : theme.primary} />
                <Text style={[styles.roleText, active && styles.roleTextActive]}>{item}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={[commonStyles.card, styles.form]}>
          <View style={styles.row}>
            <TextInput placeholder="First name" value={form.first_name} onChangeText={(v) => setField("first_name", v)} style={[commonStyles.input, styles.half]} />
            <TextInput placeholder="Last name" value={form.last_name} onChangeText={(v) => setField("last_name", v)} style={[commonStyles.input, styles.half]} />
          </View>
          <TextInput placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={form.email} onChangeText={(v) => setField("email", v)} style={commonStyles.input} />
          <TextInput placeholder="Phone" keyboardType="phone-pad" value={form.phone} onChangeText={(v) => setField("phone", v)} style={commonStyles.input} />
          <TextInput placeholder="Password" secureTextEntry value={form.password} onChangeText={(v) => setField("password", v)} style={commonStyles.input} />
          <TextInput placeholder="Confirm password" secureTextEntry value={form.confirm_password} onChangeText={(v) => setField("confirm_password", v)} style={commonStyles.input} />

          <View style={styles.locationBox}>
            {loadingLocation ? <ActivityIndicator size="small" color={theme.primary} /> : <Ionicons name="location-outline" size={18} color={theme.accent} />}
            <Text style={styles.locationText}>{location?.address || "Waiting for GPS address..."}</Text>
          </View>
          <TouchableOpacity style={styles.locationButton} onPress={loadLocation}>
            <Ionicons name="locate-outline" size={18} color={theme.primary} />
            <Text style={styles.locationButtonText}>Use current location</Text>
          </TouchableOpacity>

          {role === "ARTISAN" ? (
            <>
              <Text style={styles.label}>Category</Text>
              <FlatList
                horizontal
                data={categories}
                keyExtractor={(item) => String(item.id)}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categories}
                renderItem={({ item }) => {
                  const active = selectedCategory === String(item.id);
                  return (
                    <TouchableOpacity style={[styles.categoryChip, active && styles.categoryActive]} onPress={() => setSelectedCategory(String(item.id))}>
                      <Text style={[styles.categoryText, active && styles.categoryTextActive]}>{item.name}</Text>
                    </TouchableOpacity>
                  );
                }}
              />
            </>
          ) : null}

          <TouchableOpacity disabled={!canSubmit} style={[commonStyles.primaryButton, !canSubmit && commonStyles.disabled]} onPress={submit}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Ionicons name="person-add-outline" size={18} color="#fff" />}
            <Text style={commonStyles.primaryButtonText}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 40 },
  brandBlock: { alignItems: "center", gap: 8, marginBottom: 16 },
  heroImage: { width: 108, height: 108, borderRadius: 8, backgroundColor: "#fff" },
  brand: { color: theme.text, fontSize: 34, fontWeight: "900", letterSpacing: 0 },
  subtitle: { color: theme.muted, fontWeight: "700", textAlign: "center" },
  roleRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  roleButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  roleActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  roleText: { color: theme.primary, fontWeight: "900" },
  roleTextActive: { color: "#fff" },
  form: { gap: 12 },
  row: { flexDirection: "row", gap: 10 },
  half: { flex: 1 },
  label: { color: theme.text, fontWeight: "900" },
  locationBox: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 12, backgroundColor: "#f8fbff" },
  locationText: { flex: 1, color: theme.muted, fontWeight: "700" },
  locationButton: { minHeight: 42, borderRadius: 8, borderWidth: 1, borderColor: theme.border, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  locationButtonText: { color: theme.primary, fontWeight: "900" },
  categories: { gap: 8, paddingBottom: 2 },
  categoryChip: { borderWidth: 1, borderColor: theme.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#fff" },
  categoryActive: { borderColor: theme.accent, backgroundColor: "#fff7ed" },
  categoryText: { color: theme.muted, fontWeight: "800" },
  categoryTextActive: { color: theme.accent },
});

function errorMessage(data: any): string {
  if (!data) return "";
  if (typeof data === "string") return data;
  if (data.detail) return String(data.detail);
  const firstKey = Object.keys(data)[0];
  const value = firstKey ? data[firstKey] : null;
  if (Array.isArray(value)) return String(value[0]);
  if (value) return String(value);
  return "";
}
