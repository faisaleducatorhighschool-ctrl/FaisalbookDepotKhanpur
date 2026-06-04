import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useListOrders } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { OrderCard } from "@/components/OrderCard";

const FILTERS = ["all", "pending", "processing", "completed", "cancelled"] as const;
type Filter = (typeof FILTERS)[number];

export default function OrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<Filter>("all");

  const { data: orders, isLoading, isError, refetch } = useListOrders({
    status: filter === "all" ? undefined : filter,
  });

  const topPad = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={{ paddingTop: topPad + 8 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((f) => (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[
                styles.chip,
                {
                  backgroundColor: filter === f ? colors.primary : colors.muted,
                  borderColor: filter === f ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: filter === f ? colors.primaryForeground : colors.foreground },
                ]}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={orders ?? []}
        keyExtractor={(item) => item.id.toString()}
        scrollEnabled={!!(orders ?? []).length}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />
        }
        renderItem={({ item }) => (
          <OrderCard
            id={item.id}
            orderNumber={item.orderNumber}
            customerName={item.customerName}
            status={item.status}
            totalAmount={item.totalAmount}
            createdAt={item.createdAt}
          />
        )}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : isError ? (
            <View style={styles.center}>
              <Text style={[styles.emptyText, { color: colors.destructive }]}>Failed to load orders</Text>
            </View>
          ) : (
            <View style={styles.center}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No orders found</Text>
            </View>
          )
        }
        contentContainerStyle={{
          paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 80,
          flexGrow: 1,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  filterRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 24 },
});
