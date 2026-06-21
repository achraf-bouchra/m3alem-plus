import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, View } from "react-native";

import { theme } from "../constants/appTheme";
import { imageUrl } from "../services/format";

type RemoteImageProps = {
  sourceValue?: any;
  style?: any;
  resizeMode?: "cover" | "contain" | "stretch" | "repeat" | "center";
  placeholderIcon?: any;
  onError?: (error: any) => void;
};

export function RemoteImage({
  sourceValue,
  style,
  resizeMode = "cover",
  placeholderIcon = "person-outline",
  onError,
}: RemoteImageProps) {
  const [failed, setFailed] = useState(false);
  const uri = useMemo(() => imageUrl(sourceValue, ""), [sourceValue]);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  if (!uri || failed) {
    return (
      <View style={[styles.placeholder, style]}>
        <Ionicons name={placeholderIcon} size={28} color={theme.primary} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      resizeMode={resizeMode}
      style={style}
      onError={(event) => {
        console.log("[RemoteImage] image failed", uri, event.nativeEvent.error);
        setFailed(true);
        onError?.(event);
      }}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eaf2ff",
  },
});