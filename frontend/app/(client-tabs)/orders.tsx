import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { commonStyles, theme } from "../../constants/appTheme";
import { connectWebSocket, getRequests, respondToOffer } from "../../services/api";
import { displayName, formatDateTime } from "../../services/format";
import { showToast } from "../../services/toast";

type Offer = {
  id: string;
  price: string;
  message?: string;
  status: string;
  request_id?: string;
  artisan?: {
    id?: string;
    email: string;
  };
  created_at?: string;
};

type RequestItem = {
  id: string;
  service_name?: string;
  description: string;
  address: string;
  status: string;
  assigned_artisan?: {
    email?: string;
  } | null;
  offers?: Offer[];
  created_at?: string;
};

export default function Requests() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyOffer, setBusyOffer] = useState<string | null>(null);
  const router = useRouter();

  const withoutRejectedOffers = useCallback((request: RequestItem) => ({
    ...request,
    offers: (request.offers || []).filter((offer) => offer.status !== "REJECTED"),
  }), []);

  const upsertRequest = useCallback((request: RequestItem) => {
    const cleanRequest = withoutRejectedOffers(request);
    setRequests((current) => {
      const exists = current.some((item) => item.id === cleanRequest.id);
      if (!exists) return [cleanRequest, ...current];
      return current.map((item) => (item.id === cleanRequest.id ? { ...item, ...cleanRequest } : item));
    });
  }, [withoutRejectedOffers]);

  const upsertOffer = useCallback((offer: Offer) => {
    setRequests((current) =>
      current.map((item) => {
        if (item.id !== offer.request_id && !item.offers?.some((existing) => existing.id === offer.id)) {
          return item;
        }
        const offers = item.offers || [];
        if (offer.status === "REJECTED") {
          return { ...item, offers: offers.filter((existing) => existing.id !== offer.id) };
        }
        const hasOffer = offers.some((existing) => existing.id === offer.id);
        return {
          ...item,
          offers: hasOffer
            ? offers.map((existing) => (existing.id === offer.id ? { ...existing, ...offer } : existing)).filter((existing) => existing.status !== "REJECTED")
            : [offer, ...offers].filter((existing) => existing.status !== "REJECTED"),
        };
      })
    );
  }, []);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getRequests();
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setRequests(data.map(withoutRejectedOffers));
    } catch (err) {
      console.log(err);
      showToast("Could not load your requests.", "error");
    } finally {
      setLoading(false);
    }
  }, [withoutRejectedOffers]);

  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [loadRequests])
  );

  useEffect(() => {
    let socket: { close: () => void } | null = null;

    const connect = async () => {
      socket = await connectWebSocket("/ws/marketplace/", {
        onmessage: (event: MessageEvent) => {
          const message = JSON.parse(event.data);
          if (message.type === "new_offer") {
            if (message.payload?.request) upsertRequest(message.payload.request);
            if (message.payload?.offer) upsertOffer(message.payload.offer);
            showToast("New offer received.");
            loadRequests();
          }
          if (message.type === "offer_accepted" || message.type === "offer_rejected") {
            if (message.payload?.request) upsertRequest(message.payload.request);
            (message.payload?.offers || []).forEach(upsertOffer);
            if (message.payload?.offer) upsertOffer(message.payload.offer);
            showToast("Offer status updated.");
            loadRequests();
          }
        },
      });
    };

    connect();
    return () => socket?.close();
  }, [loadRequests, upsertOffer, upsertRequest]);

  const respond = async (offerId: string, action: "accept" | "reject") => {
    setBusyOffer(offerId);
    try {
      const res = await respondToOffer(offerId, action);
      const updated = res.data;
      setRequests((current) =>
        current.map((request) => {
          const offers = request.offers || [];
          if (!offers.some((offer) => offer.id === offerId)) return request;
          return {
            ...request,
            status: action === "accept" ? "ASSIGNED" : request.status,
            assigned_artisan: action === "accept" ? updated.artisan : request.assigned_artisan,
            offers: offers
              .map((offer) => {
                if (offer.id === offerId) return { ...offer, ...updated };
                if (action === "accept") return { ...offer, status: "REJECTED" };
                return offer;
              })
              .filter((offer) => offer.status !== "REJECTED"),
          };
        })
      );
      await loadRequests();
      showToast(action === "accept" ? "Offer accepted." : "Offer rejected.");
    } catch (err) {
      console.log(err);
      showToast("Could not update this offer.", "error");
    } finally {
      setBusyOffer(null);
    }
  };

  return (
    <SafeAreaView style={commonStyles.safe} edges={["top", "left", "right"]}>
      <View style={commonStyles.screen}>
        <Text style={commonStyles.title}>My requests</Text>
        <Text style={commonStyles.subtitle}>Review offers and assign one artisan per request.</Text>

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator color={theme.primary} />
            <Text style={styles.loaderText}>Loading requests...</Text>
          </View>
        ) : (
          <FlatList
            data={requests}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={0.9}
                style={[commonStyles.card, styles.requestCard]}
                onPress={() => router.push({ pathname: "/request-details" as any, params: { id: item.id } })}
              >
                <View style={styles.requestHeader}>
                  <View style={styles.titleRow}>
                    <Ionicons name="briefcase-outline" size={18} color={theme.accent} />
                    <Text style={styles.service}>{item.service_name || "Service"}</Text>
                  </View>
                  <RequestStatusBadge status={item.status} />
                </View>
                <Text style={styles.description}>{item.description}</Text>
                <Text style={styles.meta}><Ionicons name="location-outline" size={14} /> {item.address}</Text>
                <Text style={styles.meta}><Ionicons name="time-outline" size={14} /> {formatDateTime(item.created_at)}</Text>
                {item.status === "ASSIGNED" && item.assigned_artisan ? (
                  <View style={styles.assignedBox}>
                    <Ionicons name="checkmark-circle-outline" size={18} color={theme.success} />
                    <Text style={styles.assignedText}>Assigned to {displayName(item.assigned_artisan) || "artisan"}</Text>
                  </View>
                ) : null}

                {(item.offers || []).length === 0 ? (
                  <Text style={styles.noOffers}>No offers yet.</Text>
                ) : (
                  (item.offers || []).filter((offer) => offer.status !== "REJECTED").map((offer) => (
                    <View key={offer.id} style={styles.offerCard}>
                      <View style={styles.requestHeader}>
                        <TouchableOpacity
                          style={styles.offerArtisanButton}
                          onPress={() => offer.artisan?.id && router.push({ pathname: "/profile/[id]" as any, params: { id: offer.artisan.id } })}
                        >
                          <Text style={styles.offerArtisan}>{displayName(offer.artisan) || "Artisan"}</Text>
                        </TouchableOpacity>
                        <Text style={styles.offerPrice}>{offer.price} MAD</Text>
                      </View>
                      <Text style={styles.meta}><Ionicons name="time-outline" size={14} /> {formatDateTime(offer.created_at)}</Text>
                      {offer.message ? <Text style={styles.message}>{offer.message}</Text> : null}
                      <StatusBadge status={offer.status} />

                      {item.status === "OPEN" && offer.status === "PENDING" ? (
                        <View style={styles.actions}>
                          <TouchableOpacity
                            disabled={busyOffer === offer.id}
                            style={[styles.actionButton, styles.acceptButton]}
                            onPress={() => respond(offer.id, "accept")}
                          >
                            <Text style={styles.actionText}>Accept</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            disabled={busyOffer === offer.id}
                            style={[styles.actionButton, styles.rejectButton]}
                            onPress={() => respond(offer.id, "reject")}
                          >
                            <Text style={styles.rejectText}>Reject</Text>
                          </TouchableOpacity>
                        </View>
                      ) : null}
                    </View>
                  ))
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={commonStyles.emptyCard}>
                <Text style={commonStyles.emptyText}>No requests yet. Create one from Home.</Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12, paddingBottom: 28 },
  requestCard: { gap: 10 },
  requestHeader: { flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "center" },
  titleRow: { flexDirection: "row", gap: 8, alignItems: "center", flex: 1 },
  service: { color: theme.text, fontWeight: "800", fontSize: 16 },
  statusPill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignSelf: "flex-start" },
  statusText: { fontWeight: "900", fontSize: 12 },
  openBadge: { backgroundColor: "#fff7ed" },
  openText: { color: theme.accent },
  assignedRequestBadge: { backgroundColor: "#eaf2ff" },
  assignedRequestText: { color: theme.primary },
  completedBadge: { backgroundColor: "#e7f6ec" },
  completedText: { color: theme.success },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, alignSelf: "flex-start" },
  badgeText: { fontWeight: "900", fontSize: 12 },
  pendingBadge: { backgroundColor: "#eef2f6" },
  pendingText: { color: theme.muted },
  acceptedBadge: { backgroundColor: "#e7f6ec" },
  acceptedText: { color: theme.success },
  rejectedBadge: { backgroundColor: "#fff1f0" },
  rejectedText: { color: theme.danger },
  open: { color: theme.success },
  assigned: { color: theme.primary },
  assignedBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#e7f6ec",
    borderRadius: 8,
    padding: 10,
  },
  assignedText: { color: theme.success, fontWeight: "800", flex: 1 },
  description: { color: theme.text, lineHeight: 20 },
  meta: { color: theme.muted, fontWeight: "600" },
  noOffers: { color: theme.muted, fontStyle: "italic" },
  offerCard: { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 10, gap: 7 },
  offerArtisanButton: { flex: 1 },
  offerArtisan: { color: theme.text, fontWeight: "800", flex: 1 },
  offerPrice: { color: theme.primary, fontWeight: "900" },
  message: { color: theme.text },
  actions: { flexDirection: "row", gap: 8, marginTop: 4 },
  actionButton: { flex: 1, minHeight: 42, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  acceptButton: { backgroundColor: theme.accent },
  rejectButton: { backgroundColor: "#fff", borderWidth: 1, borderColor: theme.border },
  actionText: { color: "#fff", fontWeight: "800" },
  rejectText: { color: theme.danger, fontWeight: "800" },
  loader: { alignItems: "center", gap: 10, paddingTop: 30 },
  loaderText: { color: theme.muted, fontWeight: "600" },
});

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

function RequestStatusBadge({ status }: { status: string }) {
  const normalized = status || "OPEN";
  const badgeStyle = normalized === "COMPLETED" ? styles.completedBadge : normalized === "ASSIGNED" ? styles.assignedRequestBadge : styles.openBadge;
  const textStyle = normalized === "COMPLETED" ? styles.completedText : normalized === "ASSIGNED" ? styles.assignedRequestText : styles.openText;
  return (
    <View style={[styles.statusPill, badgeStyle]}>
      <Text style={[styles.statusText, textStyle]}>{normalized}</Text>
    </View>
  );
}
