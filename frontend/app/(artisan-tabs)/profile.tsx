import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ProfileAvatar } from "../../components/ProfileBits";
import { commonStyles, theme } from "../../constants/appTheme";
import useAuth from "../../hooks/useAuth";
import API, { deactivateAccount, getOffers, updateProfile } from "../../services/api";
import { displayName } from "../../services/format";
import { showToast } from "../../services/toast";

export default function Profile() {
  const router = useRouter();
  const { logout } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [updateVisible, setUpdateVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingAvailability, setUpdatingAvailability] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", phone: "", address: "", bio: "" });
  const [bankVisible, setBankVisible] = useState(false);
  const [bankInfo, setBankInfo] = useState({ bank_name: "", account_holder: "", account_number: "", iban: "" });
  const [bankForm, setBankForm] = useState({ bank_name: "", account_holder: "", account_number: "", iban: "" });

  const applyProfile = (data: any) => {
    setProfile(data);
    setForm({
      first_name: data?.user?.first_name || "",
      last_name: data?.user?.last_name || "",
      phone: data?.phone || data?.user?.phone || "",
      address: data?.address || "",
      bio: data?.bio || "",
    });
  };

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const [profileResponse, offersResponse] = await Promise.all([
        API.get("/accounts/artisan-profiles/me/"),
        getOffers(),
      ]);
      applyProfile(profileResponse.data);
      setOffers(Array.isArray(offersResponse.data) ? offersResponse.data : []);
    } catch (error) {
      console.log("[ArtisanProfile] load failed", error);
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

  const totalOffers = useMemo(
    () => offers.filter((offer) => offer?.status === "PENDING" || offer?.status === "ACCEPTED").length,
    [offers]
  );

  const assignedJobs = useMemo(
    () => offers.filter((offer) => offer?.status === "ACCEPTED").length,
    [offers]
  );

  const incompletedJobs = useMemo(
    () => offers.filter((offer) => offer?.status === "ACCEPTED" && offer?.request_payment_status !== "PAID").length,
    [offers]
  );

  const updateAvailability = async (available: boolean) => {
    if (updatingAvailability) return;
    const previous = Boolean(profile?.available);
    setProfile((current: any) => ({ ...current, available }));
    setUpdatingAvailability(true);
    try {
      const response = await updateProfile({ available });
      applyProfile(response.data);
      showToast(available ? "You are available for new requests" : "You are unavailable for new requests");
    } catch (error) {
      console.log("[ArtisanProfile] availability update failed", error);
      setProfile((current: any) => ({ ...current, available: previous }));
      showToast("Unable to update availability", "error");
    } finally {
      setUpdatingAvailability(false);
    }
  };

  const openUpdate = () => {
    setDrawerVisible(false);
    setUpdateVisible(true);
  };

  const openBankInfo = () => {
    setDrawerVisible(false);
    setBankForm(bankInfo);
    setBankVisible(true);
  };

  const saveBankInfo = () => {
    setBankInfo({
      bank_name: bankForm.bank_name.trim(),
      account_holder: bankForm.account_holder.trim(),
      account_number: bankForm.account_number.trim(),
      iban: bankForm.iban.trim(),
    });
    setBankVisible(false);
    showToast("Bank information saved");
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const response = await updateProfile({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        bio: form.bio.trim(),
      });
      applyProfile(response.data);
      setUpdateVisible(false);
      showToast("Profile updated");
    } catch (error) {
      console.log("[ArtisanProfile] update failed", error);
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
      console.log("[ArtisanProfile] image update failed", error);
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
      console.log("[ArtisanProfile] delete account failed", error);
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
  const category = profile?.category?.name || "Category not set";
  const available = Boolean(profile?.available);

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
          <Text style={styles.categoryText}>{category}</Text>
        </View>

        <View style={commonStyles.card}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <InfoRow icon="person-outline" label="First name" value={user?.first_name || "Not set"} />
          <InfoRow icon="person-outline" label="Last name" value={user?.last_name || "Not set"} />
          <InfoRow icon="mail-outline" label="Email" value={user?.email || "Not set"} />
          <InfoRow icon="call-outline" label="Phone number" value={profile?.phone || user?.phone || "Not set"} />
          <InfoRow icon="construct-outline" label="Category" value={category} />
          <InfoRow icon="star-outline" label="Rating" value={formatRating(profile?.rating)} />
          <InfoRow icon="chatbubble-ellipses-outline" label="Total reviews" value={String(profile?.total_reviews ?? 0)} />
        </View>

        <View style={commonStyles.card}>
          <Text style={styles.sectionTitle}>Location Information</Text>
          <InfoRow icon="location-outline" label="Address" value={profile?.address || "Not set"} />
          <InfoRow icon="navigate-outline" label="Latitude" value={formatCoord(profile?.latitude)} />
          <InfoRow icon="navigate-outline" label="Longitude" value={formatCoord(profile?.longitude)} />
        </View>

        <View style={commonStyles.card}>
          <View style={styles.availabilityRow}>
            <View style={styles.availabilityTextWrap}>
              <Text style={styles.sectionTitle}>Availability</Text>
              <Text style={[styles.availabilityLabel, available ? styles.availableText : styles.unavailableText]}>
                {available ? "Available" : "Not Available"}
              </Text>
            </View>
            {updatingAvailability ? (
              <ActivityIndicator color={theme.primary} />
            ) : (
              <Switch
                value={available}
                onValueChange={updateAvailability}
                trackColor={{ false: "#d0d5dd", true: "#bfdbfe" }}
                thumbColor={available ? theme.primary : "#f4f4f5"}
              />
            )}
          </View>
        </View>

        <View style={styles.bankCard}>
          <View style={styles.bankHeader}>
            <View style={styles.bankIcon}>
              <Ionicons name="business-outline" size={23} color={theme.primary} />
            </View>
            <View style={styles.infoTextWrap}>
              <Text style={styles.sectionTitle}>Bank Information</Text>
              <Text style={styles.bankHint}>Frontend demo information only.</Text>
            </View>
            <TouchableOpacity style={styles.editBankButton} onPress={openBankInfo}>
              <Ionicons name="create-outline" size={17} color={theme.primary} />
              <Text style={styles.editBankText}>Edit</Text>
            </TouchableOpacity>
          </View>
          <InfoRow icon="business-outline" label="Bank Name" value={bankInfo.bank_name || "Not set"} />
          <InfoRow icon="person-outline" label="Account Holder" value={bankInfo.account_holder || "Not set"} />
          <InfoRow icon="keypad-outline" label="Account Number" value={maskAccount(bankInfo.account_number)} />
          <InfoRow icon="document-text-outline" label="IBAN" value={bankInfo.iban || "Not set"} />
        </View>

        <View style={styles.statsGrid}>
          <StatCard icon="mail-open-outline" label="Offers" value={totalOffers} />
          <StatCard icon="briefcase-outline" label="Assigned" value={assignedJobs} />
          <StatCard icon="alert-circle-outline" label="Incompleted" value={incompletedJobs} />
        </View>
      </ScrollView>

      <Drawer visible={drawerVisible} onClose={() => setDrawerVisible(false)}>
        <View style={styles.drawerTopSection}>
          <DrawerItem icon="create-outline" label="Update Profile" onPress={openUpdate} />
          <DrawerItem icon="business-outline" label="Bank Account Information" onPress={openBankInfo} />
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
            <TextInput placeholder="Bio" value={form.bio} onChangeText={(value) => setForm((current) => ({ ...current, bio: value }))} style={[commonStyles.input, styles.bioInput]} multiline />
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

      <Modal visible={bankVisible} transparent animationType="fade" onRequestClose={() => setBankVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.bankTitleRow}>
                <View style={styles.bankIcon}>
                  <Ionicons name="business" size={22} color={theme.primary} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Bank Account Information</Text>
                  <Text style={styles.bankHint}>Visual profile form for demonstration.</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.iconButton} onPress={() => setBankVisible(false)}>
                <Ionicons name="close" size={22} color={theme.text} />
              </TouchableOpacity>
            </View>
            <TextInput placeholder="Bank Name" value={bankForm.bank_name} onChangeText={(value) => setBankForm((current) => ({ ...current, bank_name: value }))} style={commonStyles.input} />
            <TextInput placeholder="Account Holder Name" value={bankForm.account_holder} onChangeText={(value) => setBankForm((current) => ({ ...current, account_holder: value }))} style={commonStyles.input} />
            <TextInput placeholder="Account Number" value={bankForm.account_number} onChangeText={(value) => setBankForm((current) => ({ ...current, account_number: value }))} style={commonStyles.input} keyboardType="number-pad" />
            <TextInput placeholder="IBAN" value={bankForm.iban} onChangeText={(value) => setBankForm((current) => ({ ...current, iban: value }))} style={commonStyles.input} autoCapitalize="characters" />
            <TouchableOpacity style={commonStyles.primaryButton} onPress={saveBankInfo}>
              <Ionicons name="save-outline" size={18} color="#ffffff" />
              <Text style={commonStyles.primaryButtonText}>Save Bank Information</Text>
            </TouchableOpacity>
          </View>
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

function formatRating(value: any) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(1) : "Not set";
}

function maskAccount(value: string) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "Not set";
  return digits.length > 4 ? `**** ${digits.slice(-4)}` : "****";
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
  categoryText: { color: theme.primary, fontWeight: "900", textAlign: "center" },
  sectionTitle: { color: theme.text, fontSize: 16, fontWeight: "900", marginBottom: 6 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: theme.border },
  infoTextWrap: { flex: 1 },
  infoLabel: { color: theme.muted, fontSize: 12, fontWeight: "800" },
  infoValue: { color: theme.text, fontSize: 15, fontWeight: "800", marginTop: 2 },
  availabilityRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 14 },
  availabilityTextWrap: { flex: 1 },
  availabilityLabel: { fontSize: 15, fontWeight: "900" },
  availableText: { color: theme.success },
  unavailableText: { color: theme.danger },
  bankCard: { ...commonStyles.card, gap: 2 },
  bankHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  bankIcon: { width: 42, height: 42, borderRadius: 8, backgroundColor: "#eaf2ff", alignItems: "center", justifyContent: "center" },
  bankHint: { color: theme.muted, fontSize: 12, fontWeight: "700", lineHeight: 18 },
  bankTitleRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  editBankButton: { minHeight: 38, borderRadius: 8, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#f8fbff" },
  editBankText: { color: theme.primary, fontWeight: "900" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: { width: "30%", minWidth: 96, flexGrow: 1, alignItems: "center", gap: 4, minHeight: 112, justifyContent: "center" },
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
  bioInput: { minHeight: 84, textAlignVertical: "top" },
  secondaryButton: { minHeight: 46, borderRadius: 8, borderWidth: 1, borderColor: theme.border, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  secondaryText: { color: theme.primary, fontWeight: "900" },
});
