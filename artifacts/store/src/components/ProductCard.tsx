import { StoreProduct } from "@workspace/api-client-react";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { Link } from "wouter";
import { Heart, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function ProductCard({ product, currency }: { product: StoreProduct; currency: string }) {
  const { addItem } = useCart();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const inWish = isInWishlist(product.id);

  const toggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    if (inWish) removeFromWishlist(product.id);
    else addToWishlist(product.id);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem({
      productId: product.id,
      name: product.name,
      salePrice: product.salePrice,
      discountPrice: product.discountPrice,
      imageUrl: product.imageUrl,
      quantity: 1,
      unit: product.unit,
    });
    toast.success(`${product.name} added to cart`);
  };

  return (
    <Link href={`/products/${product.id}`} className="group relative rounded-xl border bg-card p-4 hover-elevate transition-all flex flex-col h-full" data-testid={`card-product-${product.id}`}>
      <div className="aspect-square w-full overflow-hidden rounded-lg bg-muted relative mb-4 flex-shrink-0">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-secondary/50 text-muted-foreground p-4 text-center text-sm font-medium">
            {product.name}
          </div>
        )}
        {product.discountPrice && (
          <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground">Sale</Badge>
        )}
        <button
          onClick={toggleWishlist}
          className={`absolute top-2 right-2 p-2 rounded-full bg-background/80 backdrop-blur-sm border shadow-sm hover:bg-background transition-colors ${inWish ? "text-primary" : "text-muted-foreground"}`}
          data-testid={`btn-wishlist-${product.id}`}
        >
          <Heart className="h-4 w-4" fill={inWish ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="flex-grow flex flex-col">
        <div className="text-xs text-muted-foreground mb-1">{product.categoryName || "Uncategorized"}</div>
        <h3 className="font-semibold text-foreground line-clamp-2 mb-2">{product.name}</h3>
        <div className="mt-auto flex items-center gap-2">
          {product.discountPrice ? (
            <>
              <span className="font-bold text-primary">{currency} {product.discountPrice.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground line-through">{currency} {product.salePrice.toLocaleString()}</span>
            </>
          ) : (
            <span className="font-bold text-foreground">{currency} {product.salePrice.toLocaleString()}</span>
          )}
        </div>
      </div>
      <Button
        onClick={handleAddToCart}
        className="w-full mt-4 gap-2 rounded-lg"
        variant={product.stock > 0 ? "default" : "secondary"}
        disabled={product.stock <= 0}
        data-testid={`btn-add-cart-${product.id}`}
      >
        <ShoppingCart className="h-4 w-4" />
        {product.stock > 0 ? "Add to Cart" : "Out of Stock"}
      </Button>
    </Link>
  );
}
