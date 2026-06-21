import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { theme } from "../constants/appTheme";
import { imageUrl } from "../services/format";

export function ProfileAvatar({ profile, size = 48 }: { profile?: any; size?: number }) {
  const [failed, setFailed] = useState(false);
  const uri = useMemo(() => imageUrl(profile, ""), [profile]);
  const imageStyle = { width: size, height: size, borderRadius: size / 2 };

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  return (
    <View style={[styles.avatar, imageStyle]}>
      {uri && !failed ? (
        <Image
          source={{ uri }}
          resizeMode="cover"
          style={imageStyle}
          onError={(event) => {
            console.log("[ProfileAvatar] image failed", uri, event.nativeEvent.error);
            setFailed(true);
          }}
        />
      ) : (
        <Ionicons name="person-outline" size={Math.max(20, size * 0.48)} color={theme.primary} />
      )}
    </View>
  );
}

export function StarRating({ value = 0 }: { value?: number }) {
  const rating = Math.max(0, Math.min(5, Number(value) || 0));
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Ionicons
          key={star}
          name={rating >= star ? "star" : rating >= star - 0.5 ? "star-half" : "star-outline"}
          size={16}
          color="#f59e0b"
        />
      ))}
      <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: "#eaf2ff",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  stars: { flexDirection: "row", alignItems: "center", gap: 2 },
  ratingText: { color: theme.muted, fontWeight: "800", marginLeft: 4 },
});