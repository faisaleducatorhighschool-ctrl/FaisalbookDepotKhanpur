import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "primary" | "success" | "warning" | "destructive";
  icon?: React.ReactNode;
}

export function StatCard({ label, value, sub, accent = "primary", icon }: StatCardProps) {
  const colors = useColors();

  const accentColor =
    accent === "success"
      ? colors.success
      : accent === "warning"
        ? colors.warning
        : accent === "destructive"
          ? colors.destructive
          : colors.primary;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderLeftColor: accentColor,
        },
      ]}
    >
      <View style={styles.row}>
        <Text
          style={[styles.value, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {value}
        </Text>
        {icon && <View style={styles.icon}>{icon}</View>}
      </View>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      {sub ? (
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>{sub}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
    borderRadius: 10,
    borderWidth: 1,
    borderLeftWidth: 3,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  value: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    flexShrink: 1,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  sub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  icon: {
    marginLeft: 4,
  },
});
