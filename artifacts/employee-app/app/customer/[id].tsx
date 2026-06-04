import { Feather } from "@expo/vector-icons";
import { Stack, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetCustomer, useGetCustomerLedger } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

function InfoRow({ icon, value }: { icon: string; value: string }) {
  const colors = useColors();
  return (
    <View style={styles.infoRow}>
      <Feather name={icon as any} size={15} color={colors.mutedForeground} />
      <Text style={[styles.infoText, { color: colors.mutedForeground }]}>{value}</Text>
    </View>
  );
}

export default function CustomerDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: customer, isLoading, isError } = useGetCustomer(Number(id));
  const { data: ledger } = useGetCustomerLedger(Number(id));

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (isError || !customer) {
    return (
      <>
        <Stack.Screen options={{ title: "Customer" }} />
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <Feather name="alert-circle" size={40} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.destructive }]}>Customer not found</Text>
        </View>
      </>
    );
  }

  const initial = customer.name.charAt(0).toUpperCase();
  const entries = ledger ?? [];

  return (
    <>
      <Stack.Screen options={{ title: customer.name, headerBackTitle: "Back" }} />
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id.toString()}
        scrollEnabled={!!entries.length}
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 24 }}
        ListHeaderComponent={
          <>
            <View style={[styles.hero, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Text style={[styles.initial, { color: colors.primaryForeground }]}>{initial}</Text>
              </View>
              <Text style={[styles.name, { color: colors.foreground }]}>{customer.name}</Text>
              <View style={styles.infoBlock}>
                <InfoRow icon="phone" value={customer.phone} />
                {customer.email ? <InfoRow icon="mail" value={customer.email} /> : null}
                {customer.address ? <InfoRow icon="map-pin" value={customer.address} /> : null}
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statVal, { color: colors.primary }]}>{customer.totalOrders ?? 0}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Orders</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statVal, { color: colors.success }]}>
                    ${(customer.totalSpent ?? 0).toFixed(2)}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Total Spent</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statItem}>
                  <Text
                    style={[
                      styles.statVal,
                      { color: (customer.balance ?? 0) < 0 ? colors.destructive : colors.foreground },
                    ]}
                  >
                    ${Math.abs(customer.balance ?? 0).toFixed(2)}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Balance</Text>
                </View>
              </View>
            </View>

            <Text
              style={[styles.sectionTitle, { color: colors.mutedForeground, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }]}
            >
              LEDGER
            </Text>
          </>
        }
        renderItem={({ item }) => (
          <View style={[styles.ledgerRow, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
            <View style={styles.ledgerLeft}>
              <Text style={[styles.ledgerType, { color: colors.foreground }]}>{(item as any).type ?? "Entry"}</Text>
              <Text style={[styles.ledgerDate, { color: colors.mutedForeground }]}>
                {new Date((item as any).createdAt ?? "").toLocaleDateString()}
              </Text>
            </View>
            <Text
              style={[
                styles.ledgerAmount,
                { color: ((item as any).amount ?? 0) >= 0 ? colors.success : colors.destructive },
              ]}
            >
              {((item as any).amount ?? 0) >= 0 ? "+" : ""}${Math.abs((item as any).amount ?? 0).toFixed(2)}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No ledger entries</Text>
          </View>
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  errorText: { fontSize: 16, fontFamily: "Inter_500Medium", marginTop: 12 },
  hero: { padding: 24, alignItems: "center", borderBottomWidth: 1, gap: 12 },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  initial: { fontSize: 28, fontFamily: "Inter_700Bold" },
  name: { fontSize: 22, fontFamily: "Inter_700Bold" },
  infoBlock: { gap: 4, alignItems: "center" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  statsRow: { flexDirection: "row", gap: 0, marginTop: 8, width: "100%" },
  statItem: { flex: 1, alignItems: "center", gap: 2, paddingVertical: 8 },
  statVal: { fontSize: 16, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  statDivider: { width: 1, alignSelf: "stretch" },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8 },
  ledgerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  ledgerLeft: { gap: 2 },
  ledgerType: { fontSize: 14, fontFamily: "Inter_500Medium" },
  ledgerDate: { fontSize: 12, fontFamily: "Inter_400Regular" },
  ledgerAmount: { fontSize: 15, fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
