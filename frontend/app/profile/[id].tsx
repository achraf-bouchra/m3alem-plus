import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ProfileAvatar, StarRating } from "../../components/ProfileBits";
import { commonStyles, theme } from "../../constants/appTheme";
import { getUserProfile } from "../../services/api";

export default function ProfileScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const userId = Array.isArray(id) ? id[0] : id;
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      if (!userId) return;
      setLoading(true);
      try {
        const res = await getUserProfile(userId);
        setProfile(res.data);
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [userId]);

  const isArtisan = profile?.user?.role === "ARTISAN";

  return (
    <SafeAreaView style={commonStyles.safe} edges={["top", "left", "right"]}>
      <View style={commonStyles.screen}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={theme.primary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : (
          <View style={[commonStyles.card, styles.card]}>
            <ProfileAvatar profile={profile} size={86} />
            <Text style={styles.name}>{profile?.user?.full_name || profile?.email || "Profile"}</Text>
            <Text style={styles.email}>{profile?.email}</Text>

            {isArtisan ? (
              <>
                <Text style={styles.profession}>{profile?.category?.name || "Artisan"}</Text>
                <Text style={styles.meta}><Ionicons name="construct-outline" size={14} /> {profile?.category?.name || "No category"}</Text>
                <StarRating value={profile?.rating} />
                <View style={styles.stats}>
                  <Stat label="Offers" value={profile?.number_of_offers ?? 0} />
                  <Stat label="Completed" value={profile?.completed_jobs ?? 0} />
                </View>
                {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
              </>
            ) : (
              <View style={styles.stats}>
                <Stat label="Requests" value={profile?.number_of_requests ?? 0} />
              </View>
            )}

            <Text style={styles.meta}><Ionicons name="call-outline" size={14} /> {profile?.phone || profile?.user?.phone || "No phone"}</Text>
            <Text style={styles.meta}><Ionicons name="location-outline" size={14} /> {profile?.address || "No address yet"}</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 14 },
  backText: { color: theme.primary, fontWeight: "900" },
  loader: { alignItems: "center", paddingTop: 30 },
  card: { alignItems: "center", gap: 9 },
  name: { color: theme.text, fontWeight: "900", fontSize: 20, textAlign: "center" },
  email: { color: theme.muted, fontWeight: "700" },
  profession: { color: theme.primary, fontWeight: "900" },
  meta: { color: theme.muted, textAlign: "center", fontWeight: "700" },
  bio: { color: theme.text, lineHeight: 20, textAlign: "center" },
  stats: { flexDirection: "row", gap: 10, marginVertical: 6 },
  stat: { minWidth: 96, borderRadius: 8, backgroundColor: "#f8fbff", borderWidth: 1, borderColor: theme.border, padding: 10, alignItems: "center" },
  statValue: { color: theme.text, fontWeight: "900", fontSize: 18 },
  statLabel: { color: theme.muted, fontWeight: "800", marginTop: 2 },
});
