import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, KeyboardTypeOptions, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ProfileAvatar } from "../../components/ProfileBits";
import { commonStyles, theme } from "../../constants/appTheme";
import useAuth from "../../hooks/useAuth";
import API, { deactivateAccount, getRequests, savePaymentMethod, updateProfile } from "../../services/api";
import { displayName } from "../../services/format";
import { showToast } from "../../services/toast";

export default function Profile() {
  const router = useRouter();
  const { paymentFlow, returnRequestId, offerId } = useLocalSearchParams();
  const { logout } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [updateVisible, setUpdateVisible] = useState(false);
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", phone: "", address: "" });
  const [paymentForm, setPaymentForm] = useState({ card_holder_name: "", card_number: "", expiry_date: "", cvv: "" });
  const [paymentErrors, setPaymentErrors] = useState<Record<string, string>>({});

  const applyProfile = (data: any) => {
    setProfile(data);
    setForm({
      first_name: data?.user?.first_name || "",
      last_name: data?.user?.last_name || "",
      phone: data?.phone || data?.user?.phone || "",
      address: data?.address || "",
    });
  };

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const [profileResponse, requestsResponse] = await Promise.all([
        API.get("/accounts/client-profiles/me/"),
        getRequests(),
      ]);
      applyProfile(profileResponse.data);
      setRequests(Array.isArray(requestsResponse.data) ? requestsResponse.data : []);
    } catch (error) {
      console.log("[ClientProfile] load failed", error);
      showToast("Unable to load profile", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const offersReceived = useMemo(
    () => requests.reduce((total, request) => total + (Array.isArray(request?.offers) ? request.offers.length : 0), 0),
    [requests]
  );

  useEffect(() => {
    const shouldOpenPayment = (Array.isArray(paymentFlow) ? paymentFlow[0] : paymentFlow) === "1";
    if (shouldOpenPayment) {
      setPaymentVisible(true);
    }
  }, [paymentFlow]);

  const openUpdate = () => {
    setDrawerVisible(false);
    setUpdateVisible(true);
  };

  const openPaymentMethod = () => {
    setDrawerVisible(false);
    setPaymentVisible(true);
  };

  const validatePayment = () => {
    const digits = paymentForm.card_number.replace(/\D/g, "");
    const nextErrors: Record<string, string> = {};
    if (!paymentForm.card_holder_name.trim()) nextErrors.card_holder_name = "Card holder name is required.";
    if (digits.length < 12) nextErrors.card_number = "Enter a valid card number.";
    if (!/^\d{2}\/\d{2}$/.test(paymentForm.expiry_date.trim())) nextErrors.expiry_date = "Use MM/YY format.";
    if (!/^\d{3,4}$/.test(paymentForm.cvv.trim())) nextErrors.cvv = "Enter a valid CVV.";
    setPaymentErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const saveClientPaymentMethod = async () => {
    if (!validatePayment()) return;
    setSavingPayment(true);
    try {
      await savePaymentMethod({
        card_holder_name: paymentForm.card_holder_name.trim(),
        card_number: paymentForm.card_number.replace(/\s/g, ""),
        expiry_date: paymentForm.expiry_date.trim(),
        cvv: paymentForm.cvv.trim(),
      });
      setPaymentVisible(false);
      showToast("Payment method saved");
      const requestToResume = Array.isArray(returnRequestId) ? returnRequestId[0] : returnRequestId;
      const offerToResume = Array.isArray(offerId) ? offerId[0] : offerId;
      if (requestToResume && offerToResume) {
        router.replace({
          pathname: "/request-details" as any,
          params: { id: requestToResume, resumePayment: "1", offerId: offerToResume },
        });
      }
    } catch (error: any) {
      console.log("[ClientProfile] payment method save failed", error?.response?.data || error);
      showToast("Unable to save payment method", "error");
    } finally {
      setSavingPayment(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const response = await updateProfile({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
      });
      applyProfile(response.data);
      setUpdateVisible(false);
      showToast("Profile updated");
    } catch (error) {
      console.log("[ClientProfile] update failed", error);
      showToast("Unable to update profile", "error");
    } finally {
      setSaving(false);
    }
  };

  const pickProfileImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast("Photo library permission is required", "error");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    const formData = new FormData();
    formData.append("profile_image", {
      uri: asset.uri,
      name: asset.fileName || "profile.png",
      type: asset.mimeType || "image/png",
    } as any);

    setSaving(true);
    try {
      const response = await updateProfile(formData);
      applyProfile(response.data);
      showToast("Profile image updated");
    } catch (error) {
      console.log("[ClientProfile] image update failed", error);
      showToast("Unable to update image", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    setDrawerVisible(false);
    await logout();
    router.replace("/");
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await deactivateAccount();
      await logout();
      router.replace("/");
    } catch (error) {
      console.log("[ClientProfile] delete account failed", error);
      showToast("Unable to delete account", "error");
    } finally {
      setDeleting(false);
    }
  };

  const confirmDeleteAccount = () => {
    setDrawerVisible(false);
    Alert.alert("Delete Account", "Are you sure? This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: deleteAccount },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={commonStyles.safe}>
        <View style={styles.centered}><ActivityIndicator color={theme.primary} /></View>
      </SafeAreaView>
    );
  }

  const user = profile?.user;

  return (
    <SafeAreaView style={commonStyles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.menuButton} onPress={() => setDrawerVisible(true)}>
          <Ionicons name="menu" size={26} color={theme.primary} />
        </TouchableOpacity>

        <View style={styles.heroCard}>
          <ProfileAvatar profile={profile} size={112} />
          <Text style={styles.name}>{displayName(user)}</Text>
          <Text style={styles.email}>{user?.email || "Email unavailable"}</Text>
        </View>

        <View style={commonStyles.card}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <InfoRow icon="person-outline" label="First name" value={user?.first_name || "Not set"} />
          <InfoRow icon="person-outline" label="Last name" value={user?.last_name || "Not set"} />
          <InfoRow icon="mail-outline" label="Email" value={user?.email || "Not set"} />
          <InfoRow icon="call-outline" label="Phone number" value={profile?.phone || user?.phone || "Not set"} />
        </View>

        <View style={commonStyles.card}>
          <Text style={styles.sectionTitle}>Location Information</Text>
          <InfoRow icon="location-outline" label="Address" value={profile?.address || "Not set"} />
          <InfoRow icon="navigate-outline" label="Latitude" value={formatCoord(profile?.latitude)} />
          <InfoRow icon="navigate-outline" label="Longitude" value={formatCoord(profile?.longitude)} />
        </View>

        <View style={styles.paymentCard}>
          <View style={styles.paymentCardHeader}>
            <View style={styles.paymentIcon}>
              <Ionicons name="card-outline" size={22} color={theme.primary} />
            </View>
            <View style={styles.infoTextWrap}>
              <Text style={styles.sectionTitle}>Payment Method</Text>
              <Text style={styles.paymentHint}>Save a card for assigned request payments.</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.secondaryButton} onPress={openPaymentMethod}>
            <Ionicons name="add-circle-outline" size={18} color={theme.primary} />
            <Text style={styles.secondaryText}>Add or Update Card</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          <StatCard icon="document-text-outline" label="Requests" value={requests.length} />
          <StatCard icon="mail-open-outline" label="Offers Received" value={offersReceived} />
        </View>
      </ScrollView>

      <Drawer visible={drawerVisible} onClose={() => setDrawerVisible(false)}>
        <View style={styles.drawerTopSection}>
          <DrawerItem icon="create-outline" label="Update Profile" onPress={openUpdate} />
          <DrawerItem icon="card-outline" label="Payment Method" onPress={openPaymentMethod} />
          <DrawerItem icon="log-out-outline" label="Logout" danger onPress={handleLogout} />
        </View>
        <View style={styles.drawerBottomSection}>
          <View style={styles.drawerDivider} />
          <DrawerItem icon="trash-outline" label="Delete Account" danger onPress={confirmDeleteAccount} loading={deleting} />
        </View>
      </Drawer>

      <Modal visible={updateVisible} transparent animationType="fade" onRequestClose={() => setUpdateVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Profile</Text>
              <TouchableOpacity style={styles.iconButton} onPress={() => setUpdateVisible(false)}>
                <Ionicons name="close" size={22} color={theme.text} />
              </TouchableOpacity>
            </View>
            <TextInput placeholder="First name" value={form.first_name} onChangeText={(value) => setForm((current) => ({ ...current, first_name: value }))} style={commonStyles.input} />
            <TextInput placeholder="Last name" value={form.last_name} onChangeText={(value) => setForm((current) => ({ ...current, last_name: value }))} style={commonStyles.input} />
            <TextInput placeholder="Phone" value={form.phone} onChangeText={(value) => setForm((current) => ({ ...current, phone: value }))} style={commonStyles.input} />
            <TextInput placeholder="Address" value={form.address} onChangeText={(value) => setForm((current) => ({ ...current, address: value }))} style={commonStyles.input} />
            <TouchableOpacity style={styles.secondaryButton} onPress={pickProfileImage} disabled={saving}>
              <Ionicons name="camera-outline" size={18} color={theme.primary} />
              <Text style={styles.secondaryText}>Change Profile Image</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[commonStyles.primaryButton, saving && commonStyles.disabled]} onPress={saveProfile} disabled={saving}>
              {saving ? <ActivityIndicator color="#ffffff" /> : <Ionicons name="save-outline" size={18} color="#ffffff" />}
              <Text style={commonStyles.primaryButtonText}>{saving ? "Saving..." : "Save"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={paymentVisible} transparent animationType="fade" onRequestClose={() => setPaymentVisible(false)}>
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.paymentKeyboardWrap}>
            <View style={[styles.modalCard, styles.paymentModalCard]}>
              <ScrollView contentContainerStyle={styles.paymentModalContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.modalHeader}>
                  <View style={styles.paymentTitleRow}>
                    <View style={styles.paymentIcon}>
                      <Ionicons name="card" size={22} color={theme.primary} />
                    </View>
                    <View style={styles.paymentTitleCopy}>
                      <Text style={styles.modalTitle}>Payment Method</Text>
                      <Text style={styles.paymentHint}>No payment method found. Please add a payment method first.</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.iconButton} onPress={() => setPaymentVisible(false)}>
                    <Ionicons name="close" size={22} color={theme.text} />
                  </TouchableOpacity>
                </View>
                <PaymentInput
                  icon="person-outline"
                  placeholder="Card Holder Name"
                  value={paymentForm.card_holder_name}
                  error={paymentErrors.card_holder_name}
                  onChangeText={(value) => setPaymentForm((current) => ({ ...current, card_holder_name: value }))}
                />
                <PaymentInput
                  icon="card-outline"
                  placeholder="Card Number"
                  value={paymentForm.card_number}
                  error={paymentErrors.card_number}
                  keyboardType="number-pad"
                  onChangeText={(value) => setPaymentForm((current) => ({ ...current, card_number: value }))}
                />
                <View style={styles.paymentSplit}>
                  <PaymentInput
                    icon="calendar-outline"
                    placeholder="Expiry Date"
                    value={paymentForm.expiry_date}
                    error={paymentErrors.expiry_date}
                    keyboardType="number-pad"
                    onChangeText={(value) => setPaymentForm((current) => ({ ...current, expiry_date: value }))}
                  />
                  <PaymentInput
                    icon="lock-closed-outline"
                    placeholder="CVV"
                    value={paymentForm.cvv}
                    error={paymentErrors.cvv}
                    keyboardType="number-pad"
                    secureTextEntry
                    onChangeText={(value) => setPaymentForm((current) => ({ ...current, cvv: value }))}
                  />
                </View>
                <TouchableOpacity style={[commonStyles.primaryButton, savingPayment && commonStyles.disabled]} onPress={saveClientPaymentMethod} disabled={savingPayment}>
                  {savingPayment ? <ActivityIndicator color="#ffffff" /> : <Ionicons name="shield-checkmark-outline" size={18} color="#ffffff" />}
                  <Text style={commonStyles.primaryButtonText}>{savingPayment ? "Saving..." : "Save Payment Method"}</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function formatCoord(value: any) {
  if (value === null || value === undefined || value === "") return "Not set";
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(6) : String(value);
}

function StatCard({ icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <View style={[commonStyles.card, styles.statCard]}>
      <Ionicons name={icon} size={22} color={theme.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={19} color={theme.primary} />
      <View style={styles.infoTextWrap}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function PaymentInput({
  icon,
  error,
  style,
  placeholder,
  value,
  onChangeText,
  keyboardType,
  secureTextEntry,
}: {
  icon: any;
  error?: string;
  style?: ViewStyle;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
}) {
  return (
    <View style={[styles.paymentField, style]}>
      <View style={[styles.paymentInputWrap, error && styles.inputError]}>
        <Ionicons name={icon} size={18} color={error ? theme.danger : theme.primary} />
        <TextInput
          placeholder={placeholder}
          placeholderTextColor="#98a2b3"
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          style={styles.paymentInput}
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

function Drawer({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: any }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.drawerLayer}>
        <TouchableOpacity style={styles.drawerScrim} activeOpacity={1} onPress={onClose} />
        <View style={styles.drawerPanel}>
          <Text style={styles.drawerTitle}>Menu</Text>
          <View style={styles.drawerContent}>{children}</View>
        </View>
      </View>
    </Modal>
  );
}

function DrawerItem({ icon, label, onPress, danger, loading }: { icon: any; label: string; onPress: () => void; danger?: boolean; loading?: boolean }) {
  return (
    <TouchableOpacity style={[styles.drawerItem, danger && styles.drawerDangerItem]} onPress={onPress} disabled={loading}>
      {loading ? <ActivityIndicator color={theme.danger} /> : <Ionicons name={icon} size={20} color={danger ? theme.danger : theme.primary} />}
      <Text style={[styles.drawerItemText, danger && styles.drawerItemDanger]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 96, gap: 14 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  menuButton: { width: 44, height: 44, borderRadius: 8, backgroundColor: "#ffffff", borderWidth: 1, borderColor: theme.border, alignItems: "center", justifyContent: "center" },
  heroCard: { ...commonStyles.card, alignItems: "center", gap: 8, paddingVertical: 22 },
  name: { color: theme.text, fontSize: 22, fontWeight: "900", textAlign: "center" },
  email: { color: theme.muted, fontWeight: "700", textAlign: "center" },
  sectionTitle: { color: theme.text, fontSize: 16, fontWeight: "900", marginBottom: 6 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: theme.border },
  infoTextWrap: { flex: 1 },
  infoLabel: { color: theme.muted, fontSize: 12, fontWeight: "800" },
  infoValue: { color: theme.text, fontSize: 15, fontWeight: "800", marginTop: 2 },
  statsGrid: { flexDirection: "row", gap: 12 },
  statCard: { flex: 1, alignItems: "center", gap: 4, minHeight: 112, justifyContent: "center" },
  statValue: { color: theme.text, fontSize: 24, fontWeight: "900" },
  statLabel: { color: theme.muted, fontSize: 12, fontWeight: "800", textAlign: "center" },
  drawerLayer: { flex: 1, flexDirection: "row" },
  drawerScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(16, 24, 40, 0.42)" },
  drawerPanel: { width: 282, maxWidth: "82%", backgroundColor: "#ffffff", paddingTop: 58, paddingHorizontal: 16, paddingBottom: 22, shadowColor: "#111827", shadowOpacity: 0.18, shadowRadius: 18, elevation: 8 },
  drawerTitle: { color: theme.text, fontSize: 22, fontWeight: "900", marginBottom: 14 },
  drawerContent: { flex: 1, justifyContent: "space-between" },
  drawerTopSection: { gap: 10 },
  drawerBottomSection: { gap: 12 },
  drawerDivider: { height: 1, backgroundColor: theme.border },
  drawerItem: { minHeight: 48, borderRadius: 8, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 10, backgroundColor: "#f8fbff" },
  drawerDangerItem: { backgroundColor: "#fff5f5" },
  drawerItemText: { color: theme.text, fontWeight: "900" },
  drawerItemDanger: { color: theme.danger },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(16, 24, 40, 0.45)", justifyContent: "center", padding: 18 },
  modalCard: { backgroundColor: "#ffffff", borderRadius: 8, padding: 16, gap: 12 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalTitle: { color: theme.text, fontSize: 18, fontWeight: "900" },
  iconButton: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#f2f4f7" },
  paymentCard: { ...commonStyles.card, gap: 12 },
  paymentCardHeader: { flexDirection: "row", gap: 12, alignItems: "center" },
  paymentIcon: { width: 42, height: 42, borderRadius: 8, backgroundColor: "#eaf2ff", alignItems: "center", justifyContent: "center" },
  paymentHint: { color: theme.muted, fontSize: 12, fontWeight: "700", lineHeight: 18 },
  paymentTitleRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  paymentTitleCopy: { flex: 1 },
  paymentKeyboardWrap: { width: "100%", maxHeight: "92%" },
  paymentModalCard: { maxHeight: "100%", padding: 0, overflow: "hidden" },
  paymentModalContent: { padding: 16, gap: 12, paddingBottom: 18 },
  paymentSplit: { flexDirection: "row", gap: 10 },
  paymentField: { flex: 1, gap: 5 },
  paymentInputWrap: { minHeight: 48, borderRadius: 8, borderWidth: 1, borderColor: theme.border, backgroundColor: "#f8fbff", paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 9 },
  paymentInput: { flex: 1, color: theme.text, fontWeight: "800", paddingVertical: 11 },
  inputError: { borderColor: theme.danger, backgroundColor: "#fff5f5" },
  errorText: { color: theme.danger, fontSize: 12, fontWeight: "800" },
  secondaryButton: { minHeight: 46, borderRadius: 8, borderWidth: 1, borderColor: theme.border, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  secondaryText: { color: theme.primary, fontWeight: "900" },
});
