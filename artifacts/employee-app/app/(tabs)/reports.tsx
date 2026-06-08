import { Feather } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useGetInventoryReport,
  useGetProfitLossReport,
  useGetSalesReport,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

function fmt(n: number) {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(2)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(2)}K`;
  return `$${(n ?? 0).toFixed(2)}`;
}

interface ReportRowProps {
  label: string;
  value: string;
  accent?: string;
}

function ReportRow({ label, value, accent }: ReportRowProps) {
  const colors = useColors();
  return (
    <View style={[styles.reportRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: accent ?? colors.foreground }]}>{value}</Text>
    </View>
  );
}

interface ReportCardProps {
  title: string;
  icon: string;
  children: React.ReactNode;
  isLoading?: boolean;
}

function ReportCard({ title, icon, children, isLoading }: ReportCardProps) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBox, { backgroundColor: colors.secondary }]}>
          <Feather name={icon as any} size={18} color={colors.primary} />
        </View>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>{title}</Text>
      </View>
      {isLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        children
      )}
    </View>
  );
}

export default function ReportsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const now = new Date();
  const startOfMonth = useMemo(
    () => new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0],
    [],
  );
  const today = useMemo(() => now.toISOString().split("T")[0], []);

  const { data: sales, isLoading: salesLoading } = useGetSalesReport({
    startDate: startOfMonth,
    endDate: today,
  });
  const { data: inventory, isLoading: inventoryLoading } = useGetInventoryReport();
  const { data: pl, isLoading: plLoading } = useGetProfitLossReport({
    startDate: startOfMonth,
    endDate: today,
  });

  const topPad = Platform.OS === "web" ? 67 : 0;

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.scroll,
        { paddingTop: topPad + 16, paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 80 },
      ]}
    >
      <Text style={[styles.pageTitle, { color: colors.foreground }]}>Reports</Text>
      <Text style={[styles.period, { color: colors.mutedForeground }]}>
        {new Date(startOfMonth).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
      </Text>

      <ReportCard title="Sales Report" icon="trending-up" isLoading={salesLoading}>
        <ReportRow label="Total Sales" value={fmt((sales as any)?.totalSales ?? 0)} />
        <ReportRow label="Total Orders" value={String((sales as any)?.totalOrders ?? 0)} />
        <ReportRow label="Avg. Order Value" value={fmt((sales as any)?.avgOrderValue ?? 0)} />
        <ReportRow label="Total Returns" value={String((sales as any)?.totalReturns ?? 0)} />
        <ReportRow
          label="Discount Given"
          value={fmt((sales as any)?.totalDiscount ?? 0)}
          accent={colors.warning}
        />
      </ReportCard>

      <ReportCard title="Inventory Report" icon="box" isLoading={inventoryLoading}>
        <ReportRow label="Total Products" value={String((inventory as any)?.totalProducts ?? 0)} />
        <ReportRow label="Total Stock Value" value={fmt((inventory as any)?.totalValue ?? 0)} />
        <ReportRow
          label="Low Stock Items"
          value={String((inventory as any)?.lowStockCount ?? 0)}
          accent={colors.warning}
        />
        <ReportRow
          label="Out of Stock"
          value={String((inventory as any)?.outOfStockCount ?? 0)}
          accent={colors.destructive}
        />
      </ReportCard>

      <ReportCard title="Profit & Loss" icon="bar-chart-2" isLoading={plLoading}>
        <ReportRow label="Revenue" value={fmt((pl as any)?.revenue ?? 0)} accent={colors.success} />
        <ReportRow label="Cost of Goods" value={fmt((pl as any)?.costOfGoods ?? 0)} />
        <ReportRow label="Gross Profit" value={fmt((pl as any)?.grossProfit ?? 0)} accent={colors.success} />
        <ReportRow label="Expenses" value={fmt((pl as any)?.totalExpenses ?? 0)} accent={colors.destructive} />
        <ReportRow
          label="Net Profit"
          value={fmt((pl as any)?.netProfit ?? 0)}
          accent={((pl as any)?.netProfit ?? 0) >= 0 ? colors.success : colors.destructive}
        />
      </ReportCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16, gap: 16 },
  pageTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  period: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2, marginBottom: 8 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    paddingBottom: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  loadingRow: { padding: 24, alignItems: "center" },
  reportRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  rowValue: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
