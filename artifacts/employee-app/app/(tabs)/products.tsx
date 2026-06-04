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
import { useListProducts } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { ProductCard } from "@/components/ProductCard";
import { SearchBar } from "@/components/SearchBar";

export default function ProductsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");

  const { data: products, isLoading, isError, refetch } = useListProducts({ search: search || undefined });

  const filtered = products ?? [];
  const topPad = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />
        }
        scrollEnabled={!!filtered.length}
        ListHeaderComponent={
          <View style={{ paddingTop: topPad + 8 }}>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search products…" />
          </View>
        }
        renderItem={({ item }) => (
          <ProductCard
            id={item.id}
            name={item.name}
            sku={item.sku}
            stock={item.stock}
            lowStockLimit={item.lowStockLimit ?? 10}
            salePrice={item.salePrice}
            categoryName={item.categoryName}
          />
        )}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : isError ? (
            <View style={styles.center}>
              <Text style={[styles.emptyText, { color: colors.destructive }]}>Failed to load products</Text>
            </View>
          ) : (
            <View style={styles.center}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {search ? "No products match your search" : "No products found"}
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
