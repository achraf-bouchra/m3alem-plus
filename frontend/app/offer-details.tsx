import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ProfileAvatar, StarRating } from "../components/ProfileBits";
import { commonStyles, theme } from "../constants/appTheme";
import { getOffer } from "../services/api";
import { displayName, formatDateTime } from "../services/format";

export default function OfferDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const offerId = Array.isArray(id) ? id[0] : id;
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!offerId) return;
      setLoading(true);
      try {
        const res = await getOffer(offerId);
        setOffer(res.data);
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [offerId]);

  return (
    <SafeAreaView style={commonStyles.safe} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.screen}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={theme.primary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator color={theme.primary} />
        ) : (
          <>
            <Text style={commonStyles.title}>{offer?.request_service_name || "Offer"}</Text>
            <Text style={commonStyles.subtitle}><Ionicons name="time-outline" size={14} /> {formatDateTime(offer?.created_at)}</Text>

            <View style={[commonStyles.card, styles.card]}>
              <View style={styles.rowBetween}>
                <Text style={styles.price}>{offer?.price} MAD</Text>
                <Status status={offer?.status} />
              </View>
              <Info icon="document-text-outline" label="Request description" value={offer?.request_description} />
              <Info icon="chatbubble-outline" label="Offer message" value={offer?.message || "No message"} />
              <Info icon="location-outline" label="Client location" value={offer?.request_address} />
            </View>

            <TouchableOpacity
              style={[commonStyles.card, styles.userCard]}
              onPress={() => offer?.artisan?.id && router.push({ pathname: "/profile/[id]" as any, params: { id: offer.artisan.id } })}
            >
              <ProfileAvatar profile={offer?.artisan_profile} size={48} />
              <View style={styles.userText}>
                <Text style={styles.userName}>{displayName(offer?.artisan)}</Text>
                <Text style={styles.meta}>{offer?.artisan_profile?.category?.name || offer?.artisan?.email}</Text>
                <StarRating value={offer?.artisan_profile?.rating} />
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.muted} />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Info({ icon, label, value }: { icon: any; label: string; value?: string }) {
  return (
    <View style={styles.info}>
      <Ionicons name={icon} size={17} color={theme.primary} />
      <View style={styles.infoText}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.body}>{value || "Not available"}</Text>
      </View>
    </View>
  );
}

function Status({ status }: { status?: string }) {
  return (
    <View style={styles.statusPill}>
      <Text style={styles.statusText}>{status || "PENDING"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 40 },
  back: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 14 },
  backText: { color: theme.primary, fontWeight: "900" },
  card: { gap: 12, marginBottom: 12 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "center" },
  price: { color: theme.primary, fontWeight: "900", fontSize: 20 },
  statusPill: { backgroundColor: "#eaf2ff", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  statusText: { color: theme.primary, fontWeight: "900", fontSize: 12 },
  info: { flexDirection: "row", gap: 10 },
  infoText: { flex: 1, gap: 2 },
  label: { color: theme.muted, fontWeight: "800", fontSize: 12 },
  body: { color: theme.text, lineHeight: 20 },
  userCard: { flexDirection: "row", alignItems: "center", gap: 10 },
  userText: { flex: 1, gap: 3 },
  userName: { color: theme.text, fontWeight: "900" },
  meta: { color: theme.muted, fontWeight: "700" },
});
