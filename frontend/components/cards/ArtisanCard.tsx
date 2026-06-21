import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

import { RemoteImage } from "../RemoteImage";

type Artisan = {
  id: string;
  name: string;
  job: string;
  distance: string;
  rating: number;
  available: boolean;
  image: string;
};

export default function ArtisanCard({ artisan }: { artisan: Artisan }) {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        router.push({
          pathname: "/artisan/[id]",
          params: {
            id: artisan.id,
            name: artisan.name,
            job: artisan.job,
            distance: artisan.distance,
            rating: artisan.rating.toString(),
            available: artisan.available.toString(),
            image: artisan.image,
          },
        })
      }
    >
      <RemoteImage sourceValue={artisan.image} style={styles.image} placeholderIcon="person-outline" />

      <View style={styles.info}>
        <Text style={styles.name}>{artisan.name}</Text>
        <Text style={styles.job}>{artisan.job}</Text>
        <Text style={styles.distance}>Ã°Å¸â€œÂ {artisan.distance}</Text>

        <View style={styles.row}>
          <Text style={styles.rating}>Ã¢Â­Â {artisan.rating}</Text>
          <Text
            style={[
              styles.status,
              { color: artisan.available ? "green" : "red" },
            ]}
          >
            {artisan.available ? "Available" : "Busy"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 14,
    marginHorizontal: 20,
    marginBottom: 12,
    elevation: 3,
  },

  image: {
    width: 70,
    height: 70,
    borderRadius: 12,
    marginRight: 12,
  },

  info: {
    flex: 1,
    justifyContent: "center",
  },

  name: {
    fontSize: 16,
    fontWeight: "bold",
  },

  job: {
    color: "gray",
  },

  distance: {
    fontSize: 12,
    color: "#555",
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },

  rating: {
    fontWeight: "bold",
  },

  status: {
    fontWeight: "bold",
  },
});
