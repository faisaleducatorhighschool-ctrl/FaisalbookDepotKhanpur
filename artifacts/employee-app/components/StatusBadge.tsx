import React from "react";
import { StyleSheet, Text } from "react-native";
import { useColors } from "@/hooks/useColors";

interface StatusBadgeProps {
  status: string;
}

const STATUS_MAP: Record<
  string,
  { bg: "successMuted" | "warningMuted" | "infoMuted" | "muted" | "destructive"; fg: "success" | "warning" | "info" | "mutedForeground" | "destructive" }
> = {
  completed: { bg: "successMuted", fg: "success" },
  delivered: { bg: "successMuted", fg: "success" },
  paid: { bg: "successMuted", fg: "success" },
  active: { bg: "successMuted", fg: "success" },
  "in-stock": { bg: "successMuted", fg: "success" },
  processing: { bg: "infoMuted", fg: "info" },
  shipped: { bg: "infoMuted", fg: "info" },
  pending: { bg: "warningMuted", fg: "warning" },
  draft: { bg: "warningMuted", fg: "warning" },
  "low-stock": { bg: "warningMuted", fg: "warning" },
  cancelled: { bg: "destructive", fg: "destructive" },
  returned: { bg: "destructive", fg: "destructive" },
  "out-of-stock": { bg: "destructive", fg: "destructive" },
  inactive: { bg: "muted", fg: "mutedForeground" },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const colors = useColors();
  const key = status.toLowerCase().replace(/\s+/g, "-");
  const mapping = STATUS_MAP[key] ?? { bg: "muted", fg: "mutedForeground" };

  const bg = (colors as unknown as Record<string, string>)[mapping.bg] ?? colors.muted;
  const fg = (colors as unknown as Record<string, string>)[mapping.fg] ?? colors.mutedForeground;

  return (
    <Text style={[styles.badge, { backgroundColor: bg, color: fg }]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Text>
  );
}

const styles = StyleSheet.create({
  badge: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
    overflow: "hidden",
    alignSelf: "flex-start",
    textTransform: "capitalize",
  },
});
