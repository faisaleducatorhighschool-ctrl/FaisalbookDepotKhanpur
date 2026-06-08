import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useGetStoreSettings } from "@workspace/api-client-react";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { ThemeToggle } from "./ThemeToggle";
import { ShoppingBag, Heart, User, Search, Menu, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { CartDrawer } from "./CartDrawer";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function StoreLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const { data: settings } = useGetStoreSettings();
  const { customer, logout } = useCustomerAuth();
  const { items } = useCart();
  const { wishlistIds } = useWishlist();

  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const currency = settings?.currency || "Rs.";

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/products?search=${encodeURIComponent(searchQuery)}`);
    } else {
      setLocation(`/products`);
    }
  };

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Shop All", href: "/products" },
    { label: "Track Order", href: "/track" },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background selection:bg-primary/20 selection:text-primary">
      {/* Top Banner */}
      <div className="bg-primary text-primary-foreground text-xs py-2 text-center font-medium">
        Free shipping on all orders over {currency} 5,000!
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" data-testid="btn-mobile-menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] sm:w-[400px]">
                <nav className="flex flex-col gap-4 mt-8">
                  {navLinks.map((link) => (
                    <Link key={link.href} href={link.href} className="text-lg font-medium px-4 py-2 hover:bg-muted rounded-md transition-colors">
                      {link.label}
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>

            <Link href="/" className="flex items-center gap-2" data-testid="link-home">
              {settings?.logoUrl ? (
                <img src={settings.logoUrl} alt={settings.storeName} className="h-8 object-contain" />
              ) : (
                <span className="text-xl font-bold text-primary tracking-tight">
                  {settings?.storeName || "Smart Retail"}
                </span>
              )}
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <form onSubmit={handleSearch} className="hidden lg:flex items-center relative mr-2">
              <Input
                type="search"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pl-9 rounded-full bg-muted/50 border-transparent focus-visible:bg-background"
                data-testid="input-search"
              />
              <Search className="h-4 w-4 absolute left-3 text-muted-foreground" />
            </form>

            <ThemeToggle />

            <Link href="/wishlist">
              <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground" data-testid="link-wishlist">
                <Heart className="h-5 w-5" />
                {wishlistIds.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
                )}
              </Button>
            </Link>

            {customer ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="hidden sm:flex gap-2 text-muted-foreground hover:text-foreground" data-testid="btn-user-menu">
                    <User className="h-5 w-5" />
                    <span className="text-sm font-medium truncate max-w-[100px]">{customer.name.split(' ')[0]}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setLocation("/account")}>Profile & Orders</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/wishlist")}>Wishlist</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { logout(); setLocation("/"); }}>Log out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/login">
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" data-testid="link-login">
                  <User className="h-5 w-5" />
                </Button>
              </Link>
            )}

            <CartDrawer>
              <Button variant="ghost" size="icon" className="relative text-foreground hover:bg-muted/50 rounded-full" data-testid="btn-cart">
                <ShoppingBag className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center shadow-sm">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </Button>
            </CartDrawer>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-muted/30 border-t py-12 mt-12">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <Link href="/" className="inline-block mb-4">
              <span className="text-xl font-bold text-foreground">
                {settings?.storeName || "Smart Retail"}
              </span>
            </Link>
            <p className="text-sm text-muted-foreground mb-4">
              Your one-stop destination for quality everyday products. We deliver nationwide across Pakistan.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-foreground">Quick Links</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/products" className="hover:text-primary transition-colors">Shop All Products</Link></li>
              <li><Link href="/track" className="hover:text-primary transition-colors">Track Your Order</Link></li>
              <li><Link href="/account" className="hover:text-primary transition-colors">My Account</Link></li>
              <li><Link href="/cart" className="hover:text-primary transition-colors">Shopping Cart</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-foreground">Contact Us</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {settings?.storePhone && <li>Phone: {settings.storePhone}</li>}
              {settings?.storeEmail && <li>Email: {settings.storeEmail}</li>}
              {settings?.storeAddress && <li>Address: {settings.storeAddress}</li>}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-foreground">Secure Payments</h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-background">Cash on Delivery</Badge>
              {settings?.easypaisaNumber && <Badge variant="outline" className="bg-background">EasyPaisa</Badge>}
              {settings?.jazzcashNumber && <Badge variant="outline" className="bg-background">JazzCash</Badge>}
              {settings?.bankAccount && <Badge variant="outline" className="bg-background">Bank Transfer</Badge>}
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-12 pt-8 border-t border-border/50 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} {settings?.companyName || settings?.storeName || "Smart Retail"}. All rights reserved.
        </div>
      </footer>

      {/* WhatsApp Float */}
      {settings?.storePhone && (
        <a
          href={`https://wa.me/${settings.storePhone.replace(/[^0-9]/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 h-14 w-14 bg-[#25D366] text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 hover:-translate-y-1 transition-all duration-300"
          aria-label="Chat on WhatsApp"
        >
          <MessageCircle className="h-8 w-8" />
        </a>
      )}
    </div>
  );
}
