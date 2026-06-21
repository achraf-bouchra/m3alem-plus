import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ProfileAvatar, StarRating } from "../components/ProfileBits";
import { commonStyles, theme } from "../constants/appTheme";
import useAuth from "../hooks/useAuth";
import { confirmPayment, createPaymentIntent, createReview, getPaymentMethod, getRequest, getReviews } from "../services/api";
import { displayName, formatDateTime } from "../services/format";
import { showToast } from "../services/toast";

export default function RequestDetailsScreen() {
  const { id, resumePayment, offerId: routeOfferId } = useLocalSearchParams();
  const router = useRouter();
  const requestId = Array.isArray(id) ? id[0] : id;
  const { role } = useAuth();
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [pendingPaymentOfferId, setPendingPaymentOfferId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<any>(null);
  const [reviewVisible, setReviewVisible] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [review, setReview] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      if (!requestId) return;
      setLoading(true);
      try {
        const res = await getRequest(requestId);
        setRequest(res.data);
        const reviewRes = await getReviews({ request_id: requestId });
        const savedReviews = reviewRes.data?.results || reviewRes.data || [];
        setReview(Array.isArray(savedReviews) ? savedReviews[0] || null : savedReviews);
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [requestId]);

  const loadRequest = async () => {
    if (!requestId) return;
    setLoading(true);
    try {
      const res = await getRequest(requestId);
      setRequest(res.data);
      const reviewRes = await getReviews({ request_id: requestId });
      const savedReviews = reviewRes.data?.results || reviewRes.data || [];
      setReview(Array.isArray(savedReviews) ? savedReviews[0] || null : savedReviews);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const resume = Array.isArray(resumePayment) ? resumePayment[0] : resumePayment;
    const pendingOffer = Array.isArray(routeOfferId) ? routeOfferId[0] : routeOfferId;
    if (resume === "1" && pendingOffer && request?.status === "ASSIGNED") {
      openPaymentFlow(pendingOffer, false);
    }
  }, [resumePayment, routeOfferId, request?.status]);

  const payNow = async (offerId: string) => {
    setPaying(offerId);
    try {
      const intent = await createPaymentIntent({ offer: offerId, method: "CARD" });
      await confirmPayment(intent.data.id, { status: "PAID" });
      setPaymentModalVisible(false);
      showToast("Payment completed.");
      await loadRequest();
    } catch (err) {
      console.log(err);
      showToast("Payment failed.", "error");
    } finally {
      setPaying(null);
    }
  };

  const openPaymentFlow = async (offerId: string, showMissingMessage = true) => {
    setPaying(offerId);
    try {
      const method = await getPaymentMethod();
      setPaymentMethod(method.data);
      setPendingPaymentOfferId(offerId);
      setPaymentModalVisible(true);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        if (showMissingMessage) {
          showToast("No payment method found. Please add a payment method first.", "error");
        }
        router.push({
          pathname: "/(client-tabs)/profile" as any,
          params: { paymentFlow: "1", returnRequestId: requestId || "", offerId },
        });
        return;
      }
      console.log(err);
      showToast("Unable to load payment method.", "error");
    } finally {
      setPaying(null);
    }
  };

  const submitReview = async () => {
    if (!requestId) return;
    setSubmittingReview(true);
    try {
      await createReview({ request: requestId, rating, comment: comment.trim() });
      setReviewVisible(false);
      showToast("Review submitted.");
      await loadRequest();
    } catch (err: any) {
      console.log(err?.response?.data || err);
      showToast("Could not submit review.", "error");
    } finally {
      setSubmittingReview(false);
    }
  };

  const acceptedOffer = (request?.offers || []).find((offer: any) => offer.status === "ACCEPTED");
  const assignedArtisan = request?.assigned_artisan;
  const assignedProfile = request?.assigned_artisan_profile;
  const detailUser = role === "ARTISAN" ? request?.client : assignedArtisan;
  const detailProfile = role === "ARTISAN" ? request?.client_profile : assignedProfile;
  const detailLabel = role === "ARTISAN" ? "Client" : "Artisan";

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
            <Text style={commonStyles.title}>{request?.service_name || "Request"}</Text>
            <Text style={commonStyles.subtitle}><Ionicons name="time-outline" size={14} /> {formatDateTime(request?.created_at)}</Text>

            <View style={[commonStyles.card, styles.card]}>
              <Status status={request?.status} />
              <Info icon="document-text-outline" label="Description" value={request?.description} />
              <Info icon="location-outline" label="Location" value={request?.address} />
              <Info icon="calendar-outline" label="Date" value={formatDateTime(request?.created_at)} />
            </View>

            {detailUser ? (
              <TouchableOpacity
                style={[commonStyles.card, styles.userCard]}
                onPress={() => detailUser?.id && router.push({ pathname: "/profile/[id]" as any, params: { id: detailUser.id } })}
              >
                <ProfileAvatar profile={detailProfile || detailUser} size={56} />
                <View style={styles.userText}>
                  <Text style={styles.label}>{detailLabel}</Text>
                  <Text style={styles.userName}>{displayName(detailUser)}</Text>
                  <Text style={styles.meta}>{role === "ARTISAN" ? detailProfile?.address || request?.address || "Client address" : detailProfile?.category?.name || "Artisan"}</Text>
                  {role === "ARTISAN" ? null : <StarRating value={detailProfile?.rating} />}
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.muted} />
              </TouchableOpacity>
            ) : null}

            {request?.status === "ASSIGNED" && acceptedOffer ? (
              <View style={styles.paymentCard}>
                <View style={styles.paymentIconWrap}>
                  <Ionicons name="card" size={24} color={theme.primary} />
                </View>
                <View style={styles.paymentCopy}>
                  <Text style={styles.paymentTitle}>Payment Ready</Text>
                  <Text style={styles.paymentText}>Secure this assigned request and complete the order.</Text>
                </View>
                <TouchableOpacity disabled={paying === acceptedOffer.id} style={[styles.payButton, paying === acceptedOffer.id && commonStyles.disabled]} onPress={() => openPaymentFlow(acceptedOffer.id)}>
                  {paying === acceptedOffer.id ? <ActivityIndicator color="#fff" /> : <Ionicons name="card-outline" size={18} color="#fff" />}
                  <Text style={styles.payButtonText}>Pay Now</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {review ? <ReviewCard review={review} /> : null}

            {request?.status === "COMPLETED" && !review ? (
              <TouchableOpacity style={commonStyles.primaryButton} onPress={() => setReviewVisible(true)}>
                <Ionicons name="star-outline" size={18} color="#fff" />
                <Text style={commonStyles.primaryButtonText}>Leave Review</Text>
              </TouchableOpacity>
            ) : null}

            <Modal visible={reviewVisible} transparent animationType="fade" onRequestClose={() => setReviewVisible(false)}>
              <View style={styles.modalBackdrop}>
                <View style={styles.modalCard}>
                  <Text style={styles.modalTitle}>Leave Review</Text>
                  <View style={styles.stars}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity key={star} onPress={() => setRating(star)}>
                        <Ionicons name={rating >= star ? "star" : "star-outline"} size={28} color="#f59e0b" />
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput placeholder="Comment" multiline value={comment} onChangeText={setComment} style={[commonStyles.input, styles.commentInput]} />
                  <View style={styles.modalActions}>
                    <TouchableOpacity style={styles.secondaryButton} onPress={() => setReviewVisible(false)}>
                      <Text style={styles.secondaryText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity disabled={submittingReview} style={[commonStyles.primaryButton, styles.modalSubmit, submittingReview && commonStyles.disabled]} onPress={submitReview}>
                      {submittingReview ? <ActivityIndicator color="#fff" /> : <Ionicons name="send-outline" size={18} color="#fff" />}
                      <Text style={commonStyles.primaryButtonText}>Submit</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>

            <Modal visible={paymentModalVisible} transparent animationType="fade" onRequestClose={() => setPaymentModalVisible(false)}>
              <View style={styles.modalBackdrop}>
                <View style={styles.modalCard}>
                  <View style={styles.paymentModalHeader}>
                    <View style={styles.paymentModalIcon}>
                      <Ionicons name="card-outline" size={24} color={theme.primary} />
                    </View>
                    <View style={styles.infoText}>
                      <Text style={styles.modalTitle}>Confirm Payment</Text>
                      <Text style={styles.paymentText}>Your saved card will be charged for this accepted offer.</Text>
                    </View>
                  </View>
                  <View style={styles.savedCard}>
                    <Text style={styles.label}>Payment Method</Text>
                    <Text style={styles.cardHolder}>{paymentMethod?.card_holder_name || "Saved card"}</Text>
                    <Text style={styles.cardNumber}>{maskCard(paymentMethod?.card_number)}</Text>
                  </View>
                  <View style={styles.modalActions}>
                    <TouchableOpacity style={styles.secondaryButton} onPress={() => setPaymentModalVisible(false)}>
                      <Text style={styles.secondaryText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      disabled={!pendingPaymentOfferId || paying === pendingPaymentOfferId}
                      style={[commonStyles.primaryButton, styles.modalSubmit, (!pendingPaymentOfferId || paying === pendingPaymentOfferId) && commonStyles.disabled]}
                      onPress={() => pendingPaymentOfferId && payNow(pendingPaymentOfferId)}
                    >
                      {pendingPaymentOfferId && paying === pendingPaymentOfferId ? <ActivityIndicator color="#fff" /> : <Ionicons name="lock-closed-outline" size={18} color="#fff" />}
                      <Text style={commonStyles.primaryButtonText}>Confirm</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function maskCard(cardNumber?: string) {
  const digits = String(cardNumber || "").replace(/\D/g, "");
  return digits.length >= 4 ? `**** **** **** ${digits.slice(-4)}` : "Saved card";
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
  const normalized = status || "OPEN";
  const badgeStyle = normalized === "COMPLETED" ? styles.completedBadge : normalized === "ASSIGNED" ? styles.assignedBadge : styles.openBadge;
  const textStyle = normalized === "COMPLETED" ? styles.completedText : normalized === "ASSIGNED" ? styles.assignedText : styles.openText;
  return (
    <View style={[styles.statusPill, badgeStyle]}>
      <Text style={[styles.statusText, textStyle]}>{normalized}</Text>
    </View>
  );
}

function ReviewCard({ review }: { review: any }) {
  return (
    <View style={[commonStyles.card, styles.reviewCard]}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewStars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons key={star} name={review.rating >= star ? "star" : "star-outline"} size={17} color="#f59e0b" />
          ))}
        </View>
        <Text style={styles.reviewDate}>{formatDateTime(review.created_at)}</Text>
      </View>
      <Text style={styles.body}>{review.comment || "No comment"}</Text>
      <FraudBadge score={Number(review.fake_score || 0)} />
    </View>
  );
}

function FraudBadge({ score }: { score: number }) {
  if (score > 0.7) {
    return (
      <View style={[styles.fraudBadge, styles.fraudHigh]}>
        <Text style={[styles.fraudText, styles.fraudHighText]}>Suspicious review</Text>
      </View>
    );
  }

  if (score > 0.4) {
    return (
      <View style={[styles.fraudBadge, styles.fraudMedium]}>
        <Text style={[styles.fraudText, styles.fraudMediumText]}>Possibly suspicious</Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 40 },
  back: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 14 },
  backText: { color: theme.primary, fontWeight: "900" },
  card: { gap: 10, marginBottom: 12 },
  info: { flexDirection: "row", gap: 10 },
  infoText: { flex: 1, gap: 2 },
  label: { color: theme.muted, fontWeight: "800", fontSize: 12 },
  body: { color: theme.text, lineHeight: 20 },
  userCard: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  userText: { flex: 1 },
  userName: { color: theme.text, fontWeight: "900" },
  meta: { color: theme.muted, fontWeight: "700" },
  reviewCard: { gap: 8, marginBottom: 12 },
  reviewHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  reviewStars: { flexDirection: "row", gap: 2 },
  reviewDate: { color: theme.muted, fontWeight: "700", fontSize: 12 },
  fraudBadge: { alignSelf: "flex-start", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  fraudHigh: { backgroundColor: "#fee2e2" },
  fraudMedium: { backgroundColor: "#fef3c7" },
  fraudText: { fontWeight: "900", fontSize: 12 },
  fraudHighText: { color: "#b91c1c" },
  fraudMediumText: { color: "#92400e" },
  statusPill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignSelf: "flex-start" },
  statusText: { fontWeight: "900", fontSize: 12 },
  openBadge: { backgroundColor: "#fff7ed" },
  openText: { color: theme.accent },
  assignedBadge: { backgroundColor: "#eaf2ff" },
  assignedText: { color: theme.primary },
  completedBadge: { backgroundColor: "#e7f6ec" },
  completedText: { color: theme.success },
  paymentCard: { backgroundColor: "#ffffff", borderRadius: 8, borderWidth: 1, borderColor: "#c7d7ee", padding: 14, marginBottom: 14, flexDirection: "row", alignItems: "center", gap: 12, shadowColor: "#003f87", shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 4 },
  paymentIconWrap: { width: 46, height: 46, borderRadius: 8, backgroundColor: "#eaf2ff", alignItems: "center", justifyContent: "center" },
  paymentCopy: { flex: 1, gap: 3 },
  paymentTitle: { color: theme.text, fontWeight: "900", fontSize: 16 },
  paymentText: { color: theme.muted, fontWeight: "700", lineHeight: 18 },
  payButton: { minHeight: 44, borderRadius: 8, backgroundColor: theme.accent, paddingHorizontal: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7 },
  payButtonText: { color: "#ffffff", fontWeight: "900" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(16, 24, 40, 0.45)", justifyContent: "center", padding: 20 },
  modalCard: { backgroundColor: "#fff", borderRadius: 8, padding: 16, gap: 12 },
  modalTitle: { color: theme.text, fontSize: 18, fontWeight: "900" },
  paymentModalHeader: { flexDirection: "row", gap: 12, alignItems: "center" },
  paymentModalIcon: { width: 48, height: 48, borderRadius: 8, backgroundColor: "#eaf2ff", alignItems: "center", justifyContent: "center" },
  savedCard: { borderRadius: 8, borderWidth: 1, borderColor: theme.border, backgroundColor: "#f8fbff", padding: 12, gap: 4 },
  cardHolder: { color: theme.text, fontWeight: "900", fontSize: 16 },
  cardNumber: { color: theme.primary, fontWeight: "900", letterSpacing: 1 },
  stars: { flexDirection: "row", gap: 4 },
  commentInput: { minHeight: 90, textAlignVertical: "top" },
  modalActions: { flexDirection: "row", gap: 10 },
  secondaryButton: { flex: 1, minHeight: 48, borderRadius: 8, borderWidth: 1, borderColor: theme.border, alignItems: "center", justifyContent: "center" },
  secondaryText: { color: theme.text, fontWeight: "800" },
  modalSubmit: { flex: 1 },
});
