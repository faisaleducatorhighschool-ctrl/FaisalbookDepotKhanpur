import { StoreProduct } from "@workspace/api-client-react";
import { Link } from "wouter";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Heart } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { toast } from "sonner";

export function ProductCard({ product, currency }: { product: StoreProduct; currency?: string }) {
  const { addItem } = useCart();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { customer } = useCustomerAuth();

  const inWish = isInWishlist(product.id);
  const displayCurrency = currency || "Rs.";

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.stock <= 0) {
      toast.error("This product is currently out of stock.");
      return;
    }
    addItem({
      productId: product.id,
      name: product.name,
      salePrice: product.salePrice,
      discountPrice: product.discountPrice,
      quantity: 1,
      imageUrl: product.imageUrl,
      unit: product.unit ?? undefined,
    });
    toast.success(`${product.name} added to cart`);
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!customer && !inWish) {
      toast.info("Sign in to sync your wishlist across devices");
    }
    if (inWish) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product.id);
    }
  };

  const currentPrice = product.discountPrice ?? product.salePrice;
  const isDiscounted = product.discountPrice != null && product.discountPrice < product.salePrice;

  return (
    <div className="group relative bg-card rounded-xl border hover:border-primary/30 hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden" data-testid={`card-product-${product.id}`}>
      {isDiscounted && (
        <div className="absolute top-3 right-3 z-10 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded-full shadow-sm">
          Sale
        </div>
      )}

      <Link href={`/products/${product.id}`} className="relative block aspect-square bg-muted/30 overflow-hidden p-4">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/30 text-sm text-center">
            No Image
          </div>
        )}
      </Link>

      <div className="p-4 flex flex-col flex-grow">
        <div className="mb-1">
          {product.brandName && (
            <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
              {product.brandName}
            </span>
          )}
        </div>

        <Link href={`/products/${product.id}`} className="block group-hover:text-primary transition-colors">
          <h3 className="font-semibold text-base line-clamp-2 mb-2 leading-tight">
            {product.name}
          </h3>
        </Link>

        <div className="mt-auto pt-4 flex items-end justify-between">
          <div>
            <div className="text-lg font-bold text-foreground">
              {formatCurrency(currentPrice, displayCurrency)}
            </div>
            {isDiscounted && (
              <div className="text-sm text-muted-foreground line-through">
                {formatCurrency(product.salePrice, displayCurrency)}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className={`h-9 w-9 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${inWish ? "text-primary border-primary opacity-100" : "text-muted-foreground hover:text-primary"}`}
              onClick={handleToggleWishlist}
            >
              <Heart className="h-4 w-4" fill={inWish ? "currentColor" : "none"} />
            </Button>

            <Button
              size="icon"
              className={`h-9 w-9 rounded-full ${product.stock <= 0 ? "opacity-50 cursor-not-allowed" : ""}`}
              onClick={handleAddToCart}
              disabled={product.stock <= 0}
            >
              <ShoppingCart className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
