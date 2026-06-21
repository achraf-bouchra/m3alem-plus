import { StyleSheet } from "react-native";

export const theme = {
  primary: "#003f87",
  accent: "#fd8b00",
  background: "#f4f7fb",
  surface: "#ffffff",
  text: "#101828",
  muted: "#667085",
  border: "#dde5ee",
  success: "#16803c",
  danger: "#b42318",
};

export const commonStyles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.background,
  },
  screen: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 80,
  },
  title: {
    color: theme.text,
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 6,
  },
  subtitle: {
    color: theme.muted,
    fontSize: 14,
    marginBottom: 16,
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 14,
    shadowColor: "#111827",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  emptyCard: {
    backgroundColor: theme.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
    alignItems: "center",
  },
  emptyText: {
    color: theme.muted,
    fontWeight: "600",
    textAlign: "center",
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: theme.accent,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 15,
  },
  disabled: {
    opacity: 0.45,
  },
  input: {
    backgroundColor: theme.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    color: theme.text,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
});
