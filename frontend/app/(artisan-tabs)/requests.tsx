import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, DeviceEventEmitter, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { commonStyles, theme } from "../../constants/appTheme";
import { connectWebSocket, getOffers } from "../../services/api";
import { formatDateTime } from "../../services/format";
import { showToast } from "../../services/toast";

type Offer = {
  id: string;
  request: string;
  request_id?: string;
  chat_room_id?: string | null;
  price: string;
  message?: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | string;
  request_service_name?: string;
  request_description?: string;
  request_client_email?: string;
  request_client_name?: string;
  request_payment_status?: "PAID" | "NOT_PAID" | string;
  created_at?: string;
};

export default function ArtisanOffersScreen() {
  const router = useRouter();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  const pendingOffers = offers.filter((offer) => offer.status === "PENDING");
  const assignedOffers = offers.filter((offer) => offer.status === "ACCEPTED");

  const upsertOffer = useCallback((offer: Offer) => {
    setOffers((current) => {
      const exists = current.some((item) => item.id === offer.id);
      if (offer.status === "REJECTED") {
        return current.filter((item) => item.id !== offer.id);
      }
      if (exists) {
        return current.map((item) => (item.id === offer.id ? { ...item, ...offer } : item));
      }
      if (offer.status !== "PENDING" && offer.status !== "ACCEPTED") return current;
      return [offer, ...current];
    });
  }, []);

  const loadOffers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getOffers();
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setOffers(data.filter((offer: Offer) => offer.status === "PENDING" || offer.status === "ACCEPTED"));
    } catch (err) {
      console.log(err);
      showToast("Could not load your offers.", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadOffers();
    }, [loadOffers])
  );

  useEffect(() => {
    let socket: { close: () => void } | null = null;
    const offerSentSubscription = DeviceEventEmitter.addListener("offer_sent", (offer: Offer) => {
      upsertOffer(offer);
    });

    const connect = async () => {
      socket = await connectWebSocket("/ws/marketplace/", {
        onmessage: (event: MessageEvent) => {
          const message = JSON.parse(event.data);

          if (message.type === "new_offer" && message.payload?.offer) {
            upsertOffer(message.payload.offer);
          }

          if (message.type === "offer_accepted" || message.type === "offer_rejected") {
            if (message.payload?.offer) upsertOffer(message.payload.offer);
            (message.payload?.offers || []).forEach(upsertOffer);
            showToast("Offer status updated.");
          }
        },
      });
    };

    connect();
    return () => {
      offerSentSubscription.remove();
      socket?.close();
    };
  }, [upsertOffer]);

  const openChat = (offer: Offer) => {
    if (!offer.chat_room_id) {
      showToast("Chat room is not ready yet.", "error");
      return;
    }

    router.push({
      pathname: "/chat",
      params: {
        roomId: offer.chat_room_id,
        name: offer.request_client_name || "Client",
      },
    });
  };

  return (
    <SafeAreaView style={commonStyles.safe} edges={["top", "left", "right"]}>
      <View style={commonStyles.screen}>
        <Text style={commonStyles.title}>Orders</Text>
        <Text style={commonStyles.subtitle}>Track assigned jobs and all offers you have sent.</Text>

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator color={theme.primary} />
            <Text style={styles.loaderText}>Loading offers...</Text>
          </View>
        ) : (
          <FlatList
            data={pendingOffers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              <View style={styles.sections}>
                <View style={[commonStyles.card, styles.sectionCard]}>
                  <Text style={styles.sectionTitle}>Assigned Jobs</Text>
                  {assignedOffers.length === 0 ? (
                    <Text style={styles.meta}>No assigned jobs yet.</Text>
                  ) : (
                    assignedOffers.map((offer) => (
                      <TouchableOpacity key={offer.id} style={styles.assignedRow} onPress={() => router.push({ pathname: "/offer-details" as any, params: { id: offer.id } })}>
                        <View style={styles.offerText}>
                          <Text style={styles.offerTitle}>{offer.request_service_name || "Service"}</Text>
                          <Text style={styles.meta}>{offer.request_client_name || "Client"}</Text>
                          <Text style={styles.meta}><Ionicons name="time-outline" size={14} /> {formatDateTime(offer.created_at)}</Text>
                          <Text style={styles.description}>{offer.request_description || "Assigned request"}</Text>
                          <PaymentStatusBadge status={offer.request_payment_status} />
                        </View>
                        <View style={styles.chatColumn}>
                          <StatusBadge status={offer.status} />
                          <TouchableOpacity onPress={() => openChat(offer)}>
                            <Ionicons name="chatbubble-outline" size={20} color={theme.primary} />
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    ))
                  )}
                </View>

                <Text style={styles.sectionTitle}>My Offers</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={[commonStyles.card, styles.offerCard]}>
                <View style={styles.offerRow}>
                  <View style={styles.offerText}>
                    <Text style={styles.offerTitle}>{item.request_service_name || "Service"}</Text>
                    <Text style={styles.meta}>{item.price} MAD</Text>
                    <Text style={styles.meta}><Ionicons name="time-outline" size={14} /> {formatDateTime(item.created_at)}</Text>
                    {item.message ? <Text style={styles.description}>{item.message}</Text> : null}
                  </View>
                  <StatusBadge status={item.status} />
                </View>
                <TouchableOpacity style={styles.detailsButton} onPress={() => router.push({ pathname: "/offer-details" as any, params: { id: item.id } })}>
                  <Text style={styles.detailsText}>My Offer</Text>
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={
              <View style={commonStyles.emptyCard}>
                <Text style={commonStyles.emptyText}>No pending offers.</Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status || "PENDING";
  const badgeStyle =
    normalized === "ACCEPTED" ? styles.acceptedBadge : normalized === "REJECTED" ? styles.rejectedBadge : styles.pendingBadge;
  const textStyle =
    normalized === "ACCEPTED" ? styles.acceptedText : normalized === "REJECTED" ? styles.rejectedText : styles.pendingText;

  return (
    <View style={[styles.badge, badgeStyle]}>
      <Text style={[styles.badgeText, textStyle]}>{normalized}</Text>
    </View>
  );
}

function PaymentStatusBadge({ status }: { status?: string }) {
  const normalized = status === "PAID" ? "PAID" : "NOT_PAID";
  const label = normalized === "PAID" ? "Paid" : "Waiting payment";
  return (
    <View style={[styles.paymentBadge, normalized === "PAID" ? styles.paidBadge : styles.notPaidBadge]}>
      <Text style={[styles.paymentBadgeText, normalized === "PAID" ? styles.paidText : styles.notPaidText]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10, paddingBottom: 80 },
  sections: { gap: 14, marginBottom: 10 },
  sectionCard: { gap: 12 },
  sectionTitle: { color: theme.text, fontWeight: "900", fontSize: 17 },
  assignedRow: { flexDirection: "row", gap: 10, alignItems: "center", justifyContent: "space-between" },
  offerCard: { gap: 8 },
  offerRow: { flexDirection: "row", gap: 10, alignItems: "center", justifyContent: "space-between" },
  offerText: { flex: 1, gap: 3 },
  offerTitle: { color: theme.text, fontWeight: "900", fontSize: 15 },
  meta: { color: theme.muted, fontWeight: "700" },
  description: { color: theme.text, lineHeight: 19 },
  chatColumn: { alignItems: "flex-end", gap: 8 },
  detailsButton: { minHeight: 38, borderRadius: 8, borderWidth: 1, borderColor: theme.border, alignItems: "center", justifyContent: "center" },
  detailsText: { color: theme.primary, fontWeight: "900" },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, alignSelf: "flex-start" },
  badgeText: { fontWeight: "900", fontSize: 12 },
  pendingBadge: { backgroundColor: "#fff7ed" },
  pendingText: { color: theme.accent },
  acceptedBadge: { backgroundColor: "#e7f6ec" },
  acceptedText: { color: theme.success },
  rejectedBadge: { backgroundColor: "#fff1f0" },
  rejectedText: { color: theme.danger },
  paymentBadge: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5, alignSelf: "flex-start", marginTop: 2 },
  paymentBadgeText: { fontWeight: "900", fontSize: 11 },
  paidBadge: { backgroundColor: "#e7f6ec" },
  paidText: { color: theme.success },
  notPaidBadge: { backgroundColor: "#fef3c7" },
  notPaidText: { color: "#92400e" },
  loader: { alignItems: "center", gap: 10, paddingTop: 30 },
  loaderText: { color: theme.muted, fontWeight: "600" },
});
