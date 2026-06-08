import { useCart } from "@/context/CartContext";
import { useGetStoreSettings } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, ShieldCheck } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function Cart() {
  const { items, updateQty, removeItem, subtotal } = useCart();
  const { data: settings } = useGetStoreSettings();
  const [_, setLocation] = useLocation();
  const currency = settings?.currency || "Rs.";

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-24 max-w-lg text-center">
        <div className="h-32 w-32 rounded-full bg-muted flex items-center justify-center mx-auto mb-8">
          <ShoppingBag className="h-16 w-16 text-muted-foreground" />
        </div>
        <h1 className="text-3xl font-bold mb-4">Your cart is empty</h1>
        <p className="text-muted-foreground mb-8 text-lg">Looks like you haven't added anything to your cart yet.</p>
        <Button size="lg" className="w-full h-14 text-lg" onClick={() => setLocation("/products")}>
          Continue Shopping
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

      <div className="grid lg:grid-cols-3 gap-12">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-6">
          {items.map((item) => (
            <div key={item.productId} className="flex flex-col sm:flex-row gap-6 p-6 bg-card border rounded-2xl relative group">
              <Link href={`/products/${item.productId}`} className="h-32 w-32 shrink-0 rounded-xl bg-muted overflow-hidden border">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground p-2 text-center">No Image</div>
                )}
              </Link>
              
              <div className="flex-1 flex flex-col justify-between">
                <div className="pr-8">
                  <Link href={`/products/${item.productId}`} className="font-semibold text-lg hover:text-primary transition-colors line-clamp-2">
                    {item.name}
                  </Link>
                  <div className="mt-2 text-lg font-bold text-foreground">
                    {currency} {(item.discountPrice ?? item.salePrice).toLocaleString()}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center rounded-lg border bg-background h-10">
                    <button
                      className="w-10 h-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
                      onClick={() => updateQty(item.productId, Math.max(1, item.quantity - 1))}
                      disabled={item.quantity <= 1}
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-12 text-center text-sm font-medium">{item.quantity}</span>
                    <button
                      className="w-10 h-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      onClick={() => updateQty(item.productId, item.quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  
                  <div className="font-semibold text-primary">
                    Total: {currency} {((item.discountPrice ?? item.salePrice) * item.quantity).toLocaleString()}
                  </div>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 text-muted-foreground hover:text-destructive opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeItem(item.productId)}
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-muted/30 border rounded-2xl p-6 sticky top-24">
            <h2 className="text-xl font-bold mb-6">Order Summary</h2>
            
            <div className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal ({items.length} items)</span>
                <span className="font-medium">{currency} {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-medium">Calculated at checkout</span>
              </div>
            </div>
            
            <Separator className="my-6" />
            
            <div className="flex justify-between items-center mb-8">
              <span className="text-lg font-bold">Total</span>
              <span className="text-2xl font-bold text-primary">{currency} {subtotal.toLocaleString()}</span>
            </div>

            <Button size="lg" className="w-full h-14 text-lg" onClick={() => setLocation("/checkout")}>
              Proceed to Checkout <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4" /> Secure Checkout
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
