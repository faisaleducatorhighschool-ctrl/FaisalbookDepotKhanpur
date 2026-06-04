import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface ProductCardProps {
  id: number;
  name: string;
  sku: string;
  stock: number;
  lowStockLimit: number;
  salePrice: number;
  categoryName?: string | null;
  currency?: string;
}

export function ProductCard({
  id,
  name,
  sku,
  stock,
  lowStockLimit,
  salePrice,
  categoryName,
  currency = "$",
}: ProductCardProps) {
  const colors = useColors();
  const router = useRouter();
  const isLow = stock <= lowStockLimit;
  const isOut = stock === 0;

  return (
    <Pressable
      onPress={() => router.push(`/product/${id}`)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <View style={styles.body}>
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={2}>
            {name}
          </Text>
          <Text style={[styles.sku, { color: colors.mutedForeground }]}>SKU: {sku}</Text>
          {categoryName ? (
            <Text style={[styles.cat, { color: colors.mutedForeground }]}>{categoryName}</Text>
          ) : null}
        </View>
        <View style={styles.meta}>
          <Text style={[styles.price, { color: colors.foreground }]}>
            {currency}{salePrice.toFixed(2)}
          </Text>
          <View
            style={[
              styles.stock,
              {
                backgroundColor: isOut
                  ? colors.destructive
                  : isLow
                    ? colors.warningMuted
                    : colors.successMuted,
              },
            ]}
          >
            <Text
              style={[
                styles.stockText,
                {
                  color: isOut
                    ? colors.destructiveForeground
                    : isLow
                      ? colors.warning
                      : colors.success,
                },
              ]}
            >
              {isOut ? "Out" : `${stock} left`}
            </Text>
          </View>
        </View>
      </View>
      <Feather name="chevron-right" size={16} color={colors.mutedForeground} style={styles.arrow} />
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
  },
  body: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  info: { flex: 1, gap: 2 },
  meta: { alignItems: "flex-end", gap: 6 },
  name: { fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  sku: { fontSize: 12, fontFamily: "Inter_400Regular" },
  cat: { fontSize: 11, fontFamily: "Inter_400Regular" },
  price: { fontSize: 15, fontFamily: "Inter_700Bold" },
  stock: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
  },
  stockText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  arrow: { marginLeft: 8 },
});
