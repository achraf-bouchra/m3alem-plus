import { Alert, Platform, ToastAndroid } from "react-native";

export const showToast = (message, type = "info") => {
  if (Platform.OS === "android") {
    ToastAndroid.show(message, ToastAndroid.SHORT);
    return;
  }

  Alert.alert(type === "error" ? "Error" : "Success", message);
};
