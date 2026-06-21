import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { commonStyles, theme } from "../constants/appTheme";
import { createRequest } from "../services/api";
import { showToast } from "../services/toast";

export default function CreateRequest() {
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { category_id, category_name, artisan_id, artisan_name } = useLocalSearchParams();

  const categoryId = Array.isArray(category_id) ? category_id[0] : category_id;
  const categoryName = Array.isArray(category_name) ? category_name[0] : category_name;
  const artisanId = Array.isArray(artisan_id) ? artisan_id[0] : artisan_id;
  const artisanName = Array.isArray(artisan_name) ? artisan_name[0] : artisan_name;
  const canSubmit = useMemo(
    () => Boolean(categoryId && description.trim() && address.trim() && coords && !submitting),
    [address, categoryId, coords, description, submitting]
  );

  const handleUseCurrentLocation = async () => {
      setLoadingLocation(true);
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== "granted") {
          showToast("Location permission is required.", "error");
          return;
        }

        const current = await Location.getCurrentPositionAsync({});
        setCoords({
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
        });
        const places = await Location.reverseGeocodeAsync({
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
        });
        const place = places[0];
        if (place) {
          setAddress([place.name, place.street, place.city, place.region].filter(Boolean).join(", "));
        } else {
          setAddress(`${current.coords.latitude.toFixed(5)}, ${current.coords.longitude.toFixed(5)}`);
        }
      } catch (err) {
        console.log(err);
        showToast("Could not get GPS coordinates.", "error");
      } finally {
        setLoadingLocation(false);
      }
    };

  useEffect(() => {
    handleUseCurrentLocation();
  }, []);

  const handleCreate = async () => {
    if (!canSubmit || !coords || !categoryId) return;

    setSubmitting(true);
    try {
      const role = await AsyncStorage.getItem("role");
      if (role !== "CLIENT") {
        showToast("Only clients can create requests.", "error");
        return;
      }

      await createRequest({
        category: categoryId,
        description: description.trim(),
        address: address.trim(),
        latitude: coords.latitude,
        longitude: coords.longitude,
        ...(artisanId ? { specific_artisan: artisanId } : {}),
      });

      showToast(artisanId ? "Request sent to selected artisan." : "Request sent to category artisans.");
      router.replace("/(client-tabs)/orders");
    } catch (err) {
      console.log(err);
      showToast("Could not create the request.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={commonStyles.safe} edges={["top", "left", "right"]}>
      <View style={commonStyles.screen}>
        <Text style={commonStyles.title}>Create request</Text>
        <Text style={commonStyles.subtitle}>
          {artisanName ? `${categoryName || "Selected category"} - ${artisanName}` : categoryName || "Selected category"}
        </Text>

        <View style={[commonStyles.card, styles.form]}>
          <View style={styles.inputShell}>
            <Ionicons name="document-text-outline" size={18} color={theme.primary} />
            <TextInput
              placeholder="Describe the job"
              value={description}
              onChangeText={setDescription}
              multiline
              style={styles.textarea}
            />
          </View>

          <View style={styles.locationBox}>
            {loadingLocation ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Ionicons name="location-outline" size={18} color={theme.accent} />
            )}
            <Text style={styles.locationText}>
              {address || (coords ? `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}` : "Waiting for GPS...")}
            </Text>
          </View>

          <TouchableOpacity style={styles.locationButton} onPress={handleUseCurrentLocation}>
            <Ionicons name="locate-outline" size={18} color={theme.primary} />
            <Text style={styles.locationButtonText}>Use current location</Text>
          </TouchableOpacity>

          <TouchableOpacity
            disabled={!canSubmit}
            style={[commonStyles.primaryButton, !canSubmit && commonStyles.disabled]}
            onPress={handleCreate}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : <Ionicons name="send-outline" size={19} color="#fff" />}
            <Text style={commonStyles.primaryButtonText}>Create Request</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  form: { gap: 12, borderRadius: 8 },
  inputShell: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  textarea: { flex: 1, minHeight: 118, textAlignVertical: "top", color: theme.text, padding: 0 },
  locationBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f8fbff",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  locationText: { color: theme.muted, fontWeight: "700" },
  locationButton: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#fff",
  },
  locationButtonText: { color: theme.primary, fontWeight: "900" },
});