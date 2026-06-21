import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

export const BACKEND_HOST = "192.168.1.4";
export const API_BASE_URL = "http://192.168.1.4:8000/api";
export const WS_BASE_URL = "ws://192.168.1.4:8000";

console.log("[API] baseURL:", API_BASE_URL);
console.log("[WS] baseURL:", WS_BASE_URL);

const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

API.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log("[API]", config.method?.toUpperCase(), `${API_BASE_URL}${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

export const getServices = () => API.get("/services/");
export const getCategories = () => API.get("/services/categories/");
export const register = (payload) => API.post("/register/", payload);
export const updateProfile = (payload) => API.put("/profile/update/", payload);
export const getRequests = () => API.get("/requests/");
export const getRequest = (id) => API.get(`/requests/${id}/`);
export const createRequest = (payload) => API.post("/requests/", payload);
export const getNearbyArtisans = (options) => {
  const { latitude, longitude, service_id, category_id } = options;
  return API.get("/requests/nearby/", {
    params: {
      lat: latitude,
      lng: longitude,
      ...(service_id ? { service_id } : {}),
      ...(category_id ? { category_id } : {}),
    },
  });
};
export const getOffers = () => API.get("/requests/offers/");
export const getOffer = (id) => API.get(`/requests/offers/${id}/`);
export const createOffer = (payload) => API.post("/requests/offers/", payload);
export const respondToOffer = (offerId, action) =>
  API.post(`/requests/offers/${offerId}/respond/`, { action });
export const createChatMessage = (payload) => API.post("/chat/messages/", payload);
export const getUserProfile = (userId) => API.get(`/accounts/users/${userId}/profile/`);
export const deactivateAccount = () => API.post("/accounts/users/deactivate/");
export const createPayment = (payload) => API.post("/payments/", payload);
export const createPaymentIntent = (payload) => API.post("/payments/create-intent/", payload);
export const confirmPayment = (paymentId, payload = {}) => API.post(`/payments/${paymentId}/confirm/`, payload);
export const getPaymentMethod = () => API.get("/payments/payment-method/");
export const savePaymentMethod = (payload) => API.post("/payments/payment-method/", payload);
export const createReview = (payload) => API.post("/reviews/", payload);
export const getReviews = (params = {}) => API.get("/reviews/", { params });

export const getWebSocketUrl = async (path) => {
  const token = await AsyncStorage.getItem("token");
  const separator = path.includes("?") ? "&" : "?";
  return `${WS_BASE_URL}${path}${token ? `${separator}token=${encodeURIComponent(token)}` : ""}`;
};

export const connectWebSocket = async (path, handlers = {}, options = {}) => {
  let socket;
  let closedByCaller = false;
  let reconnectTimer;
  const reconnectDelay = options.reconnectDelay ?? 2500;
  const reconnect = options.reconnect ?? false;

  const open = async () => {
    const url = await getWebSocketUrl(path);
    console.log("[WS] connecting:", url);
    socket = new WebSocket(url);

    socket.onopen = (event) => {
      console.log("[WS] connected:", path);
      handlers.onopen?.(event, socket);
    };

    socket.onmessage = (event) => {
      handlers.onmessage?.(event, socket);
    };

    socket.onerror = (event) => {
      console.log("[WS] error:", path, event?.message || event);
      handlers.onerror?.(event, socket);
    };

    socket.onclose = (event) => {
      console.log("[WS] closed:", path, event?.code, event?.reason || "");
      handlers.onclose?.(event, socket);
      if (!closedByCaller && reconnect) {
        reconnectTimer = setTimeout(open, reconnectDelay);
      }
    };
  };

  await open();

  return {
    get current() {
      return socket;
    },
    close() {
      closedByCaller = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    },
    send(data) {
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(data);
        return true;
      }
      return false;
    },
  };
};

export default API;
