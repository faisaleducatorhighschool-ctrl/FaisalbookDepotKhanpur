import { Feather } from "@expo/vector-icons";
import { Stack, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetProduct } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { StatusBadge } from "@/components/StatusBadge";

function DetailRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  const colors = useColors();
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: valueColor ?? colors.foreground }]}>{value}</Text>
    </View>
  );
}

export default function ProductDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: product, isLoading, isError } = useGetProduct(Number(id));

  const isLow = product ? product.stock <= (product.lowStockLimit ?? 10) : false;
  const isOut = product?.stock === 0;

  return (
    <>
      <Stack.Screen options={{ title: product?.name ?? "Product", headerBackTitle: "Back" }} />
      <ScrollView
        style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 24 }}
      >
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : isError || !product ? (
          <View style={styles.center}>
            <Feather name="alert-circle" size={40} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.destructive }]}>Product not found</Text>
          </View>
        ) : (
          <>
            <View style={[styles.heroCard, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
              <View style={[styles.iconCircle, { backgroundColor: colors.secondary }]}>
                <Feather name="box" size={32} color={colors.primary} />
              </View>
              <Text style={[styles.productName, { color: colors.foreground }]}>{product.name}</Text>
              <Text style={[styles.sku, { color: colors.mutedForeground }]}>SKU: {product.sku}</Text>
              <View style={styles.badgeRow}>
                <StatusBadge status={product.status} />
                {isLow && !isOut && <StatusBadge status="low-stock" />}
                {isOut && <StatusBadge status="out-of-stock" />}
              </View>
            </View>

            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>PRICING</Text>
              <DetailRow label="Sale Price" value={`$${product.salePrice.toFixed(2)}`} />
              <DetailRow label="Cost Price" value={`$${product.costPrice.toFixed(2)}`} />
              {product.discountPrice ? (
                <DetailRow label="Discount Price" value={`$${product.discountPrice.toFixed(2)}`} valueColor={colors.success} />
              ) : null}
            </View>

            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>STOCK</Text>
              <DetailRow
                label="Current Stock"
                value={`${product.stock} ${product.unit ?? "units"}`}
                valueColor={isOut ? colors.destructive : isLow ? colors.warning : colors.success}
              />
              <DetailRow label="Low Stock Alert" value={`${product.lowStockLimit ?? 10} units`} />
            </View>

            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>DETAILS</Text>
              {product.categoryName ? (
                <DetailRow label="Category" value={product.categoryName} />
              ) : null}
              {product.brandName ? (
                <DetailRow label="Brand" value={product.brandName} />
              ) : null}
              {product.barcode ? (
                <DetailRow label="Barcode" value={product.barcode} />
              ) : null}
              {product.expiryDate ? (
                <DetailRow
                  label="Expiry Date"
                  value={new Date(product.expiryDate).toLocaleDateString()}
                  valueColor={new Date(product.expiryDate) < new Date() ? colors.destructive : colors.foreground}
                />
              ) : null}
              {product.description ? (
                <View style={[styles.row, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>Description</Text>
                  <Text style={[styles.descText, { color: colors.foreground }]} numberOfLines={4}>
                    {product.description}
                  </Text>
                </View>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  errorText: { fontSize: 16, fontFamily: "Inter_500Medium", marginTop: 12 },
  heroCard: {
    alignItems: "center",
    padding: 24,
    borderBottomWidth: 1,
    gap: 8,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  productName: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  sku: { fontSize: 13, fontFamily: "Inter_400Regular" },
  badgeRow: { flexDirection: "row", gap: 6, marginTop: 4 },
  section: { marginTop: 12, marginHorizontal: 16, borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 16,
  },
  rowLabel: { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1 },
  rowValue: { fontSize: 14, fontFamily: "Inter_600SemiBold", textAlign: "right", flex: 1 },
  descText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 2, textAlign: "right" },
});
