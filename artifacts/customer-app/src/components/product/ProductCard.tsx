import { Link } from "wouter";
import { ShoppingCart, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { ProductImage } from "./ProductImage";
import type { StoreProduct } from "@workspace/api-client-react";

interface ProductCardProps {
  product: StoreProduct;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();
  const price = product.discountPrice ?? product.salePrice;
  const hasDiscount = product.discountPrice != null && product.discountPrice < product.salePrice;

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    addItem({
      productId: product.id,
      name: product.name,
      salePrice: product.salePrice,
      discountPrice: product.discountPrice ?? null,
      imageUrl: product.imageUrl ?? null,
      stock: product.stock,
      unit: product.unit ?? "pcs",
    });
  }

  return (
    <Link href={`/products/${product.id}`}>
      <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 active:scale-[0.98] transition-transform">
        <div className="relative aspect-square bg-gray-50">
          <ProductImage src={product.imageUrl} alt={product.name} />
          {hasDiscount && (
            <Badge className="absolute top-2 left-2 bg-red-500 text-white text-xs">
              Sale
            </Badge>
          )}
          {product.stock === 0 && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="text-white text-sm font-semibold">Out of Stock</span>
            </div>
          )}
        </div>
        <div className="p-3">
          {product.categoryName && (
            <p className="text-xs text-gray-400 mb-0.5">{product.categoryName}</p>
          )}
          <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2">
            {product.name}
          </p>
          <div className="flex items-center justify-between mt-2">
            <div>
              <span className="text-base font-bold text-indigo-600">
                Rs {price.toLocaleString()}
              </span>
              {hasDiscount && (
                <span className="ml-1 text-xs text-gray-400 line-through">
                  Rs {product.salePrice.toLocaleString()}
                </span>
              )}
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
              onClick={handleAddToCart}
              disabled={product.stock === 0}
            >
              <ShoppingCart className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </Link>
  );
}
