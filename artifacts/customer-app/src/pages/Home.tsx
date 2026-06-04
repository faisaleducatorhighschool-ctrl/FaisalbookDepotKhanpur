import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "@/components/product/ProductCard";
import { MobileLayout } from "@/components/layout/MobileLayout";
import {
  useGetStoreFeatured,
  useListStoreCategories,
  useGetStoreSettings,
} from "@workspace/api-client-react";

export default function Home() {
  const [search, setSearch] = useState("");
  const [, navigate] = useLocation();

  const { data: settings } = useGetStoreSettings({
    query: { queryKey: ["store-settings"] },
  });
  const { data: featured, isLoading: featuredLoading } = useGetStoreFeatured({
    query: { queryKey: ["store-featured"] },
  });
  const { data: categories } = useListStoreCategories({
    query: { queryKey: ["store-categories"] },
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (search.trim()) navigate(`/shop?search=${encodeURIComponent(search.trim())}`);
  }

  return (
    <MobileLayout>
      <div className="bg-white px-4 pt-5 pb-4 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          {settings?.logoUrl && (
            <img src={settings.logoUrl} alt="" className="w-8 h-8 rounded-lg object-contain" />
          )}
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">
              {settings?.storeName ?? "Smart Retail ERP"}
            </h1>
            {settings?.companyName && (
              <p className="text-xs text-gray-500">{settings.companyName}</p>
            )}
          </div>
        </div>
        <form onSubmit={handleSearch} className="mt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search products..."
              className="pl-9 bg-gray-50 border-gray-200"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </form>
      </div>

      <div className="px-4 pt-4">
        {categories && categories.length > 0 && (
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">Categories</h2>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/shop?categoryId=${cat.id}`}
                  className="shrink-0 px-4 py-1.5 rounded-full bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {featuredLoading ? (
          <ProductGridSkeleton />
        ) : (
          <>
            {featured?.newArrivals && featured.newArrivals.length > 0 && (
              <ProductSection
                title="New Arrivals"
                products={featured.newArrivals}
                href="/shop?sort=new"
              />
            )}
            {featured?.bestSelling && featured.bestSelling.length > 0 && (
              <ProductSection
                title="Best Selling"
                products={featured.bestSelling}
                href="/shop?sort=best"
              />
            )}
            {featured?.discounted && featured.discounted.length > 0 && (
              <ProductSection
                title="On Sale"
                products={featured.discounted}
                href="/shop?sort=sale"
              />
            )}
          </>
        )}
      </div>
    </MobileLayout>
  );
}

function ProductSection({
  title,
  products,
  href,
}: {
  title: string;
  products: Parameters<typeof ProductCard>[0]["product"][];
  href: string;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        <Link href={href} className="text-xs text-indigo-600 font-medium">
          See all
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {products.slice(0, 4).map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
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
  );
}
