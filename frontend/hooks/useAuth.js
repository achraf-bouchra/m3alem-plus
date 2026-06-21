import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function useAuth() {
  const [token, setToken] = useState(null);
  const [role, setRole] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const storedToken = await AsyncStorage.getItem("token");
      const storedRole = await AsyncStorage.getItem("role");
      const storedUserId = await AsyncStorage.getItem("userId");
      setToken(storedToken);
      setRole(storedRole);
      setUserId(storedUserId);
      setLoading(false);
    };

    init();
  }, []);

  const saveAuth = async (authToken, userRole, authUserId) => {
    await AsyncStorage.setItem("token", authToken);
    await AsyncStorage.setItem("role", userRole);
    await AsyncStorage.setItem("userId", authUserId || "");
    setToken(authToken);
    setRole(userRole);
    setUserId(authUserId || null);
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(["token", "role", "userId"]);
    setToken(null);
    setRole(null);
    setUserId(null);
  };

  return { token, role, userId, loading, saveAuth, logout };
}
