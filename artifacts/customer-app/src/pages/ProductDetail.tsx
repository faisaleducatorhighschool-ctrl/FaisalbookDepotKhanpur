import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Heart, ShoppingCart, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { useCart } from "@/context/CartContext";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import {
  useGetStoreProduct,
  useAddToStoreWishlist,
  useRemoveFromStoreWishlist,
  useGetStoreWishlist,
} from "@workspace/api-client-react";
import { ProductImage } from "@/components/product/ProductImage";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { addItem, items, updateQuantity } = useCart();
  const { isLoggedIn } = useCustomerAuth();
  const [qty, setQty] = useState(1);

  const productId = Number(id);

  const { data: product, isLoading } = useGetStoreProduct(productId, {
    query: { queryKey: ["store-product", productId], enabled: !isNaN(productId) },
  });

  const { data: wishlist, refetch: refetchWishlist } = useGetStoreWishlist({
    query: {
      queryKey: ["store-wishlist"],
      enabled: isLoggedIn,
    },
  });

  const addWishlist = useAddToStoreWishlist();
  const removeWishlist = useRemoveFromStoreWishlist();

  const inWishlist = wishlist?.some((p) => p.id === productId) ?? false;
  const cartItem = items.find((i) => i.productId === productId);

  function handleAddToCart() {
    if (!product) return;
    addItem({
      productId: product.id,
      name: product.name,
      salePrice: product.salePrice,
      discountPrice: product.discountPrice ?? null,
      imageUrl: product.imageUrl ?? null,
      stock: product.stock,
      unit: product.unit ?? "pcs",
    });
    toast({ title: "Added to cart" });
  }

  async function handleToggleWishlist() {
    if (!isLoggedIn) {
      navigate("/auth");
      return;
    }
    if (inWishlist) {
      await removeWishlist.mutateAsync({ productId });
    } else {
      await addWishlist.mutateAsync({ data: { productId } });
    }
    refetchWishlist();
  }

  if (isLoading) {
    return (
      <MobileLayout hideNav>
        <Skeleton className="w-full aspect-square" />
        <div className="p-4 space-y-3">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-20 w-full" />
        </div>
      </MobileLayout>
    );
  }

  if (!product) {
    return (
      <MobileLayout hideNav>
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-gray-500">Product not found</p>
          <Button variant="ghost" onClick={() => navigate("/shop")} className="mt-2">
            Back to Shop
          </Button>
        </div>
      </MobileLayout>
    );
  }

  const price = product.discountPrice ?? product.salePrice;
  const hasDiscount = product.discountPrice != null && product.discountPrice < product.salePrice;

  return (
    <MobileLayout hideNav>
      <div className="relative">
        <button
          onClick={() => navigate("/shop")}
          className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur rounded-full p-2 shadow"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <button
          onClick={handleToggleWishlist}
          className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur rounded-full p-2 shadow"
        >
          <Heart
            className={`w-5 h-5 ${inWishlist ? "fill-red-500 text-red-500" : "text-gray-700"}`}
          />
        </button>
        <div className="aspect-square bg-gray-50 w-full">
          <ProductImage src={product.imageUrl} alt={product.name} iconSize={56} />
        </div>
      </div>

      <div className="bg-white rounded-t-3xl -mt-4 relative p-5 pb-28">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h1 className="text-xl font-bold text-gray-900 leading-tight flex-1">
            {product.name}
          </h1>
          {product.status !== "active" && (
            <Badge variant="secondary">{product.status}</Badge>
          )}
        </div>

        {(product.categoryName || product.brandName) && (
          <div className="flex gap-2 mb-3">
            {product.categoryName && (
              <Badge variant="outline" className="text-xs">
                {product.categoryName}
              </Badge>
            )}
            {product.brandName && (
              <Badge variant="outline" className="text-xs">
                {product.brandName}
              </Badge>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-bold text-indigo-600">
            Rs {price.toLocaleString()}
          </span>
          {hasDiscount && (
            <span className="text-base text-gray-400 line-through">
              Rs {product.salePrice.toLocaleString()}
            </span>
          )}
        </div>

        {product.stock > 0 ? (
          <p className="text-xs text-green-600 font-medium mb-4">
            In Stock ({product.stock} {product.unit})
          </p>
        ) : (
          <p className="text-xs text-red-500 font-medium mb-4">Out of Stock</p>
        )}

        {product.description && (
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Description</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
          </div>
        )}

        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t px-5 py-3 flex items-center gap-3">
          {cartItem ? (
            <div className="flex items-center gap-2 bg-indigo-50 rounded-full px-3 py-1.5">
              <button
                onClick={() => updateQuantity(productId, cartItem.quantity - 1)}
                className="text-indigo-600"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold text-indigo-700 w-6 text-center">
                {cartItem.quantity}
              </span>
              <button
                onClick={() =>
                  updateQuantity(productId, Math.min(cartItem.quantity + 1, product.stock))
                }
                className="text-indigo-600"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          ) : null}
          <Button
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full"
            disabled={product.stock === 0}
            onClick={handleAddToCart}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            {cartItem ? "Add More" : "Add to Cart"}
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
}
