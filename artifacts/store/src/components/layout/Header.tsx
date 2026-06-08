import { Link } from "wouter";
import { ShoppingCart, User, Menu, X, Heart } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { useGetStoreSettings } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

export function Header() {
  const { items, subtotal } = useCart();
  const { customer } = useCustomerAuth();
  const { data: settings } = useGetStoreSettings();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>

            <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-primary" data-testid="link-home">
              {settings?.logoUrl ? (
                <img src={settings.logoUrl} alt={settings.storeName || "Tech Mentor"} className="h-8 object-contain" />
              ) : null}
              <span>{settings?.storeName || "Tech Mentor"}</span>
            </Link>

            <nav className="hidden md:flex gap-6 text-sm font-medium">
              <Link href="/" className="hover:text-primary transition-colors" data-testid="link-nav-home">Home</Link>
              <Link href="/products" className="hover:text-primary transition-colors" data-testid="link-nav-products">Products</Link>
              <Link href="/track" className="hover:text-primary transition-colors" data-testid="link-nav-track">Track Order</Link>
            </nav>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden lg:flex items-center text-sm text-muted-foreground mr-4">
              Need help? <span className="font-semibold text-foreground ml-1">{settings?.storePhone || ""}</span>
            </div>

            <Link href="/wishlist">
              <Button variant="ghost" size="icon" className="relative" data-testid="btn-wishlist">
                <Heart className="h-5 w-5" />
              </Button>
            </Link>

            <Link href={customer ? "/account" : "/login"}>
              <Button variant="ghost" size="icon" data-testid="btn-account">
                <User className="h-5 w-5" />
              </Button>
            </Link>

            <Link href="/cart">
              <Button variant="outline" className="relative flex items-center gap-2 px-3 border-primary/20 hover:bg-primary/5" data-testid="btn-cart">
                <ShoppingCart className="h-4 w-4 text-primary" />
                <span className="hidden sm:inline-block font-semibold">
                  {formatCurrency(subtotal, settings?.currency)}
                </span>
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                    {totalItems}
                  </span>
                )}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background p-4">
          <nav className="flex flex-col gap-4 text-sm font-medium">
            <Link href="/" className="hover:text-primary transition-colors p-2 rounded-md hover:bg-muted" onClick={() => setMobileMenuOpen(false)}>Home</Link>
            <Link href="/products" className="hover:text-primary transition-colors p-2 rounded-md hover:bg-muted" onClick={() => setMobileMenuOpen(false)}>Products</Link>
            <Link href="/track" className="hover:text-primary transition-colors p-2 rounded-md hover:bg-muted" onClick={() => setMobileMenuOpen(false)}>Track Order</Link>
            {customer ? (
              <Link href="/account" className="hover:text-primary p-2 rounded-md hover:bg-muted" onClick={() => setMobileMenuOpen(false)}>My Account</Link>
            ) : (
              <Link href="/login" className="hover:text-primary p-2 rounded-md hover:bg-muted" onClick={() => setMobileMenuOpen(false)}>Login</Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
