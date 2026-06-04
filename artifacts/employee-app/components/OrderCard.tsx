import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { StatusBadge } from "./StatusBadge";

interface OrderCardProps {
  id: number;
  orderNumber: string;
  customerName?: string | null;
  status: string;
  totalAmount: number;
  createdAt: string;
  currency?: string;
}

export function OrderCard({
  id,
  orderNumber,
  customerName,
  status,
  totalAmount,
  createdAt,
  currency = "$",
}: OrderCardProps) {
  const colors = useColors();
  const router = useRouter();

  const dateStr = new Date(createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Pressable
      onPress={() => router.push(`/order/${id}`)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.left}>
          <Text style={[styles.number, { color: colors.primary }]}>{orderNumber}</Text>
          <Text style={[styles.customer, { color: colors.mutedForeground }]} numberOfLines={1}>
            {customerName ?? "Walk-in Customer"}
          </Text>
        </View>
        <View style={styles.right}>
          <Text style={[styles.amount, { color: colors.foreground }]}>
            {currency}{totalAmount.toFixed(2)}
          </Text>
          <Text style={[styles.date, { color: colors.mutedForeground }]}>{dateStr}</Text>
        </View>
      </View>
      <View style={styles.footer}>
        <StatusBadge status={status} />
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  left: { flex: 1, gap: 2, marginRight: 8 },
  right: { alignItems: "flex-end", gap: 2 },
  number: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  customer: { fontSize: 13, fontFamily: "Inter_400Regular" },
  amount: { fontSize: 15, fontFamily: "Inter_700Bold" },
  date: { fontSize: 12, fontFamily: "Inter_400Regular" },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
