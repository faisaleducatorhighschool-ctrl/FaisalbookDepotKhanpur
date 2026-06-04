import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useListCustomers } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { CustomerCard } from "@/components/CustomerCard";
import { SearchBar } from "@/components/SearchBar";

export default function CustomersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");

  const { data: customers, isLoading, isError, refetch } = useListCustomers({ search: search || undefined });

  const topPad = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <FlatList
        data={customers ?? []}
        keyExtractor={(item) => item.id.toString()}
        scrollEnabled={!!(customers ?? []).length}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <View style={{ paddingTop: topPad + 8 }}>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search customers…" />
          </View>
        }
        renderItem={({ item }) => (
          <CustomerCard
            id={item.id}
            name={item.name}
            phone={item.phone}
            balance={item.balance ?? 0}
            totalOrders={item.totalOrders ?? 0}
          />
        )}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : isError ? (
            <View style={styles.center}>
              <Text style={[styles.emptyText, { color: colors.destructive }]}>Failed to load customers</Text>
            </View>
          ) : (
            <View style={styles.center}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {search ? "No customers match your search" : "No customers yet"}
              </Text>
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
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 24 },
});
