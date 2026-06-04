import { useLocation } from "wouter";
import { Heart, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "@/components/product/ProductCard";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { useGetStoreWishlist } from "@workspace/api-client-react";

export default function Wishlist() {
  const [, navigate] = useLocation();
  const { isLoggedIn } = useCustomerAuth();

  const { data: wishlist, isLoading } = useGetStoreWishlist({
    query: { queryKey: ["store-wishlist"], enabled: isLoggedIn },
  });

  if (!isLoggedIn) {
    return (
      <MobileLayout>
        <div className="flex flex-col items-center justify-center h-80 px-8 text-center">
          <LogIn className="w-16 h-16 text-gray-200 mb-4" />
          <h2 className="text-lg font-semibold text-gray-700 mb-1">Sign in to view wishlist</h2>
          <p className="text-sm text-gray-400 mb-6">
            Save your favourite products for later.
          </p>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-8"
            onClick={() => navigate("/auth")}
          >
            Sign In
          </Button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="bg-white px-4 py-4 border-b">
        <h1 className="text-xl font-bold text-gray-900">Wishlist</h1>
      </div>

      <div className="px-4 py-3">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm">
                <Skeleton className="aspect-square w-full" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : !wishlist || wishlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Heart className="w-14 h-14 text-gray-200 mb-3" />
            <p className="text-gray-500 text-sm">Your wishlist is empty</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-indigo-600"
              onClick={() => navigate("/shop")}
            >
              Browse Products
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {wishlist.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
