import { useState } from "react";
import { useParams, Link } from "wouter";
import { useGetStoreProduct, useGetStoreSettings, useListStoreProducts, getListStoreProductsQueryKey } from "@workspace/api-client-react";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Minus, Plus, Heart, ShoppingCart, ArrowLeft, Truck, ShieldCheck, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const productId = Number(id);
  
  const [quantity, setQuantity] = useState(1);
  
  const { data: settings } = useGetStoreSettings();
  const { data: product, isLoading, error } = useGetStoreProduct(productId);
  
  const relatedParams = { categoryId: product?.categoryId ?? undefined, limit: 4 };
  const { data: relatedProducts } = useListStoreProducts(relatedParams, {
    query: { enabled: !!product?.categoryId, queryKey: getListStoreProductsQueryKey(relatedParams) }
  });

  const { addItem } = useCart();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  
  const currency = settings?.currency || "Rs.";
  
  if (error) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">Product not found</h2>
        <Link href="/products"><Button>Back to Products</Button></Link>
      </div>
    );
  }

  if (isLoading || !product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-8 w-32 mb-8" />
        <div className="grid md:grid-cols-2 gap-12">
          <Skeleton className="aspect-square rounded-2xl w-full" />
          <div className="space-y-6">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const inWish = isInWishlist(product.id);
  const toggleWishlist = () => {
    if (inWish) removeFromWishlist(product.id);
    else addToWishlist(product.id);
  };

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      name: product.name,
      salePrice: product.salePrice,
      discountPrice: product.discountPrice,
      imageUrl: product.imageUrl,
      quantity,
      unit: product.unit,
    });
    toast.success(`${quantity} x ${product.name} added to cart`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/products" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to products
      </Link>

      <div className="grid md:grid-cols-2 gap-12">
        {/* Product Image */}
        <div className="aspect-square bg-muted rounded-2xl border overflow-hidden relative flex items-center justify-center">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-muted-foreground text-2xl font-medium px-4 text-center">{product.name}</span>
          )}
          {product.discountPrice && (
            <Badge className="absolute top-4 left-4 text-sm px-3 py-1 bg-destructive text-destructive-foreground">Sale</Badge>
          )}
        </div>

        {/* Product Info */}
        <div className="flex flex-col">
          <div className="mb-2 text-primary font-medium text-sm tracking-wide uppercase">
            {product.categoryName || "Uncategorized"} {product.brandName ? `• ${product.brandName}` : ""}
          </div>
          
          <h1 className="text-3xl md:text-4xl font-extrabold mb-4">{product.name}</h1>
          
          <div className="flex items-center gap-4 mb-6 pb-6 border-b">
            {product.discountPrice ? (
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-primary">{currency} {product.discountPrice.toLocaleString()}</span>
                <span className="text-xl text-muted-foreground line-through">{currency} {product.salePrice.toLocaleString()}</span>
              </div>
            ) : (
              <span className="text-3xl font-bold">{currency} {product.salePrice.toLocaleString()}</span>
            )}
            
            <Badge variant={product.stock > 0 ? "outline" : "secondary"} className="ml-auto">
              {product.stock > 0 ? `In Stock (${product.stock})` : "Out of Stock"}
            </Badge>
          </div>

          <div className="prose prose-sm dark:prose-invert mb-8 text-muted-foreground">
            <p>{product.description || "No description available for this product."}</p>
            {product.unit && <p><strong>Unit:</strong> {product.unit}</p>}
            <p className="text-xs">SKU: {product.sku}</p>
          </div>

          {/* Actions */}
          <div className="mt-auto space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center rounded-lg border bg-background h-14">
                <button
                  className="w-14 h-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1 || product.stock <= 0}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-12 text-center font-medium text-lg">{quantity}</span>
                <button
                  className="w-14 h-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  disabled={quantity >= product.stock || product.stock <= 0}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <Button
                size="lg"
                className="flex-1 h-14 text-lg gap-2"
                onClick={handleAddToCart}
                disabled={product.stock <= 0}
              >
                <ShoppingCart className="h-5 w-5" />
                {product.stock > 0 ? "Add to Cart" : "Out of Stock"}
              </Button>

              <Button
                variant="outline"
                size="icon"
                className={`h-14 w-14 shrink-0 transition-colors ${inWish ? "text-primary border-primary" : "text-muted-foreground"}`}
                onClick={toggleWishlist}
              >
                <Heart className="h-6 w-6" fill={inWish ? "currentColor" : "none"} />
              </Button>
            </div>

            {/* Guarantees */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Truck className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-muted-foreground leading-tight">Fast<br/>Delivery</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-muted-foreground leading-tight">Secure<br/>Payment</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <RefreshCw className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-muted-foreground leading-tight">Easy<br/>Returns</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts && relatedProducts.data.length > 0 && (
        <div className="mt-24">
          <h2 className="text-2xl font-bold mb-8">You might also like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {relatedProducts.data.filter(p => p.id !== product.id).slice(0, 4).map(p => (
              <ProductCard key={p.id} product={p} currency={currency} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
