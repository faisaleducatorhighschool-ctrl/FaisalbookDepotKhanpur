import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "@/components/product/ProductCard";
import { MobileLayout } from "@/components/layout/MobileLayout";
import {
  useListStoreProducts,
  useListStoreCategories,
  type ListStoreProductsParams,
} from "@workspace/api-client-react";

export default function Shop() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [categoryId, setCategoryId] = useState<number | undefined>(
    searchParams.get("categoryId") ? Number(searchParams.get("categoryId")) : undefined
  );
  const [page, setPage] = useState(1);

  const params: ListStoreProductsParams = {
    search: search || undefined,
    categoryId,
    page,
    limit: 12,
  };

  const { data, isLoading } = useListStoreProducts(params, {
    query: { queryKey: ["store-products", params] },
  });

  const { data: categories } = useListStoreCategories({
    query: { queryKey: ["store-categories"] },
  });

  useEffect(() => {
    setPage(1);
  }, [search, categoryId]);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const s = sp.get("search") ?? "";
    const c = sp.get("categoryId") ? Number(sp.get("categoryId")) : undefined;
    setSearch(s);
    setCategoryId(c);
  }, [location]);

  return (
    <MobileLayout>
      <div className="bg-white px-4 pt-5 pb-3 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search products..."
              className="pl-9 bg-gray-50 border-gray-200"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        {categories && categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide mt-3">
            <button
              onClick={() => setCategoryId(undefined)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                !categoryId
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-600 border-gray-200"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryId(cat.id === categoryId ? undefined : cat.id)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  categoryId === cat.id
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-600 border-gray-200"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 pt-4">
        {data && (
          <p className="text-xs text-gray-500 mb-3">
            {data.total} product{data.total !== 1 ? "s" : ""} found
          </p>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm">
                <Skeleton className="aspect-square w-full" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : data?.data.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-sm">No products found</p>
            {(search || categoryId) && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-indigo-600"
                onClick={() => {
                  setSearch("");
                  setCategoryId(undefined);
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {data?.data.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-6 pb-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  {page} / {data.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </MobileLayout>
  );
}
