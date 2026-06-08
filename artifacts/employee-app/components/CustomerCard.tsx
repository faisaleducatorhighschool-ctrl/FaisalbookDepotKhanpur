import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface CustomerCardProps {
  id: number;
  name: string;
  phone: string;
  balance: number;
  totalOrders: number;
  currency?: string;
}

export function CustomerCard({ id, name, phone, balance, totalOrders, currency = "$" }: CustomerCardProps) {
  const colors = useColors();
  const router = useRouter();
  const initial = name.charAt(0).toUpperCase();

  return (
    <Pressable
      onPress={() => router.push(`/customer/${id}`)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
        <Text style={[styles.initial, { color: colors.primaryForeground }]}>{initial}</Text>
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>{name}</Text>
        <Text style={[styles.phone, { color: colors.mutedForeground }]}>{phone}</Text>
      </View>
      <View style={styles.meta}>
        <Text style={[styles.balance, { color: balance < 0 ? colors.destructive : colors.foreground }]}>
          {balance < 0 ? "-" : ""}{currency}{Math.abs(balance).toFixed(2)}
        </Text>
        <Text style={[styles.orders, { color: colors.mutedForeground }]}>{totalOrders} orders</Text>
      </View>
      <Feather name="chevron-right" size={16} color={colors.mutedForeground} style={{ marginLeft: 4 }} />
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
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  initial: { fontSize: 16, fontFamily: "Inter_700Bold" },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  phone: { fontSize: 12, fontFamily: "Inter_400Regular" },
  meta: { alignItems: "flex-end", gap: 2 },
  balance: { fontSize: 14, fontFamily: "Inter_700Bold" },
  orders: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
