import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  DeviceEventEmitter,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { commonStyles, theme } from "../../constants/appTheme";
import { createOffer, getRequests } from "../../services/api";
import { formatDateTime } from "../../services/format";
import { showToast } from "../../services/toast";

type RequestItem = {
  id: string;
  service_name?: string;
  description: string;
  address: string;
  status: string;
  distance?: number | null;
  my_offer?: { id: string; status: string } | null;
  created_at?: string;
  client_profile?: { address?: string };
};

export default function ArtisanHomeScreen() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);
  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const visibleOpenRequests = useCallback((items: RequestItem[]) => {
    return items.filter((item) => item.status === "OPEN" && !item.my_offer);
  }, []);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getRequests();
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setRequests(visibleOpenRequests(data));
    } catch (err) {
      console.log(err);
      showToast("Could not load open requests.", "error");
    } finally {
      setLoading(false);
    }
  }, [visibleOpenRequests]);

  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [loadRequests])
  );

  const openOfferModal = (request: RequestItem) => {
    setSelectedRequest(request);
    setPrice("");
    setMessage("");
  };

  const closeOfferModal = () => {
    setSelectedRequest(null);
    setPrice("");
    setMessage("");
  };

  const submitOffer = async () => {
    if (!selectedRequest) return;
    const numericPrice = Number(price);
    if (Number.isNaN(numericPrice) || numericPrice <= 0) {
      showToast("Enter a valid price.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await createOffer({
        request: selectedRequest.id,
        price: numericPrice,
        message: message.trim(),
      });

      console.log("[ArtisanHome] offer_sent:", res.data);
      DeviceEventEmitter.emit("offer_sent", res.data);
      await loadRequests();
      showToast("Offer sent.");
      closeOfferModal();
    } catch (err) {
      console.log(err);
      showToast("Could not send offer.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={commonStyles.safe} edges={["top", "left", "right"]}>
      <View style={commonStyles.screen}>
        <Text style={commonStyles.title}>Live requests</Text>
        <Text style={commonStyles.subtitle}>Open client requests available for offers.</Text>

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator color={theme.primary} />
            <Text style={styles.loaderText}>Loading open requests...</Text>
          </View>
        ) : (
          <FlatList
            data={requests}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <View style={[commonStyles.card, styles.card]}>
                <View style={styles.header}>
                  <Ionicons name="briefcase-outline" size={20} color={theme.accent} />
                  <Text style={styles.service}>{item.service_name || "Service"}</Text>
                </View>
                <Text style={styles.description}>{item.description}</Text>
                <Text style={styles.meta}><Ionicons name="location-outline" size={14} /> {item.address}</Text>
                <Text style={styles.meta}><Ionicons name="person-outline" size={14} /> Client: {item.client_profile?.address || item.address || "Location unavailable"}</Text>
                <Text style={styles.meta}><Ionicons name="time-outline" size={14} /> {formatDateTime(item.created_at)}</Text>
                <Text style={styles.meta}>
                  Distance: {typeof item.distance === "number" ? `${item.distance} km` : "Not available"}
                </Text>
                <TouchableOpacity style={styles.detailsButton} onPress={() => router.push({ pathname: "/request-details" as any, params: { id: item.id } })}>
                  <Text style={styles.detailsText}>View Details</Text>
                </TouchableOpacity>
                <TouchableOpacity style={commonStyles.primaryButton} onPress={() => openOfferModal(item)}>
                  <Ionicons name="send-outline" size={18} color="#fff" />
                  <Text style={commonStyles.primaryButtonText}>Send Offer</Text>
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={
              <View style={commonStyles.emptyCard}>
                <Text style={commonStyles.emptyText}>No open requests right now.</Text>
              </View>
            }
          />
        )}

        <Modal visible={Boolean(selectedRequest)} transparent animationType="fade" onRequestClose={closeOfferModal}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Send offer</Text>
              <Text style={styles.modalSubtitle}>{selectedRequest?.service_name || "Service"}</Text>
              <TextInput
                placeholder="Price"
                keyboardType="decimal-pad"
                value={price}
                onChangeText={setPrice}
                style={commonStyles.input}
              />
              <TextInput
                placeholder="Message"
                value={message}
                onChangeText={setMessage}
                style={commonStyles.input}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.secondaryButton]} onPress={closeOfferModal}>
                  <Text style={styles.secondaryText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={submitting}
                  style={[commonStyles.primaryButton, styles.modalSubmit, submitting && commonStyles.disabled]}
                  onPress={submitOffer}
                >
                  {submitting ? <ActivityIndicator color="#fff" /> : <Ionicons name="send-outline" size={18} color="#fff" />}
                  <Text style={commonStyles.primaryButtonText}>Send</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12, paddingBottom: 80 },
  card: { gap: 10 },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  service: { color: theme.text, fontWeight: "900", fontSize: 16 },
  description: { color: theme.text, lineHeight: 20 },
  meta: { color: theme.muted, fontWeight: "600" },
  detailsButton: { minHeight: 38, borderRadius: 8, borderWidth: 1, borderColor: theme.border, alignItems: "center", justifyContent: "center" },
  detailsText: { color: theme.primary, fontWeight: "900" },
  loader: { alignItems: "center", gap: 10, paddingTop: 30 },
  loaderText: { color: theme.muted, fontWeight: "600" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(16, 24, 40, 0.45)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: { backgroundColor: "#fff", borderRadius: 8, padding: 16, gap: 12 },
  modalTitle: { color: theme.text, fontSize: 20, fontWeight: "900" },
  modalSubtitle: { color: theme.muted, fontWeight: "700" },
  modalActions: { flexDirection: "row", gap: 10 },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { color: theme.text, fontWeight: "800" },
  modalSubmit: { flex: 1 },
});
