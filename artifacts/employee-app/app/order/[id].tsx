import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetOrder, useUpdateOrderStatus } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { StatusBadge } from "@/components/StatusBadge";

const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ["processing", "cancelled"],
  processing: ["completed", "shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  completed: [],
  cancelled: [],
};

export default function OrderDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: order, isLoading, isError, refetch } = useGetOrder(Number(id));
  const { mutateAsync: updateStatus, isPending: updating } = useUpdateOrderStatus();
  const [isUpdating, setIsUpdating] = useState(false);

  async function handleStatusUpdate(newStatus: string) {
    Alert.alert(
      "Update Status",
      `Change order status to "${newStatus}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Update",
          style: "default",
          onPress: async () => {
            try {
              setIsUpdating(true);
              await updateStatus({ id: Number(id), data: { status: newStatus } });
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              refetch();
            } catch {
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert("Error", "Failed to update status. Please try again.");
            } finally {
              setIsUpdating(false);
            }
          },
        },
      ],
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (isError || !order) {
    return (
      <>
        <Stack.Screen options={{ title: "Order" }} />
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <Feather name="alert-circle" size={40} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.destructive }]}>Order not found</Text>
        </View>
      </>
    );
  }

  const transitions = STATUS_TRANSITIONS[order.status] ?? [];
  const items = order.items ?? [];

  return (
    <>
      <Stack.Screen options={{ title: order.orderNumber, headerBackTitle: "Back" }} />
      <ScrollView
        style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 24 }}
      >
        <View style={[styles.hero, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Text style={[styles.orderNum, { color: colors.primary }]}>{order.orderNumber}</Text>
          <StatusBadge status={order.status} />
          {order.customerName ? (
            <View style={styles.customerRow}>
              <Feather name="user" size={14} color={colors.mutedForeground} />
              <Text style={[styles.customerName, { color: colors.mutedForeground }]}>{order.customerName}</Text>
            </View>
          ) : null}
          <Text style={[styles.date, { color: colors.mutedForeground }]}>
            {new Date(order.createdAt).toLocaleDateString(undefined, {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </Text>
        </View>

        {transitions.length > 0 ? (
          <View style={[styles.actionsSection, { borderBottomColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>UPDATE STATUS</Text>
            <View style={styles.actionRow}>
              {transitions.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => handleStatusUpdate(s)}
                  disabled={isUpdating}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    { backgroundColor: colors.primary, opacity: pressed || isUpdating ? 0.7 : 1 },
                  ]}
                >
                  <Text style={[styles.actionBtnText, { color: colors.primaryForeground }]}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>ORDER ITEMS</Text>
          {items.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No items</Text>
          ) : (
            items.map((item) => (
              <View key={item.id} style={[styles.itemRow, { borderBottomColor: colors.border }]}>
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={2}>
                    {item.productName ?? `Product #${item.productId}`}
                  </Text>
                  <Text style={[styles.itemQty, { color: colors.mutedForeground }]}>
                    {item.quantity} × ${item.price.toFixed(2)}
                  </Text>
                </View>
                <Text style={[styles.itemTotal, { color: colors.foreground }]}>
                  ${(item.quantity * item.price).toFixed(2)}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>PAYMENT</Text>
          <View style={[styles.row, { borderBottomColor: colors.border }]}>
            <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>Subtotal</Text>
            <Text style={[styles.rowValue, { color: colors.foreground }]}>${Number(order.subtotal ?? 0).toFixed(2)}</Text>
          </View>
          {Number(order.discount ?? 0) > 0 ? (
            <View style={[styles.row, { borderBottomColor: colors.border }]}>
              <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>Discount</Text>
              <Text style={[styles.rowValue, { color: colors.success }]}>-${Number(order.discount ?? 0).toFixed(2)}</Text>
            </View>
          ) : null}
          {Number(order.tax ?? 0) > 0 ? (
            <View style={[styles.row, { borderBottomColor: colors.border }]}>
              <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>Tax</Text>
              <Text style={[styles.rowValue, { color: colors.foreground }]}>${Number(order.tax ?? 0).toFixed(2)}</Text>
            </View>
          ) : null}
          <View style={[styles.row, { borderBottomColor: colors.border }]}>
            <Text style={[styles.rowLabelBold, { color: colors.foreground }]}>Total</Text>
            <Text style={[styles.rowValueBold, { color: colors.primary }]}>${Number(order.totalAmount ?? 0).toFixed(2)}</Text>
          </View>
          <View style={[styles.row, { borderBottomColor: colors.border }]}>
            <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>Paid</Text>
            <Text style={[styles.rowValue, { color: colors.success }]}>${Number(order.paidAmount ?? 0).toFixed(2)}</Text>
          </View>
          {Number(order.dueAmount ?? 0) > 0 ? (
            <View style={[styles.row, { borderBottomColor: colors.border }]}>
              <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>Due</Text>
              <Text style={[styles.rowValue, { color: colors.destructive }]}>${Number(order.dueAmount ?? 0).toFixed(2)}</Text>
            </View>
          ) : null}
          <View style={[styles.row, { borderBottomColor: colors.border }]}>
            <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>Payment Method</Text>
            <Text style={[styles.rowValue, { color: colors.foreground }]}>{order.paymentMethod}</Text>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  errorText: { fontSize: 16, fontFamily: "Inter_500Medium", marginTop: 12 },
  hero: { padding: 24, alignItems: "center", gap: 8, borderBottomWidth: 1 },
  orderNum: { fontSize: 20, fontFamily: "Inter_700Bold" },
  customerRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  customerName: { fontSize: 14, fontFamily: "Inter_400Regular" },
  date: { fontSize: 13, fontFamily: "Inter_400Regular" },
  actionsSection: { paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1 },
  actionRow: { flexDirection: "row", gap: 10, flexWrap: "wrap", marginTop: 8 },
  actionBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8 },
  actionBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  section: { marginTop: 12, marginHorizontal: 16, borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontFamily: "Inter_500Medium", lineHeight: 20 },
  itemQty: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  itemTotal: { fontSize: 14, fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", padding: 14 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  rowValue: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  rowLabelBold: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  rowValueBold: { fontSize: 16, fontFamily: "Inter_700Bold" },
});
