import { Feather } from "@expo/vector-icons";
import React from "react";
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
import {
  useGetDashboardStats,
  useGetRecentOrders,
  useGetSalesChart,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { StatCard } from "@/components/StatCard";
import { OrderCard } from "@/components/OrderCard";

function fmt(n: number) {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useGetDashboardStats();
  const { data: recentOrders, isLoading: ordersLoading, refetch: refetchOrders } = useGetRecentOrders();
  const { data: chart } = useGetSalesChart();

  const isLoading = statsLoading || ordersLoading;
  function onRefresh() {
    refetchStats();
    refetchOrders();
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 80 }}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>Good day,</Text>
          <Text style={[styles.name, { color: colors.foreground }]}>{user?.name ?? "Staff"}</Text>
        </View>
        <Pressable
          onPress={signOut}
          style={[styles.logoutBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
        >
          <Feather name="log-out" size={16} color={colors.mutedForeground} />
        </Pressable>
      </View>

      {statsLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>TODAY</Text>
          <View style={styles.statsRow}>
            <StatCard label="Today Sales" value={fmt(stats?.todaySales ?? 0)} accent="primary" />
            <StatCard label="Month Sales" value={fmt(stats?.monthSales ?? 0)} accent="success" />
          </View>

          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>OVERVIEW</Text>
          <View style={styles.statsRow}>
            <StatCard label="Total Orders" value={stats?.totalOrders ?? 0} sub={`${stats?.pendingOrders ?? 0} pending`} accent="primary" />
            <StatCard label="Customers" value={stats?.totalCustomers ?? 0} accent="success" />
          </View>
          <View style={styles.statsRow}>
            <StatCard label="Low Stock" value={stats?.lowStockCount ?? 0} sub={`${stats?.outOfStockCount ?? 0} out-of-stock`} accent="warning" />
            <StatCard label="Products" value={stats?.totalProducts ?? 0} accent="primary" />
          </View>
        </>
      )}

      {chart && chart.length > 0 ? (
        <>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>7-DAY SALES</Text>
          <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.chartBars}>
              {(() => {
                const max = Math.max(...chart.map((p) => p.sales), 1);
                return chart.map((point, i) => (
                  <View key={i} style={styles.barCol}>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            height: `${Math.max((point.sales / max) * 100, 4)}%` as any,
                            backgroundColor: colors.primary,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.barLabel, { color: colors.mutedForeground }]}>
                      {new Date(point.date).toLocaleDateString(undefined, { weekday: "short" }).charAt(0)}
                    </Text>
                  </View>
                ));
              })()}
            </View>
          </View>
        </>
      ) : null}

      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>RECENT ORDERS</Text>
      {ordersLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !recentOrders?.length ? (
        <View style={styles.emptyRow}>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No recent orders</Text>
        </View>
      ) : (
        (recentOrders ?? []).slice(0, 5).map((order) => (
          <OrderCard
            key={order.id}
            id={order.id}
            orderNumber={order.orderNumber}
            customerName={order.customerName}
            status={order.status}
            totalAmount={order.totalAmount}
            createdAt={order.createdAt}
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  greeting: { fontSize: 13, fontFamily: "Inter_400Regular" },
  name: { fontSize: 20, fontFamily: "Inter_700Bold", marginTop: 2 },
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 4,
  },
  loadingRow: { padding: 32, alignItems: "center" },
  emptyRow: { paddingVertical: 24, alignItems: "center" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  chartCard: {
    marginHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    padding: 16,
  },
  chartBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 80,
    gap: 6,
  },
  barCol: { flex: 1, alignItems: "center", gap: 4 },
  barTrack: { flex: 1, width: "100%", justifyContent: "flex-end" },
  barFill: { width: "100%", borderRadius: 3, minHeight: 4 },
  barLabel: { fontSize: 10, fontFamily: "Inter_500Medium" },
});
