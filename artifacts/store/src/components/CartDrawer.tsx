import { useCart } from "@/context/CartContext";
import { useGetStoreSettings } from "@workspace/api-client-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { Link, useLocation } from "wouter";

export function CartDrawer({ children }: { children: React.ReactNode }) {
  const { items, updateQty, removeItem, subtotal } = useCart();
  const { data: settings } = useGetStoreSettings();
  const [_, setLocation] = useLocation();
  const currency = settings?.currency || "Rs.";

  return (
    <Sheet>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent className="flex flex-col w-full sm:max-w-md p-0">
        <SheetHeader className="p-6 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2 text-xl font-bold">
            <ShoppingBag className="h-5 w-5" />
            Your Cart ({items.length})
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-hidden">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-4">
              <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center">
                <ShoppingBag className="h-10 w-10 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-lg">Your cart is empty</h3>
                <p className="text-sm text-muted-foreground">Looks like you haven't added anything yet.</p>
              </div>
              <SheetTrigger asChild>
                <Button onClick={() => setLocation("/products")} className="mt-4">
                  Start Shopping
                </Button>
              </SheetTrigger>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                {items.map((item) => (
                  <div key={item.productId} className="flex gap-4">
                    <div className="h-20 w-20 rounded-md overflow-hidden bg-muted flex-shrink-0">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground text-center p-2">
                          No Image
                        </div>
                      )}
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="font-medium text-sm line-clamp-2 leading-tight">{item.name}</h4>
                          <div className="text-sm font-semibold text-primary mt-1">
                            {currency} {(item.discountPrice ?? item.salePrice).toLocaleString()}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => removeItem(item.productId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center rounded-md border border-input bg-background h-8">
                          <button
                            className="w-8 h-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
                            onClick={() => updateQty(item.productId, Math.max(1, item.quantity - 1))}
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                          <button
                            className="w-8 h-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            onClick={() => updateQty(item.productId, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t p-6 bg-muted/20">
            <div className="flex items-center justify-between mb-4">
              <span className="font-medium text-muted-foreground">Subtotal</span>
              <span className="text-xl font-bold">{currency} {subtotal.toLocaleString()}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-4 text-center">
              Taxes and shipping calculated at checkout
            </p>
            <SheetTrigger asChild>
              <Button className="w-full h-12 text-base font-semibold" onClick={() => setLocation("/checkout")}>
                Proceed to Checkout
              </Button>
            </SheetTrigger>
            <SheetTrigger asChild>
              <Button variant="outline" className="w-full mt-2" onClick={() => setLocation("/cart")}>
                View Cart
              </Button>
            </SheetTrigger>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
