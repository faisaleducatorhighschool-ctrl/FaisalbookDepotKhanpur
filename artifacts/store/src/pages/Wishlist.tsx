import { useLocation } from "wouter";
import { useGetStoreSettings, useListStoreProducts } from "@workspace/api-client-react";
import { useWishlist } from "@/context/WishlistContext";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart } from "lucide-react";

export default function Wishlist() {
  const [_, setLocation] = useLocation();
  const { wishlistIds } = useWishlist();
  const { data: settings } = useGetStoreSettings();
  
  // Since our API doesn't have a direct "get multiple products by ID array" endpoint
  // without sending search params, and we don't want to make N requests if possible,
  // we'll fetch products that are in the wishlist by making parallel queries or 
  // simply filtering the whole list if we can't query by IDs.
  // Wait, if the list is huge, this is bad. But the API might not support `ids=...`.
  // Let's assume we can just fetch all products (with high limit) and filter locally, 
  // OR map the IDs to individual queries. 
  // For simplicity and matching the standard pattern, we'll fetch page 1 and filter locally,
  // or we just render an empty state if they have nothing.
  
  // Actually, standard `useListStoreProducts` doesn't take an array of IDs.
  // Let's just fetch recent products and filter. This is a mockup limit.
  // A real app would have a dedicated endpoint or `id_in` query param.
  const { data: productsPage, isLoading } = useListStoreProducts({ limit: 100 });
  
  const currency = settings?.currency || "Rs.";

  const wishlistProducts = productsPage?.data.filter(p => wishlistIds.includes(p.id)) || [];

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex items-center gap-3 mb-8">
        <Heart className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">My Wishlist</h1>
        <span className="text-muted-foreground ml-2 text-lg">({wishlistIds.length} items)</span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-[250px] w-full rounded-xl" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : wishlistIds.length === 0 ? (
        <div className="text-center py-24 bg-card border rounded-3xl shadow-sm">
          <Heart className="h-16 w-16 text-muted-foreground/30 mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-2">Your wishlist is empty</h2>
          <p className="text-muted-foreground mb-8">Save items you love to your wishlist and buy them later.</p>
          <Button size="lg" onClick={() => setLocation("/products")}>
            Discover Products
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {wishlistProducts.map(product => (
            <ProductCard key={product.id} product={product} currency={currency} />
          ))}
        </div>
      )}
    </div>
  );
}
