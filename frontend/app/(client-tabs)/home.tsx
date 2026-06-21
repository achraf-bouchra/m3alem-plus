import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { RemoteImage } from "../../components/RemoteImage";
import { commonStyles, theme } from "../../constants/appTheme";
import { ProfileAvatar, StarRating } from "../../components/ProfileBits";
import { connectWebSocket, getCategories, getNearbyArtisans, getServices } from "../../services/api";
import { showToast } from "../../services/toast";

type Category = {
  id: number | string;
  name: string;
};

type Service = {
  id: number | string;
  name: string;
  category?: { id: number | string; name: string };
  image?: string | null;
  image_url?: string | null;
};

type ArtisanMatch = {
  id: string;
  name: string;
  category: string | null;
  available: boolean;
  rating: number;
  latitude: number;
  longitude: number;
  distance: number;
  score: number;
  profile_image?: string | null;
};

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedArtisan, setSelectedArtisan] = useState<ArtisanMatch | null>(null);
  const [matches, setMatches] = useState<ArtisanMatch[]>([]);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const router = useRouter();

  const serviceImagesByCategory = useMemo(() => {
    const images: Record<string, Service> = {};
    services.forEach((service) => {
      const categoryId = service.category?.id?.toString();
      if (categoryId && !images[categoryId] && (service.image || service.image_url)) {
        images[categoryId] = service;
      }
    });
    return images;
  }, [services]);

  const filteredMatches = useMemo(
    () =>
      [...matches]
        .filter((artisan) => artisan.category === selectedCategory?.name)
        .sort((a, b) => Number(b.available) - Number(a.available) || a.distance - b.distance || b.rating - a.rating),
    [matches, selectedCategory]
  );

  const loadCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const [categoryRes, serviceRes] = await Promise.all([getCategories(), getServices()]);
      setCategories(Array.isArray(categoryRes.data) ? categoryRes.data : categoryRes.data.results || []);
      setServices(Array.isArray(serviceRes.data) ? serviceRes.data : serviceRes.data.results || []);
    } catch (err) {
      console.log(err);
      showToast("Could not load categories.", "error");
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  const loadLocation = useCallback(async () => {
    setLoadingLocation(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        showToast("Location permission is required to find nearby artisans.", "error");
        return;
      }

      const current = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      });
    } catch (err) {
      console.log(err);
      showToast("Could not get your current location.", "error");
    } finally {
      setLoadingLocation(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
    loadLocation();
  }, [loadCategories, loadLocation]);

  useEffect(() => {
    let socket: { close: () => void } | null = null;

    const connect = async () => {
      socket = await connectWebSocket("/ws/marketplace/", {
        onmessage: (event: MessageEvent) => {
          const message = JSON.parse(event.data);
          if (message.type === "new_offer" || message.type === "offer_accepted" || message.type === "offer_rejected") {
            showToast(message.type === "new_offer" ? "New offer received." : "Offer status updated.");
          }
        },
      });
    };

    connect();
    return () => socket?.close();
  }, []);

  const findNearby = async (category: Category) => {
    setSelectedCategory(category);
    setSelectedArtisan(null);
    setMatches([]);
    if (!location) {
      showToast("Waiting for your GPS position.", "error");
      return;
    }

    setLoadingMatches(true);
    try {
      const res = await getNearbyArtisans({
        latitude: location.latitude,
        longitude: location.longitude,
        category_id: category.id,
      });
      setMatches(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (err) {
      console.log(err);
      showToast("Could not load nearby artisans.", "error");
    } finally {
      setLoadingMatches(false);
    }
  };

  const openCreate = () => {
    if (!selectedCategory) return;
    router.push({
      pathname: "/create",
      params: {
        category_id: String(selectedCategory.id),
        category_name: selectedCategory.name,
        ...(selectedArtisan ? { artisan_id: selectedArtisan.id, artisan_name: selectedArtisan.name } : {}),
      },
    });
  };

  return (
    <SafeAreaView style={commonStyles.safe} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
        <Text style={commonStyles.title}>Find an artisan</Text>
        <Text style={commonStyles.subtitle}>Choose a category, then select an artisan or create a category request.</Text>

        <View style={styles.stepHeader}>
          <Text style={styles.stepTitle}>1. Select category</Text>
          {loadingLocation ? <ActivityIndicator size="small" color={theme.primary} /> : null}
        </View>

        {loadingCategories ? (
          <View style={styles.loaderRow}>
            <ActivityIndicator color={theme.primary} />
            <Text style={styles.loaderText}>Loading categories...</Text>
          </View>
        ) : categories.length === 0 ? (
          <View style={commonStyles.emptyCard}>
            <Text style={commonStyles.emptyText}>No categories available</Text>
          </View>
        ) : (
          <View style={styles.categoryList}>
            {categories.map((item) => {
              const active = selectedCategory?.id === item.id;
              return (
                <TouchableOpacity
                  key={item.id.toString()}
                  onPress={() => findNearby(item)}
                  style={[styles.categoryCard, active && styles.categoryCardActive]}
                >
                  <RemoteImage
                    sourceValue={serviceImagesByCategory[item.id.toString()]}
                    resizeMode="contain"
                    style={styles.categoryImage}
                    placeholderIcon="construct-outline"
                    onError={(event) => console.log("[Home] service image failed", item.name, event.nativeEvent.error)}
                  />
                  <Text style={styles.categoryName}>{item.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={styles.stepHeader}>
          <Text style={styles.stepTitle}>2. Filtered artisans</Text>
          {loadingMatches ? <ActivityIndicator size="small" color={theme.primary} /> : null}
        </View>

        {loadingMatches ? (
          <View style={styles.loaderCenter}>
            <ActivityIndicator color={theme.primary} />
            <Text style={styles.loaderText}>Finding matches...</Text>
          </View>
        ) : filteredMatches.length ? (
          <View style={styles.matchList}>
            {filteredMatches.map((item) => {
              const active = selectedArtisan?.id === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[commonStyles.card, styles.matchCard, active && styles.matchCardActive]}
                  onPress={() => setSelectedArtisan(active ? null : item)}
                >
                  <View style={styles.matchHeader}>
                    <ProfileAvatar profile={item} size={48} />
                    <View style={styles.matchInfo}>
                      <Text style={styles.matchTitle}>{item.name || "Artisan"}</Text>
                      <Text style={styles.email}>{item.category || "Service category"}</Text>
                      <StarRating value={item.rating} />
                    </View>
                    <View style={styles.scorePill}>
                      <Text style={styles.scoreText}>{item.score}</Text>
                    </View>
                  </View>
                  <View style={styles.metrics}>
                    <Text style={styles.metric}><Ionicons name="location-outline" size={14} /> {item.distance} km</Text>
                    <Text style={[styles.metric, item.available ? styles.available : styles.busy]}>
                      {item.available ? "Available" : "Unavailable"}
                    </Text>
                    <Text style={styles.metric}>{active ? "Selected" : "Tap to select"}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={commonStyles.emptyCard}>
            <Text style={commonStyles.emptyText}>
              {selectedCategory ? "No available artisans found for this category." : "Select a category to find artisans."}
            </Text>
          </View>
        )}

        <TouchableOpacity
          disabled={!selectedCategory}
          style={[commonStyles.primaryButton, styles.createButton, !selectedCategory && commonStyles.disabled]}
          onPress={openCreate}
        >
          <Ionicons name={selectedArtisan ? "person-add-outline" : "megaphone-outline"} size={20} color="#fff" />
          <Text style={commonStyles.primaryButtonText}>
            {selectedArtisan ? "Create Request for Selected Artisan" : "Create Category Request"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screenContent: { flexGrow: 1, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 96 },
  stepHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10, marginTop: 4 },
  stepTitle: { fontSize: 18, fontWeight: "800", color: theme.text },
  categoryList: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingBottom: 18 },
  categoryCard: {
    width: "48%",
    minHeight: 112,
    backgroundColor: theme.surface,
    borderRadius: 8,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: "#111827",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  categoryCardActive: { borderColor: theme.accent, backgroundColor: "#fff7ed" },
  categoryImage: { width: 50, height: 50, borderRadius: 8, backgroundColor: "#f8fbff" },
  categoryName: { fontWeight: "900", color: theme.text },
  createButton: { marginTop: 16 },
  matchList: { gap: 10, paddingBottom: 8 },
  matchCard: { gap: 12 },
  matchCardActive: { borderColor: theme.accent, backgroundColor: "#fffaf3" },
  matchHeader: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  matchInfo: { flex: 1 },
  matchTitle: { fontWeight: "800", color: theme.text, fontSize: 16 },
  email: { color: theme.muted, marginTop: 2 },
  scorePill: { backgroundColor: "#e7f6ec", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignSelf: "flex-start" },
  scoreText: { color: theme.success, fontWeight: "800" },
  metrics: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  metric: { color: theme.muted, fontWeight: "700" },
  available: { color: theme.success },
  busy: { color: theme.danger },
  loaderRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 18 },
  loaderCenter: { alignItems: "center", gap: 10, paddingVertical: 28 },
  loaderText: { color: theme.muted, fontWeight: "600" },
});