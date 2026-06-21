import { API_BASE_URL } from "./api";

export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");
const IMAGE_CACHE_TOKEN = Date.now();
export const DEFAULT_IMAGE_URL = `${API_ORIGIN}/media/profiles/default.png?t=${IMAGE_CACHE_TOKEN}`;

const isSupportedImage = (uri) => /\.(png|jpe?g)(\?|#|$)/i.test(String(uri || ""));

export const formatDateTime = (value) => {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date
    .toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    .replace(",", "");
};

export const displayName = (user) => {
  if (!user) return "User";
  return user.full_name || `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email || "User";
};

export const mediaUrl = (path, fallback = "") => {
  if (!path) return fallback;
  const raw = String(path);
  const absolute = raw.startsWith("http") ? raw : raw.startsWith("/") ? `${API_ORIGIN}${raw}` : `${API_ORIGIN}/${raw}`;
  if (!isSupportedImage(absolute)) return fallback;
  const separator = absolute.includes("?") ? "&" : "?";
  return `${absolute}${separator}t=${IMAGE_CACHE_TOKEN}`;
};

export const imageUrl = (source, fallback = DEFAULT_IMAGE_URL) => {
  const uri =
    typeof source === "string"
      ? source
      : source?.image ||
        source?.image_url ||
        source?.profile_image ||
        source?.profile_image_url ||
        null;
  return mediaUrl(uri, fallback);
};